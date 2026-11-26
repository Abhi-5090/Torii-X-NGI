# NGI Collaboration — ToriiMinds Landing Page

## Overview

This is the official collaboration project between **ToriiMinds** and **Nagarjuna Group of Institutions (NGI)**. The landing page promotes ToriiMinds programs to NGI students and serves as the entry point before navigating to the LMS portal.

**Live Route:** `/` (e.g., `http://localhost:3002`)

---

## Where the Code Lives

This is an independent Next.js project. It has no imports from the main Torii frontend or backend.

### Components
| File | Purpose |
|---|---|
| `components/ngi/index.jsx` | Main page orchestrator |
| `components/ngi/ngi-header.jsx` | Sticky header with nav, WhatsApp & Login buttons |
| `components/ngi/who-we-are.jsx` | Hero / About ToriiMinds section |
| `components/ngi/programs.jsx` | Programs grid (Ignite, SkillUp, AI Ready, Owl Coder) |
| `components/ngi/certifications.jsx` | Certification logos grid |
| `components/ngi/team.jsx` | Team profile cards + detail modal |
| `components/ngi/team-data.js` | Team member data (names, photos, bios) |

### Route
| File | Purpose |
|---|---|
| `app/page.jsx` | Next.js home page → `/` |

### Styles (Global Color System)
| File | Purpose |
|---|---|
| `public/assets/scss/ngi/_ngi-theme.scss` | All color tokens (80+ CSS variables) |
| `public/assets/scss/ngi/_ngi-sections.scss` | Section-specific styles |

## Landing Page Sections

1. **Header** — Sticky navbar with smooth-scroll links, WhatsApp Community button, Login/Sign Up button
2. **Who We Are** — About ToriiMinds, mission, value proposition
3. **Programs We Offer** — Ignite Coder (1st yr), SkillUp Coder (2nd yr), AI Ready Engineers (3rd yr), Owl Coder (expert)
4. **Certifications** — Partner certification logos (AWS, GCP, MongoDB, etc.)
5. **Our Team** — Profile cards with click-to-view detail modal
6. **Contact Us / Footer** — Standalone NGI footer

---


## Color System

All colors are maintained globally in `_ngi-theme.scss`. **No color is hardcoded** anywhere in the components. Every color references a CSS variable prefixed with `--ngi-*`.

Example: `color: var(--ngi-primary)` instead of `color: #E2544C`

---

## How to Run

```bash
npm install
npm run dev
```

Then visit: **http://localhost:3002** (or the port shown by Next.js).

---

## What Needs to Be Updated

- [ ] WhatsApp community invite link (in `ngi-header.jsx`)
- [ ] "Who We Are" content (in `who-we-are.jsx`)
- [ ] Program descriptions (in `programs.jsx`)
- [ ] Certification list & logos (in `certifications.jsx`)
- [ ] Team profiles — names, photos, bios (in `team-data.js`)
- [ ] Team photos → add to `public/assets/images/ngi/team/`
- [ ] LMS login URL (in `ngi-header.jsx`)
