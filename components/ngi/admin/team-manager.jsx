'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    TEAM_LIMITS,
    validateMember,
    PORTFOLIO_MAX_BYTES,
    PORTFOLIO_PART_BYTES,
    looksLikeHtml,
} from '../../../lib/team-schema';
import { useAdmin } from './admin-context';
import {
    IconUsers,
    IconUpload,
    IconTrash,
    IconCheckCircle,
    IconAlert,
    IconEye,
    IconEyeOff,
} from '../dashboard/dashboard-icons';

// Admin → Team: every member of the website's "Meet the Team" section (the ones
// built into the site and the ones added here) can be added, edited, reordered,
// hidden or removed. The fields match what the team spotlight shows.

const L = TEAM_LIMITS;
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const MAX_EDGE = 1400; // photos are shrunk in the browser before upload

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
const IconArrowUp = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
);
const IconArrowDown = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
);

/** Shrink a photo to MAX_EDGE on its long side, keeping transparency (WebP;
 *  browsers without WebP encoding fall back to PNG), applying the camera's
 *  rotation, so the upload stays under Vercel's 4.5MB request limit. */
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
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/webp', 0.92);
    });
    return { blob, previewUrl: URL.createObjectURL(blob) };
}

const formatSize = (bytes) => (bytes == null ? '' : bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

const IconFile = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M10 13l-2 2 2 2M14 13l2 2-2 2" />
    </svg>
);

const EMPTY = { name: '', role: '', tagline: '', linkedin: '', portfolio: '', highlights: [''], tags: [] };

export default function TeamManager() {
    const { unauthorized } = useAdmin();
    const [tab, setTab] = useState('list'); // 'list' | 'form'
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [tagDraft, setTagDraft] = useState('');
    // { previewUrl, blob? (new) | src, imageId? (existing) }
    const [photo, setPhoto] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [progress, setProgress] = useState('');
    const [banner, setBanner] = useState(null);

    const [members, setMembers] = useState([]);
    const [loadingList, setLoadingList] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [savingOrder, setSavingOrder] = useState(false);

    // Portfolio HTML file: { name, size, file? } — `file` is set for a newly chosen one;
    // otherwise it describes the member's current portfolio (form.portfolio).
    const [portfolioFile, setPortfolioFile] = useState(null);
    const portfolioRef = useRef(null);
    const fileRef = useRef(null);
    const photoRef = useRef(photo);
    photoRef.current = photo;
    useEffect(() => () => { if (photoRef.current?.blob) URL.revokeObjectURL(photoRef.current.previewUrl); }, []);

    const loadMembers = useCallback(async () => {
        setLoadingList(true);
        try {
            const res = await fetch('/api/admin/team', { cache: 'no-store' });
            if (res.status === 401) { unauthorized(); return; }
            const json = await res.json();
            if (json.success) setMembers(json.members || []);
            else setBanner({ type: 'error', text: json.message || 'Could not load the team.' });
        } catch {
            setBanner({ type: 'error', text: 'Could not load the team. Please check your connection.' });
        }
        setLoadingList(false);
    }, [unauthorized]);

    useEffect(() => { loadMembers(); }, [loadMembers]);

    const setField = (name, value) => {
        setForm((f) => ({ ...f, [name]: value }));
        if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
        setBanner((b) => (b?.type === 'error' ? null : b));
    };
    const setPoint = (i, value) => setField('highlights', form.highlights.map((v, j) => (j === i ? value : v)));
    const addPoint = () => form.highlights.length < L.highlights.max && setField('highlights', [...form.highlights, '']);
    const removePoint = (i) => form.highlights.length > 1 && setField('highlights', form.highlights.filter((_, j) => j !== i));

    const addTag = (raw) => {
        const tag = String(raw || '').replace(/^#+/, '').replace(/\s+/g, ' ').trim();
        if (!tag) return;
        if (form.tags.length >= L.tags.max) {
            setErrors((e) => ({ ...e, tags: `You can add at most ${L.tags.max} keywords.` }));
            return;
        }
        if (!form.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) setField('tags', [...form.tags, tag.slice(0, L.tag.max)]);
        setTagDraft('');
    };
    const onTagKey = (e) => {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagDraft); }
        if (e.key === 'Backspace' && !tagDraft && form.tags.length) setField('tags', form.tags.slice(0, -1));
    };

    const pickPhoto = async (file) => {
        if (!file) return;
        if (!/^image\//.test(file.type)) { setErrors((e) => ({ ...e, photo: 'Please choose an image (PNG, JPG or WEBP).' })); return; }
        if (file.size > MAX_SOURCE_BYTES) { setErrors((e) => ({ ...e, photo: 'That photo is too large.' })); return; }
        setProcessing(true);
        try {
            const shrunk = await shrinkPhoto(file);
            if (photo?.blob) URL.revokeObjectURL(photo.previewUrl);
            setPhoto(shrunk);
            setErrors((e) => ({ ...e, photo: undefined }));
        } catch {
            setErrors((e) => ({ ...e, photo: 'That photo could not be read. Please use a PNG or JPG.' }));
        }
        setProcessing(false);
        if (fileRef.current) fileRef.current.value = '';
    };

    const pickPortfolio = async (file) => {
        if (portfolioRef.current) portfolioRef.current.value = '';
        if (!file) return;
        const fail = (msg) => setErrors((e) => ({ ...e, portfolio: msg }));
        if (!/\.html?$/i.test(file.name)) return fail('Please choose the portfolio as an .html file.');
        if (file.size > PORTFOLIO_MAX_BYTES) return fail(`That file is too large (max ${PORTFOLIO_MAX_BYTES / 1024 / 1024} MB).`);
        if (!file.size) return fail('That file is empty.');
        if (!looksLikeHtml(await file.slice(0, 4096).text())) return fail('That file does not look like an HTML page.');
        setPortfolioFile({ name: file.name, size: file.size, file });
        setErrors((e) => ({ ...e, portfolio: undefined }));
        setBanner((b) => (b?.type === 'error' ? null : b));
    };
    const removePortfolio = () => { setPortfolioFile(null); setField('portfolio', ''); };

    /** Upload the chosen portfolio in parts; returns its site path. */
    const uploadPortfolio = async (file) => {
        setProgress('Uploading portfolio…');
        let res = await fetch('/api/admin/team/portfolio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: file.name, size: file.size }),
        });
        if (res.status === 401) { unauthorized(); return null; }
        let json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) throw new Error(json?.message || 'The portfolio could not be uploaded.');
        const { id, parts } = json;
        for (let n = 0; n < parts; n += 1) {
            if (parts > 1) setProgress(`Uploading portfolio… ${Math.round((n / parts) * 100)}%`);
            const body = file.slice(n * PORTFOLIO_PART_BYTES, (n + 1) * PORTFOLIO_PART_BYTES);
            res = await fetch(`/api/admin/team/portfolio/${id}?part=${n}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/octet-stream' },
                body,
            });
            if (res.status === 401) { unauthorized(); return null; }
            json = await res.json().catch(() => null);
            if (!res.ok || !json?.success) throw new Error(json?.message || 'The portfolio could not be uploaded.');
        }
        return `/api/team/portfolio/${id}`;
    };

    const resetForm = () => {
        if (photo?.blob) URL.revokeObjectURL(photo.previewUrl);
        setPhoto(null); setForm(EMPTY); setPortfolioFile(null); setTagDraft(''); setErrors({});
    };
    const startAdd = () => { resetForm(); setEditing(null); setBanner(null); setTab('form'); };
    const startEdit = (m) => {
        if (photo?.blob) URL.revokeObjectURL(photo.previewUrl);
        setForm({
            name: m.name, role: m.role, tagline: m.tagline, linkedin: m.linkedin, portfolio: m.portfolio,
            highlights: m.highlights.length ? m.highlights : [''], tags: m.tags,
        });
        setPhoto({ src: m.photo.src, imageId: m.photo.imageId, previewUrl: m.photo.src });
        setPortfolioFile(m.portfolioFile ? { ...m.portfolioFile } : null);
        setTagDraft(''); setErrors({}); setBanner(null);
        setEditing(m); setTab('form');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const cancelEdit = () => { resetForm(); setEditing(null); setTab('list'); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting || processing) return;
        setBanner(null);
        const tags = tagDraft.trim() ? [...form.tags, tagDraft.trim()] : form.tags;
        const newPortfolio = portfolioFile?.file || null;
        const { ok, errors: found, value } = validateMember(
            { ...form, tags, portfolio: newPortfolio ? '' : form.portfolio },
            Boolean(photo)
        );
        if (!ok) {
            setErrors(found);
            setBanner({ type: 'error', text: 'Please fix the highlighted fields.' });
            return;
        }

        setSubmitting(true);
        try {
            let photoRefBody;
            if (photo.blob) {
                setProgress('Uploading photo…');
                const fd = new FormData();
                fd.append('image', photo.blob, 'photo.webp');
                const res = await fetch('/api/admin/team/photo', { method: 'POST', body: fd });
                if (res.status === 401) { unauthorized(); return; }
                const json = await res.json().catch(() => null);
                if (!res.ok || !json?.success) throw new Error(json?.message || 'The photo could not be uploaded.');
                photoRefBody = { imageId: json.id };
            } else {
                photoRefBody = { src: photo.src, ...(photo.imageId ? { imageId: photo.imageId } : {}) };
            }

            if (newPortfolio) {
                const path = await uploadPortfolio(newPortfolio);
                if (!path) return;
                value.portfolio = path;
            }

            setProgress(editing ? 'Saving changes…' : 'Adding member…');
            const res = await fetch(editing ? `/api/admin/team/${editing.id}` : '/api/admin/team', {
                method: editing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...value, photo: photoRefBody }),
            });
            if (res.status === 401) { unauthorized(); return; }
            const json = await res.json().catch(() => null);
            if (!res.ok || !json?.success) {
                if (json?.errors) setErrors(json.errors);
                throw new Error(json?.message || 'Could not save the member.');
            }
            setBanner({
                type: 'success',
                text: editing
                    ? `Saved changes to ${value.name}. The website shows them within about a minute.`
                    : `${value.name} has been added at the end of the team. Use the arrows to move them into place.`,
            });
            resetForm(); setEditing(null); setTab('list');
            loadMembers();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            setBanner({ type: 'error', text: error.message || 'Network error. Please check your connection and try again.' });
        } finally {
            setSubmitting(false);
            setProgress('');
        }
    };

    const runAction = async (m, action) => {
        if (action === 'delete' && !window.confirm(`Remove ${m.name} from the team permanently? They will disappear from the website and this cannot be undone.`)) return;
        setBusyId(m.id);
        try {
            const res = action === 'delete'
                ? await fetch(`/api/admin/team/${m.id}`, { method: 'DELETE' })
                : await fetch(`/api/admin/team/${m.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action }),
                });
            if (res.status === 401) { unauthorized(); return; }
            if (!res.ok) setBanner({ type: 'error', text: 'Could not update that member. Please try again.' });
            if (action === 'delete' && editing?.id === m.id) cancelEdit();
            await loadMembers();
        } finally {
            setBusyId(null);
        }
    };

    // Move a member one place up or down; the new order is saved straight away.
    const move = async (index, delta) => {
        const to = index + delta;
        if (to < 0 || to >= members.length || savingOrder) return;
        const next = [...members];
        [next[index], next[to]] = [next[to], next[index]];
        setMembers(next);
        setSavingOrder(true);
        try {
            const res = await fetch('/api/admin/team/order', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: next.map((m) => m.id) }),
            });
            if (res.status === 401) { unauthorized(); return; }
            if (!res.ok) {
                const json = await res.json().catch(() => null);
                setBanner({ type: 'error', text: json?.message || 'Could not save the new order.' });
                await loadMembers();
            }
        } catch {
            setBanner({ type: 'error', text: 'Could not save the new order. Please check your connection.' });
            await loadMembers();
        } finally {
            setSavingOrder(false);
        }
    };

    const fieldError = (name) => errors[name] && <span className="ann-error">{errors[name]}</span>;
    const liveCount = members.filter((m) => m.published).length;

    return (
        <div className="ann-mgr-panel is-page evm tm">
            <div className="ann-mgr-head">
                <div className="ann-mgr-head-title">
                    <span className="ann-mgr-head-icon"><IconUsers /></span>
                    <div>
                        <h3>Team</h3>
                        <p>Everyone in the website&apos;s Meet the Team section. Add, edit, reorder, hide or remove members here; the site follows this order.</p>
                    </div>
                </div>
            </div>

            <div className="ann-mgr-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={tab === 'list'} className={tab === 'list' ? 'is-active' : ''} onClick={() => setTab('list')}>
                    All Members{members.length ? ` (${members.length})` : ''}
                </button>
                <button type="button" role="tab" aria-selected={tab === 'form'} className={tab === 'form' ? 'is-active' : ''} onClick={() => (editing ? setTab('form') : startAdd())}>
                    {editing ? 'Edit Member' : 'Add Member'}
                </button>
            </div>

            <div className="ann-mgr-body">
                {banner && (
                    <div className={`ann-form-banner ${banner.type}`} role="status">
                        {banner.type === 'success' ? <IconCheckCircle /> : <IconAlert />}
                        <span>{banner.text}</span>
                    </div>
                )}

                {tab === 'form' ? (
                    <form className="ann-form evm-form" onSubmit={handleSubmit} noValidate>
                        {editing && (
                            <div className="evm-editing">
                                <IconPencil />
                                <span>Editing <strong>{editing.name}</strong></span>
                                <button type="button" className="ann-link-btn" onClick={cancelEdit}>Cancel</button>
                            </div>
                        )}

                        <div className="tm-form-grid">
                            {/* ---- Photo */}
                            <div className="ann-field-stack">
                                <h4 className="evm-section-title">Photo <span className="req">*</span></h4>
                                <button
                                    type="button"
                                    className={`tm-photo ${photo ? 'has-photo' : ''} ${dragOver ? 'is-drag' : ''} ${errors.photo ? 'has-error' : ''}`}
                                    onClick={() => fileRef.current?.click()}
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={(e) => { e.preventDefault(); setDragOver(false); pickPhoto(e.dataTransfer.files?.[0]); }}
                                    disabled={processing}
                                    aria-label={photo ? 'Replace photo' : 'Add photo'}
                                >
                                    {photo ? (
                                        <>
                                            <img src={photo.previewUrl} alt="" />
                                            <span className="tm-photo-replace"><IconUpload /> Replace</span>
                                        </>
                                    ) : (
                                        <span className="tm-photo-empty">
                                            <IconUpload />
                                            <strong>{processing ? 'Preparing…' : 'Add photo'}</strong>
                                            <span>Drop or click</span>
                                        </span>
                                    )}
                                </button>
                                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
                                <p className="evm-help tm-photo-help">
                                    Best: a <strong>full-body photo with a transparent background</strong> (PNG), like the current team photos.
                                    It is framed automatically to match everyone else.
                                </p>
                                {fieldError('photo')}
                            </div>

                            {/* ---- Details */}
                            <div className="ann-field-stack">
                                <h4 className="evm-section-title">Details</h4>
                                <div className="evm-row">
                                    <div className="ann-field">
                                        <label htmlFor="tm-name">Name <span className="req">*</span></label>
                                        <input id="tm-name" type="text" autoComplete="off" maxLength={L.name.max} placeholder="e.g. Sudhir R"
                                            value={form.name} onChange={(e) => setField('name', e.target.value)} />
                                        {fieldError('name')}
                                    </div>
                                    <div className="ann-field">
                                        <label htmlFor="tm-role">Role <span className="req">*</span></label>
                                        <input id="tm-role" type="text" autoComplete="off" maxLength={L.role.max} placeholder="e.g. Full Stack Trainer"
                                            value={form.role} onChange={(e) => setField('role', e.target.value)} />
                                        {fieldError('role')}
                                    </div>
                                </div>

                                <div className="ann-field">
                                    <label htmlFor="tm-tagline">
                                        Tagline <span className="req">*</span>
                                        <span className="evm-count">{form.tagline.length}/{L.tagline.max}</span>
                                    </label>
                                    <textarea id="tm-tagline" rows={2} maxLength={L.tagline.max} placeholder="One line about them, shown under their name."
                                        value={form.tagline} onChange={(e) => setField('tagline', e.target.value)} />
                                    {fieldError('tagline')}
                                </div>

                                <div className="evm-row">
                                    <div className="ann-field">
                                        <label htmlFor="tm-linkedin">LinkedIn <span className="ann-optional">(optional)</span></label>
                                        <input id="tm-linkedin" type="text" autoComplete="off" maxLength={L.url.max} placeholder="https://www.linkedin.com/in/…"
                                            value={form.linkedin} onChange={(e) => setField('linkedin', e.target.value)} />
                                        {fieldError('linkedin')}
                                    </div>
                                </div>

                                <div className="ann-field">
                                    <label htmlFor="tm-portfolio-btn">Portfolio <span className="ann-optional">(optional · HTML file)</span></label>
                                    {portfolioFile ? (
                                        <div className={`tm-portfolio ${errors.portfolio ? 'has-error' : ''}`}>
                                            <span className="tm-portfolio-icon"><IconFile /></span>
                                            <span className="tm-portfolio-info">
                                                <strong title={portfolioFile.name}>{portfolioFile.name}</strong>
                                                <span>
                                                    {[formatSize(portfolioFile.size), portfolioFile.file ? 'Ready to upload when you save' : 'Current portfolio'].filter(Boolean).join(' · ')}
                                                </span>
                                            </span>
                                            <span className="tm-portfolio-actions">
                                                {!portfolioFile.file && form.portfolio && (
                                                    <a className="ann-link-btn" href={form.portfolio} target="_blank" rel="noopener noreferrer">View</a>
                                                )}
                                                <button type="button" id="tm-portfolio-btn" className="ann-link-btn" onClick={() => portfolioRef.current?.click()}>Replace</button>
                                                <button type="button" className="evm-icon-btn is-danger" onClick={removePortfolio} aria-label="Remove portfolio" title="Remove portfolio"><IconX /></button>
                                            </span>
                                        </div>
                                    ) : (
                                        <button type="button" id="tm-portfolio-btn" className={`tm-portfolio tm-portfolio--empty ${errors.portfolio ? 'has-error' : ''}`} onClick={() => portfolioRef.current?.click()}>
                                            <span className="tm-portfolio-icon"><IconUpload /></span>
                                            <span className="tm-portfolio-info">
                                                <strong>Upload portfolio (.html)</strong>
                                                <span>The member&apos;s portfolio page as one HTML file, up to {PORTFOLIO_MAX_BYTES / 1024 / 1024} MB</span>
                                            </span>
                                        </button>
                                    )}
                                    <input ref={portfolioRef} type="file" accept=".html,.htm,text/html" hidden onChange={(e) => pickPortfolio(e.target.files?.[0])} />
                                    {fieldError('portfolio')}
                                </div>
                                <p className="evm-help">The portfolio opens on this website. Without a LinkedIn link or portfolio, the website shows a polite &ldquo;coming soon&rdquo; on that button.</p>
                            </div>
                        </div>

                        {/* ---- Key highlights */}
                        <div className="ann-field evm-block">
                            <label>Key Highlights <span className="req">*</span> <span className="ann-optional">(points, up to {L.highlights.max})</span></label>
                            {form.highlights.map((point, i) => (
                                <div key={i} className="evm-list-row">
                                    <span className="evm-bullet" aria-hidden="true" />
                                    <input type="text" autoComplete="off" maxLength={L.highlight.max} placeholder="e.g. 8+ years training engineers in Java and DSA"
                                        value={point} onChange={(e) => setPoint(i, e.target.value)} />
                                    {form.highlights.length > 1 && (
                                        <button type="button" className="evm-icon-btn is-danger" onClick={() => removePoint(i)} aria-label={`Remove highlight ${i + 1}`}><IconX /></button>
                                    )}
                                </div>
                            ))}
                            {form.highlights.length < L.highlights.max && (
                                <button type="button" className="evm-add-row" onClick={addPoint}><IconPlus /> Add highlight</button>
                            )}
                            {fieldError('highlights')}
                        </div>

                        {/* ---- Keywords */}
                        <div className="ann-field evm-block">
                            <label htmlFor="tm-tag">Keywords <span className="ann-optional">(skills shown as tags, up to {L.tags.max})</span></label>
                            <div className="evm-tags">
                                {form.tags.map((t) => (
                                    <span key={t} className="evm-tag">
                                        {t}
                                        <button type="button" onClick={() => setField('tags', form.tags.filter((x) => x !== t))} aria-label={`Remove ${t}`}><IconX /></button>
                                    </span>
                                ))}
                                {form.tags.length < L.tags.max && (
                                    <input id="tm-tag" type="text" autoComplete="off" maxLength={L.tag.max} placeholder={form.tags.length ? 'Add another…' : 'Type a keyword and press Enter'}
                                        value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} onKeyDown={onTagKey} onBlur={() => tagDraft.trim() && addTag(tagDraft)} />
                                )}
                            </div>
                            {fieldError('tags')}
                        </div>

                        <div className="ann-form-footer evm-footer">
                            <span className="ann-form-hint">{progress || (editing ? 'Changes show on the website as soon as they are saved.' : 'New members are added at the end of the team.')}</span>
                            {editing && <button type="button" className="dash-btn" onClick={cancelEdit} disabled={submitting}>Cancel</button>}
                            <button type="submit" className="dash-btn dash-btn--primary" disabled={submitting || processing}>
                                {submitting ? (editing ? 'Saving…' : 'Adding…') : (editing ? 'Save Changes' : 'Add Member')}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="evm-list">
                        <div className="evm-list-head">
                            <p className="evm-help">
                                {members.length
                                    ? `${members.length} members · ${liveCount} shown on the website, in this order. Use the arrows to reorder.`
                                    : 'Everyone in the website’s Meet the Team section, in order.'}
                            </p>
                            <button type="button" className="dash-btn dash-btn--primary" onClick={startAdd}><IconPlus /> Add Member</button>
                        </div>
                        {loadingList ? (
                            <div className="ann-history-empty">Loading the team…</div>
                        ) : members.length === 0 ? (
                            <div className="ann-history-empty">No team members yet. Use &ldquo;Add Member&rdquo; to add the first one.</div>
                        ) : (
                            members.map((m, i) => {
                                const busy = busyId === m.id;
                                return (
                                    <div key={m.id} className={`evm-card tm-card ${m.published ? '' : 'is-hidden'} ${editing?.id === m.id ? 'is-editing' : ''}`}>
                                        <div className="tm-order">
                                            <button type="button" className="evm-icon-btn" disabled={i === 0 || savingOrder} onClick={() => move(i, -1)} aria-label={`Move ${m.name} up`} title="Move up"><IconArrowUp /></button>
                                            <span className="tm-order-num">{String(i + 1).padStart(2, '0')}</span>
                                            <button type="button" className="evm-icon-btn" disabled={i === members.length - 1 || savingOrder} onClick={() => move(i, 1)} aria-label={`Move ${m.name} down`} title="Move down"><IconArrowDown /></button>
                                        </div>
                                        <span className="tm-card-photo"><img src={m.photo.src} alt="" loading="lazy" /></span>
                                        <div className="evm-card-info">
                                            <div className="evm-card-top">
                                                <span className="ann-history-tier">{m.role}</span>
                                                {m.published
                                                    ? <span className="ann-history-live"><IconCheckCircle /> Live</span>
                                                    : <span className="evm-card-hidden"><IconEyeOff /> Hidden</span>}
                                                <span className={`evm-source ${m.source === 'builtin' ? 'is-builtin' : ''}`}>{m.source === 'builtin' ? 'Built-in' : 'Added'}</span>
                                            </div>
                                            <strong className="evm-card-title">{m.name}</strong>
                                            <span className="evm-card-meta">{m.tagline}</span>
                                        </div>
                                        <div className="evm-card-actions">
                                            <button type="button" className="dash-btn" disabled={busy} onClick={() => startEdit(m)}><IconPencil /> Edit</button>
                                            <button type="button" className="dash-btn" disabled={busy} onClick={() => runAction(m, m.published ? 'unpublish' : 'publish')}
                                                title={m.published ? 'Hide from the website' : 'Show on the website'}>
                                                {m.published ? <><IconEyeOff /> Hide</> : <><IconEye /> Show</>}
                                            </button>
                                            <button type="button" className="dash-btn dash-btn--ghost ann-history-delete" disabled={busy} onClick={() => runAction(m, 'delete')} aria-label={`Remove ${m.name}`} title="Remove">
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
