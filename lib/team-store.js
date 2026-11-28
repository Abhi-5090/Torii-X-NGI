// Server-side helpers for team members stored in MongoDB (Admin → Team).
//
// Every member lives in the `ngi_team` collection, ordered by `order`:
//   - "built-in" members are copied once from components/ngi/team-data.js
//     (source: 'builtin', builtinId: the original id) so they can be edited,
//     reordered, hidden or deleted from the admin like any other;
//   - members added in the admin have source: 'admin'.
// A photo is { src, imageId? }: a file shipped with the site
// (/assets/images/ngi/project-images/team/...) or an uploaded photo
// (/api/team/photo/<id>, bytes in `ngi_team_photos`).

import { ObjectId } from 'mongodb';
import { builtInTeam } from '../components/ngi/team-data';
import {
    getTeamCollection,
    getTeamPhotosCollection,
    getTeamPortfoliosCollection,
    getTeamPortfolioPartsCollection,
    getSettingsCollection,
} from './mongodb';
import { PORTFOLIO_UPLOAD_PREFIX, isUploadedPortfolio } from './team-schema';

const SETTINGS_ID = 'team-builtins';
const STATIC_PREFIX = '/assets/images/ngi/project-images/team/';
export const PHOTO_PREFIX = '/api/team/photo/';

const toObjectId = (raw) => { try { return new ObjectId(String(raw)); } catch { return null; } };

/** Ids of built-in members already copied into the database. */
export async function getSeededTeamIds() {
    const settings = await getSettingsCollection();
    const doc = await settings.findOne({ _id: SETTINGS_ID });
    return doc?.seededIds || [];
}

/**
 * Copy any built-in member not yet in the database, keeping the site order.
 * Runs when an admin opens Team; each built-in member is copied once ever, so
 * a member the admin deletes never comes back.
 */
export async function seedBuiltInTeam() {
    const seeded = new Set(await getSeededTeamIds());
    const missing = builtInTeam.map((m, i) => ({ m, i })).filter(({ m }) => !seeded.has(m.id));
    if (!missing.length) return 0;

    const team = await getTeamCollection();
    const last = await team.find({}, { projection: { order: 1 } }).sort({ order: -1 }).limit(1).toArray();
    // A first copy keeps the original positions; members added to the code
    // later go after everyone already in the database.
    const base = seeded.size === 0 ? 0 : (last[0]?.order ?? -1) + 1;
    const now = new Date();
    for (const { m, i } of missing) {
        try {
            await team.updateOne(
                { builtinId: m.id },
                {
                    $setOnInsert: {
                        builtinId: m.id,
                        source: 'builtin',
                        name: m.name,
                        role: m.role,
                        tagline: m.tagline || '',
                        photo: { src: m.photo },
                        linkedin: m.linkedin || '',
                        portfolio: m.portfolio || '',
                        highlights: m.highlights || [],
                        tags: m.tags || [],
                        order: seeded.size === 0 ? i : base + i,
                        published: true,
                        createdAt: now,
                        updatedAt: now,
                    },
                },
                { upsert: true }
            );
        } catch (error) {
            if (error?.code !== 11000) throw error; // another request copied it
        }
    }
    const settings = await getSettingsCollection();
    await settings.updateOne(
        { _id: SETTINGS_ID },
        { $addToSet: { seededIds: { $each: missing.map(({ m }) => m.id) } } },
        { upsert: true }
    );
    return missing.length;
}

/**
 * Check a submitted photo: { imageId } for a new upload, or { src } for the
 * one the member already has. `memberId` is the member being edited (null when
 * adding). Returns { photo, uploadedId } or { error }.
 */
export async function resolveTeamPhoto(item, memberId = null) {
    if (!item || typeof item !== 'object') return { error: 'Please add a photo.' };
    const src = typeof item.src === 'string' ? item.src : '';
    let imageId = item.imageId ? toObjectId(item.imageId) : null;
    if (!imageId && src.startsWith(PHOTO_PREFIX)) imageId = toObjectId(src.slice(PHOTO_PREFIX.length));

    if (imageId) {
        const photos = await getTeamPhotosCollection();
        const owners = memberId ? [null, memberId] : [null];
        const found = await photos.countDocuments({ _id: imageId, memberId: { $in: owners } });
        if (!found) return { error: 'The photo has expired or belongs to another member. Please re-add it.' };
        return { photo: { src: `${PHOTO_PREFIX}${imageId}`, imageId }, uploadedId: imageId };
    }
    if (src.startsWith(STATIC_PREFIX) && !src.includes('..')) return { photo: { src }, uploadedId: null };
    return { error: 'The photo could not be read. Please re-add it.' };
}

const ORPHAN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Check the member's portfolio before saving. '' (none) and the HTML files
 * shipped with the site pass as-is; an uploaded one must be fully uploaded and
 * not belong to another member. Returns { portfolio, portfolioFile, uploadedId } or { error }.
 */
export async function resolvePortfolio(portfolio, memberId = null) {
    if (!portfolio || !isUploadedPortfolio(portfolio)) return { portfolio: portfolio || '', portfolioFile: null, uploadedId: null };
    const fileId = toObjectId(portfolio.slice(PORTFOLIO_UPLOAD_PREFIX.length));
    const files = await getTeamPortfoliosCollection();
    const owners = memberId ? [null, memberId] : [null];
    const file = fileId && await files.findOne({ _id: fileId, complete: true, memberId: { $in: owners } }, { projection: { name: 1, size: 1 } });
    if (!file) return { error: 'The portfolio upload did not finish or has expired. Please upload the file again.' };
    return { portfolio, portfolioFile: { name: file.name, size: file.size }, uploadedId: fileId };
}

/** Delete uploaded portfolio files (and their parts) matching `filter`. */
export async function deletePortfolios(filter) {
    const files = await getTeamPortfoliosCollection();
    const ids = (await files.find(filter, { projection: { _id: 1 } }).toArray()).map((f) => f._id);
    if (!ids.length) return 0;
    const parts = await getTeamPortfolioPartsCollection();
    await parts.deleteMany({ fileId: { $in: ids } });
    await files.deleteMany({ _id: { $in: ids } });
    return ids.length;
}

/** Link a saved member to their uploaded portfolio and drop any portfolio they no longer use. */
export async function attachPortfolio(memberId, uploadedId) {
    const files = await getTeamPortfoliosCollection();
    if (uploadedId) await files.updateOne({ _id: uploadedId }, { $set: { memberId } });
    await deletePortfolios({ memberId, ...(uploadedId ? { _id: { $ne: uploadedId } } : {}) });
}

/** Remove uploads that were never attached to a member (abandoned forms). */
export function cleanupOrphanPortfolios() {
    return deletePortfolios({ memberId: null, createdAt: { $lt: new Date(Date.now() - ORPHAN_TTL_MS) } });
}

/** Shape used by the website's Meet the Team section (matches team-data.js). */
export function toPublicMember(doc) {
    return {
        id: doc.builtinId || `admin-${doc._id}`,
        name: doc.name,
        role: doc.role,
        tagline: doc.tagline,
        photo: doc.photo?.src,
        ...(doc.linkedin ? { linkedin: doc.linkedin } : {}),
        ...(doc.portfolio ? { portfolio: doc.portfolio } : { portfolioComingSoon: true }),
        tags: doc.tags || [],
        highlights: doc.highlights || [],
    };
}

/** Full member for the admin list and edit form. */
export function toAdminMember(doc) {
    return {
        id: String(doc._id),
        source: doc.source || 'admin',
        builtinId: doc.builtinId || null,
        name: doc.name,
        role: doc.role,
        tagline: doc.tagline || '',
        photo: { src: doc.photo?.src, ...(doc.photo?.imageId ? { imageId: String(doc.photo.imageId) } : {}) },
        linkedin: doc.linkedin || '',
        portfolio: doc.portfolio || '',
        // Shown in the admin form: the uploaded file's name/size, or the site file's name.
        portfolioFile: doc.portfolio
            ? (doc.portfolioFile || { name: doc.portfolio.split('/').pop(), size: null })
            : null,
        highlights: doc.highlights || [],
        tags: doc.tags || [],
        order: doc.order ?? 0,
        published: doc.published !== false,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}
