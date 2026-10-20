---
name: Bahulu Berry Cameron Admin
description: Operations console for the bakery's Owner, Managers and Staff.
colors:
  berry: "#b8171c"
  berry-deep: "#9a1418"
  berry-soft: "#fdf3f3"
  berry-tint: "#f6c5c6"
  ground: "#f6f6f7"
  surface: "#ffffff"
  subtle: "#fafafa"
  hover: "#f4f4f5"
  border: "#e4e4e7"
  border-strong: "#d4d4d8"
  ink: "#18181b"
  ink-secondary: "#3f3f46"
  muted: "#5f6168"
  icon-muted: "#71717a"
  faint: "#a1a1aa"
  gold: "#e0a800"
typography:
  page-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI Variable Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  metric:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI Variable Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  section-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI Variable Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI Variable Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI Variable Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.45
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI Variable Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.45
  mono:
    fontFamily: "ui-monospace, 'Cascadia Code', 'SF Mono', Consolas, monospace"
    fontSize: "12px"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.berry}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.berry-deep}"
  button-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    height: "36px"
  button-default-hover:
    backgroundColor: "{colors.hover}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    height: "36px"
  nav-item:
    textColor: "{colors.ink-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "6px 10px"
    height: "32px"
  nav-item-hover:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.ink}"
  nav-item-active:
    backgroundColor: "{colors.berry-soft}"
    textColor: "{colors.berry-deep}"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "16px"
  table-header:
    backgroundColor: "{colors.subtle}"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    padding: "8px 16px"
  table-cell:
    typography: "{typography.body}"
    padding: "9px 16px"
  kpi-cell:
    backgroundColor: "{colors.surface}"
    padding: "14px 20px 16px"
  list-row:
    padding: "10px 16px"
  badge:
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    height: "22px"
    padding: "0 8px"
---

# Design System: Bahulu Berry Cameron Admin

This document covers the admin dashboard in `frontend/` only. The public storefront in `storefront/` has its own warm yellow and berry identity, which is not described here.

## Overview

**Creative North Star: "The Quiet Counter"**

A neutral operations console. White panels sit on a cool grey ground, separated by 1px hairlines. Berry red appears where something can be acted on, is selected, needs attention, or is the main series in a chart. Everything else is ink and grey. A dark scheme follows the system setting and can be switched from the top bar.

Density is moderate and consistent: a 14px base, 32px navigation rows, about 40px table rows, and one page structure across every section (title, one-line description, actions on the right, then content). Staff should be able to read any screen the same way: find today's work, open a table, act on a row.

Depth comes from borders and tonal steps, not shadows. Shadows are reserved for things that float above the page.

**Key Characteristics:**
- Cool neutral greys with a single berry accent, and gold as a quiet second marker.
- 1px hairline borders define every panel, row and cell.
- Flat at rest; shadows only on menus, popovers and modals.
- System UI sans throughout, tabular numerals everywhere.
- 6px radius on controls, 8px on panels.

## Colors

A zinc-like neutral scale carries the interface; one berry red marks action, selection and alerts.

### Primary
- **Berry Red** (berry): primary buttons, the active navigation icon, focus outlines, input focus border, text caret, the notification dot, Tabs indicator and the navigation progress bar.
- **Deep Berry** (berry-deep): hover state of filled berry buttons.
- **Berry Wash** (berry-soft): the selected sidebar item and alert icons in work-queue rows.
- **Berry Tint** (berry-tint): text selection, the ring around the selected sidebar item, and the border of alert icons in work-queue rows.
- **Gold** (gold): the second KPI marker dot, next to berry. Never a fill or text colour.

### Neutral
- **Cool Grey Ground** (ground): app body and main area behind panels.
- **Surface White** (surface): panels, cards, tables, inputs, the active nav item.
- **Rail Grey** (subtle): sidebar background, table header, row hover.
- **Hover Grey** (hover): hover fill for nav items, menu items, ghost controls.
- **Hairline** (border): panel borders, row and cell dividers, header and sidebar edges.
- **Strong Hairline** (border-strong): input and default-button borders, hover border on the header search and prompt tiles, scrollbar thumb.
- **Ink** (ink): primary text and headings.
- **Secondary Ink** (ink-secondary): nav item labels and form labels.
- **Muted Grey** (muted): descriptions, table header text, secondary values, dimmed text.
- **Icon Grey** (icon-muted): chart axis labels.
- **Faint Grey** (faint): inactive nav icons.

Status colours (green, orange, red, gray) come from Mantine's default palette and appear as light badges, alerts and icons. Light variants have their text darkened to 78% of the colour's darkest shade mixed with black (58% for yellow, orange and lime) so badge text stays readable on the pale fill.

### Named Rules
**The Accent Means Act Rule.** Berry red marks something you can press, something selected, focus, something that needs attention, or the main chart series. It is never decoration, never a panel fill, never a heading colour.

**The Berry Charts Rule.** Line and area charts draw the main series in berry with a 14% berry fill beneath, straight segments (no smoothing), on dashed #efeff1 grid lines. Secondary series use neutral grey (#52525b). Chart colours come from `useChartTheme()` so they follow the colour scheme.

### Dark mode
`defaultColorScheme="auto"` follows the system; the top-bar toggle overrides it. The same `--ui-*` tokens are redefined under `[data-mantine-color-scheme="dark"]`:

| Token | Light | Dark |
|---|---|---|
| ground | #f6f6f7 | #0f0f11 |
| surface | #ffffff | #18181b |
| subtle | #fafafa | #1d1d21 |
| hover | #f4f4f5 | #232327 |
| border | #e4e4e7 | #2a2a2f |
| border-strong | #d4d4d8 | #3a3a40 |
| ink | #18181b | #f4f4f5 |
| ink-secondary | #3f3f46 | #d4d4d8 |
| muted | #5f6168 | #a1a1aa |
| berry | #b8171c | #ec6f73 |
| berry-deep | #9a1418 | #f6a5a7 |
| berry-soft | #fdf3f3 | berry at 12% |
| berry-tint | #f6c5c6 | berry at 32% |
| gold | #e0a800 | #f2c94c |

Components read the tokens, never raw hex, so both schemes stay in step.

## Typography

**Body Font:** system UI sans (-apple-system, Segoe UI Variable Text, Segoe UI, Roboto, Helvetica Neue, Arial)
**Mono Font:** ui-monospace, Cascadia Code, SF Mono, Consolas

**Character:** One family at every level. Hierarchy comes from size and weight (400, 500, 600), not from a second typeface. Tabular numerals are set on the root so prices, counts and dates line up in columns.

### Hierarchy
- **Page title** (600, 22px, 1.3, -0.015em): one per page, in the page header.
- **Metric** (600, 24px, 1.2, -0.02em): KPI strip values only.
- **Section title** (600, 16px, 1.4): modal titles and h3. Panel headers use 14px at 600.
- **Body** (400, 14px, 1.5): table cells, descriptions, form values. Page descriptions cap at 680px.
- **Label** (500, 14px): form labels, nav items, table headers, buttons.
- **Caption** (400, 12px): input descriptions, sidebar section labels (at 500), badge text, keyboard hints.

Heading sizes h4 to h6 step down to 15px and 14px. No text is uppercase; badges have text-transform and letter-spacing removed.

### Named Rules
**The Sentence Case Rule.** All labels, badges, section labels and buttons are sentence case at normal letter-spacing. There are no uppercase labels or small text above headings.

## Layout

An application shell with the sidebar spanning full height (`layout="alt"`): a 232px left rail and a 52px top bar. Main content is padded 16px on mobile and 24px from 48em up, and centred at a maximum of 1440px.

Spacing steps are 8, 12, 16, 20 and 24px. Panels pad 16px; panel headers 14px 16px 12px; KPI cells 14px 20px 16px. The page header leaves 20px (16px on mobile) above content.

Dashboard order: page header, one KPI strip (a single bordered panel divided into cells by inset 1px lines, not separate cards), then the two work-queue panels side by side from the lg breakpoint, then charts.

Responsive behaviour:
- Below 48em the sidebar becomes a toggled drawer, the header search collapses to a 32px icon button, the account name hides, and the page header stacks.
- Below 37.5em main padding drops to 12px, tables switch to stacked row cards, modals and drawers go full screen with sticky headers, page-header buttons go full width and stack with the primary action first, and tab lists scroll horizontally.
- Below 30em header actions tighten to a 4px gap.

## Elevation & Depth

Flat by default. Cards carry no shadow; separation is a 1px hairline plus the white-on-grey tonal step. The active nav item uses a 1px inset berry-tint ring rather than a drop shadow. The top bar is 92% white (88% surface in dark mode) with an 8px backdrop blur so content scrolls under it.

### Shadow Vocabulary
- **Overlay** (`0 6px 16px rgb(24 24 27 / 0.08), 0 2px 4px rgb(24 24 27 / 0.04)`): menus and popovers.
- **Modal** (`0 24px 56px rgb(24 24 27 / 0.16), 0 6px 12px rgb(24 24 27 / 0.05)`): modal dialogs. Backdrop is 40% black with no blur.
- **Focus glow** (`0 0 0 3px rgb(184 23 28 / 0.12)`): focused inputs, alongside a berry border.

### Named Rules
**The Only Floating Things Cast Shadows Rule.** A shadow means the element sits above the page: a menu, popover or modal. Panels, cards, tables and tiles stay flat.

## Shapes

Small, even corners. Controls (buttons, inputs, badges, nav items, tooltips, the header search, list-row icon boxes) use 6px. Panels, cards, tables, modals, menus, alerts and prompt tiles use 8px. Sort buttons in table headers use 4px. Avatars and the notification dot are circles. On mobile, table rows inside the stacked view lose their radius and become bottom-bordered rows, and modals lose their radius at full screen.

All borders are 1px. Icons are Tabler outline icons, mostly 16px at 1.75 stroke in rows and 16 to 18px in controls.

## Components

### Buttons
Quiet and compact.
- **Shape:** 6px corners, 36px tall (Mantine size sm), weight 500.
- **Primary:** filled berry with white text.
- **Hover / Focus:** colour transitions over 120ms; filled hover deepens to berry-deep. Focus shows a 2px berry outline at 2px offset. On fine pointers a pressed button shifts down 0.5px.
- **Default:** white with a strong hairline border, ink text. Used for Cancel, Back and secondary actions.
- **Subtle:** no fill until hover. Icon buttons default to subtle grey; in table cells they are 30px square.

### Badges
- **Style:** light variant by default, 6px corners, 12px text at 500, 22px tall (20px at size sm), sentence case.
- **State:** colour carries status (green done or published, orange in progress or needs attention, red failed, unpaid or high priority, gray neutral or draft).

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** surface white on the grey ground.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px hairline.
- **Internal Padding:** 16px; panels with headers use zero padding and let header, rows and footer pad themselves.

### Inputs / Fields
- **Style:** white fill, 1px strong hairline, 6px corners, 14px text, berry caret. Labels are 14px at 500 in secondary ink with 4px below; descriptions are 12px.
- **Focus:** border turns berry and a 3px berry glow at 12% appears.
- **Placeholder:** #6f6f78.

### Navigation
- **Sidebar:** rail grey with a hairline right edge. A 52px brand row (mark plus name at 14px, 600) sits on top, then every section expanded under 12px muted section labels.
- **Items:** 32px rows, 6px corners, 14px secondary ink at 500, faint icon. Hover fills hover grey and darkens text to ink. Active is a berry pill: berry wash fill, berry-tint inset ring, deep berry text at 600 and a berry icon.
- **Sections by role:** Owners see every section; Managers get a Management section with Reports; Staff see daily work only. Links a role cannot use are hidden, not disabled.
- **Top bar:** 52px, translucent, hairline bottom edge. A 260px search trigger with a Ctrl K hint, the light/dark toggle, the notification bell (berry dot when something needs attention), and the account menu with the role label.
- **Mobile:** the rail opens as a drawer from a burger in the top bar.

### Data Table
The main work surface.
- Bordered 8px panel with hidden overflow. Header row on rail grey, 14px muted text at 500, 8px 16px padding, sortable columns show a faded sort icon until sorted.
- Rows 9px 16px, 14px text, hairline dividers, hover to rail grey over 100ms. Numeric columns align right.
- **Row actions:** one 30px "…" button per row opens a menu of labelled actions with icons; destructive actions are red and listed last. Actions a role cannot use are left out.
- **Row click:** clicking a row opens its main action (view or edit). It is a mouse shortcut only; the same action is always in the menu for keyboard users.
- Below 37.5em each row becomes a stacked card with bottom border only, with the "…" menu at the top right.

### KPI Strip
One bordered panel split into cells by inset 1px hairlines. Each cell has a small berry or gold dot, a 14px muted label at 500, a 24px metric value, and an optional 12px description. Used on the dashboard, fulfilment and reports pages.

### Work Queue Panel
A card with a header (14px title at 600, 14px muted description, optional badge, hairline below), then full-width link rows: 30px bordered icon box, title and detail, trailing grey chevron. When a queue needs attention the icon box turns berry on berry wash. An optional centred footer link closes the panel.

## Do's and Don'ts

### Do:
- **Do** keep berry for primary actions, selection, focus and attention states.
- **Do** separate surfaces with 1px hairlines (#e4e4e7) and the white-on-grey step.
- **Do** use the page header on every page: 22px title, one-line description, actions on the right.
- **Do** set numbers in tabular figures and right-align numeric table columns.
- **Do** use 6px corners for controls and 8px for panels.
- **Do** honour reduced motion: page reveals (8px rise, 260ms) and number animations are disabled when the user asks.

### Don't:
- **Don't** add shadows to cards, panels or tiles; shadows are for menus, popovers and modals.
- **Don't** fill panels or headings with berry.
- **Don't** put a row of bare icons in a table row; use the "…" actions menu.
- **Don't** hard-code light colours; use the `--ui-*` tokens so dark mode works.
- **Don't** use warm cream or pink-tinted backgrounds; neutrals here are cool grey.
- **Don't** split the KPI strip into separate cards or put icon tiles on every metric.
- **Don't** stack cards inside cards on the dashboard; use rows and dividers inside one panel.
- **Don't** use uppercase labels or small labels above headings.
