import { NextResponse } from 'next/server';
import { getEventsCollection, getEventImagesCollection } from '../../../../lib/mongodb';
import { isAuthenticated } from '../../../../lib/dashboard-auth';
import { validateEvent } from '../../../../lib/event-schema';
import { seedBuiltInEvents, resolvePhotos, toAdminEvent } from '../../../../lib/events-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const unauthorized = () => NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

/** Every event (built-in and admin-added), newest event date first. Copies any
 *  built-in event that is not in the database yet, so all of them are editable. */
export async function GET(request) {
    if (!isAuthenticated(request)) return unauthorized();
    try {
        await seedBuiltInEvents();
        const events = await getEventsCollection();
        const docs = await events.find({}).sort({ date: -1, createdAt: -1 }).toArray();
        return NextResponse.json({ success: true, events: docs.map(toAdminEvent) });
    } catch (error) {
        console.error('[admin/events] list failed:', error);
        return NextResponse.json({ success: false, message: 'Could not load events.' }, { status: 500 });
    }
}

/**
 * Create an event. JSON body: the event text, `cover` and `photos`
 * ({ imageId } for photos uploaded via POST /api/admin/events/images), and
 * `layout` ('bento' | 'portrait'). 4–6 photos in total including the cover.
 */
export async function POST(request) {
    if (!isAuthenticated(request)) return unauthorized();

    let body;
    try { body = await request.json(); } catch {
        return NextResponse.json({ success: false, message: 'Invalid request.' }, { status: 400 });
    }

    const items = [body.cover, ...(Array.isArray(body.photos) ? body.photos : [])].filter(Boolean);
    const { ok, errors, value } = validateEvent(body, items.length);
    if (!ok) return NextResponse.json({ success: false, message: 'Please correct the highlighted fields.', errors }, { status: 422 });

    try {
        const resolved = await resolvePhotos(items, null);
        if (resolved.error) {
            return NextResponse.json({ success: false, message: resolved.error, errors: { photos: resolved.error } }, { status: 422 });
        }
        const [cover, ...photos] = resolved.photos;
        const events = await getEventsCollection();
        const now = new Date();
        const result = await events.insertOne({
            ...value,
            source: 'admin',
            cover,
            photos,
            layout: body.layout === 'portrait' ? 'portrait' : 'bento',
            published: true,
            createdAt: now,
            updatedAt: now,
        });
        if (resolved.uploadedIds.length) {
            const images = await getEventImagesCollection();
            await images.updateMany({ _id: { $in: resolved.uploadedIds } }, { $set: { eventId: result.insertedId } });
        }
        return NextResponse.json({ success: true, message: 'Event published.', id: String(result.insertedId) }, { status: 201 });
    } catch (error) {
        console.error('[admin/events] create failed:', error);
        return NextResponse.json({ success: false, message: 'Could not save the event. Please try again.' }, { status: 503 });
    }
}
