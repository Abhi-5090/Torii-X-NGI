import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { getTeamPhotosCollection } from '../../../../../lib/mongodb';
import { isAuthenticated } from '../../../../../lib/dashboard-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// The admin form shrinks photos in the browser first, so each upload stays well
// under Vercel's 4.5MB request limit.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ORPHAN_TTL_MS = 24 * 60 * 60 * 1000;
// Same frame as the existing team cutouts: 700 × 880, person bottom-anchored
// with a little headroom, transparent around them.
const CANVAS_W = 700;
const CANVAS_H = 880;
const HEADROOM = 24;

/** Upload one team photo. It is attached to a member when the member is saved. */
export async function POST(request) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    let form;
    try { form = await request.formData(); } catch {
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
        return NextResponse.json({ success: false, message: 'The photo must be an image (PNG, JPG or WEBP).' }, { status: 422 });
    }

    let data;
    try {
        const upright = await sharp(Buffer.from(await file.arrayBuffer())).rotate().png().toBuffer();
        // Trim empty (transparent or flat) margins so everyone is framed alike.
        const trimmed = await sharp(upright).trim({ threshold: 10 }).toBuffer().catch(() => upright);
        const fitted = await sharp(trimmed)
            .resize({ width: CANVAS_W, height: CANVAS_H - HEADROOM, fit: 'inside' })
            .toBuffer({ resolveWithObject: true });
        data = await sharp({ create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
            .composite([{
                input: fitted.data,
                left: Math.round((CANVAS_W - fitted.info.width) / 2),
                top: CANVAS_H - fitted.info.height,
            }])
            .webp({ quality: 82 })
            .toBuffer();
    } catch (error) {
        console.error('[admin/team/photo] processing failed:', error);
        return NextResponse.json({ success: false, message: 'Could not read that photo. Please try a different file.' }, { status: 400 });
    }

    try {
        const photos = await getTeamPhotosCollection();
        const now = new Date();
        const result = await photos.insertOne({ data, contentType: 'image/webp', memberId: null, createdAt: now });
        photos.deleteMany({ memberId: null, createdAt: { $lt: new Date(now.getTime() - ORPHAN_TTL_MS) } }).catch(() => {});
        return NextResponse.json({ success: true, id: String(result.insertedId), src: `/api/team/photo/${result.insertedId}` }, { status: 201 });
    } catch (error) {
        console.error('[admin/team/photo] save failed:', error);
        return NextResponse.json({ success: false, message: 'Could not save the photo. Please try again.' }, { status: 503 });
    }
}
