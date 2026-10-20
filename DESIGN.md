---
name: Recall Cards — Pulse
description: QuotaPulse inspired monochrome interface, scoped to pulse.html.
colors:
  primary: "#29292c"
  ink: "#242426"
  muted: "#707074"
  paper: "#f4f4f4"
  surface: "#ffffff"
  surface-secondary: "#eeeeef"
  line: "#e5e5e7"
typography:
  display:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "54px"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "26px"
    fontWeight: 650
    lineHeight: 1.35
    letterSpacing: "-0.025em"
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "14px"
    lineHeight: 1.7
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  control: "9px"
  panel: "16px"
  shell: "22px"
spacing:
  small: "8px"
  medium: "16px"
  panel-gap: "20px"
  large: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "7px 13px"
    height: "36px"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "7px 13px"
    height: "36px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
---

## Overview

**Creative North Star: "A quiet recall desk"**

This visual system applies to `pulse.html`, `pulse.css`, and `pulse.js` only. The classic homepage keeps its existing visual identity. The user selected the installed QuotaPulse macOS app as the reference and explicitly retained black and white as the main colors.

A pale outer shell holds clear white panels. Centered segmented navigation, compact labels, and large tabular numbers establish a calm native-app rhythm. Card content remains the focus; the visual system adds no illustrative assets or invented learning analytics.

**Key Characteristics:**
- Neutral surfaces with black primary actions.
- System typography with tabular numeric metrics.
- A single translucent shell around stable white panels.
- Optional floating deck navigation and an initially closed review outline.

## Colors

Primary is a soft near-black reserved for the main action and emphasis. Ink and muted gray distinguish content from supporting labels. White panels sit on paper and secondary neutral surfaces; the line color separates adjacent regions.

**The Monochrome Rule.** Communicate review states through text, position, and borders as well as tone. Do not introduce colored accents copied from the reference app.

## Typography

The Pulse header uses the user-selected Anki wordmark, outlined in `icons/anki-wordmark.svg`. Its open A retains the card-shaped crossbar; the lowercase n uses a standard continuous arch. The companion app icon is the approved stacked-card mark in charcoal on white (`icons/anki-app.svg`). Both are native vector assets, independent of installed fonts. Pulse's favicon, install manifest, and Apple touch icon use this mark; classic branding remains available at the original entry point.

Use the platform system sans stack throughout the Pulse interface. The largest numeric style belongs to the due-card count. Headlines introduce a view; compact labels support navigation and controls. Review questions and answers have more generous line spacing than dashboard labels.

**The Content Rule.** Preserve Markdown hierarchy, readable paragraphs, tables, code, and sandboxed HTML previews. Long content scrolls naturally and wraps without expanding the viewport.

## Layout

The desktop shell has a maximum width of 1160px. Its header uses three columns with centered segmented navigation. The main overview combines a summary panel and a two-column deck/next-question area. Use the observed spacing tokens for related controls and panel groups.

Responsive rules at 799px and 479px stack the overview, reflow the header, and reduce margins. Deck navigation remains an optional overlay. The review outline starts closed and opens from the left floating control.

## Elevation & Depth

**The One Shell Rule.** Apply backdrop blur only to the outer shell. Content panels use white fill and a subtle border, without shadows. Reserve structural shadows for overlays, menus, dialogs, and the selected navigation segment.

Motion uses short color transitions; progress changes use a brief width transition. Reduced-motion disables transitions and reduced-transparency makes the shell opaque.

## Shapes

Use the shell, panel, and control radii from the frontmatter to maintain QuotaPulse's nested corner hierarchy. Small tags and navigation segments are tighter than panels. Icons are simple outlined SVGs aligned to labels, with no raster illustrations.

## Components

Primary buttons use near-black fill, white labels, and a lighter hover state. Ghost buttons use white fill and a gray border. All interactive controls expose a visible keyboard focus outline. Labels remain visible for import, edit, pin, and review actions.

Segmented navigation has a neutral track and a white selected segment. Review ratings share the same neutral material, with explicit four-level labels and keyboard hints. Search uses a clear field; editing uses native labeled fields inside a scrollable dialog.

The overview renders actual card counts and deck metadata. Empty states offer creation or browsing. The footer shows existing sync status and a direct return to the classic version.

## Do's and Don'ts

### Do:
- Do use the shared card store and authenticated backend for both versions.
- Do keep review content readable at narrow screen widths.
- Do keep rollback available through the classic-version link.
- Do document actual implemented values rather than speculative tokens.

### Don't:
- Don't apply the Pulse system to the classic homepage automatically.
- Don't invent activity history or metrics absent from stored card data.
- Don't use color as the only explanation of a review state.
- Don't blur or elevate every panel.
