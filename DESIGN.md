# Design Brief

## Direction

Cyber-Neutral Premium SaaS — A sophisticated fintech dashboard with glassmorphism, geometric typography, and high-contrast accents for modern personal finance tracking.

## Tone

Bold minimalism with premium restraint — cyber-neutral base tones with electric accents used sparingly for active states and goal-reached statuses, avoiding generic tech clichés.

## Differentiation

Glassmorphic cards with backdrop blur and gradient circular progress rings on goal cards create a distinctive, premium visual identity that feels familiar to modern SaaS design without being derivative.

## Color Palette

| Token             | OKLCH           | Role                                          |
|-------------------|-----------------|-----------------------------------------------|
| background        | 0.98 0.002 220  | Light mode base; deep charcoal in dark mode   |
| foreground        | 0.16 0.015 220  | Primary text, dark mode foreground            |
| card              | 1 0 0           | Light mode card surface                       |
| primary           | 0.72 0.25 270   | Electric Indigo — active states, goal-reached |
| accent            | 0.7 0.22 195    | Neon Teal — supporting accents                |
| muted             | 0.92 0.01 220   | Subtle backgrounds, disabled states           |
| chart-1           | 0.72 0.25 270   | Sparkline / chart accent                      |
| chart-2           | 0.7 0.22 195    | Secondary chart accent                        |
| success           | 0.62 0.18 150   | Goal progress, positive balance               |
| destructive       | 0.62 0.22 25    | Warnings, delete actions                      |

## Typography

- Display: Space Grotesk — headings, section labels, high-impact text (500–700 weight)
- Body: DM Sans — all UI text, form labels, body copy (400–600 weight)
- Mono: Geist Mono — code snippets, currency amounts, numeric precision
- Scale: hero `text-4xl md:text-6xl font-bold`, h2 `text-2xl md:text-4xl font-semibold`, label `text-xs md:text-sm font-semibold tracking-wide uppercase`, body `text-base md:text-lg`

## Elevation & Depth

Glassmorphic cards (backdrop blur 12–16px, soft borders) replace traditional shadows. Light mode uses `bg-card / 0.8` with 1px subtle border; dark mode uses `bg-card / 0.6` with near-transparent border (8% opacity). Subtle hover elevation (`translate-y-[-2px]`) on interactive cards.

## Structural Zones

| Zone       | Background              | Border                   | Notes                                     |
|------------|-------------------------|--------------------------|-------------------------------------------|
| Header    | `glass-card` backdrop    | `border-border / 8–15%`   | Blurred card with minimal border          |
| Content   | `bg-background`         | —                         | Clean alternation: card sections on muted |
| Cards     | `glass-card` backdrop    | `border-border / 8–15%`   | Bento grid on dashboard hero              |
| Nav       | `glass-card` backdrop    | `border-border / 8–15%`   | Adaptive: bottom bar mobile, sidebar 1024px+ |

## Spacing & Rhythm

Spacious layout with generous negative space: 2rem gap between sections, 1rem between cards within grid. Compact internal padding (px-3 py-2) on inputs; loose heading margins (mt-6 mb-3). No default browser shadows; micro-spacing uses 0.5rem, 1rem, 1.5rem increments.

## Component Patterns

- Buttons: `bg-primary text-primary-foreground rounded-lg px-4 py-2` with spring hover elevation; secondary uses `bg-muted text-muted-foreground`
- Cards: `glass-card rounded-lg px-4 py-6` with subtle border, micro-shadow on hover
- Floating inputs: label floats above on focus; full-width with `transition-spring`; soft border focus state with ring
- Badges: `bg-accent / 15% text-accent rounded-full px-2 py-1` for tags and categories
- Progress: Circular ring with gradient `gradient-accent`, animated fill on load

## Motion

- Entrance: Spring animation (0.35s ease-out with cubic-bezier(0.34, 1.56, 0.64, 1)) for cards and modals
- Hover: Subtle 2px elevation (`card-hover`), smooth 0.2s transition on transform and shadow
- Data updates: Pulse-glow animation (2s infinite) for real-time value changes; shimmer on skeleton loaders
- Decorative: Animated SVG sparklines on dashboard summary cards only; Recharts line charts remain static

## Constraints

- Rounded corners: minimum 14px (1rem) base radius across all UI
- No hard shadows: glassmorphism + subtle borders only; use `box-shadow-glass` for micro-elevation
- Font weight: display 500–700, body 400–600; no thin or extra-bold variants
- Accent usage: Electric Indigo and Neon Teal reserved for active states, goal progress, and highlights — never for neutral UI
- Dark mode as marketing hero: system-default detection via `prefers-color-scheme`, dark optimized for screenshots and App Store

## Signature Detail

Glassmorphic cards with 12–16px backdrop blur and gradient circular progress rings on goal cards create immediate visual distinction — a premium, modern aesthetic that signals fintech sophistication without generic tech clichés.


