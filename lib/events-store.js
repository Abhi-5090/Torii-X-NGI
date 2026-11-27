// Server-side helpers for events stored in MongoDB (Admin → Events).
//
// Every event lives in the `ngi_events` collection:
//   - "built-in" events are copied once from components/ngi/events-data.js
//     (source: 'builtin', builtinId: the original id), so they can be edited,
//     hidden or deleted from the admin like any other;
//   - events created in the admin have source: 'admin'.
// A photo is { src, imageId?, position? }: either a file shipped with the site
// (/assets/images/ngi/events/...) or an uploaded photo (/api/events/image/<id>,
// bytes in `ngi_event_images`).

import { ObjectId } from 'mongodb';
import builtInEvents from '../components/ngi/events-data';
import { getEventsCollection, getEventImagesCollection, getSettingsCollection } from './mongodb';

const SETTINGS_ID = 'events-builtins';
const STATIC_PREFIX = '/assets/images/ngi/events/';
export const IMAGE_PREFIX = '/api/events/image/';

const asPhoto = (p) => (typeof p === 'string' ? { src: p } : { src: p.src, ...(p.position ? { position: p.position } : {}) });
const toObjectId = (raw) => { try { return new ObjectId(String(raw)); } catch { return null; } };

/** Ids of built-in events already copied into the database. */
export async function getSeededBuiltinIds() {
    const settings = await getSettingsCollection();
    const doc = await settings.findOne({ _id: SETTINGS_ID });
    return doc?.seededIds || [];
}

/**
 * Copy any built-in event not yet in the database. Runs when an admin opens
 * Events; each built-in is copied once ever, so an event the admin deletes
 * never comes back, while a new event added to events-data.js is picked up.
 */
export async function seedBuiltInEvents() {
    const seeded = new Set(await getSeededBuiltinIds());
    const missing = builtInEvents.filter((e) => !seeded.has(e.id));
    if (!missing.length) return 0;

    const events = await getEventsCollection();
    const now = new Date();
    for (const e of missing) {
        try {
            await events.updateOne(
                { builtinId: e.id },
                {
                    $setOnInsert: {
                        builtinId: e.id,
                        source: 'builtin',
                        title: e.title,
                        date: e.date,
                        venue: e.venue,
                        category: e.category,
                        shortDescription: e.shortDescription,
                        longDescription: e.longDescription || [],
                        highlights: e.highlights || [],
                        tags: e.tags || [],
                        cover: asPhoto(e.cover),
                        photos: (e.photos || []).map(asPhoto),
                        layout: e.layout === 'portrait' ? 'portrait' : 'bento',
                        published: true,
                        createdAt: now,
                        updatedAt: now,
                    },
                },
                { upsert: true }
            );
        } catch (error) {
            // Two admins opening Events at once: the other request copied it.
            if (error?.code !== 11000) throw error;
        }
    }
    const settings = await getSettingsCollection();
    await settings.updateOne(
        { _id: SETTINGS_ID },
        { $addToSet: { seededIds: { $each: missing.map((e) => e.id) } } },
        { upsert: true }
    );
    return missing.length;
}

/**
 * Check a submitted list of photos ({ imageId } for a new upload, or
 * { src, position? } for one the event already has). `eventId` is the event
 * being edited (null when creating). Returns { photos, uploadedIds } or { error }.
 */
export async function resolvePhotos(items, eventId = null) {
    if (!Array.isArray(items)) return { error: 'Photos are missing.' };
    const photos = [];
    const uploadedIds = [];
    for (const item of items) {
        if (!item || typeof item !== 'object') return { error: 'A photo could not be read.' };
        const position = typeof item.position === 'string' && /^[a-z0-9 %.\-]{1,30}$/i.test(item.position) ? item.position : undefined;
        let imageId = item.imageId ? toObjectId(item.imageId) : null;
        const src = typeof item.src === 'string' ? item.src : '';
        if (!imageId && src.startsWith(IMAGE_PREFIX)) imageId = toObjectId(src.slice(IMAGE_PREFIX.length));
        if (imageId) {
            uploadedIds.push(imageId);
            photos.push({ src: `${IMAGE_PREFIX}${imageId}`, imageId, ...(position ? { position } : {}) });
        } else if (src.startsWith(STATIC_PREFIX) && !src.includes('..')) {
            photos.push({ src, ...(position ? { position } : {}) });
        } else {
            return { error: 'A photo could not be read. Please re-add it.' };
        }
    }
    if (new Set(photos.map((p) => p.src)).size !== photos.length) return { error: 'The same photo was added twice.' };

    if (uploadedIds.length) {
        const images = await getEventImagesCollection();
        const owners = eventId ? [null, eventId] : [null];
        const found = await images.countDocuments({ _id: { $in: uploadedIds }, eventId: { $in: owners } });
        if (found !== uploadedIds.length) {
            return { error: 'Some photos have expired or belong to another event. Please re-add them.' };
        }
    }
    return { photos, uploadedIds };
}

const publicPhoto = (p) => (p.position ? { src: p.src, position: p.position } : p.src);

/** Shape used by the website's Events section (matches events-data.js). */
export function toPublicEvent(doc) {
    return {
        id: doc.builtinId || `admin-${doc._id}`,
        title: doc.title,
        category: doc.category,
        date: doc.date,
        venue: doc.venue,
        shortDescription: doc.shortDescription,
        longDescription: doc.longDescription || [],
        highlights: doc.highlights || [],
        tags: doc.tags || [],
        layout: doc.layout === 'portrait' ? 'portrait' : undefined,
        cover: publicPhoto(doc.cover),
        photos: (doc.photos || []).map(publicPhoto),
    };
}

const adminPhoto = (p) => ({
    src: p.src,
    ...(p.imageId ? { imageId: String(p.imageId) } : {}),
    ...(p.position ? { position: p.position } : {}),
});

/** Full event for the admin list and edit form. */
export function toAdminEvent(doc) {
    return {
        id: String(doc._id),
        source: doc.source || 'admin',
        builtinId: doc.builtinId || null,
        title: doc.title,
        date: doc.date,
        venue: doc.venue,
        category: doc.category,
        shortDescription: doc.shortDescription,
        longDescription: doc.longDescription || [],
        highlights: doc.highlights || [],
        tags: doc.tags || [],
        cover: adminPhoto(doc.cover),
        photos: (doc.photos || []).map(adminPhoto),
        layout: doc.layout === 'portrait' ? 'portrait' : 'bento',
        published: doc.published !== false,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}
