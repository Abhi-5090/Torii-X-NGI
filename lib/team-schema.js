// Shared rules for team members managed in Admin → Team. The admin form and the
// API both validate with these, so the limits can never drift apart. The fields
// mirror what the "Meet the Team" spotlight shows.

export const TEAM_LIMITS = {
    name: { min: 2, max: 60 },
    role: { min: 2, max: 60 },
    tagline: { min: 10, max: 160 },
    highlights: { min: 1, max: 6 },
    highlight: { min: 5, max: 170 },
    tags: { min: 0, max: 6 },
    tag: { min: 2, max: 30 },
    url: { max: 300 },
};

const clean = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v)).replace(/\s+/g, ' ').trim();

function lengthError(label, value, { min, max }) {
    if (!value) return `Please enter the ${label}.`;
    if (value.length < min) return `The ${label} is too short (at least ${min} characters).`;
    if (value.length > max) return `The ${label} is too long (at most ${max} characters).`;
    return null;
}

/** LinkedIn profile URL ("linkedin.com/in/…" also accepted and completed). */
export function normalizeLinkedIn(raw) {
    let v = clean(raw);
    if (!v) return '';
    if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
    return v;
}
const isLinkedIn = (v) => /^https:\/\/([a-z]{2,3}\.)?(www\.)?linkedin\.com\/[^\s]+$/i.test(v);

/** Portfolio: an HTML file uploaded in the admin (/api/team/portfolio/<id>)
 *  or one shipped with the site (/portfolios/name.html). Links to other sites
 *  are not accepted: every portfolio is hosted here. */
export const PORTFOLIO_UPLOAD_PREFIX = '/api/team/portfolio/';
export const PORTFOLIO_MAX_BYTES = 40 * 1024 * 1024;
// Uploaded in parts of this size so each request stays under Vercel's 4.5MB limit.
export const PORTFOLIO_PART_BYTES = 3.5 * 1024 * 1024;
export const portfolioPartCount = (size) => Math.max(1, Math.ceil(size / PORTFOLIO_PART_BYTES));
/** True when the start of a file looks like an HTML page. */
export const looksLikeHtml = (head) => /<!doctype\s+html|<html[\s>]/i.test(String(head).replace(/^\uFEFF/, '').slice(0, 4096));
export const normalizePortfolio = (raw) => clean(raw);
export const isUploadedPortfolio = (v) => /^\/api\/team\/portfolio\/[a-f0-9]{24}$/.test(v);
export const isStaticPortfolio = (v) => /^\/portfolios\/[A-Za-z0-9_\-]+\.html?$/.test(v);
const isPortfolio = (v) => isUploadedPortfolio(v) || isStaticPortfolio(v);

/**
 * Validate and normalise a team member. `hasPhoto` says whether a photo is attached.
 * Returns { ok, value, errors } where errors is keyed by field.
 */
export function validateMember(raw = {}, hasPhoto = false) {
    const L = TEAM_LIMITS;
    const errors = {};

    const name = clean(raw.name);
    const role = clean(raw.role);
    const tagline = clean(raw.tagline);
    const highlights = (Array.isArray(raw.highlights) ? raw.highlights : []).map(clean).filter(Boolean);
    const tags = [...new Set((Array.isArray(raw.tags) ? raw.tags : []).map((t) => clean(t).replace(/^#+/, '')).filter(Boolean))];
    const linkedin = normalizeLinkedIn(raw.linkedin);
    const portfolio = normalizePortfolio(raw.portfolio);

    const nameErr = lengthError('name', name, L.name);
    if (nameErr) errors.name = nameErr;
    const roleErr = lengthError('role', role, L.role);
    if (roleErr) errors.role = roleErr;
    const taglineErr = lengthError('tagline', tagline, L.tagline);
    if (taglineErr) errors.tagline = taglineErr;

    if (highlights.length < L.highlights.min) {
        errors.highlights = 'Please add at least one key highlight.';
    } else if (highlights.length > L.highlights.max) {
        errors.highlights = `Please keep it to at most ${L.highlights.max} key highlights.`;
    } else {
        const bad = highlights.findIndex((h) => h.length < L.highlight.min || h.length > L.highlight.max);
        if (bad >= 0) errors.highlights = `Highlight ${bad + 1} should be ${L.highlight.min}–${L.highlight.max} characters.`;
    }

    if (tags.length > L.tags.max) {
        errors.tags = `Please use at most ${L.tags.max} keywords.`;
    } else {
        const bad = tags.find((t) => t.length < L.tag.min || t.length > L.tag.max);
        if (bad) errors.tags = `"${bad}" should be ${L.tag.min}–${L.tag.max} characters.`;
    }

    if (linkedin && (linkedin.length > L.url.max || !isLinkedIn(linkedin))) {
        errors.linkedin = 'Please paste a LinkedIn profile link (https://www.linkedin.com/in/…).';
    }
    if (portfolio && !isPortfolio(portfolio)) {
        errors.portfolio = 'Please upload the portfolio as an HTML file.';
    }

    if (!hasPhoto) errors.photo = 'Please add a photo.';

    const ok = Object.keys(errors).length === 0;
    return { ok, errors, value: ok ? { name, role, tagline, highlights, tags, linkedin, portfolio } : null };
}
