# UI/UX DESIGN DOC v2 — Satkar Medical Pharmacy Management System
*(Supersedes v1 — restarted per client direction, July 2026)*

## Brand Source
Palette is extracted directly from the official Satkar Medical logo (circular mark: cross + caring-hand + leaf). The logo itself is a first-class visual asset — used as a background watermark throughout the app, not just in the header.

## Colours (from logo)
```
Primary (deep teal, cross/ring/wordmark) : #0B4C52
Secondary (hand — mid teal/cyan)         : #17878E
Accent (leaf — green)                    : #5CA627
Neutral (MEDICAL wordmark grey)          : #6E6E6E
Background (warm off-white, unchanged)   : #FAF7F2
Surface                                  : #FFFFFF
Text                                     : #1C2620
Muted                                    : #6E7180
Success                                  : #17878E
Warning                                  : #F59E0B
Error                                    : #DC2626
```
Exact hex values should be re-sampled from the source logo file (`satkar-logo.jpeg`) using a colour picker for pixel-perfect accuracy before final implementation — the values above are close estimates from visual inspection.

## Typography
```
Headings : Space Grotesk, 600 weight  (kept — pairs well with the logo's serif wordmark energy without competing with it)
Body     : Inter, 400/16px, line-height 1.6
Data/Mono: IBM Plex Mono — batch numbers, dates, GST%, currency
Scale    : 12 / 14 / 16 / 20 / 28 / 40
```

## Logo as a Living Background Element
This is the key new direction. The logo's circular cross-mark should appear as a **subtle watermark/backdrop**, not just a static header image:
- **Dashboard & all main screens**: the circular logo mark rendered at 3-5% opacity, large scale, fixed position (bottom-right or centered), in `Primary` teal — using a react-bits background component (e.g. a masked/blurred large-scale version of the icon, or a soft radial-gradient glow behind it) so it reads as texture, not clutter.
- **Login screen**: logo mark can be more prominent (15-20% opacity) as a hero background, optionally with a subtle react-bits "Aurora" or particle-drift effect in teal/cyan behind it for a premium first-impression moment.
- **Loading states**: the cross-mark can double as a subtle pulse/loading motif (echoes the "pulse-divider" concept from v1, now literally tied to the real logo shape instead of an invented one).

## Modern / "3D" Treatment — what this means concretely
"3D and modern" translates to specific, tasteful techniques — not skeuomorphic 3D icons:
- **Layered depth via shadow + blur**: cards use a soft, warm-toned shadow (`0 8px 30px rgba(11,76,82,0.08)`) with a subtle 1px inner highlight border to feel lifted, not flat.
- **Glassmorphic accents, used sparingly**: e.g. the sidebar or a stats-summary bar can use a frosted-glass effect (`backdrop-blur` + translucent surface) over the logo watermark — this is where "3D/modern" reads most clearly, but it's confined to 1-2 structural elements, not applied everywhere.
- **Micro-interactions (react-bits)**: hover-lift on cards (2-4px translate + shadow grow, 150ms ease), animated number counters on dashboard stats (e.g. sales figures counting up on load), smooth page-transition fades.
- **Magic UI accents (sparingly, 1-2 places max)**: e.g. a glowing-border treatment on the "Today's Sales" hero stat card, or an animated beam connecting the Invoice Scan upload zone to the stock table to visually reinforce the OCR → stock flow.

## HARD AESTHETIC RULES
1. Palette is locked to the logo-derived colours above. Do not introduce new hues.
2. NO generic AI purple/blue gradients, NO default emoji-as-icons — use a proper icon set (lucide-react) styled in `Primary`/`Secondary` teal.
3. The logo watermark must never reduce text legibility — keep it under 6% opacity on data-dense screens (Stock List, Billing), and reserve higher-opacity/hero treatment for Login and Dashboard only.
4. Glassmorphism and glow effects are accent techniques for 1-2 key moments per screen — not a blanket style. Overuse defeats the "clean, trustworthy" brand feel the logo conveys.
5. Reference vibe: a modern healthcare SaaS (think Linear-level restraint) with the logo's warmth (teal + green + the caring-hand motif) — professional first, decorative second.

## Component states — unchanged principle, now backed by real components
- **Button**: shadcn/ui `Button`, styled with `Primary`/`Accent`, hover/active/disabled/loading states built in
- **Input**: shadcn/ui `Input` + `Form`, focus ring in `Secondary` teal, error state in `Error` red
- **Card**: custom card wrapper combining shadcn/ui structure + the shadow/hover treatment described above
- **Stat counters**: react-bits animated number component
- **Status badges**: Active (teal-100/teal-800) / Expiring Soon (amber) / Expired (red) — pill-shaped, shadcn/ui `Badge` base

## Layout
Persistent left sidebar (deep teal `#0B4C52`, with a faint version of the logo mark bleeding into its background) + main content area on warm off-white, with the large-scale watermark treatment described above. Sidebar items: Dashboard, Medical Stock, Provision Store, Invoice Scan, Billing, Expiry Alerts, Settings.

## Component Library Setup (for implementation)
```
Base            : shadcn/ui (forms, tables, dialogs, badges, buttons)
Animation/motion: react-bits (backgrounds, text effects, hover/scroll interactions) — chosen over Aceternity/Magic UI as
                   the primary library for its lighter bundle and lack of forced Framer Motion dependency
Accent moments  : Magic UI — used selectively for 1-2 "wow" elements only (e.g. hero stat card glow, OCR flow beam)
Icons           : lucide-react
```
