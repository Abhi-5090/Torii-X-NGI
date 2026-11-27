import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getEventsCollection, getEventImagesCollection } from '../../../../../lib/mongodb';
import { isAuthenticated } from '../../../../../lib/dashboard-auth';
import { validateEvent } from '../../../../../lib/event-schema';
import { resolvePhotos } from '../../../../../lib/events-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const parseId = (raw) => { try { return new ObjectId(raw); } catch { return null; } };
const unauthorized = () => NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
const badId = () => NextResponse.json({ success: false, message: 'Invalid event id.' }, { status: 400 });

/** Edit an event (built-in or admin-added). Same body as creating one. */
export async function PUT(request, { params }) {
    if (!isAuthenticated(request)) return unauthorized();
    const id = parseId(params.id);
    if (!id) return badId();

    let body;
    try { body = await request.json(); } catch {
        return NextResponse.json({ success: false, message: 'Invalid request.' }, { status: 400 });
    }

    const items = [body.cover, ...(Array.isArray(body.photos) ? body.photos : [])].filter(Boolean);
    const { ok, errors, value } = validateEvent(body, items.length);
    if (!ok) return NextResponse.json({ success: false, message: 'Please correct the highlighted fields.', errors }, { status: 422 });

    try {
        const events = await getEventsCollection();
        const existing = await events.findOne({ _id: id }, { projection: { _id: 1 } });
        if (!existing) return NextResponse.json({ success: false, message: 'Event not found.' }, { status: 404 });

        const resolved = await resolvePhotos(items, id);
        if (resolved.error) {
            return NextResponse.json({ success: false, message: resolved.error, errors: { photos: resolved.error } }, { status: 422 });
        }
        const [cover, ...photos] = resolved.photos;
        await events.updateOne({ _id: id }, {
            $set: {
                ...value,
                cover,
                photos,
                layout: body.layout === 'portrait' ? 'portrait' : 'bento',
                updatedAt: new Date(),
            },
        });

        // Attach newly uploaded photos; delete uploaded photos this event no longer uses.
        const images = await getEventImagesCollection();
        if (resolved.uploadedIds.length) {
            await images.updateMany({ _id: { $in: resolved.uploadedIds } }, { $set: { eventId: id } });
        }
        await images.deleteMany({ eventId: id, _id: { $nin: resolved.uploadedIds } });

        return NextResponse.json({ success: true, message: 'Event updated.' });
    } catch (error) {
        console.error('[admin/events/:id] edit failed:', error);
        return NextResponse.json({ success: false, message: 'Could not save the changes. Please try again.' }, { status: 503 });
    }
}

/** Show or hide an event on the website. JSON: { action: 'publish' | 'unpublish' }. */
export async function PATCH(request, { params }) {
    if (!isAuthenticated(request)) return unauthorized();
    const id = parseId(params.id);
    if (!id) return badId();

    let body;
    try { body = await request.json(); } catch { body = {}; }
    if (!['publish', 'unpublish'].includes(body.action)) {
        return NextResponse.json({ success: false, message: 'Unknown action.' }, { status: 400 });
    }

    try {
        const events = await getEventsCollection();
        const result = await events.updateOne(
            { _id: id },
            { $set: { published: body.action === 'publish', updatedAt: new Date() } }
        );
        if (!result.matchedCount) return NextResponse.json({ success: false, message: 'Event not found.' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[admin/events/:id] update failed:', error);
        return NextResponse.json({ success: false, message: 'Could not update the event.' }, { status: 503 });
    }
}

/** Delete an event and its uploaded photos. A deleted built-in event does not come back. */
export async function DELETE(request, { params }) {
    if (!isAuthenticated(request)) return unauthorized();
    const id = parseId(params.id);
    if (!id) return badId();

    try {
        const events = await getEventsCollection();
        const result = await events.deleteOne({ _id: id });
        if (!result.deletedCount) return NextResponse.json({ success: false, message: 'Event not found.' }, { status: 404 });
        const images = await getEventImagesCollection();
        await images.deleteMany({ eventId: id });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[admin/events/:id] delete failed:', error);
        return NextResponse.json({ success: false, message: 'Could not delete the event.' }, { status: 503 });
    }
}
