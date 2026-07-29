
# Revenue Recovery Platform — Architecture Phase

This phase establishes the *infrastructure* for every current and future calculator. No dummy questions, calculations, recommendations, or reports are generated. Existing design system, typography, sidebar, CRM structure and public site remain untouched.

## 1. Database (single migration)

Tables in `public`, each with RLS + GRANTs:

- `rr_calculators` — one row per calculator product
  - `slug` (unique, url-safe), `key` (stable enum-like: `leakage`, `ai-opportunity`, …), `name`, `tagline`, `description`, `status` (`draft` | `published` | `archived`), `industries` (text[]), `settings` jsonb (thank-you copy, CTA label, Calendly URL, PDF template ref, animation flags), `published_at`, `archived_at`, `created_by`.
- `rr_calculator_versions` — immutable version history
  - `calculator_id`, `version` (int), `snapshot` jsonb (full config: questions, scoring, recommendations, industry overrides, copy), `published` bool, `created_by`.
- `rr_questions` — working (draft) question set per calculator
  - `calculator_id`, `order_index`, `type` (single/multi/number/currency/percentage/slider/rating/yes-no/short-text/long-text), `industry` (nullable — null = all), `key`, `label`, `help`, `required`, `options` jsonb, `validation` jsonb, `conditions` jsonb (branching), `weight` numeric, `scoring` jsonb, `tooltip`, `insight` text.
- `rr_scoring_rules` — reusable scoring configuration per calculator (weights, industry multipliers, formulas as data). Structured jsonb, not code.
- `rr_recommendations` — per-calculator recommendation library (triggers as data: score band, industry, answer conditions).
- `rr_submissions` — one per public completion
  - `calculator_id`, `version_id`, `slug` (denormalised), `industry`, `answers` jsonb, `score` numeric, `score_breakdown` jsonb, `financial_impact` jsonb, `lead_id` (fk `leads`), `device`, `traffic_source`, `referrer`, `duration_ms`, `completed_at`.
- `rr_events` — funnel analytics (`view`, `start`, `question_answered`, `complete`, `report_viewed`, `pdf_downloaded`, `cta_clicked`, `call_booked`)
  - `calculator_id`, `slug`, `session_id`, `event`, `payload` jsonb, `industry`, `device`, `source`, `created_at`.

RLS:
- Admin (`has_role(auth.uid(),'admin')`) full read/write on all `rr_*` tables.
- `anon` + `authenticated` may INSERT into `rr_events` and `rr_submissions` when the referenced `rr_calculators.status = 'published'` (checked via SECURITY DEFINER helper `rr_is_published(uuid)`).
- `anon` may SELECT published calculator snapshots via a security-definer function `rr_get_published_by_slug(text)` returning the current published version snapshot only — no direct SELECT grant on tables.
- Submissions/events never readable by anon.

GRANTs on each table per project conventions; anon gets only INSERT on `rr_events`/`rr_submissions`, EXECUTE on the two definer functions.

## 2. Server functions (`src/lib/revenue-recovery/*.functions.ts`)

Authenticated (`requireSupabaseAuth` + admin check):
- `listCalculators`, `getCalculator(id)`, `createCalculator`, `updateCalculator`, `duplicateCalculator`, `archiveCalculator`, `deleteCalculator`.
- `listVersions`, `publishCalculator` (writes new `rr_calculator_versions` snapshot, flips status), `revertToVersion`.
- `upsertQuestion`, `reorderQuestions`, `deleteQuestion`.
- `upsertScoringRules`, `upsertRecommendations`.
- `getCalculatorAnalytics(id, range)` — aggregates from `rr_events` + `rr_submissions`.
- `listSubmissions(calculatorId, filters)`.

Public (no auth, via server routes for raw HTTP where needed):
- `src/routes/api/public/rr/$slug/config.ts` GET — returns published snapshot.
- `src/routes/api/public/rr/$slug/event.ts` POST — records analytics events.
- `src/routes/api/public/rr/$slug/submit.ts` POST — validates answers against the published snapshot, runs scoring engine, creates `leads` + `rr_submissions`, returns report payload.

All signature-verified? No secret needed — inputs re-validated server-side, rate-limit acceptable at platform layer.

## 3. Engine (pure TypeScript, `src/lib/revenue-recovery/engine/`)

Reusable, calculator-agnostic modules. No calculator content lives here.

- `types.ts` — `CalculatorConfig`, `Question`, `Answer`, `ScoringRules`, `Recommendation`, `ReportPayload`, `Industry`.
- `validation.ts` — validates answers against question definitions (required, min/max, regex, etc.).
- `branching.ts` — evaluates `conditions` to determine visible questions.
- `scoring.ts` — data-driven scoring: weighted sum, industry multipliers, band mapping, financial-impact formulas defined as JSON expressions (add/sub/mul/div/pct/min/max/if — same evaluator idea, hardened).
- `recommendations.ts` — filters recommendation library by score band + answer conditions.
- `report.ts` — composes `ReportPayload` (hero, score, financial impact, charts data, recommendations, action plan, next steps) from config + answers + scoring output. Content strings come from config, never hardcoded.

Engine has zero knowledge of any specific calculator. Adding a new calculator = inserting a row + config, no code changes.

## 4. Reusable UI components (`src/components/revenue-recovery/`)

All match existing Dock typography, spacing, colors — no new tokens.

- `QuestionCard`, one per type (`SingleChoice`, `MultiChoice`, `NumberInput`, `CurrencyInput`, `PercentInput`, `SliderInput`, `RatingInput`, `YesNoInput`, `ShortText`, `LongText`) sharing a wrapper.
- `ProgressDots` (milestone dots, no numbers — matches earlier pattern).
- `InsightCallout`, `AnalysisScreen`, `LoadingScreen`.
- `ResultsHero`, `ScoreCard`, `FinancialImpactCard`, `ChartBlock` (thin `recharts` wrapper, monochrome), `RecommendationList`, `ActionPlan`, `CTACard`, `LeadCaptureForm`, `PdfExportButton` (stub hook).
- `PublishBar` (admin): Draft ↔ Preview ↔ Publish, copy public link, version history.

Every component is a shell — it renders whatever the config/report payload provides. No copy is hardcoded.

## 5. Admin routes

Under existing sidebar group (unchanged nav structure). Each existing calculator route becomes a real editor mounted on the shared admin shell:

- `/admin/revenue-recovery` — platform overview (existing, extended with real analytics roll-up).
- `/admin/revenue-recovery/engine` — hub listing calculators (existing, extended with status + last published).
- `/admin/revenue-recovery/$key` — calculator admin (replaces the 9 placeholder routes)
  - Tabs: **General** (title/description/industries/copy/CTA/Calendly/PDF), **Questions** (visual builder, per-industry override, branching), **Scoring** (weights, multipliers, bands, formulas), **Recommendations** (library + triggers), **Report** (section toggles, copy), **Analytics** (funnel + submissions), **Publish** (draft/preview/publish, versions, public link).
- `/admin/revenue-recovery/$key/preview` — admin-only preview of current draft.
- `/admin/revenue-recovery/$key/submissions/$id` — single submission drill-down.

Existing 9 placeholder route files are replaced with a single dynamic `$key` route; the sidebar links continue to work because keys match today's slugs.

## 6. Public routes

- `src/routes/rr.$slug.tsx` — public calculator experience (landing → industry select if calculator supports multiple → question flow → analysis screen → lead capture → report). SSR loader calls the public `config` endpoint. Emits analytics events. No admin chrome, no auth wall.
- `src/routes/rr.$slug.report.$submissionId.tsx` — shareable report view.

URLs live under `/rr/<slug>` to avoid colliding with existing top-level routes and to keep the public site untouched. `slug` is user-editable per calculator (defaults to key). Root site nav is not modified.

## 7. Lifecycle & versioning

- Editing writes to the working tables (`rr_questions`, `rr_scoring_rules`, `rr_recommendations`) + `rr_calculators.settings`.
- **Publish** serializes the working state into `rr_calculator_versions.snapshot`, increments `version`, marks it `published`, sets `rr_calculators.status='published'`, `published_at=now()`.
- Public endpoints only ever read the latest `published` snapshot — never the working tables. This is the isolation guarantee.
- **Archive**, **duplicate** (deep copy of working state + settings, fresh slug), **delete** (cascades), **revert** (copies a version's snapshot back into the working tables).

## 8. CRM integration

`rr_submissions` insert path creates/updates a `leads` row with: name, email, phone, company, industry, website, source = `rr:<slug>`, plus a link back to the submission. Answers, score and financial estimate are stored on the submission and surfaced on the lead detail via a new "Revenue Recovery" panel (small addition to existing lead view — no CRM restructure).

## 9. Analytics

`getCalculatorAnalytics` aggregates `rr_events` + `rr_submissions` into: views, starts, completes, completion %, avg completion time, industry breakdown, device breakdown, traffic source, conversions, bookings, downloads. Rendered inside each calculator's Analytics tab; platform overview shows the roll-up.

## 10. Explicitly NOT in this phase

- No questions, formulas, recommendations, or report copy for any specific calculator.
- No PDF template implementation (button + hook stub only).
- No Calendly embedding beyond storing/opening a URL.
- No changes to public site nav, home, CRM tables, sidebar structure, typography, colors, spacing.

## Technical notes

- Engine is pure TS, unit-testable, isomorphic — usable in server functions (scoring on submit) and client (live preview in admin, live totals in wizard).
- Formulas are stored as JSON AST (`{op:'mul', args:[{ref:'answers.calls_missed'}, {ref:'answers.avg_deal_size'}]}`) evaluated by a whitelisted interpreter — no `eval`, no code storage.
- All new files live under `src/lib/revenue-recovery/`, `src/components/revenue-recovery/`, `src/routes/_authenticated/admin.revenue-recovery.*`, `src/routes/rr.$slug.*`, and `src/routes/api/public/rr/*`.
- Adding a new calculator later = create row + config in admin UI. Zero code changes.

```text
Data flow

  Admin edits ──► rr_questions / rr_scoring_rules / rr_recommendations
                          │
                          ▼
                    Publish action
                          │
                          ▼
              rr_calculator_versions (immutable snapshot)
                          │
     Public /rr/<slug> ◄──┘ (reads latest published snapshot only)
                          │
        submit ──► engine.score() ──► rr_submissions + leads
        events ──► rr_events
                          │
                          ▼
              Admin Analytics tab + platform overview
```
