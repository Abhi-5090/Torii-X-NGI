import { MongoClient } from 'mongodb';

// Vercel runs each API route in a short-lived serverless function, and dev mode
// hot-reloads modules on every edit. Both would open a brand new pool per
// invocation and quickly exhaust the Atlas connection limit, so the client
// promise is cached on globalThis and reused across invocations/reloads.

const DB_NAME = process.env.MONGODB_DB || 'ngi';
const COLLECTION_NAME = process.env.MONGODB_COLLECTION || 'ngi_registrations';

const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 15000,
    retryWrites: true
};

let cached = globalThis.__ngiMongo;
if (!cached) {
    cached = globalThis.__ngiMongo = { clientPromise: null, indexesReady: null };
}

function getClientPromise() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI is not set. Add it to .env.local locally and to the Vercel project environment variables.');
    }
    if (!cached.clientPromise) {
        // Note: connect() failures must clear the cache, otherwise a single
        // startup blip would leave every later request stuck on a dead promise.
        cached.clientPromise = new MongoClient(uri, options).connect().catch((error) => {
            cached.clientPromise = null;
            throw error;
        });
    }
    return cached.clientPromise;
}

// Uniqueness used to be global (one roll number / email across every program).
// Moon Coder re-enrols students who already hold a SkillUp Coder record, so the
// constraint is now per program: the same student may appear once per intake.
// The old single-field indexes must go first or the second registration would
// still be rejected.
const LEGACY_INDEXES = ['uniq_rollNumber', 'uniq_collegeEmail'];

async function ensureRegistrationIndexes(collection) {
    // indexes() throws NamespaceNotFound on a brand-new deployment where the
    // collection has not been created yet — treat that as "no indexes".
    const existing = await collection.indexes().catch(() => []);
    const names = new Set(existing.map((index) => index.name));
    for (const name of LEGACY_INDEXES) {
        if (names.has(name)) await collection.dropIndex(name);
    }
    await Promise.all([
        collection.createIndex({ programCode: 1, rollNumber: 1 }, { unique: true, name: 'uniq_program_rollNumber' }),
        collection.createIndex({ programCode: 1, collegeEmail: 1 }, { unique: true, name: 'uniq_program_collegeEmail' }),
        collection.createIndex({ registrationId: 1 }, { unique: true, name: 'uniq_registrationId' }),
        collection.createIndex({ createdAt: -1 }, { name: 'idx_createdAt' }),
        // The admin analytics filter one program and sort/range on createdAt.
        collection.createIndex({ programCode: 1, createdAt: -1 }, { name: 'idx_program_createdAt' })
    ]);
}

/**
 * Returns the registrations collection, ensuring the uniqueness indexes exist.
 * Index creation is idempotent and cached, so it costs one round trip per
 * cold start rather than one per request.
 */
export async function getRegistrationsCollection() {
    const client = await getClientPromise();
    const collection = client.db(DB_NAME).collection(COLLECTION_NAME);

    // Keyed per index-layout version: the cache lives on globalThis and survives
    // dev hot-reloads, so a renamed key is what makes a long-running dev server
    // actually run a new migration instead of reusing the old resolved promise.
    if (!cached.registrationIndexesV3) {
        cached.registrationIndexesV3 = ensureRegistrationIndexes(collection).catch((error) => {
            // Don't poison the cache — a failed index build should be retried on
            // the next request rather than permanently rejected.
            cached.registrationIndexesV3 = null;
            throw error;
        });
    }
    await cached.registrationIndexesV3;

    return collection;
}

const ANNOUNCEMENTS_COLLECTION = 'ngi_announcements';

/**
 * Returns the announcements collection. Images are stored inline as a Buffer
 * field (`imageData`) rather than on disk — Vercel's filesystem is read-only
 * and ephemeral per-deploy, so anything an admin uploads at runtime must live
 * in the database to actually persist and be visible on every instance.
 */
export async function getAnnouncementsCollection() {
    const client = await getClientPromise();
    const collection = client.db(DB_NAME).collection(ANNOUNCEMENTS_COLLECTION);

    if (!cached.announcementIndexesReady) {
        cached.announcementIndexesReady = Promise.all([
            collection.createIndex({ isActive: 1, createdAt: -1 }, { name: 'idx_active_created' }),
            collection.createIndex({ createdAt: -1 }, { name: 'idx_createdAt' })
        ]).catch((error) => {
            cached.announcementIndexesReady = null;
            throw error;
        });
    }
    await cached.announcementIndexesReady;

    return collection;
}

const EVENTS_COLLECTION = 'ngi_events';
const EVENT_IMAGES_COLLECTION = 'ngi_event_images';

/**
 * Events added from Admin → Events. Each event stores its text plus the ids of
 * its photos; the photo bytes live in the event-images collection (one document
 * per photo) so an event document stays small and photos can be uploaded one
 * request at a time, under Vercel's request-size limit.
 */
export async function getEventsCollection() {
    const client = await getClientPromise();
    const collection = client.db(DB_NAME).collection(EVENTS_COLLECTION);

    if (!cached.eventIndexesReady) {
        cached.eventIndexesReady = Promise.all([
            collection.createIndex({ published: 1, date: -1 }, { name: 'idx_published_date' }),
            // A built-in event (copied from events-data.js) is stored at most once.
            collection.createIndex(
                { builtinId: 1 },
                { name: 'uniq_builtinId', unique: true, partialFilterExpression: { builtinId: { $type: 'string' } } }
            ),
        ]).catch((error) => {
            cached.eventIndexesReady = null;
            throw error;
        });
    }
    await cached.eventIndexesReady;

    return collection;
}

/** Photos for admin-added events (`data` is the image Buffer). */
export async function getEventImagesCollection() {
    const client = await getClientPromise();
    const collection = client.db(DB_NAME).collection(EVENT_IMAGES_COLLECTION);

    if (!cached.eventImageIndexesReady) {
        cached.eventImageIndexesReady = collection
            .createIndex({ eventId: 1, createdAt: 1 }, { name: 'idx_event_created' })
            .catch((error) => {
                cached.eventImageIndexesReady = null;
                throw error;
            });
    }
    await cached.eventImageIndexesReady;

    return collection;
}

const TEAM_COLLECTION = 'ngi_team';
const TEAM_PHOTOS_COLLECTION = 'ngi_team_photos';

/** Team members managed in Admin → Team (`order` = position on the site). */
export async function getTeamCollection() {
    const client = await getClientPromise();
    const collection = client.db(DB_NAME).collection(TEAM_COLLECTION);

    if (!cached.teamIndexesReady) {
        cached.teamIndexesReady = Promise.all([
            collection.createIndex({ order: 1 }, { name: 'idx_order' }),
            collection.createIndex(
                { builtinId: 1 },
                { name: 'uniq_builtinId', unique: true, partialFilterExpression: { builtinId: { $type: 'string' } } }
            ),
        ]).catch((error) => {
            cached.teamIndexesReady = null;
            throw error;
        });
    }
    await cached.teamIndexesReady;

    return collection;
}

/** Photos uploaded for team members (`data` is the image Buffer). */
export async function getTeamPhotosCollection() {
    const client = await getClientPromise();
    const collection = client.db(DB_NAME).collection(TEAM_PHOTOS_COLLECTION);

    if (!cached.teamPhotoIndexesReady) {
        cached.teamPhotoIndexesReady = collection
            .createIndex({ memberId: 1, createdAt: 1 }, { name: 'idx_member_created' })
            .catch((error) => {
                cached.teamPhotoIndexesReady = null;
                throw error;
            });
    }
    await cached.teamPhotoIndexesReady;

    return collection;
}

const TEAM_PORTFOLIOS_COLLECTION = 'ngi_team_portfolios';
const TEAM_PORTFOLIO_PARTS_COLLECTION = 'ngi_team_portfolio_parts';

/**
 * Portfolio HTML files uploaded for team members. A file can be larger than one
 * request (Vercel allows 4.5MB) and than one MongoDB document (16MB), so it is
 * uploaded and stored in numbered parts: one document here per file
 * ({ name, size, parts, complete, memberId }) and one per part in the parts collection.
 */
export async function getTeamPortfoliosCollection() {
    const client = await getClientPromise();
    const collection = client.db(DB_NAME).collection(TEAM_PORTFOLIOS_COLLECTION);
    if (!cached.teamPortfolioIndexesReady) {
        cached.teamPortfolioIndexesReady = collection
            .createIndex({ memberId: 1, createdAt: 1 }, { name: 'idx_member_created' })
            .catch((error) => {
                cached.teamPortfolioIndexesReady = null;
                throw error;
            });
    }
    await cached.teamPortfolioIndexesReady;
    return collection;
}

/** Parts of uploaded portfolio files ({ fileId, n, data }). */
export async function getTeamPortfolioPartsCollection() {
    const client = await getClientPromise();
    const collection = client.db(DB_NAME).collection(TEAM_PORTFOLIO_PARTS_COLLECTION);
    if (!cached.teamPortfolioPartIndexesReady) {
        cached.teamPortfolioPartIndexesReady = collection
            .createIndex({ fileId: 1, n: 1 }, { name: 'uniq_file_part', unique: true })
            .catch((error) => {
                cached.teamPortfolioPartIndexesReady = null;
                throw error;
            });
    }
    await cached.teamPortfolioPartIndexesReady;
    return collection;
}

const SETTINGS_COLLECTION = 'ngi_settings';

/** Small site-wide settings documents, keyed by _id (e.g. 'events-builtins'). */
export async function getSettingsCollection() {
    const client = await getClientPromise();
    return client.db(DB_NAME).collection(SETTINGS_COLLECTION);
}

export { DB_NAME, COLLECTION_NAME, ANNOUNCEMENTS_COLLECTION, EVENTS_COLLECTION, EVENT_IMAGES_COLLECTION, TEAM_COLLECTION, TEAM_PHOTOS_COLLECTION, TEAM_PORTFOLIOS_COLLECTION, TEAM_PORTFOLIO_PARTS_COLLECTION, SETTINGS_COLLECTION };
