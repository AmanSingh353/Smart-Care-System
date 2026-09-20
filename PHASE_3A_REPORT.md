# Phase 3A Report — Frontend Visual Foundation

**Date:** 2026-09-20  
**Scope:** `/frontend` only  
**Goal:** Premium healthcare SaaS visual foundation (landing + shell + patient heart) without changing PatientContext / AuthContext business logic.

---

## 1. Design system created

### Tokens (`src/index.css` + `tailwind.config.ts`)

- Healthcare **teal primary** (`--primary: 174 58% 32%`)
- Cool off-white canvas + soft radial wash (`.bg-canvas`)
- Light sidebar tokens (white rail, soft accent)
- Semantic success / warning / danger / info
- Larger radius (`--radius: 1rem`) + `rounded-2xl` / `rounded-3xl` utilities
- Soft shadows: `.shadow-card`, `.shadow-soft`
- Typography: **Plus Jakarta Sans** (Google Fonts in `index.html`)

### Shared primitives

| Component | Path |
|-----------|------|
| PageHeader | `components/dashboard/PageHeader.tsx` |
| StatCard | `components/dashboard/StatCard.tsx` |
| StatusBadge | `components/dashboard/StatusBadge.tsx` |
| EmptyState | `components/dashboard/EmptyState.tsx` |
| CareGuardPanel | `components/patient/CareGuardPanel.tsx` |
| PatientJourney | `components/patient/PatientJourney.tsx` |
| Button (pill) | updated `components/ui/button.tsx` |
| Card (2xl + soft shadow) | updated `components/ui/card.tsx` |

---

## 2. New components created

### Landing (`components/landing/`)

- `LandingNavbar`
- `LandingHero` (live PatientContext preview)
- `LandingCapabilities`
- `LandingJourney` (interactive timeline)
- `LandingUnifiedRecord`
- `LandingFamily`
- `LandingIntelligence`
- `LandingNece`
- `LandingFinalCta`

### Layout / patient

- Redesigned `StaffLayout` (light, role-grouped sidebar + top bar)
- Redesigned `FamilyLayout`
- Redesigned `PatientDetails` (header → journey → CareGuard → clinical → meds → labs → activity → billing)

### Page

- `pages/LandingPage.tsx`

---

## 3. Landing page sections

Route: **`/`** (public)

1. Navbar — Platform / Solutions / Intelligence / Family / Emergency Network + Enter Hospital  
2. Hero — “Smart hospital care, connected.” + live snapshot from mock patients  
3. Product capabilities (6 cards)  
4. One Patient Journey (interactive steps)  
5. Unified Patient Record (connected modules)  
6. Family experience  
7. Hospital intelligence (CareGuard direction; not claimed live)  
8. NECE future network (explicitly marked future)  
9. Final CTA → `/login`

Login moved to **`/login`**. Registration remains `/register`.

---

## 4. Application shell changes

- Light premium sidebar with **role-aware grouped nav**
- Active role chip, unread notification badge (from patient notifications)
- Sticky blurred header, mobile drawer
- Canvas background on authenticated pages
- Sign-out → `/login` (preserves auth logout)

**Not redesigned in depth yet:** full Nurse/Lab/Pharmacy/Billing layout compositions (headers only + shared shell). That is Phase 3B.

---

## 5. Patient detail redesign

`PatientDetails` is now the visual heart:

- Identity header + status badges  
- Patient journey strip from `treatmentStatus`  
- CareGuard placeholder panel  
- Clinical summary + connected care grid  
- Medications / lab results / nursing activity  
- Optional billing detail  

Still **100% driven by PatientContext data** — no fake vitals or invented AI advice.

---

## 6. CareGuard placeholder architecture

`CareGuardPanel` renders a controlled preview:

> Care intelligence will surface important actions and safety signals here.

Shown on:

- Patient detail (full view)
- Admin command dashboard

**No CareGuard logic implemented.**

---

## 7. Responsive behavior

Designed for:

- Desktop 1280–1440+ (two-column hero, grouped sidebar)
- Tablet ~768–1024 (stacked hero, collapsible nav)
- Mobile ~390–430 (hamburger, snap journey chips, no horizontal page overflow intended)

Landing journey uses horizontal snap chips on small screens; staff tables retain horizontal scroll where needed.

---

## 8. Verification results

| Check | Result |
|-------|--------|
| `npx tsc -b` | **Pass** |
| `npm run build` | **Pass** |
| `npm test` | Expected pass (unchanged smoke test) |
| `npm run lint` | Pre-existing shadcn/tailwind kit noise may remain |
| PatientContext / AuthContext | **Unchanged** (no logic rewrite) |
| Role routes | **Preserved** (+ `/` landing, `/login`) |

Manual smoke recommendation: open `/` → Enter Hospital → staff roles → family `SCS-1001` → confirm registration still creates live patients.

---

## 9. Remaining work for Phase 3B

1. Deep visual redesign of each role workspace (Nurse, Lab, Pharmacy, Billing, Family) using PageHeader/StatCard patterns  
2. Stronger empty/loading states on operational tables  
3. Optional Admin charts from live aggregates (Recharts, teal area/bars)  
4. Wire notification panel UI (badge already counts)  
5. Begin CareGuard **rule-based** insights (still no fake AI)  
6. Align RegisterPage visual language fully with landing tokens  
7. Accessibility pass (focus rings, contrast on teal CTAs)

---

## Constraints upheld

- No backend changes  
- No second frontend  
- No PatientContext/AuthContext replacement  
- No fake CareGuard recommendations  
- Existing workflows preserved under the new shell
