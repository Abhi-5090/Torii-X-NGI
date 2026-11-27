'use client';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import colleges, { INSTITUTION_COUNT } from './colleges-data';

// "One Group · 7 Institutions": the institutions of the Nagarjuna Group orbit
// the NGI logo. Every few seconds the ring turns so the next institution comes
// round to the front, grows and is named below. The tiles travel along the
// ellipse itself (one shared rotation value drives every tile), so the motion
// reads as a real orbit rather than tiles sliding across to new spots.

// Long enough for the name to finish typing and be read before the next turn.
const INTERVAL_MS = 4400;
const TURN_S = 1.25;
const EASE = [0.22, 1, 0.36, 1];
const NGI_LOGO = '/assets/images/ngi/project-images/ngi.png';
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Logos confirmed to load (a missing file shows a numbered badge instead).
const loadedLogos = new Set();
function useLogoReady(src) {
    const [ready, setReady] = useState(() => loadedLogos.has(src));
    useEffect(() => {
        if (!src || loadedLogos.has(src)) { setReady(loadedLogos.has(src)); return undefined; }
        let alive = true;
        const img = new Image();
        img.onload = () => { loadedLogos.add(src); if (alive) setReady(true); };
        img.src = src;
        return () => { alive = false; };
    }, [src]);
    return ready;
}

// Every logo gets the same visual weight: sized by area, capped to the tile.
const LOGO_AREA = 6200; // px² at full tile size
const LOGO_MAX_W = 140;
const LOGO_MAX_H = 62;
function logoSize(ratio = 1) {
    let w = Math.sqrt(LOGO_AREA * ratio);
    let h = w / ratio;
    if (w > LOGO_MAX_W) { w = LOGO_MAX_W; h = w / ratio; }
    if (h > LOGO_MAX_H) { h = LOGO_MAX_H; w = h * ratio; }
    return { w: Math.round(w), h: Math.round(h) };
}

function CollegeLogo({ college, index }) {
    const ready = useLogoReady(college.logo);
    if (!ready) {
        return <span className="ngi-orbit-badge" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>;
    }
    const { w, h } = logoSize(college.ratio);
    return (
        <img
            src={college.logo}
            alt=""
            draggable="false"
            style={{ width: `calc(${w}px * var(--orbit-scale, 1))`, height: `calc(${h}px * var(--orbit-scale, 1))` }}
        />
    );
}

/** Where a tile sits for a given ring rotation (`phase`, in steps). The front
 *  of the orbit is the bottom of the ellipse, closest to the viewer. */
function orbitPose(i, phase, n, geo) {
    const a = ((i - phase) / n) * Math.PI * 2 + Math.PI / 2;
    const depth = (Math.sin(a) + 1) / 2; // 0 = back, 1 = front
    return {
        x: Math.cos(a) * geo.rx,
        y: Math.sin(a) * geo.ry,
        scale: 0.6 + depth * 0.45,
        opacity: 0.38 + depth * 0.62,
        z: Math.round(depth * 100),
    };
}

function OrbitTile({ college, i, n, phase, geoRef, isFront, onPick }) {
    const x = useTransform(phase, (p) => orbitPose(i, p, n, geoRef.current).x);
    const y = useTransform(phase, (p) => orbitPose(i, p, n, geoRef.current).y);
    const scale = useTransform(phase, (p) => orbitPose(i, p, n, geoRef.current).scale);
    const opacity = useTransform(phase, (p) => orbitPose(i, p, n, geoRef.current).opacity);
    const zIndex = useTransform(phase, (p) => orbitPose(i, p, n, geoRef.current).z);
    return (
        <motion.button
            type="button"
            className={`ngi-orbit-tile ${isFront ? 'is-front' : ''}`}
            style={{ x, y, scale, opacity, zIndex }}
            onClick={() => onPick(i)}
            aria-label={`Show ${college.name}`}
            aria-current={isFront ? 'true' : undefined}
            title={college.name}
        >
            <CollegeLogo college={college} index={i} />
        </motion.button>
    );
}

// ---------------------------------------------------------------------------
// Caption: the front institution's name. "Nagarjuna" stays put (it is in
// nearly every name); the rest of the old name erases letter by letter, the
// new one types in letter by letter, and "Nagarjuna" glides sideways as the
// line's width changes so the whole name stays centred. On phones the name
// wraps under "Nagarjuna" instead.
// ---------------------------------------------------------------------------
const PREFIX = 'Nagarjuna';
const ERASE_MS = 14; // per letter
const TYPE_MS = 32; // per letter
const LOC_TYPE_MS = 24; // per letter, for the campus line

function splitName(c) {
    const hasPrefix = c.name.startsWith(`${PREFIX} `);
    const rest = (hasPrefix ? c.name.slice(PREFIX.length) : c.name) + (c.location ? ',' : '');
    return { hasPrefix, rest, location: c.location || '' };
}

function useMedia(query) {
    const [matches, setMatches] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia(query);
        const update = () => setMatches(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, [query]);
    return matches;
}

const keepSpaces = (str, wide) => (wide ? str.replace(/ /g, '\u00A0') : str);

function TypedName({ college, reduceMotion }) {
    const target = splitName(college);
    const wide = useMedia('(min-width: 768px)');
    const [rest, setRest] = useState(target.rest);
    const [loc, setLoc] = useState(target.location);
    const [prefixOn, setPrefixOn] = useState(target.hasPrefix);
    const [typing, setTyping] = useState(false);
    const [cycle, setCycle] = useState(0);
    const [glideS, setGlideS] = useState(1);
    const restRef = useRef(rest);
    const locRef = useRef(loc);
    restRef.current = rest;
    locRef.current = loc;

    // Widths of the target name and of "Nagarjuna", measured in the real font,
    // so the line can glide to its final width in one smooth motion.
    const restMeasure = useRef(null);
    const prefixMeasure = useRef(null);
    const [restW, setRestW] = useState(null);
    const [prefixW, setPrefixW] = useState(null);
    const [fontTick, setFontTick] = useState(0);
    useEffect(() => {
        let alive = true;
        document.fonts?.ready.then(() => { if (alive) setFontTick((t) => t + 1); });
        return () => { alive = false; };
    }, []);
    useIsoLayoutEffect(() => {
        if (restMeasure.current) setRestW(restMeasure.current.getBoundingClientRect().width);
        if (prefixMeasure.current) setPrefixW(prefixMeasure.current.getBoundingClientRect().width);
    }, [target.rest, wide, fontTick]);

    useEffect(() => {
        if (restRef.current === target.rest && locRef.current === target.location) return undefined;
        if (reduceMotion) {
            setRest(target.rest); setLoc(target.location); setPrefixOn(target.hasPrefix);
            return undefined;
        }
        let cancelled = false;
        const timers = [];
        const at = (ms, fn) => timers.push(window.setTimeout(() => { if (!cancelled) fn(); }, ms));
        const oldRest = restRef.current;
        const oldLoc = locRef.current;
        let t = 0;
        setTyping(true);
        for (let i = oldLoc.length - 1; i >= 0; i--) { t += ERASE_MS; const v = oldLoc.slice(0, i); at(t, () => setLoc(v)); }
        for (let i = oldRest.length - 1; i >= 0; i--) { t += ERASE_MS; const v = oldRest.slice(0, i); at(t, () => setRest(v)); }
        const typeStart = t + 140;
        at(t, () => { setPrefixOn(target.hasPrefix); setCycle((c) => c + 1); });
        t = typeStart;
        for (let i = 1; i <= target.rest.length; i++) { t += TYPE_MS; const v = target.rest.slice(0, i); at(t, () => setRest(v)); }
        for (let i = 1; i <= target.location.length; i++) { t += LOC_TYPE_MS; const v = target.location.slice(0, i); at(t, () => setLoc(v)); }
        at(t + 260, () => setTyping(false));
        // "Nagarjuna" glides over the whole erase-and-type stretch.
        setGlideS(Math.max(0.6, (typeStart + target.rest.length * TYPE_MS) / 1000));
        return () => { cancelled = true; timers.forEach(window.clearTimeout); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [college, reduceMotion]);

    const chars = (str, keyBase) => Array.from(keepSpaces(str, wide)).map((ch, i) => (
        <span key={`${keyBase}-${i}`} className="ngi-type-char">{ch}</span>
    ));
    const caret = typing && <span className="ngi-type-caret" aria-hidden="true" />;
    const glide = { duration: reduceMotion ? 0 : glideS, ease: [0.65, 0, 0.35, 1] };

    return (
        <>
            {/* Screen readers get the plain name once, not the typing. */}
            <span className="sr-only">{college.name}{college.location ? `, ${college.location}` : ''}</span>
            <span className="ngi-type-measure" aria-hidden="true">
                <span ref={prefixMeasure}>{PREFIX}</span>
                <span ref={restMeasure}>{keepSpaces(target.rest, true)}</span>
            </span>

            <span className={`ngi-type-line ${wide ? 'is-wide' : 'is-stacked'}`} aria-hidden="true">
                <motion.span
                    className="ngi-type-prefix"
                    initial={false}
                    animate={wide
                        ? { width: prefixOn ? (prefixW ?? 'auto') : 0, opacity: prefixOn ? 1 : 0 }
                        : { opacity: prefixOn ? 1 : 0, height: prefixOn ? 'auto' : 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.55, ease: EASE }}
                >
                    {PREFIX}
                </motion.span>
                <motion.span
                    className="ngi-type-rest"
                    initial={false}
                    animate={wide && restW != null ? { width: restW } : {}}
                    transition={glide}
                >
                    {chars(rest, `r${cycle}`)}
                    {!loc && caret}
                </motion.span>
            </span>
            {(loc || target.location) && (
                <span className="ngi-type-location" aria-hidden="true">
                    {chars(loc, `l${cycle}`)}
                    {loc && caret}
                </span>
            )}
        </>
    );
}

/** "01 / 07": only the number rolls; the new one drops in from the top. */
function RollingCounter({ value, total, reduceMotion }) {
    const pad = (v) => String(v).padStart(2, '0');
    return (
        <small className="ngi-orbit-counter">
            <span className="sr-only">{value} of {total}</span>
            <span className="ngi-orbit-roll" aria-hidden="true">
                <AnimatePresence initial={false}>
                    <motion.span
                        key={value}
                        initial={reduceMotion ? false : { y: '-110%', opacity: 0 }}
                        animate={{ y: '0%', opacity: 1 }}
                        exit={reduceMotion ? undefined : { y: '110%', opacity: 0 }}
                        transition={{ duration: 0.55, ease: EASE }}
                    >
                        {pad(value)}
                    </motion.span>
                </AnimatePresence>
            </span>
            <span aria-hidden="true">&nbsp;/ {pad(total)}</span>
        </small>
    );
}

export default function CollegesStrip() {
    const n = colleges.length;
    const reduceMotion = useReducedMotion();
    const [active, setActive] = useState(0);
    const [paused, setPaused] = useState(false);
    const [inView, setInView] = useState(false);
    const sectionRef = useRef(null);
    const stageRef = useRef(null);
    const phase = useMotionValue(0); // ring rotation in steps (keeps counting up)
    const turning = useRef(null);
    const geoRef = useRef({ rx: 380, ry: 112 });
    const [, setGeoTick] = useState(0);
    // The ring is decorative motion laid out from the browser's measurements, so it
    // is drawn after mount (never server-rendered) and fades in.
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // Preload every logo once.
    useEffect(() => {
        colleges.forEach((c) => {
            if (!c.logo || loadedLogos.has(c.logo)) return;
            const img = new Image();
            img.onload = () => loadedLogos.add(c.logo);
            img.src = c.logo;
        });
    }, []);

    // Size the ellipse to the stage: wide and flat on desktop, rounder on phones.
    useIsoLayoutEffect(() => {
        const el = stageRef.current;
        if (!el) return undefined;
        const fit = () => {
            const w = el.clientWidth;
            const small = w < 576;
            const tileHalfW = small ? 50 : 84;
            const rx = Math.max(110, Math.min(400, w / 2 - tileHalfW - 6));
            // Deep enough that the front tile (scale 1.05) always clears the NGI
            // circle, whatever the screen width; otherwise follow the ratio.
            const core = el.querySelector('.ngi-orbit-core');
            const coreR = core ? core.offsetHeight / 2 : 89;
            const tileHalf = small ? 27 : 43;
            const clear = coreR + tileHalf * 1.05 + 10;
            const ry = Math.max(small ? rx * 0.75 : rx * 0.37, clear);
            geoRef.current = { rx, ry };
            // Re-place every tile with the new geometry, keeping the ring where it is.
            const p = phase.get();
            phase.set(p + 1e-6);
            phase.set(p);
            setGeoTick((t) => t + 1);
        };
        fit();
        if (typeof ResizeObserver === 'undefined') return undefined;
        const ro = new ResizeObserver(fit);
        ro.observe(el);
        return () => ro.disconnect();
    }, [phase]);

    useEffect(() => {
        const el = sectionRef.current;
        if (!el || typeof IntersectionObserver === 'undefined') { setInView(true); return undefined; }
        const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    /** Turn the ring so institution `target` comes to the front (shortest way round). */
    const turnTo = useCallback((target) => {
        const current = phase.get();
        const from = ((Math.round(current) % n) + n) % n;
        let delta = target - from;
        if (delta > n / 2) delta -= n;
        if (delta < -n / 2) delta += n;
        if (!delta) return;
        setActive(target);
        turning.current?.stop();
        const to = Math.round(current) + delta;
        if (reduceMotion) { phase.set(to); return; }
        turning.current = animate(phase, to, { duration: TURN_S * Math.min(1.6, 0.75 + Math.abs(delta) * 0.25), ease: EASE });
    }, [n, phase, reduceMotion]);

    useEffect(() => {
        if (paused || !inView || reduceMotion || n < 2) return undefined;
        const timer = window.setTimeout(() => turnTo((active + 1) % n), INTERVAL_MS);
        return () => window.clearTimeout(timer);
    }, [active, paused, inView, reduceMotion, n, turnTo]);

    useEffect(() => () => turning.current?.stop(), []);

    if (!n) return null;
    const college = colleges[active];

    return (
        <section
            className="ngi-colleges"
            ref={sectionRef}
            aria-label="Institutions of the Nagarjuna Group"
        >
            <div className="ngi-colleges-inner">
                <div className="ngi-colleges-head">
                    <span className="ngi-colleges-pill">✦ One Group · {INSTITUTION_COUNT} Institutions</span>
                    <h2 className="ngi-colleges-title">Nagarjuna Group of Institutions</h2>
                </div>

                <div
                    className="ngi-orbit"
                    ref={stageRef}
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                >
                    {mounted && (
                    <motion.span
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1, transition: { duration: 0.8 } }}
                        className="ngi-orbit-ring"
                        aria-hidden="true"
                        style={{ width: geoRef.current.rx * 2, height: geoRef.current.ry * 2, x: "-50%", y: "-50%" }}
                    />
                    )}
                    <div className="ngi-orbit-core">
                        <span className="ngi-orbit-core-glow" aria-hidden="true" />
                        <img src={NGI_LOGO} alt="Nagarjuna Group of Institutions" draggable="false" />
                    </div>
                    {mounted && colleges.map((c, i) => (
                        <OrbitTile
                            key={c.name}
                            college={c}
                            i={i}
                            n={n}
                            phase={phase}
                            geoRef={geoRef}
                            isFront={i === active}
                            onPick={turnTo}
                        />
                    ))}
                </div>

                <div className="ngi-orbit-caption" aria-live="polite">
                    <div className="ngi-orbit-caption-inner">
                        <RollingCounter value={active + 1} total={n} reduceMotion={reduceMotion} />
                        <strong className="ngi-orbit-name">
                            <TypedName college={college} reduceMotion={reduceMotion} />
                        </strong>
                    </div>
                </div>
            </div>
        </section>
    );
}
