# PRODUCT VISION — SOROUSH // FIELD ATLAS

> A living map of research, territory, signals, and experiments.

## Problem

Conventional portfolios flatten a body of research into a résumé of cards.
They optimise for recruiter skimming, not for conveying how a research
practice actually connects — how a *territory* relates to an *Earth
observation source*, which in turn feeds a *project*, which emits *signals*.
The relationships **are** the work; a list destroys them.

Field Atlas exists to represent a research ecosystem as a coherent, legible
instrument rather than a marketing surface.

## Audience

Ordered by priority:

1. **Research & technical peers** — people evaluating depth: geospatial
   scientists, EO engineers, tourism/mobility researchers, hiring technical
   leads. They must be able to trace a claim to its data.
2. **Collaborators** — potential partners scanning for overlap with their own
   territories or methods.
3. **The author (Soroush)** — this is also a working map of his own practice;
   it should stay useful as an internal instrument, not just an external pitch.

Explicit non-audience: passive scrollers who want a hero image and a CTA.

## Identity

The recognisable identity is **not** an animation style or a colour. It is a
*posture*: everything on screen is an instrument reading of real structure.
Coordinates are real coordinates. A node is a real project. An edge is a real
relationship. The atlas is dark, cartographic, quiet, and dense with meaning
rather than motion. If you removed every animation, the identity would still
be legible — that is the test (see STOP GATE Q1).

## What this project IS

- A single full-screen **field instrument** composed of living modules.
- A **data-first** system: visualisations render structured domain data they
  do not own.
- A **research atlas** where visual complexity is earned by information.
- A slowly-growing surface: three real modules now (TERRITORY, EARTH,
  SIGNALS) plus a central FIELD STATE core.

## What this project is NOT

- Not a conventional portfolio / résumé site.
- Not a SaaS dashboard, not a gaming HUD, not a cyberpunk/Matrix aesthetic.
- Not a Google-Maps clone.
- Not a demo of every library that renders particles.
- Not (yet) connected to any live API — Sentinel, GitHub, FieldOS, etc.
- Not a place for authentication, CMS, database, or backend services.

## Success criteria

A build of Phase 1 succeeds if:

1. **Recognisability without motion** — a static screenshot conveys the
   identity and the structure (Q1).
2. **Every mark means something** — no element exists that does not encode a
   territory, source, project, signal, observation, or a relationship among
   them (Q2).
3. **Legible at a glance** — a peer can read the current field state and at
   least one relationship within ~10 seconds, on desktop, without hovering.
4. **Data swappable** — replacing a mock dataset with a real one requires
   editing only files under `/data` (+ its adapter), never a rendering
   component (Q4).
5. **Accessible fallback** — with animation and canvas disabled, all
   information is still reachable via DOM/text and keyboard.
6. **Honest performance** — no continuous rendering when idle; reduced-motion
   respected; usable on a 390-wide viewport.

If Phase 1 reads as "a cool developer portfolio" rather than "a research
instrument", it has failed criterion 1–2 regardless of how it looks.
