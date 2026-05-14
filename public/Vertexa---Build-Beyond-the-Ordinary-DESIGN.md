---
version: "alpha"
name: "Vertexa - Build Beyond the Ordinary"
description: "Vertexa Build CTA Section is designed for building reusable UI components in modern web projects. Key features include reusable structure, responsive behavior, and production-ready presentation. It is suitable for component libraries and responsive product interfaces."
colors:
  primary: "#2C40FF"
  secondary: "#374151"
  tertiary: "#9CA3AF"
  neutral: "#FFFFFF"
  background: "#2C40FF"
  surface: "#2C40FF"
  text-primary: "#FFFFFF"
  text-secondary: "#D1D5DB"
  border: "#374151"
  accent: "#2C40FF"
typography:
  display-lg:
    fontFamily: "Inter"
    fontSize: "96px"
    fontWeight: 600
    lineHeight: "96px"
    letterSpacing: "-0.025em"
  body-md:
    fontFamily: "Inter"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
  label-md:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: "24px"
rounded:
  md: "6px"
spacing:
  base: "8px"
  sm: "8px"
  md: "9.6px"
  lg: "12px"
  xl: "20px"
  gap: "8px"
  section-padding: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "12px"
  button-secondary:
    textColor: "{colors.neutral}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "8px"
  button-link:
    textColor: "{colors.text-secondary}"
    typography: "{typography.body-md}"
    rounded: "0px"
    padding: "0px"
---

## Overview

- **Composition cues:**
  - Layout: Flex
  - Content Width: Full Bleed
  - Framing: Open
  - Grid: Minimal

## Colors

The color system uses dark mode with #2C40FF as the main accent and #FFFFFF as the neutral foundation.

- **Primary (#2C40FF):** Main accent and emphasis color.
- **Secondary (#374151):** Supporting accent for secondary emphasis.
- **Tertiary (#9CA3AF):** Reserved accent for supporting contrast moments.
- **Neutral (#FFFFFF):** Neutral foundation for backgrounds, surfaces, and supporting chrome.

- **Usage:** Background: #2C40FF; Surface: #2C40FF; Text Primary: #FFFFFF; Text Secondary: #D1D5DB; Border: #374151; Accent: #2C40FF

## Typography

Typography relies on Inter across display, body, and utility text.

- **Display (`display-lg`):** Inter, 96px, weight 600, line-height 96px, letter-spacing -0.025em.
- **Body (`body-md`):** Inter, 14px, weight 500, line-height 20px.
- **Labels (`label-md`):** Inter, 16px, weight 500, line-height 24px.

## Layout

Layout follows a flex composition with reusable spacing tokens. Preserve the flex, full bleed structural frame before changing ornament or component styling. Use 8px as the base rhythm and let larger gaps step up from that cadence instead of introducing unrelated spacing values.

Treat the page as a flex / full bleed composition, and keep that framing stable when adding or remixing sections.

- **Layout type:** Flex
- **Content width:** Full Bleed
- **Base unit:** 8px
- **Scale:** 8px, 9.6px, 12px, 20px, 24px, 40px, 48px, 128px
- **Section padding:** 24px, 84px
- **Gaps:** 8px, 40px

## Elevation & Depth

Depth is communicated through elevated, border contrast, and reusable shadow or blur treatments. Keep those recipes consistent across hero panels, cards, and controls so the page reads as one material system.

Surfaces should read as elevated first, with borders, shadows, and blur only reinforcing that material choice.

- **Surface style:** Elevated
- **Borders:** 1px #374151
- **Shadows:** rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(44, 64, 255, 0.3) 0px 0px 20px 0px

### Techniques
- **Gradient border shell:** Use a thin gradient border shell around the main card. Wrap the surface in an outer shell with 0px padding and a 0px radius. Drive the shell with repeating-linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0) 2px, rgba(0, 0, 0, 0.4) 2px, rgba(0, 0, 0, 0.4) 4px) so the edge reads like premium depth instead of a flat stroke. Keep the actual stroke understated so the gradient shell remains the hero edge treatment. Inset the real content surface inside the wrapper with a slightly smaller radius so the gradient only appears as a hairline frame.

## Shapes

Shapes rely on a tight radius system anchored by 6px and scaled across cards, buttons, and supporting surfaces. Icon geometry should stay compatible with that soft-to-controlled silhouette.

Use the radius family intentionally: larger surfaces can open up, but controls and badges should stay within the same rounded DNA instead of inventing sharper or pill-only exceptions.

- **Corner radii:** 6px
- **Icon treatment:** Linear
- **Icon sets:** Solar

## Components

Anchor interactions to the detected button styles.

### Buttons
- **Primary:** background #2C40FF, text #FFFFFF, radius 6px, padding 12px, border 0px solid rgb(229, 231, 235).
- **Secondary:** text #FFFFFF, radius 6px, padding 8px, border 1px solid rgb(55, 65, 81).
- **Links:** text #D1D5DB, radius 0px, padding 0px, border 0px solid rgb(229, 231, 235).

### Iconography
- **Treatment:** Linear.
- **Sets:** Solar.

## Do's and Don'ts

Use these constraints to keep future generations aligned with the current system instead of drifting into adjacent styles.

### Do
- Do use the primary palette as the main accent for emphasis and action states.
- Do keep spacing aligned to the detected 8px rhythm.
- Do reuse the Elevated surface treatment consistently across cards and controls.
- Do keep corner radii within the detected 6px family.

### Don't
- Don't introduce extra accent colors outside the core palette roles unless the page needs a new semantic state.
- Don't mix unrelated shadow or blur recipes that break the current depth system.
- Don't exceed the detected moderate motion intensity without a deliberate reason.

## Motion

Motion feels controlled and interface-led across text, layout, and section transitions. Timing clusters around 150ms and 300ms. Easing favors ease and cubic-bezier(0.4. Hover behavior focuses on text and stroke changes. Scroll choreography uses GSAP ScrollTrigger for section reveals and pacing.

**Motion Level:** moderate

**Durations:** 150ms, 300ms

**Easings:** ease, cubic-bezier(0.4, 0, 0.2, 1)

**Hover Patterns:** text, stroke, color, shadow

**Scroll Patterns:** gsap-scrolltrigger
