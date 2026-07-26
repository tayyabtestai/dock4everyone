## Assessment Engine — scope

A new Owner Console module. One engine, N assessments. Public pages live only at `/assessment/$slug` (never linked from the site). No changes to existing modules, layouts, or the public site.

## Database (Lovable Cloud migration)

Four new tables in `public`, with GRANTs + RLS in the same migration.

- `assessments` — one row per assessment
  - `id uuid pk`, `slug text unique not null`, `name text`, `industry text`,
    `status assessment_status default 'draft'` (enum: draft/published/archived),
    `headline`, `subheadline`, `description`, `estimated_minutes int`,
    `primary_cta_label`, `primary_cta_url`, `secondary_cta_label`, `secondary_cta_url`,
    `seo_title`, `seo_description`, `featured_image_url`, `og_image_url`,
    `questions jsonb default '[]'` — ordered array of question configs
    (id, type, title, description, placeholder, required, default, validation, help, error, options, conditional),
    `formulas jsonb default '[]'` — ordered variable list (id, label, expression AST or step list, format),
    `result_config jsonb default '{}'` — headline, score, benchmark, summary, recommendations, CTAs, sections,
    `lead_fields jsonb default '{}'` — toggles + consent copy,
    `ai_recommendations jsonb default '[]'` — static rules (condition → recommendation, priority),
    `created_at`, `updated_at` (trigger `tg_set_updated_at`).
- `assessment_templates` — reusable presets (`name`, `industry`, `questions`, `formulas`, `result_config`, `ai_recommendations`). Seed rows via migration for the 8 example templates.
- `assessment_submissions` — one row per completed submission
  - `assessment_id fk`, `lead_id fk null`, `answers jsonb`, `computed jsonb`
    (formula outputs), `score numeric null`, `recommendations jsonb`,
    `utm jsonb`, `landing_page`, `referrer`, `country`, `device`, `browser`,
    `ip_address`, `user_agent`, `duration_seconds`, `completed boolean`,
    `created_at`.
- `assessment_events` — lightweight funnel tracker
  - `assessment_id`, `type` (view/start/step/complete/drop), `step_index null`,
    `session_id`, `created_at`.

### Grants & RLS

- `assessments`: admins full CRUD; `anon`+`authenticated` SELECT `WHERE status = 'published'` (needed for public page).
- `assessment_templates`: admins full CRUD; authenticated SELECT for the builder.
- `assessment_submissions`: admins SELECT/DELETE. INSERT allowed to `anon`+`authenticated` (public submits); no UPDATE.
- `assessment_events`: same as submissions — anon INSERT, admin SELECT.

Extend `leads` linkage by adding a `submission_id` to the submission row and reusing the existing `leads` table (insert a lead as part of the server function that finalizes a submission).

## Server functions

`src/lib/assessments.functions.ts`:
- `listAssessments`, `getAssessment(id)`, `getAssessmentBySlug(slug)` (public, published-only), `upsertAssessment`, `duplicateAssessment`, `archiveAssessment`, `deleteAssessment` — admin-gated via `requireSupabaseAuth` + `has_role`.
- `listTemplates`, `applyTemplate(assessmentId, templateId)`.
- `submitAssessment({ slug, answers, leadFields, utm, meta })` — public, no auth. Loads assessment, evaluates formulas server-side (safe evaluator, no `eval`), applies AI recommendation rules, inserts a `leads` row + `assessment_submissions` row atomically, returns the computed result payload for the results screen.
- `trackAssessmentEvent({ slug, type, stepIndex, sessionId })` — public, best-effort insert.
- `assessmentAnalytics(id)` — admin — aggregates from `assessment_events`/`assessment_submissions`.

Formula evaluator: interpret the stored `formulas` array as ordered steps `{ id, label, op: add|sub|mul|div|pct|round|min|max|avg|const|var, args: [ref] }`. No string eval — deterministic and safe.

## Admin routes (Owner Console)

New leaf routes under `src/routes/_authenticated/`:
- `admin.assessments.tsx` (layout with `<Outlet />`) — optional; use flat dot-routes:
- `admin.assessments.index.tsx` — All Assessments table (search, sort, filters, bulk archive/delete, row actions: Edit, Duplicate, Analytics, Copy Link, Archive, Delete).
- `admin.assessments.new.tsx` — starts a blank or template-seeded draft, redirects to editor.
- `admin.assessments.$id.tsx` — Builder with tabs:
  1. General (name, slug, industry, headline, CTAs, SEO, images, status)
  2. Questions (drag-reorder list; per-question inspector; supports all 18 types; conditional logic = simple `{ ifQuestionId, op, value }`)
  3. Formulas (visual step list, references question ids or prior variables, live preview)
  4. Result (editable headline, dynamic tokens like `{{monthlyLoss}}`, sections, CTAs)
  5. AI Recommendations (rule list: `when <var> <op> <value>` → recommendation, priority, CTA)
  6. Lead Capture (toggle fields, consent copy)
  7. Share (public URL, copy, preview, QR — QR via `qrcode` lib)
- `admin.assessments.templates.tsx` — grid of templates, "Use template" creates a new draft from it.
- `admin.assessments.analytics.tsx` — pick an assessment → per-assessment analytics view.

Sidebar update in `src/components/admin/owner-console.tsx`: insert new group "Assessment Engine" with children All Assessments / New Assessment / Templates / Analytics. Icon: `ClipboardList` (or similar). No other sidebar changes.

## Public experience

`src/routes/assessment.$slug.tsx` — SSR-safe route.
- Loader calls `getAssessmentBySlug` (public, published-only). 404 via `notFound()` otherwise.
- Head: uses assessment `seo_title` / `seo_description` / `og_image_url`.
- Component: Dock typography, serif hero, multi-step wizard (one question per step or grouped), progress bar, Previous/Next, auto-save to `sessionStorage` per slug, `trackAssessmentEvent` on view/start/step/complete.
- Final step: lead capture form (only enabled fields). On submit: `submitAssessment` → results screen showing dynamic result config + AI recommendations + CTAs.
- Fully responsive; no admin chrome; not linked from nav, home, sitemap, or resources.

`robots.txt` / sitemap: do not include `/assessment/*`.

## Reusable engine internals

`src/lib/assessment-engine/`:
- `types.ts` — Assessment, Question, Formula, ResultConfig, Recommendation.
- `evaluator.ts` — pure formula evaluation from answers → computed vars.
- `recommendations.ts` — rule evaluation → ranked recommendations.
- `render-tokens.ts` — `{{var}}` interpolation with formatters (currency/percent/number).
- `wizard/` — public components (Step, ProgressBar, QuestionRenderer for all 18 types).
- `builder/` — admin components (QuestionList, QuestionInspector, FormulaBuilder, ResultBuilder, RecommendationBuilder, LeadFieldsBuilder, SharePanel).

The 18 question types are all rendered through one `QuestionRenderer` switching on `type`.

## Design

- Reuse existing tokens (`bg-canvas`, `text-ink`, `border-border`, serif headings, `eyebrow`).
- No new colors, no gradients. Tables/cards match existing admin patterns.
- Public wizard mirrors `/resources` / `/about` typography.

## Non-goals (explicit)

- No changes to home, nav, footer, resources, leads, CRM, pipeline, email, analytics, settings, or the existing dashboard.
- No AI provider wiring yet — AI Recommendations run from configured rules (deterministic). Hooking a live model is a later step.
- No file-upload storage buckets for question uploads yet — the "File Upload" question type is accepted in the builder but marked "Coming soon" at runtime to avoid new bucket + RLS work in this PR.
- Booked-call metric shows `—` until a booking source exists (per your no-fake-data rule).

## Technical notes

- Migration is one file: enum + 4 tables + GRANTs + RLS + policies + updated_at triggers + template seed inserts.
- `qrcode` added via `bun add qrcode` for the Share panel; `@dnd-kit/core` + `@dnd-kit/sortable` for drag reorder (already common; will add if absent).
- Public submit path uses the server publishable client pattern for reads + `supabaseAdmin` (loaded inside handler) only for the atomic insert, after basic zod validation and per-IP rate check.
- All admin server fns use `requireSupabaseAuth` + `has_role('admin')`.
