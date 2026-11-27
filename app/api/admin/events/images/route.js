import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { getEventImagesCollection } from '../../../../../lib/mongodb';
import { isAuthenticated } from '../../../../../lib/dashboard-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// One photo per request. The admin form shrinks photos in the browser first
// (about 1600px), so each upload stays well under Vercel's 4.5MB request limit.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
// Photos uploaded but never attached to a saved event (e.g. the form was
// abandoned) are cleaned up after a day.
const ORPHAN_TTL_MS = 24 * 60 * 60 * 1000;

/** Upload one event photo. Returns its id and size; the photo is attached to an
 *  event when the event itself is saved (POST /api/admin/events). */
export async function POST(request) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    let form;
    try {
        form = await request.formData();
    } catch {
        return NextResponse.json({ success: false, message: 'Invalid upload.' }, { status: 400 });
    }

    const file = form.get('image');
    if (!file || typeof file === 'string' || !file.size) {
        return NextResponse.json({ success: false, message: 'Please choose a photo.' }, { status: 422 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ success: false, message: 'That photo is too large. Please use one under 4MB.' }, { status: 413 });
    }
    if (!/^image\//.test(file.type || '')) {
        return NextResponse.json({ success: false, message: 'Photos must be image files (JPG, PNG or WEBP).' }, { status: 422 });
    }

    let processed;
    try {
        // rotate() applies the camera's EXIF orientation so phone photos stand upright.
        processed = await sharp(Buffer.from(await file.arrayBuffer()))
            .rotate()
            .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer({ resolveWithObject: true });
    } catch (error) {
        console.error('[admin/events/images] processing failed:', error);
        return NextResponse.json({ success: false, message: 'Could not read that photo. Please try a different file.' }, { status: 400 });
    }

    try {
        const images = await getEventImagesCollection();
        const now = new Date();
        const result = await images.insertOne({
            data: processed.data,
            contentType: 'image/webp',
            width: processed.info.width,
            height: processed.info.height,
            eventId: null,
            createdAt: now,
        });
        // Best-effort tidy-up of abandoned uploads; never blocks this upload.
        images.deleteMany({ eventId: null, createdAt: { $lt: new Date(now.getTime() - ORPHAN_TTL_MS) } }).catch(() => {});

        return NextResponse.json({
            success: true,
            id: String(result.insertedId),
            width: processed.info.width,
            height: processed.info.height,
        }, { status: 201 });
    } catch (error) {
        console.error('[admin/events/images] save failed:', error);
        return NextResponse.json({ success: false, message: 'Could not save the photo. Please try again.' }, { status: 503 });
    }
}
