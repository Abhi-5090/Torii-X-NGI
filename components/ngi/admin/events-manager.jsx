'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EVENT_LIMITS, EVENT_FORMAT_SUGGESTIONS, validateEvent, normalizeTag, pickLayout } from '../../../lib/event-schema';
import { useAdmin } from './admin-context';
import {
    IconCalendar,
    IconUpload,
    IconTrash,
    IconCheckCircle,
    IconAlert,
    IconEye,
    IconEyeOff,
} from '../dashboard/dashboard-icons';

// Admin → Events: every event on the website's "Moments That Define Us"
// section (the ones built into the site and the ones added here) can be added,
// edited, hidden or deleted. The fields match what visitors see when they click
// "Explore Event".

const L = EVENT_LIMITS;
const MAX_SOURCE_BYTES = 25 * 1024 * 1024; // what a phone camera can produce
const MAX_EDGE = 1600; // new photos are shrunk in the browser before upload

const IconStar = ({ filled }) => (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" />
    </svg>
);
const IconPlus = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
);
const IconX = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
);
const IconPencil = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
);

/** Shrink a photo to MAX_EDGE on its long side as a JPEG, applying the camera's
 *  rotation, so each upload stays small (Vercel caps requests at 4.5MB). */
async function shrinkPhoto(file) {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', 0.86);
    });
    return { blob, width, height, previewUrl: URL.createObjectURL(blob) };
}

const formatDate = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
};

const EMPTY = {
    title: '',
    date: '',
    venue: '',
    category: '',
    shortDescription: '',
    longDescription: [''],
    highlights: [''],
    tags: [],
};

let photoKey = 0;
const releasePreview = (p) => { if (p.blob) URL.revokeObjectURL(p.previewUrl); };

export default function EventsManager() {
    const { unauthorized } = useAdmin();
    const [tab, setTab] = useState('list'); // 'create' | 'list'
    const [editing, setEditing] = useState(null); // the event being edited, or null when adding
    const [form, setForm] = useState(EMPTY);
    const [tagDraft, setTagDraft] = useState('');
    // { key, previewUrl, width?, height?, blob? (new) | src, imageId?, position? (existing) }
    const [photos, setPhotos] = useState([]);
    const [coverKey, setCoverKey] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [progress, setProgress] = useState('');
    const [banner, setBanner] = useState(null); // { type, text }

    const [events, setEvents] = useState([]);
    const [loadingList, setLoadingList] = useState(true);
    const [busyId, setBusyId] = useState(null);

    const fileRef = useRef(null);
    const photosRef = useRef(photos);
    photosRef.current = photos;

    // Revoke new-photo previews when leaving the page.
    useEffect(() => () => photosRef.current.forEach(releasePreview), []);

    const loadEvents = useCallback(async () => {
        setLoadingList(true);
        try {
            const res = await fetch('/api/admin/events', { cache: 'no-store' });
            if (res.status === 401) { unauthorized(); return; }
            const json = await res.json();
            if (json.success) setEvents(json.events || []);
            else setBanner({ type: 'error', text: json.message || 'Could not load events.' });
        } catch {
            setBanner({ type: 'error', text: 'Could not load events. Please check your connection.' });
        }
        setLoadingList(false);
    }, [unauthorized]);

    useEffect(() => { loadEvents(); }, [loadEvents]);

    const setField = (name, value) => {
        setForm((f) => ({ ...f, [name]: value }));
        if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
    };
    const setListItem = (name, i, value) => setField(name, form[name].map((v, j) => (j === i ? value : v)));
    const addListItem = (name, max) => form[name].length < max && setField(name, [...form[name], '']);
    const removeListItem = (name, i) => form[name].length > 1 && setField(name, form[name].filter((_, j) => j !== i));

    // ---- hashtags
    const addTag = (raw) => {
        const tag = normalizeTag(raw);
        if (!tag) return;
        if (form.tags.length >= L.tags.max) {
            setErrors((e) => ({ ...e, tags: `You can add at most ${L.tags.max} hashtags.` }));
            return;
        }
        if (!form.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) setField('tags', [...form.tags, tag.slice(0, L.tag.max)]);
        setTagDraft('');
    };
    const onTagKey = (e) => {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagDraft); }
        if (e.key === 'Backspace' && !tagDraft && form.tags.length) setField('tags', form.tags.slice(0, -1));
    };

    // ---- photos
    const addFiles = async (fileList) => {
        const files = Array.from(fileList || []).filter(Boolean);
        if (!files.length) return;
        const room = L.photos.max - photos.length;
        if (room <= 0) {
            setErrors((e) => ({ ...e, photos: `An event can have at most ${L.photos.max} photos.` }));
            return;
        }
        setProcessing(true);
        const added = [];
        let problem = '';
        for (const file of files.slice(0, room)) {
            if (!/^image\//.test(file.type)) { problem = `"${file.name}" is not an image (use JPG, PNG or WEBP).`; continue; }
            if (file.size > MAX_SOURCE_BYTES) { problem = `"${file.name}" is too large.`; continue; }
            try {
                const shrunk = await shrinkPhoto(file);
                added.push({ key: ++photoKey, name: file.name, ...shrunk });
            } catch {
                problem = `"${file.name}" could not be read. Please use a JPG or PNG.`;
            }
        }
        if (files.length > room) problem = `Only ${L.photos.max} photos are allowed; the extra ones were skipped.`;
        setProcessing(false);
        if (added.length) {
            setPhotos((p) => [...p, ...added]);
            // The first landscape photo makes the best cover; otherwise the first photo.
            if (!coverKey) setCoverKey((added.find((p) => p.width > p.height) || added[0]).key);
        }
        setErrors((e) => ({ ...e, photos: problem || undefined }));
        if (fileRef.current) fileRef.current.value = '';
    };

    // Existing photos report their size once loaded (used to pick the grid layout).
    const onPreviewLoad = (key, img) => {
        setPhotos((list) => list.map((p) => (p.key === key && !p.width ? { ...p, width: img.naturalWidth, height: img.naturalHeight } : p)));
    };

    const removePhoto = (key) => {
        const target = photos.find((p) => p.key === key);
        if (target) releasePreview(target);
        const rest = photos.filter((p) => p.key !== key);
        setPhotos(rest);
        if (coverKey === key) setCoverKey(rest[0]?.key ?? null);
    };

    const resetForm = () => {
        photos.forEach(releasePreview);
        setPhotos([]); setCoverKey(null); setForm(EMPTY); setTagDraft(''); setErrors({});
    };

    const startAdd = () => {
        resetForm(); setEditing(null); setBanner(null); setTab('create');
    };

    const startEdit = (ev) => {
        photos.forEach(releasePreview);
        const items = [ev.cover, ...ev.photos].map((p) => ({
            key: ++photoKey,
            src: p.src,
            imageId: p.imageId,
            position: p.position,
            previewUrl: p.src,
            name: p.src.split('/').pop(),
        }));
        setForm({
            title: ev.title,
            date: ev.date,
            venue: ev.venue,
            category: ev.category,
            shortDescription: ev.shortDescription,
            longDescription: ev.longDescription.length ? ev.longDescription : [''],
            highlights: ev.highlights.length ? ev.highlights : [''],
            tags: ev.tags,
        });
        setPhotos(items);
        setCoverKey(items[0]?.key ?? null);
        setTagDraft(''); setErrors({}); setBanner(null);
        setEditing(ev);
        setTab('create');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => { resetForm(); setEditing(null); setTab('list'); };

    // ---- submit (add or save changes)
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting || processing) return;
        setBanner(null);

        const tags = tagDraft.trim() ? [...form.tags, normalizeTag(tagDraft)] : form.tags;
        const { ok, errors: found, value } = validateEvent({ ...form, tags }, photos.length);
        if (!ok) {
            setErrors(found);
            setBanner({ type: 'error', text: 'Please fix the highlighted fields.' });
            return;
        }

        setSubmitting(true);
        try {
            // Cover first, then the rest in their current order.
            const ordered = [...photos.filter((p) => p.key === coverKey), ...photos.filter((p) => p.key !== coverKey)];
            const newCount = ordered.filter((p) => p.blob).length;
            let uploaded = 0;
            const items = [];
            for (const p of ordered) {
                if (!p.blob) {
                    items.push({ src: p.src, ...(p.imageId ? { imageId: p.imageId } : {}), ...(p.position ? { position: p.position } : {}) });
                    continue;
                }
                uploaded += 1;
                setProgress(`Uploading photo ${uploaded} of ${newCount}…`);
                const fd = new FormData();
                fd.append('image', p.blob, `photo-${uploaded}.jpg`);
                const res = await fetch('/api/admin/events/images', { method: 'POST', body: fd });
                if (res.status === 401) { unauthorized(); return; }
                const json = await res.json().catch(() => null);
                if (!res.ok || !json?.success) throw new Error(json?.message || `Photo ${uploaded} could not be uploaded.`);
                items.push({ imageId: json.id });
            }

            // Portrait grid when most non-cover photos are portraits. If some
            // existing photo has not reported its size yet, keep the current layout.
            const rest = ordered.slice(1);
            const layout = rest.every((p) => p.width)
                ? pickLayout(rest.map((p) => ({ width: p.width, height: p.height })))
                : (editing?.layout || 'bento');

            setProgress(editing ? 'Saving changes…' : 'Publishing the event…');
            const res = await fetch(editing ? `/api/admin/events/${editing.id}` : '/api/admin/events', {
                method: editing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...value, cover: items[0], photos: items.slice(1), layout }),
            });
            if (res.status === 401) { unauthorized(); return; }
            const json = await res.json().catch(() => null);
            if (!res.ok || !json?.success) {
                if (json?.errors) setErrors(json.errors);
                throw new Error(json?.message || 'Could not save the event.');
            }

            setBanner({
                type: 'success',
                text: editing
                    ? `Saved changes to "${value.title}". The website shows them within about a minute.`
                    : `"${value.title}" is published. It appears in the Events section, placed by its date (${formatDate(value.date)}), within about a minute.`,
            });
            resetForm();
            setEditing(null);
            setTab('list');
            loadEvents();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            setBanner({ type: 'error', text: error.message || 'Network error. Please check your connection and try again.' });
        } finally {
            setSubmitting(false);
            setProgress('');
        }
    };

    // ---- list actions
    const runAction = async (ev, action) => {
        if (action === 'delete' && !window.confirm(`Delete "${ev.title}" permanently? It will be removed from the website and cannot be undone.`)) return;
        setBusyId(ev.id);
        try {
            const res = action === 'delete'
                ? await fetch(`/api/admin/events/${ev.id}`, { method: 'DELETE' })
                : await fetch(`/api/admin/events/${ev.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action }),
                });
            if (res.status === 401) { unauthorized(); return; }
            if (!res.ok) setBanner({ type: 'error', text: 'Could not update that event. Please try again.' });
            if (action === 'delete' && editing?.id === ev.id) cancelEdit();
            await loadEvents();
        } finally {
            setBusyId(null);
        }
    };

    const photoCountOk = photos.length >= L.photos.min && photos.length <= L.photos.max;
    const fieldError = (name) => errors[name] && <span className="ann-error">{errors[name]}</span>;
    const liveCount = events.filter((e) => e.published).length;

    return (
        <div className="ann-mgr-panel is-page evm">
            <div className="ann-mgr-head">
                <div className="ann-mgr-head-title">
                    <span className="ann-mgr-head-icon"><IconCalendar /></span>
                    <div>
                        <h3>Events</h3>
                        <p>Every event in the website&apos;s Events section. Add, edit, hide or delete them here; the carousel shows them newest first by date.</p>
                    </div>
                </div>
            </div>

            <div className="ann-mgr-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={tab === 'list'} className={tab === 'list' ? 'is-active' : ''} onClick={() => setTab('list')}>
                    All Events{events.length ? ` (${events.length})` : ''}
                </button>
                <button type="button" role="tab" aria-selected={tab === 'create'} className={tab === 'create' ? 'is-active' : ''} onClick={() => (editing ? setTab('create') : startAdd())}>
                    {editing ? 'Edit Event' : 'Add Event'}
                </button>
            </div>

            <div className="ann-mgr-body">
                {banner && (
                    <div className={`ann-form-banner ${banner.type}`} role="status">
                        {banner.type === 'success' ? <IconCheckCircle /> : <IconAlert />}
                        <span>{banner.text}</span>
                    </div>
                )}

                {tab === 'create' ? (
                    <form className="ann-form evm-form" onSubmit={handleSubmit} noValidate>
                        {editing && (
                            <div className="evm-editing">
                                <IconPencil />
                                <span>Editing <strong>{editing.title}</strong>{editing.source === 'builtin' ? ' (built-in event)' : ''}</span>
                                <button type="button" className="ann-link-btn" onClick={cancelEdit}>Cancel</button>
                            </div>
                        )}

                        <div className="ann-form-grid">
                            {/* ---- Event details */}
                            <div className="ann-field-stack">
                                <h4 className="evm-section-title">Event details</h4>

                                <div className="ann-field">
                                    <label htmlFor="evm-title">Event title <span className="req">*</span></label>
                                    <input id="evm-title" type="text" autoComplete="off" maxLength={L.title.max} placeholder="e.g. Red Hat Academy Day"
                                        value={form.title} onChange={(e) => setField('title', e.target.value)} />
                                    {fieldError('title')}
                                </div>

                                <div className="evm-row">
                                    <div className="ann-field">
                                        <label htmlFor="evm-date">Date <span className="req">*</span></label>
                                        <input id="evm-date" type="date" className="evm-date" value={form.date}
                                            onChange={(e) => setField('date', e.target.value)} />
                                        {fieldError('date')}
                                    </div>
                                    <div className="ann-field">
                                        <label htmlFor="evm-category">Format <span className="req">*</span></label>
                                        <input id="evm-category" type="text" autoComplete="off" list="evm-formats" maxLength={L.category.max} placeholder="e.g. Workshop"
                                            value={form.category} onChange={(e) => setField('category', e.target.value)} />
                                        <datalist id="evm-formats">
                                            {EVENT_FORMAT_SUGGESTIONS.map((f) => <option key={f} value={f} />)}
                                        </datalist>
                                        {fieldError('category')}
                                    </div>
                                </div>

                                <div className="ann-field">
                                    <label htmlFor="evm-venue">Venue <span className="req">*</span></label>
                                    <input id="evm-venue" type="text" autoComplete="off" maxLength={L.venue.max} placeholder="e.g. Seminar Hall, 2nd Floor"
                                        value={form.venue} onChange={(e) => setField('venue', e.target.value)} />
                                    {fieldError('venue')}
                                </div>

                                <div className="ann-field">
                                    <label htmlFor="evm-short">
                                        Short description <span className="req">*</span>
                                        <span className="evm-count">{form.shortDescription.length}/{L.shortDescription.max}</span>
                                    </label>
                                    <textarea id="evm-short" rows={3} maxLength={L.shortDescription.max}
                                        placeholder="One or two sentences shown on the carousel card and at the top of the event."
                                        value={form.shortDescription} onChange={(e) => setField('shortDescription', e.target.value)} />
                                    {fieldError('shortDescription')}
                                </div>
                            </div>

                            {/* ---- Photos */}
                            <div className="ann-field-stack">
                                <h4 className="evm-section-title">
                                    Photos <span className="req">*</span>
                                    <span className={`evm-photo-count ${photoCountOk ? 'is-ok' : ''}`}>{photos.length} / {L.photos.min}–{L.photos.max}</span>
                                </h4>
                                <p className="evm-help">
                                    Add {L.photos.min} to {L.photos.max} photos. Tap the star to choose the <strong>cover</strong>: it is shown on the
                                    carousel card, so a wide (landscape) group or stage photo works best.
                                </p>

                                <div className="evm-photos">
                                    {photos.map((p) => {
                                        const isCover = p.key === coverKey;
                                        const portrait = p.width && p.height > p.width * 1.1;
                                        return (
                                            <div key={p.key} className={`evm-photo ${isCover ? 'is-cover' : ''}`}>
                                                <img src={p.previewUrl} alt={p.name || ''} onLoad={(e) => onPreviewLoad(p.key, e.currentTarget)} />
                                                {isCover && <span className="evm-photo-badge">Cover</span>}
                                                {portrait && !isCover && <span className="evm-photo-badge is-muted">Portrait</span>}
                                                <div className="evm-photo-actions">
                                                    <button type="button" className={`evm-icon-btn ${isCover ? 'is-on' : ''}`} onClick={() => setCoverKey(p.key)}
                                                        aria-label={isCover ? 'This is the cover photo' : 'Use as cover photo'} title={isCover ? 'Cover photo' : 'Use as cover'}>
                                                        <IconStar filled={isCover} />
                                                    </button>
                                                    <button type="button" className="evm-icon-btn is-danger" onClick={() => removePhoto(p.key)} aria-label="Remove photo" title="Remove">
                                                        <IconTrash />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {photos.length < L.photos.max && (
                                        <button
                                            type="button"
                                            className={`evm-photo-add ${dragOver ? 'is-drag' : ''} ${errors.photos ? 'has-error' : ''}`}
                                            onClick={() => fileRef.current?.click()}
                                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                            onDragLeave={() => setDragOver(false)}
                                            onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                                            disabled={processing}
                                        >
                                            <IconUpload />
                                            <strong>{processing ? 'Preparing…' : photos.length ? 'Add more' : 'Add photos'}</strong>
                                            <span>Drop or click · JPG, PNG, WEBP</span>
                                        </button>
                                    )}
                                </div>
                                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
                                {fieldError('photos')}
                            </div>
                        </div>

                        {/* ---- The Story */}
                        <div className="ann-field evm-block">
                            <label>The Story <span className="req">*</span> <span className="ann-optional">({L.storyParagraphs.min}–{L.storyParagraphs.max} short paragraphs)</span></label>
                            {form.longDescription.map((para, i) => (
                                <div key={i} className="evm-list-row">
                                    <textarea rows={3} maxLength={L.storyParagraph.max} placeholder={i === 0 ? 'What was the event about?' : 'What happened next?'}
                                        value={para} onChange={(e) => setListItem('longDescription', i, e.target.value)} />
                                    {form.longDescription.length > 1 && (
                                        <button type="button" className="evm-icon-btn is-danger" onClick={() => removeListItem('longDescription', i)} aria-label={`Remove paragraph ${i + 1}`}><IconX /></button>
                                    )}
                                </div>
                            ))}
                            {form.longDescription.length < L.storyParagraphs.max && (
                                <button type="button" className="evm-add-row" onClick={() => addListItem('longDescription', L.storyParagraphs.max)}><IconPlus /> Add paragraph</button>
                            )}
                            {fieldError('longDescription')}
                        </div>

                        {/* ---- What We Did */}
                        <div className="ann-field evm-block">
                            <label>What We Did <span className="req">*</span> <span className="ann-optional">(points, up to {L.highlights.max})</span></label>
                            {form.highlights.map((point, i) => (
                                <div key={i} className="evm-list-row">
                                    <span className="evm-bullet" aria-hidden="true" />
                                    <input type="text" autoComplete="off" maxLength={L.highlight.max} placeholder="e.g. Hands-on session on Linux and open source"
                                        value={point} onChange={(e) => setListItem('highlights', i, e.target.value)} />
                                    {form.highlights.length > 1 && (
                                        <button type="button" className="evm-icon-btn is-danger" onClick={() => removeListItem('highlights', i)} aria-label={`Remove point ${i + 1}`}><IconX /></button>
                                    )}
                                </div>
                            ))}
                            {form.highlights.length < L.highlights.max && (
                                <button type="button" className="evm-add-row" onClick={() => addListItem('highlights', L.highlights.max)}><IconPlus /> Add point</button>
                            )}
                            {fieldError('highlights')}
                        </div>

                        {/* ---- Hashtags */}
                        <div className="ann-field evm-block">
                            <label htmlFor="evm-tag">Hashtags <span className="ann-optional">(up to {L.tags.max})</span></label>
                            <div className="evm-tags">
                                {form.tags.map((t) => (
                                    <span key={t} className="evm-tag">
                                        #{t}
                                        <button type="button" onClick={() => setField('tags', form.tags.filter((x) => x !== t))} aria-label={`Remove #${t}`}><IconX /></button>
                                    </span>
                                ))}
                                {form.tags.length < L.tags.max && (
                                    <input id="evm-tag" type="text" autoComplete="off" maxLength={L.tag.max + 1} placeholder={form.tags.length ? 'Add another…' : 'Type a hashtag and press Enter'}
                                        value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} onKeyDown={onTagKey} onBlur={() => tagDraft.trim() && addTag(tagDraft)} />
                                )}
                            </div>
                            {fieldError('tags')}
                        </div>

                        <div className="ann-form-footer evm-footer">
                            <span className="ann-form-hint">
                                {progress || (editing ? 'Changes show on the website as soon as they are saved.' : 'The event goes live on the website as soon as it is published.')}
                            </span>
                            {editing && <button type="button" className="dash-btn" onClick={cancelEdit} disabled={submitting}>Cancel</button>}
                            <button type="submit" className="dash-btn dash-btn--primary" disabled={submitting || processing}>
                                {submitting ? (editing ? 'Saving…' : 'Publishing…') : (editing ? 'Save Changes' : 'Publish Event')}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="evm-list">
                        <div className="evm-list-head">
                            <p className="evm-help">
                                {events.length
                                    ? `${events.length} events · ${liveCount} live on the website, newest event date first.`
                                    : 'Every event in the website’s Events section, newest first.'}
                            </p>
                            <button type="button" className="dash-btn dash-btn--primary" onClick={startAdd}><IconPlus /> Add Event</button>
                        </div>
                        {loadingList ? (
                            <div className="ann-history-empty">Loading events…</div>
                        ) : events.length === 0 ? (
                            <div className="ann-history-empty">No events yet. Use &ldquo;Add Event&rdquo; to publish the first one.</div>
                        ) : (
                            events.map((ev) => {
                                const busy = busyId === ev.id;
                                return (
                                    <div key={ev.id} className={`evm-card ${ev.published ? '' : 'is-hidden'} ${editing?.id === ev.id ? 'is-editing' : ''}`}>
                                        <img className="evm-card-cover" src={ev.cover.src} alt="" loading="lazy" style={ev.cover.position ? { objectPosition: ev.cover.position } : undefined} />
                                        <div className="evm-card-info">
                                            <div className="evm-card-top">
                                                <span className="ann-history-tier">{ev.category}</span>
                                                {ev.published
                                                    ? <span className="ann-history-live"><IconCheckCircle /> Live</span>
                                                    : <span className="evm-card-hidden"><IconEyeOff /> Hidden</span>}
                                                <span className={`evm-source ${ev.source === 'builtin' ? 'is-builtin' : ''}`}>{ev.source === 'builtin' ? 'Built-in' : 'Added'}</span>
                                            </div>
                                            <strong className="evm-card-title">{ev.title}</strong>
                                            <span className="evm-card-meta">{formatDate(ev.date)} · {ev.venue} · {1 + ev.photos.length} photos</span>
                                        </div>
                                        <div className="evm-card-actions">
                                            <button type="button" className="dash-btn" disabled={busy} onClick={() => startEdit(ev)}>
                                                <IconPencil /> Edit
                                            </button>
                                            <button type="button" className="dash-btn" disabled={busy} onClick={() => runAction(ev, ev.published ? 'unpublish' : 'publish')}
                                                title={ev.published ? 'Hide from the website' : 'Show on the website'}>
                                                {ev.published ? <><IconEyeOff /> Hide</> : <><IconEye /> Show</>}
                                            </button>
                                            <button type="button" className="dash-btn dash-btn--ghost ann-history-delete" disabled={busy} onClick={() => runAction(ev, 'delete')} aria-label={`Delete ${ev.title}`} title="Delete">
                                                <IconTrash />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
