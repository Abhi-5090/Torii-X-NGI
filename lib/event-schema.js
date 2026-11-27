// Shared rules for events added from the admin panel (Admin → Events). The admin
// form and the API both validate with these, so the limits can never drift apart.
// The event fields mirror what the public "Explore Event" view shows.

export const EVENT_LIMITS = {
    title: { min: 3, max: 80 },
    venue: { min: 2, max: 80 },
    category: { min: 2, max: 40 },
    shortDescription: { min: 20, max: 240 },
    // "The Story": 1–3 short paragraphs.
    storyParagraphs: { min: 1, max: 3 },
    storyParagraph: { min: 20, max: 700 },
    // "What We Did": bullet points.
    highlights: { min: 1, max: 6 },
    highlight: { min: 3, max: 140 },
    // Hashtags, at most five.
    tags: { min: 0, max: 5 },
    tag: { min: 2, max: 30 },
    // Photos including the cover.
    photos: { min: 4, max: 6 },
};

// Formats offered as suggestions in the admin form (any short label is allowed).
export const EVENT_FORMAT_SUGGESTIONS = [
    'Celebration', 'Inauguration', 'Conclave', 'Project Expo', 'Tech Symposium',
    'Career Drive', 'Industry Session', 'Hackathon', 'Workshop', 'Bootcamp',
    'Project Showcase', 'Hands-on Week', 'Open Source', 'Launch', 'Competition',
];

const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const clean = (v) => str(v).replace(/\s+/g, ' ').trim();

/** "#Open Source" / "open source" -> "Open Source". */
export function normalizeTag(raw) {
    return clean(raw).replace(/^#+/, '').trim();
}

function isValidIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && y >= 2000 && y <= 2100;
}

function lengthError(label, value, { min, max }) {
    if (!value) return `Please enter the ${label}.`;
    if (value.length < min) return `The ${label} is too short (at least ${min} characters).`;
    if (value.length > max) return `The ${label} is too long (at most ${max} characters).`;
    return null;
}

/**
 * Validate and normalise an event submission.
 * `photoCount` is the number of photos (including the cover) attached to it.
 * Returns { ok, value, errors } where errors is keyed by field.
 */
export function validateEvent(raw = {}, photoCount = 0) {
    const L = EVENT_LIMITS;
    const errors = {};

    const title = clean(raw.title);
    const date = clean(raw.date);
    const venue = clean(raw.venue);
    const category = clean(raw.category);
    const shortDescription = clean(raw.shortDescription);
    const longDescription = (Array.isArray(raw.longDescription) ? raw.longDescription : []).map(clean).filter(Boolean);
    const highlights = (Array.isArray(raw.highlights) ? raw.highlights : []).map(clean).filter(Boolean);
    const tags = [...new Set((Array.isArray(raw.tags) ? raw.tags : []).map(normalizeTag).filter(Boolean))];

    const titleErr = lengthError('event title', title, L.title);
    if (titleErr) errors.title = titleErr;

    if (!date) errors.date = 'Please choose the event date.';
    else if (!isValidIsoDate(date)) errors.date = 'Please choose a valid date.';

    const venueErr = lengthError('venue', venue, L.venue);
    if (venueErr) errors.venue = venueErr;

    const categoryErr = lengthError('format', category, L.category);
    if (categoryErr) errors.category = categoryErr;

    const shortErr = lengthError('short description', shortDescription, L.shortDescription);
    if (shortErr) errors.shortDescription = shortErr;

    if (longDescription.length < L.storyParagraphs.min) {
        errors.longDescription = 'Please write at least one paragraph for "The Story".';
    } else if (longDescription.length > L.storyParagraphs.max) {
        errors.longDescription = `"The Story" can have at most ${L.storyParagraphs.max} paragraphs.`;
    } else {
        const bad = longDescription.findIndex((p) => p.length < L.storyParagraph.min || p.length > L.storyParagraph.max);
        if (bad >= 0) errors.longDescription = `Story paragraph ${bad + 1} should be ${L.storyParagraph.min}–${L.storyParagraph.max} characters.`;
    }

    if (highlights.length < L.highlights.min) {
        errors.highlights = 'Please add at least one point under "What We Did".';
    } else if (highlights.length > L.highlights.max) {
        errors.highlights = `"What We Did" can have at most ${L.highlights.max} points.`;
    } else {
        const bad = highlights.findIndex((h) => h.length < L.highlight.min || h.length > L.highlight.max);
        if (bad >= 0) errors.highlights = `Point ${bad + 1} should be ${L.highlight.min}–${L.highlight.max} characters.`;
    }

    if (tags.length > L.tags.max) {
        errors.tags = `Please use at most ${L.tags.max} hashtags.`;
    } else {
        const bad = tags.find((t) => t.length < L.tag.min || t.length > L.tag.max || !/^[\p{L}\p{N}][\p{L}\p{N} &+.\-]*$/u.test(t));
        if (bad) errors.tags = `"#${bad}" is not a valid hashtag (letters, numbers and spaces, ${L.tag.min}–${L.tag.max} characters).`;
    }

    if (photoCount < L.photos.min || photoCount > L.photos.max) {
        errors.photos = `Please add ${L.photos.min} to ${L.photos.max} photos (including the cover).`;
    }

    const ok = Object.keys(errors).length === 0;
    return {
        ok,
        errors,
        value: ok ? { title, date, venue, category, shortDescription, longDescription, highlights, tags } : null,
    };
}

/** Portrait grid when at least half of the non-cover photos are clearly portrait. */
export function pickLayout(photoDims = []) {
    if (!photoDims.length) return 'bento';
    const portraits = photoDims.filter((d) => d && d.height > d.width * 1.1).length;
    return portraits * 2 >= photoDims.length ? 'portrait' : 'bento';
}
