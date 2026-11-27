'use client';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import builtInEvents from './events-data';

// The events to show, newest first: everything from the database (Admin →
// Events) plus any built-in event (events-data.js) not yet copied into it.
// `builtinIds` are the built-in events the database already owns, so an event
// edited, hidden or deleted in the admin is never overridden by the built-in file.
function mergeEvents(builtIn, fromDb, builtinIds = []) {
    const db = (fromDb || []).filter((e) => e && e.id && e.cover && e.date);
    const owned = new Set([...builtinIds, ...db.map((e) => e.id)]);
    return [...db, ...builtIn.filter((e) => !owned.has(e.id))].sort((a, b) => b.date.localeCompare(a.date));
}

// "Moments That Define Us": the events showcase.
//
// Two views share one section:
//   1. Carousel: every event as a 16:9 card in an endless loop (auto-plays,
//      arrows, dots, swipe and arrow keys).
//   2. Detail: one event with a four-image grid (16:9 cover, two 9:16
//      portraits, 16:9 wide) beside its full story, plus prev/next events.
//
// Opening an event: the chosen card lifts while the others dissolve, then its
// image flies (FLIP animation) into the cover slot at the top of the grid and
// the rest of the detail view settles in around it. "All Events" reverses it.
//
// Smoothness rules followed throughout:
//   - only transform and opacity are animated on large elements (GPU-only);
//   - every image is decoded before it is revealed, so nothing flashes blank;
//   - the flying image is never hidden, so there is no blink at hand-over;
//   - cards that wrap around the loop travel while invisible, never across
//     the stage, and stacking order changes mid-slide, not at the start.

const EASE = [0.22, 1, 0.36, 1];
const FADE = [0.4, 0, 0.2, 1]; // opacity: even, unhurried (no front-loaded "snap")
const EASE_CSS = 'cubic-bezier(0.22, 1, 0.36, 1)';
const AUTOPLAY_MS = 4800;
const SLIDE_S = 0.8;
const DISSOLVE_MS = 440;
const FLIGHT_MS = 860;
const CLOSE_FADE_MS = 320;
const HEADER_OFFSET = 88;
const LIFT_SHADOW = '0 34px 80px rgba(15, 23, 42, 0.30)';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Dates are formatted by hand (not Intl) so server and client render
// identical strings and hydration never mismatches.
function dateParts(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return {
        day: String(d).padStart(2, '0'),
        monthShort: MONTHS[m - 1].slice(0, 3),
        year: y,
        medium: `${d} ${MONTHS[m - 1]} ${y}`,
        weekday: WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()],
    };
}

const pad2 = (n) => String(n).padStart(2, '0');
const wrap = (i, n) => ((i % n) + n) % n;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
// A photo is a path, or { src, position } to choose its crop focus.
const srcOf = (p) => (typeof p === "string" ? p : p?.src);
const posOf = (p) => (typeof p === "string" ? undefined : p?.position);
const imagesOf = (event) => [event.cover, ...event.photos];
const decodePhotos = (photos) => decodeAll(photos.map(srcOf));

// Decode images ahead of time and keep them referenced, so swapping views
// never paints a frame before the picture is ready.
const decodeCache = new Map();
// Sources known to be loaded: these render visible from their very first frame.
const loadedSrcs = new Set();
function decodeImage(src) {
    if (typeof window === 'undefined' || !src) return Promise.resolve();
    if (decodeCache.has(src)) return decodeCache.get(src);
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    const ready = (img.decode ? img.decode() : new Promise((res) => { img.onload = res; img.onerror = res; }))
        .catch(() => {})
        .then(() => { loadedSrcs.add(src); return img; });
    decodeCache.set(src, ready);
    return ready;
}
const decodeAll = (srcs) => Promise.all(srcs.map(decodeImage));

// FLIP: make `el` appear exactly where `from` was (position, size, corner
// radius and shadow), then glide to its own spot. Both are 16:9, so one
// uniform scale keeps the picture undistorted; the radius is counter-scaled
// so corners stay the same visual size the whole way.
function flyFrom(el, from) {
    if (!el || !from || typeof el.animate !== 'function') return;
    const to = el.getBoundingClientRect();
    if (!to.width) return;
    const s = from.rect.width / to.width;
    const dx = from.rect.left - to.left;
    const dy = from.rect.top - to.top;
    const cs = getComputedStyle(el);
    const toRadius = parseFloat(cs.borderTopLeftRadius) || 0;
    el.classList.add('is-flying');
    const anim = el.animate(
        [
            { transform: `translate3d(${dx}px, ${dy}px, 0) scale(${s})`, borderRadius: `${from.radius / s}px`, boxShadow: from.shadow },
            { transform: 'translate3d(0, 0, 0) scale(1)', borderRadius: `${toRadius}px`, boxShadow: cs.boxShadow },
        ],
        { duration: FLIGHT_MS, easing: EASE_CSS }
    );
    const done = () => el.classList.remove('is-flying');
    anim.onfinish = done;
    anim.oncancel = done;
}

function snapshot(el, shadow) {
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { rect: el.getBoundingClientRect(), radius: parseFloat(cs.borderTopLeftRadius) || 0, shadow: shadow || cs.boxShadow };
}

function scrollSectionIntoView(section) {
    if (!section) return false;
    const top = section.getBoundingClientRect().top;
    if (top >= HEADER_OFFSET - 4 && top < window.innerHeight * 0.4) return false;
    window.scrollTo({ top: top + window.scrollY - HEADER_OFFSET, behavior: 'smooth' });
    return true;
}

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */
const Icon = {
    calendar: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16.5" rx="2.5" /><path d="M16 2.5v4M8 2.5v4M3 10h18" /></svg>
    ),
    pin: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
    ),
    check: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
    ),
    arrowLeft: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
    ),
    arrowRight: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
    ),
    back: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
    ),
    expand: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
    ),
    spark: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></svg>
    ),
    close: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
    ),
};

/* ------------------------------------------------------------------ */
/* Carousel view                                                       */
/* ------------------------------------------------------------------ */
const HIDDEN_SLOT = 3;

function cardPose(offset) {
    const d = Math.min(Math.abs(offset), HIDDEN_SLOT);
    const sign = Math.sign(offset) || 1;
    const zIndex = 10 - d;
    if (d === 0) return { x: '0%', scale: 1, opacity: 1, zIndex };
    if (d === 1) return { x: `${sign * 40}%`, scale: 0.8, opacity: 0.62, zIndex };
    if (d === 2) return { x: `${sign * 64}%`, scale: 0.64, opacity: 0.28, zIndex };
    return { x: `${sign * 82}%`, scale: 0.5, opacity: 0, zIndex };
}

function EventsCarousel({ eventsData, active, setActive, phase, arriving, intro, onOpen, activeMediaRef, running, setHovered, reduceMotion }) {
    const n = eventsData.length;
    const opening = phase === 'opening';
    const prevOffsets = useRef({});
    const fillRef = useRef(null);
    const elapsed = useRef(0);

    const goNext = useCallback(() => setActive((i) => wrap(i + 1, n)), [n, setActive]);
    const goPrev = useCallback(() => setActive((i) => wrap(i - 1, n)), [n, setActive]);

    const offsetOf = (i) => {
        let o = i - active;
        if (o > n / 2) o -= n;
        if (o < -n / 2) o += n;
        return o;
    };

    // Autoplay on a single rAF clock that truly pauses and resumes, and drives
    // the active dot's progress bar directly (no re-renders per frame).
    useEffect(() => {
        elapsed.current = 0;
        if (fillRef.current) fillRef.current.style.transform = 'scaleX(0)';
    }, [active]);

    useEffect(() => {
        if (!running || n < 2) return undefined;
        let raf;
        let last = performance.now();
        const tick = (now) => {
            elapsed.current += Math.min(now - last, 64);
            last = now;
            const p = Math.min(1, elapsed.current / AUTOPLAY_MS);
            if (fillRef.current) fillRef.current.style.transform = `scaleX(${p})`;
            if (p >= 1) { setActive((i) => wrap(i + 1, n)); return; }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [running, active, n, setActive]);

    // Remember where every card was, to route loop wrap-arounds off-stage.
    const offsets = eventsData.map((_, i) => offsetOf(i));
    useEffect(() => {
        eventsData.forEach((e, i) => { prevOffsets.current[e.id] = offsets[i]; });
    });

    const onKeyDown = (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
    };

    return (
        <motion.div
            className={`ngi-events-carousel ${opening ? 'is-opening' : ''}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHovered(false); }}
            onKeyDown={onKeyDown}
            role="region"
            aria-roledescription="carousel"
            aria-label="NGI events"
            initial={intro && !reduceMotion ? { opacity: 0, y: 40 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 1, ease: EASE }}
        >
            <motion.div
                className="ngi-events-stage"
                onPanEnd={(_, info) => {
                    if (opening) return;
                    if (info.offset.x < -50 || info.velocity.x < -400) goNext();
                    else if (info.offset.x > 50 || info.velocity.x > 400) goPrev();
                }}
            >
                {eventsData.map((event, i) => {
                    const offset = offsets[i];
                    const isActive = offset === 0;
                    const pose = cardPose(offset);
                    const prev = prevOffsets.current[event.id] ?? offset;
                    const visible = Math.abs(offset) < HIDDEN_SLOT;
                    const wasVisible = Math.abs(prev) < HIDDEN_SLOT;
                    const date = dateParts(event.date);

                    let target;
                    if (opening) {
                        target = isActive
                            ? { ...pose, scale: 1.025 } // the chosen card lifts…
                            : { ...pose, x: `${parseFloat(pose.x) * 1.12}%`, opacity: 0, scale: pose.scale * 0.88 }; // …the rest dissolve outward
                    } else if (!visible) {
                        // Leaving the stage: fade out on the side it was on.
                        target = cardPose((Math.sign(prev) || 1) * HIDDEN_SLOT);
                    } else if (!wasVisible && Math.sign(prev) !== Math.sign(offset)) {
                        // Entering from the hidden slot: start off-stage on its own side.
                        const from = cardPose(Math.sign(offset) * HIDDEN_SLOT);
                        target = { x: [from.x, pose.x], scale: [from.scale, pose.scale], opacity: [0, pose.opacity], zIndex: pose.zIndex };
                    } else {
                        target = pose;
                    }

                    let transition = { duration: SLIDE_S, ease: EASE, opacity: { duration: SLIDE_S * 0.85, ease: FADE } };
                    if (reduceMotion) transition = { duration: 0 };
                    else if (opening) transition = { duration: DISSOLVE_MS / 1000, ease: EASE, opacity: { duration: DISSOLVE_MS / 1000, ease: FADE } };
                    else if (arriving && !isActive) {
                        const delay = 0.38 + Math.abs(offset) * 0.07;
                        transition = { duration: 0.75, ease: EASE, delay, opacity: { duration: 0.6, ease: FADE, delay } };
                    }

                    return (
                        <motion.article
                            key={event.id}
                            className={`ngi-event-card ${isActive ? 'is-active' : ''}`}
                            initial={arriving && !isActive && !reduceMotion ? { ...pose, opacity: 0, scale: pose.scale * 0.88 } : false}
                            animate={target}
                            transition={transition}
                            style={{ pointerEvents: !visible || opening ? 'none' : 'auto' }}
                            aria-hidden={!isActive}
                            aria-roledescription="slide"
                            aria-label={`${i + 1} of ${n}: ${event.title}`}
                            onClick={() => { if (!isActive) setActive(i); }}
                        >
                            <div className="ngi-event-card-media ngi-event-flyer" ref={isActive ? activeMediaRef : undefined}>
                                <FadeInImg src={srcOf(event.cover)} alt={event.title} draggable="false" decoding={Math.abs(offset) <= 1 ? "sync" : "async"} />
                            </div>
                            <motion.div
                                className="ngi-event-card-overlay"
                                initial={arriving && isActive && !reduceMotion ? { opacity: 0 } : false}
                                animate={{ opacity: opening && isActive ? 0 : 1 }}
                                transition={{ duration: opening ? 0.3 : 0.6, ease: FADE, delay: arriving && isActive ? FLIGHT_MS / 1000 - 0.3 : 0 }}
                            >
                                <div className="ngi-event-card-top">
                                    <span className="ngi-event-date-chip">
                                        <strong>{date.day}</strong>
                                        <span>{date.monthShort} {date.year}</span>
                                    </span>
                                    <span className="ngi-event-category-pill">{event.category}</span>
                                </div>
                                <div className="ngi-event-card-body">
                                    <h3>{event.title}</h3>
                                    <p>{event.shortDescription}</p>
                                    <button
                                        type="button"
                                        className="ngi-event-explore-btn"
                                        tabIndex={isActive ? 0 : -1}
                                        onClick={(e) => { e.stopPropagation(); onOpen(); }}
                                    >
                                        Explore Event
                                        <span aria-hidden="true">{Icon.arrowRight}</span>
                                    </button>
                                </div>
                            </motion.div>
                        </motion.article>
                    );
                })}
            </motion.div>

            <motion.div
                className="ngi-events-controls"
                initial={arriving && !reduceMotion ? { opacity: 0, y: 10 } : false}
                animate={{ opacity: opening ? 0 : 1, y: 0 }}
                transition={{ duration: 0.5, ease: FADE, delay: arriving ? 0.55 : 0 }}
            >
                <button type="button" className="ngi-events-arrow" onClick={goPrev} aria-label="Previous event">{Icon.arrowLeft}</button>
                <div className="ngi-events-dots" role="tablist" aria-label="Choose an event">
                    {eventsData.map((event, i) => (
                        <button
                            key={event.id}
                            type="button"
                            role="tab"
                            aria-selected={i === active}
                            aria-label={event.title}
                            className={`ngi-events-dot ${i === active ? 'is-active' : ''}`}
                            onClick={() => setActive(i)}
                        >
                            {i === active && (
                                <span
                                    ref={fillRef}
                                    className={`ngi-events-dot-fill ${reduceMotion ? 'is-static' : ''}`}
                                    style={{ transform: 'scaleX(0)' }}
                                />
                            )}
                        </button>
                    ))}
                </div>
                <span className="ngi-events-counter" aria-live="polite">
                    {pad2(active + 1)} <small>/ {pad2(n)}</small>
                </span>
                <button type="button" className="ngi-events-arrow" onClick={goNext} aria-label="Next event">{Icon.arrowRight}</button>
            </motion.div>
        </motion.div>
    );
}

/* ------------------------------------------------------------------ */
/* Images that fade in                                                 */
/* ------------------------------------------------------------------ */

// An <img> that fades in once it has loaded, instead of popping in. Cached
// images are detected before the first paint, so they show immediately
// (important for the flying cover, which must never blink).
function FadeInImg({ src, alt = "", className = "", ...rest }) {
    const ref = useRef(null);
    // Already-loaded images start visible (no fade, no blink); only genuinely
    // new ones fade in.
    const [loaded, setLoaded] = useState(() => loadedSrcs.has(src));
    const markLoaded = () => { loadedSrcs.add(src); setLoaded(true); };
    // Covers images that finished loading before hydration (no onLoad then).
    useEffect(() => {
        const img = ref.current;
        if (img && img.complete && img.naturalWidth) markLoaded();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);
    return (
        <img
            ref={ref}
            src={src}
            alt={alt}
            className={`ngi-fade-img ${loaded ? 'is-loaded' : ''} ${className}`}
            onLoad={markLoaded}
            onError={markLoaded}
            {...rest}
        />
    );
}

// One photo slot in the detail grid. When the event changes, the new photo
// fades in on top of the old one (which stays fully visible underneath until
// the new one has landed), so the slot is never blank or grey mid-switch.
function CrossfadeImg({ photo, alt, delay, reduceMotion }) {
    const src = srcOf(photo);
    return (
        <span className="ngi-event-tile-media">
            <AnimatePresence initial={false}>
                <motion.img
                    key={src}
                    src={src}
                    alt={alt}
                    decoding="sync"
                    draggable="false"
                    style={{ objectPosition: posOf(photo) }}
                    initial={reduceMotion ? false : { opacity: 0, scale: 1.06 }}
                    animate={{ opacity: 1, scale: 1, zIndex: 2 }}
                    // The outgoing photo drops behind and holds at full opacity until
                    // the incoming one has fully faded in over it, then fades out
                    // unseen underneath. (A real opacity change is needed here:
                    // framer would treat "stay at 1" as already finished and remove
                    // the photo immediately, leaving the tile blank.)
                    exit={{
                        opacity: 0,
                        zIndex: 1,
                        transition: { opacity: { duration: 0.2, delay: delay + 0.8 }, zIndex: { duration: 0 } },
                    }}
                    transition={{
                        opacity: { duration: 0.75, ease: FADE, delay },
                        scale: { duration: 1.25, ease: EASE, delay },
                        zIndex: { duration: 0 },
                    }}
                />
            </AnimatePresence>
        </span>
    );
}

/* ------------------------------------------------------------------ */
/* Detail view                                                         */
/* ------------------------------------------------------------------ */

// Opening via the card flight: everything except the flying cover fades in
// around it (tiles fade and settle, text fades and rises). Heading back, the
// same elements fade away while the cover stays put for the return flight.
function reveal(delay, { closing, reduceMotion }, kind = 'rise') {
    if (reduceMotion) return { initial: false };
    const from = kind === 'tile' ? { opacity: 0, scale: 0.965 } : { opacity: 0, y: 18 };
    const to = kind === 'tile' ? { opacity: 1, scale: 1 } : { opacity: 1, y: 0 };
    const d = 0.34 + delay;
    return {
        initial: from,
        animate: closing ? { ...from, opacity: 0 } : to,
        transition: closing
            ? { duration: CLOSE_FADE_MS / 1000, ease: FADE }
            : { duration: 0.9, ease: EASE, delay: d, opacity: { duration: 0.7, ease: FADE, delay: d } },
    };
}

// Story text swaps with a quick fade-out and a soft fade-up when the event changes.
const storyVariants = {
    enter: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE, opacity: { duration: 0.5, ease: FADE } } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.22, ease: FADE } },
};

// Photos after the cover: [square, stack top, stack bottom, ...extra row].
// The extra row is a cinematic strip for one photo, or a pair for two.
const extraVariant = (count) => (count >= 2 ? 'pair' : count === 1 ? 'strip' : 'none');

function GalleryTile({ photo, index, slot, title, delay, revealDelay, fx, onZoom, gallery }) {
    return (
        <motion.button
            type="button"
            className={`ngi-event-tile is-${slot}`}
            onClick={() => onZoom(gallery, index)}
            aria-label={`View ${title} photo ${index + 1} of ${gallery.length}`}
            {...reveal(revealDelay, fx, 'tile')}
        >
            <CrossfadeImg photo={photo} alt="" delay={delay} reduceMotion={fx.reduceMotion} />
            <span className="ngi-event-tile-zoom">{Icon.expand}</span>
        </motion.button>
    );
}

function EventDetail({ eventsData, index, closing, heroRef, onBack, onPrev, onNext, onJump, onZoom, reduceMotion }) {
    const n = eventsData.length;
    const event = eventsData[index];
    const next = eventsData[wrap(index + 1, n)];
    const date = dateParts(event.date);
    const nextDate = dateParts(next.date);
    const gallery = imagesOf(event);
    const fx = { closing, reduceMotion };
    const [square, stackTop, stackBottom, ...extra] = event.photos;
    const variant = extraVariant(extra.length);
    const extraPhotos = extra.slice(0, 2);
    // Event switches: every photo cross-fades, one slot after another.
    const stagger = (i) => i * 0.08;
    const mountedRef = useRef(false);
    useEffect(() => { mountedRef.current = true; }, []);
    const tileProps = { title: event.title, fx, onZoom, gallery };
    // Portrait events: photos are shown whole in 4:5 tiles, two large and then a
    // row of smaller ones, instead of being cropped into wide tiles.
    const portrait = event.layout === 'portrait';
    const largeCount = event.photos.length >= 4 ? 2 : 0;
    const portraitLarge = event.photos.slice(0, largeCount);
    const portraitSmall = event.photos.slice(largeCount, largeCount + 4);

    return (
        <div className="ngi-event-detail">
            <motion.div className="ngi-event-detail-bar" {...reveal(0, fx)}>
                <button type="button" className="ngi-event-back-btn" onClick={onBack}>
                    {Icon.back}
                    <span>All Events</span>
                </button>
                <div className="ngi-event-detail-nav">
                    <button type="button" className="ngi-events-arrow" onClick={onPrev} aria-label="Previous event">{Icon.arrowLeft}</button>
                    <span className="ngi-events-counter">{pad2(index + 1)} <small>/ {pad2(n)}</small></span>
                    <button type="button" className="ngi-events-arrow" onClick={onNext} aria-label="Next event">{Icon.arrowRight}</button>
                </div>
            </motion.div>

            <div className="ngi-event-detail-layout">
                {/* Photo grid. The tiles stay mounted across events; only their
                    photos change, so switching events is a pure cross-fade. */}
                <div className="ngi-event-gallery">
                    <button
                        type="button"
                        ref={heroRef}
                        className="ngi-event-tile is-cover ngi-event-flyer"
                        onClick={() => onZoom(gallery, 0)}
                        aria-label={`View ${event.title} photo 1 of ${gallery.length}`}
                    >
                        <CrossfadeImg photo={event.cover} alt={event.title} delay={stagger(0)} reduceMotion={reduceMotion} />
                        <span className="ngi-event-tile-zoom">{Icon.expand}</span>
                    </button>

                    {/* Switching between a portrait event and a regular one cross-fades
                        the whole grid; between events of the same kind the tiles stay
                        and only their photos cross-fade. */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={portrait ? 'portrait' : 'bento'}
                            className="ngi-event-gallery-body"
                            initial={mountedRef.current && !reduceMotion ? { opacity: 0 } : false}
                            animate={{ opacity: 1 }}
                            exit={reduceMotion ? undefined : { opacity: 0, transition: { duration: 0.25, ease: FADE } }}
                            transition={{ duration: 0.45, ease: FADE }}
                        >
                            {portrait ? (
                                <div className="ngi-event-portrait-grid">
                                    {portraitLarge.length > 0 && (
                                        <div className="ngi-event-portrait-row cols-2">
                                            {portraitLarge.map((photo, i) => (
                                                <GalleryTile key={`p-large-${i}`} photo={photo} index={1 + i} slot="portrait" delay={stagger(1 + i)} revealDelay={0.08 + i * 0.08} {...tileProps} />
                                            ))}
                                        </div>
                                    )}
                                    {portraitSmall.length > 0 && (
                                        <div className={`ngi-event-portrait-row cols-${portraitSmall.length}`}>
                                            {portraitSmall.map((photo, i) => (
                                                <GalleryTile key={`p-small-${i}`} photo={photo} index={1 + largeCount + i} slot="portrait" delay={stagger(1 + largeCount + i)} revealDelay={0.24 + i * 0.08} {...tileProps} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                            <div className="ngi-event-trio">
                                <GalleryTile photo={square} index={1} slot="square" delay={stagger(1)} revealDelay={0.08} {...tileProps} />
                                <GalleryTile photo={stackTop} index={2} slot="stack" delay={stagger(2)} revealDelay={0.16} {...tileProps} />
                                <GalleryTile photo={stackBottom} index={3} slot="stack" delay={stagger(3)} revealDelay={0.24} {...tileProps} />
                            </div>

                            {/* No initial={false} here: it would also cancel the tiles' first fade-in. */}
                            <AnimatePresence>
                                {variant !== 'none' && (
                                    <motion.div
                                        key={variant}
                                        className={`ngi-event-extra is-${variant}`}
                                        initial={mountedRef.current && !reduceMotion ? { opacity: 0, height: 0 } : false}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                                        transition={{ height: { duration: 0.6, ease: EASE }, opacity: { duration: 0.45, ease: FADE } }}
                                    >
                                        <div className="ngi-event-extra-inner">
                                            {extraPhotos.map((photo, i) => (
                                                <GalleryTile
                                                    key={`extra-${i}`}
                                                    photo={photo}
                                                    index={4 + i}
                                                    slot={variant === 'strip' ? 'strip' : 'half'}
                                                    delay={stagger(4 + i)}
                                                    revealDelay={0.32 + i * 0.08}
                                                    {...tileProps}
                                                />
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                                </>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Story */}
                <motion.div className="ngi-event-info" {...reveal(0.06, fx)}>
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={event.id}
                            variants={reduceMotion ? undefined : storyVariants}
                            initial="enter"
                            animate="show"
                            exit="exit"
                        >
                            <span className="ngi-event-kicker">Inside the Event</span>
                            <h3 className="ngi-event-title">{event.title}</h3>

                            <div className="ngi-event-facts">
                                <div className="ngi-event-fact">
                                    <span className="ngi-event-fact-icon">{Icon.calendar}</span>
                                    <span className="ngi-event-fact-text">
                                        <small>Date</small>
                                        <time dateTime={event.date}>{date.medium}</time>
                                        <em>{date.weekday}</em>
                                    </span>
                                </div>
                                <div className="ngi-event-fact">
                                    <span className="ngi-event-fact-icon">{Icon.pin}</span>
                                    <span className="ngi-event-fact-text">
                                        <small>Venue</small>
                                        <strong>{event.venue}</strong>
                                    </span>
                                </div>
                                <div className="ngi-event-fact">
                                    <span className="ngi-event-fact-icon">{Icon.spark}</span>
                                    <span className="ngi-event-fact-text">
                                        <small>Format</small>
                                        <strong>{event.category}</strong>
                                    </span>
                                </div>
                            </div>

                            <p className="ngi-event-lead">{event.shortDescription}</p>

                            {event.stats?.length > 0 && (
                                <div className="ngi-event-stats">
                                    {event.stats.slice(0, 3).map((stat) => (
                                        <div key={stat.label} className="ngi-event-stat">
                                            <strong>{stat.value}</strong>
                                            <span>{stat.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="ngi-event-block">
                                <h4>The <span>Story</span></h4>
                                {event.longDescription.map((para, i) => <p key={i}>{para}</p>)}
                            </div>

                            {event.highlights?.length > 0 && (
                                <div className="ngi-event-block">
                                    <h4>What We <span>Did</span></h4>
                                    <ul className="ngi-event-highlights">
                                        {event.highlights.map((item) => (
                                            <li key={item}><span className="ngi-event-check">{Icon.check}</span>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {event.tags?.length > 0 && (
                                <div className="ngi-event-tags">
                                    {event.tags.map((tag) => <span key={tag}>#{tag}</span>)}
                                </div>
                            )}

                            {n > 1 && (
                                <button type="button" className="ngi-event-upnext" onClick={() => onJump(wrap(index + 1, n))}>
                                    <span className="ngi-event-upnext-thumb"><FadeInImg src={srcOf(next.cover)} /></span>
                                    <span className="ngi-event-upnext-text">
                                        <small>Up Next</small>
                                        <strong>{next.title}</strong>
                                        <em>{nextDate.day} {nextDate.monthShort} {nextDate.year} · {next.category}</em>
                                    </span>
                                    <span className="ngi-event-upnext-arrow">{Icon.arrowRight}</span>
                                </button>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Lightbox                                                            */
/* ------------------------------------------------------------------ */
function Lightbox({ state, title, onClose, onStep }) {
    useEffect(() => {
        if (!state) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') onStep(1);
            if (e.key === 'ArrowLeft') onStep(-1);
        };
        // Lock page scroll without the layout jump of a disappearing scrollbar.
        const { overflow, paddingRight } = document.body.style;
        const gutter = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        if (gutter > 0) document.body.style.paddingRight = `${gutter}px`;
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = overflow;
            document.body.style.paddingRight = paddingRight;
        };
    }, [state, onClose, onStep]);

    return (
        <AnimatePresence>
            {state && (
                <motion.div
                    className="ngi-event-lightbox"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${title} photos`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    onClick={onClose}
                >
                    <button type="button" className="ngi-event-lightbox-close" onClick={onClose} aria-label="Close">{Icon.close}</button>
                    <div className="ngi-event-lightbox-frame">
                        <AnimatePresence initial={false}>
                            <motion.img
                                key={srcOf(state.images[state.index])}
                                src={srcOf(state.images[state.index])}
                                alt={`${title}, photo ${state.index + 1}`}
                                decoding="sync"
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.02 }}
                                transition={{ duration: 0.4, ease: EASE }}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </AnimatePresence>
                    </div>
                    <div className="ngi-event-lightbox-bar" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="ngi-events-arrow" onClick={() => onStep(-1)} aria-label="Previous photo">{Icon.arrowLeft}</button>
                        <span>{title} · {state.index + 1} / {state.images.length}</span>
                        <button type="button" className="ngi-events-arrow" onClick={() => onStep(1)} aria-label="Next photo">{Icon.arrowRight}</button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */
export default function Events() {
    const [eventsData, setEventsData] = useState(builtInEvents);
    const n = eventsData.length;
    const reduceMotion = useReducedMotion();
    const [view, setView] = useState('carousel');
    const [active, setActive] = useState(0);
    const [selected, setSelected] = useState(0);
    const [phase, setPhase] = useState('idle'); // idle | opening | closing
    const [arriving, setArriving] = useState(false); // carousel re-entering after "All Events"
    const [hovered, setHovered] = useState(false);
    const [inView, setInView] = useState(false);
    const [lightbox, setLightbox] = useState(null);
    const [introDone, setIntroDone] = useState(false); // first-view rise-in has had its turn

    const sectionRef = useRef(null);
    const activeMediaRef = useRef(null);
    const heroRef = useRef(null);
    const flightRef = useRef(null);
    const busy = useRef(false);
    const timers = useRef([]);

    const later = (fn, ms) => { timers.current.push(window.setTimeout(fn, ms)); };
    useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

    // Auto-play only while the section is on screen; warm up the covers the
    // first time it comes close.
    useEffect(() => {
        const el = sectionRef.current;
        if (!el || typeof IntersectionObserver === 'undefined') return undefined;
        const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
        const warm = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) return;
            decodeAll(builtInEvents.map((e) => srcOf(e.cover)));
            warm.disconnect();
        }, { rootMargin: '600px 0px' });
        io.observe(el);
        warm.observe(el);
        return () => { io.disconnect(); warm.disconnect(); };
    }, []);

    // In the detail view, have the neighbours' photos ready before they're asked for.
    useEffect(() => {
        if (view !== 'detail') return;
        [selected, wrap(selected + 1, n), wrap(selected - 1, n)].forEach((i) => decodePhotos(imagesOf(eventsData[i])));
    }, [view, selected, n, eventsData]);

    // Merge in events added from Admin → Events. If the list changes while an
    // event is on screen, keep that same event selected (by id, not position).
    const listRef = useRef(eventsData);
    const activeRef = useRef(active);
    const selectedRef = useRef(selected);
    listRef.current = eventsData;
    activeRef.current = active;
    selectedRef.current = selected;
    useEffect(() => {
        let cancelled = false;
        fetch('/api/events')
            .then((res) => (res.ok ? res.json() : null))
            .then((json) => {
                if (cancelled || !json?.success) return;
                const prev = listRef.current;
                const merged = mergeEvents(builtInEvents, json.events, json.builtinIds);
                const activeId = prev[activeRef.current]?.id;
                const selectedId = prev[selectedRef.current]?.id;
                const ai = merged.findIndex((e) => e.id === activeId);
                const si = merged.findIndex((e) => e.id === selectedId);
                setEventsData(merged);
                setActive(ai >= 0 ? ai : 0);
                setSelected(si >= 0 ? si : 0);
            })
            .catch(() => { /* the built-in events still show */ });
        return () => { cancelled = true; };
    }, []);

    // Run the pending flight once the destination view has laid out.
    useIsoLayoutEffect(() => {
        const from = flightRef.current;
        if (!from) return;
        flightRef.current = null;
        flyFrom(view === 'detail' ? heroRef.current : activeMediaRef.current, from);
    }, [view]);

    const openEvent = useCallback(() => {
        if (busy.current || phase !== 'idle') return;
        const ev = eventsData[active];
        setLightbox(null);
        if (reduceMotion) {
            setSelected(active);
            setView('detail');
            return;
        }
        setIntroDone(true);
        busy.current = true;
        const ready = decodePhotos(imagesOf(ev));
        setPhase('opening');
        later(async () => {
            await Promise.race([ready, wait(400)]);
            flightRef.current = snapshot(activeMediaRef.current, LIFT_SHADOW);
            setSelected(active);
            setArriving(false);
            setView('detail');
            setPhase('idle');
            later(() => { busy.current = false; }, FLIGHT_MS);
        }, DISSOLVE_MS);
    }, [phase, reduceMotion, active, eventsData]);

    const closeDetail = useCallback(() => {
        if (busy.current || phase !== 'idle') return;
        setLightbox(null);
        if (reduceMotion) {
            setActive(selected);
            setView('carousel');
            return;
        }
        busy.current = true;
        const run = () => {
            setPhase('closing');
            later(() => {
                flightRef.current = snapshot(heroRef.current);
                setActive(selected);
                setArriving(true);
                setHovered(false);
                setView('carousel');
                setPhase('idle');
                later(() => { setArriving(false); busy.current = false; }, FLIGHT_MS + 500);
            }, CLOSE_FADE_MS);
        };
        // Bring the section top into view first so the image flies on screen.
        if (scrollSectionIntoView(sectionRef.current)) later(run, 560);
        else run();
    }, [phase, reduceMotion, selected]);

    // Switch events in the detail view. The new photos are decoded first so the
    // cross-fade starts from fully ready images; rapid clicks are coalesced.
    const showEvent = useCallback((target) => {
        if (busy.current) return;
        busy.current = true;
        const i = wrap(target, n);
        scrollSectionIntoView(sectionRef.current);
        Promise.race([decodePhotos(imagesOf(eventsData[i])), wait(350)]).then(() => {
            setSelected(i);
            later(() => { busy.current = false; }, 420);
        });
    }, [n, eventsData]);

    const stepLightbox = useCallback((delta) => {
        setLightbox((s) => (s ? { ...s, index: wrap(s.index + delta, s.images.length) } : s));
    }, []);
    const closeLightbox = useCallback(() => setLightbox(null), []);

    if (!n) return null;

    return (
        <section id="events" className="ngi-events" ref={sectionRef}>
            <span className="ngi-events-glow ngi-events-glow-1" aria-hidden="true" />
            <span className="ngi-events-glow ngi-events-glow-2" aria-hidden="true" />
            <div className="ngi-events-container">
                <motion.div
                    className="ngi-section-title"
                    initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.8, ease: EASE }}
                >
                    <span className="ngi-section-badge">✦ Life at NGI</span>
                    <h2>Moments That <span>Define Us</span></h2>
                    <p>
                        From inaugurations and hackathons to project expos and achievers&apos; celebrations, relive the
                        moments where NGI students learn, build and grow with ToriiMinds.
                    </p>
                </motion.div>

                {view === 'carousel' ? (
                    <EventsCarousel
                        eventsData={eventsData}
                        active={active}
                        setActive={setActive}
                        phase={phase}
                        arriving={arriving}
                        intro={!introDone}
                        onOpen={openEvent}
                        activeMediaRef={activeMediaRef}
                        running={!hovered && inView && !reduceMotion && phase === 'idle' && !arriving}
                        setHovered={setHovered}
                        reduceMotion={reduceMotion}
                    />
                ) : (
                    <EventDetail
                        eventsData={eventsData}
                        index={selected}
                        closing={phase === 'closing'}
                        heroRef={heroRef}
                        onBack={closeDetail}
                        onPrev={() => showEvent(selected - 1)}
                        onNext={() => showEvent(selected + 1)}
                        onJump={(i) => showEvent(i)}
                        onZoom={(images, index) => setLightbox({ images, index })}
                        reduceMotion={reduceMotion}
                    />
                )}
            </div>

            <Lightbox state={lightbox} title={eventsData[selected].title} onClose={closeLightbox} onStep={stepLightbox} />
        </section>
    );
}
