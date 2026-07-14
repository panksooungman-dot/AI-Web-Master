# WEBSITE BUILDER AUDIT

> Scope: `packages/cli/src/website/{types,content,scaffold,builder,agents,workflow}.ts`,
> `packages/cli/src/commands/website.ts`, `packages/cli/src/templates/website/**`.
> This is the CLI's `ai website create` feature ("Website Builder v2"), built and directly verified
> in this same working session (implementation, `npx tsc --noEmit`, full `npm install` + `npm run build`
> + `npm run lint` + `npm run start` + route-by-route `curl` check against a generated project, then
> a second generation run to confirm the `--site-type` fallback path). Read-only for this audit —
> nothing was modified during the audit pass itself.

---

## Current implementation

`ai website create` runs an 8-step Planning pipeline (existing Workflow Engine, `website/workflow.ts`, `website/agents.ts`) unchanged from its prior version, then generates the actual project via:

1. **Content Engine** (`website/content.ts`, 462 lines) — builds a deterministic default `SiteContent` object (`buildDefaultContent()`) from the user's inputs (project name, business type, target audience, brand, site type), then attempts one Provider Layer call (`ProviderManager.complete()`) asking for a large JSON object of prose overrides (headline, subheadline, per-page intros, features, testimonials, values, services, products, pricing plans, FAQ, blog posts, SEO title/description). The AI response is parsed leniently (`parseOverrides()`) and merged field-by-field (`mergeOverrides()`) — any missing/malformed field falls back to the deterministic default, and a JSON-parse failure discards the whole AI response with no error, keeping the deterministic defaults. **This guarantees a working project regardless of whether a provider is configured.**
2. **Generator** (`generators/website.ts` → `generators/template.ts:generateFromTemplate()`, the same generic template-copy engine used by `ai create agent/workflow/skill`) — copies `templates/website/` to the target directory, substituting `{{var}}` placeholders (extended this session to also render `.svg` files, for brand-colored logo/icon/placeholder assets).
3. **Tool System** — `PLANNING.md` (a transcript of the 8-step pipeline's planning output) is written via `executeTool("filesystem", ...)`, the same Tool System used elsewhere in the CLI.

No new execution engine was introduced — the feature is a composition of the existing Generator, Workflow Engine, Prompt Engine (`renderPromptTemplate` used to build the Content Engine's system prompt), Provider Layer, and Tool System.

## Supported website types

11 types, defined in `website/types.ts` (`WEBSITE_TYPES` const, 184 lines total): `website` (general/default), `landing`, `portfolio`, `corporate`, `agency`, `dental`, `hospital`, `restaurant`, `shopping`, `blog`, `education`.

Selected via `--site-type <type>` (`commands/website.ts`). An unrecognized value prints a warning and falls back to `"website"` — **directly verified this session**: `ai website create --site-type bogus-type ...` printed `⚠ Unknown site type "bogus-type" — falling back to "website" (general)` and generated a project with the general palette (`--primary: #2563eb`).

Each type maps to:
- A distinct color palette (`PALETTES` — primary/primaryDark/secondary/accent per type; background/foreground/muted/border/success/warning/danger shared across all types) — `types.ts:BRAND_COLORS`.
- Content vocabulary (`SITE_TYPE_COPY` — label, hero kicker, product noun, pricing noun, 3 feature titles, 4 service titles per type) used by the Content Engine's deterministic defaults.

**Design trade-off (not a defect, but worth stating plainly)**: the site *type* changes color palette and content vocabulary, but **not** which pages get generated — every type produces the same fixed 11-page set (see below). A "restaurant" site therefore gets a SaaS-style "Pricing" page with subscription tiers ($0/mo, $49/mo, Enterprise), which is a mismatch for that business type unless the generated content is hand-edited afterward. This was a deliberate scope-reduction decision during implementation, not an oversight — flagged here as a known limitation.

## Supported pages

All 11 requested page types are generated **unconditionally, every run**, regardless of site type:

| Page | Route | File |
|---|---|---|
| Home | `/` | `app/page.tsx` |
| About | `/about` | `app/about/page.tsx` |
| Services | `/services` | `app/services/page.tsx` |
| Products | `/products` | `app/products/page.tsx` |
| Pricing | `/pricing` | `app/pricing/page.tsx` |
| FAQ | `/faq` | `app/faq/page.tsx` |
| Blog | `/blog` | `app/blog/page.tsx` |
| Contact | `/contact` | `app/contact/page.tsx` |
| Privacy | `/privacy` | `app/privacy/page.tsx` |
| Terms | `/terms` | `app/terms/page.tsx` |
| 404 | any unmatched route | `app/not-found.tsx` |

**Missing**: no individual blog-post detail pages (`/blog/[slug]`) — the Blog page is a listing of placeholder excerpts only, with no linked detail route. No CMS/database — all content is static, generation-time text in `lib/content.ts`, editable only by hand afterward.

## Design system

- `styles/tokens.ts` — raw tokens (colors from the resolved palette, plus static typography/layout/radius/breakpoints scale, mirroring the convention in `packages/design-system/tokens.ts`).
- `styles/theme.ts` — semantic layer combining `tokens.ts` + site identity (`name`, `type`) into one `theme` export.
- `styles/theme.css` — Tailwind v4 `@theme inline` block mapping CSS custom properties to Tailwind color utilities (`bg-primary`, `text-foreground`, `border-border`, etc.), following the exact same pattern already used by `packages/design-system/theme.css`.

**Missing**: no dark-mode variant (`@media (prefers-color-scheme: dark)`) — confirmed by grep, `styles/theme.css` has no such block, unlike some other assets in this repo. No design-token documentation generated alongside the code.

## Components

12 components generated per project (`templates/website/components/`): `Header`, `Navbar`, `Footer`, `Hero`, `Features`, `CTA`, `Testimonials`, `Pricing`, `FAQ`, `ContactForm`, `Newsletter`, `JsonLd` — plus one unlisted-but-reasonable helper, `Container`, factored out to avoid repeating the `mx-auto max-w-6xl px-6` wrapper in every other component. All 11 requested component names are present.

`ContactForm` and `Newsletter` are Client Components with real fetch-based submission (`"use client"`); `FAQ` and `Navbar` are Client Components for interactivity (accordion, mobile menu); the rest are Server Components.

## SEO

- `app/robots.ts` → `/robots.txt` (Next.js file convention, same pattern as `apps/cnbiz-web/app/robots.ts`)
- `app/sitemap.ts` → `/sitemap.xml`, all 11 non-404 routes with per-route priority/changeFrequency
- `app/opengraph-image.tsx` → dynamic PNG via `next/og`'s `ImageResponse`, same pattern as the repo-root `app/opengraph-image.tsx`
- `public/manifest.json` → PWA manifest, referenced via `metadata.manifest` in `app/layout.tsx`
- Per-page `export const metadata: Metadata` on every route
- Organization JSON-LD (`components/JsonLd.tsx`, rendered once in `app/layout.tsx`)

**Missing**: no `twitter:image` distinct from the OG image (falls back to it, standard behavior, not necessarily a gap). No structured data beyond Organization (no BreadcrumbList, no per-page `Article`/`Product` schema).

## Assets

- `app/icon.svg` — Next.js file-convention favicon/app icon, brand-initial monogram on the primary color
- `public/logo.svg` — wordmark version (icon + project name text)
- `public/images/placeholder-{wide,square,portrait}.svg` — 3 generic placeholder images in the muted/border palette colors

**Missing**: no raster fallback (`.ico`/`.png`) for older browsers/platforms that don't support SVG favicons. No AI-generated imagery — all assets are procedurally-drawn SVG shapes/text, not illustration or photography.

## Deployment

- `.env.example` — `NEXT_PUBLIC_SITE_URL` (wired: `lib/site-config.ts` reads `process.env.NEXT_PUBLIC_SITE_URL` at runtime, overriding the generation-time placeholder domain) + commented-out `CONTACT_EMAIL_TO`/`CONTACT_EMAIL_FROM`/`RESEND_API_KEY` placeholders (documented but unused by the generated code — see below)
- `vercel.json` — minimal framework/build/dev/install command config
- `README.md` — full project structure, design system explanation, content-editing instructions, deployment steps

`app/api/contact/route.ts` and `app/api/newsletter/route.ts` — real server-side validation (required fields, email regex, honeypot on the contact form) and `console.log` on success. **No actual email delivery is wired in** — the `.env.example` documents `RESEND_API_KEY` etc. as an extension point, but the route code never reads those variables or calls any email provider. Forms "work" (return `{success:true}` and clear) but a real submission is only visible in server logs.

## Missing features (explicit, for the roadmap)

- No page-set customization by site type (all 11 pages always generated — see "Design system trade-off" above)
- No blog post detail pages / CMS
- No actual email delivery (contact/newsletter routes log to console only)
- No dark mode
- No `ai website update` / regenerate-in-place command — only `create`; editing after generation is manual file editing
- No language localization of the deterministic default content — `buildDefaultContent()` always writes English text regardless of the `--language` input; only the AI-enrichment prompt is instructed to "Write in {{language}}", so non-English output only happens when a provider is actually configured and succeeds
- No automated test coverage for the generator itself (consistent with the rest of the repo — see `CODE_QUALITY.md`)
- No accessibility audit run beyond default `eslint-config-next` linting (which passed with zero warnings on the generated project)
- Not exposed in the interactive `ai menu` (see `CLI_AUDIT.md`)

## Verification performed this session

- `packages/cli` — `npx tsc --noEmit` passed (after excluding `src/templates/**` from the CLI's own tsconfig, since template source files intentionally contain `{{var}}` placeholders that are not valid standalone TypeScript)
- `npm run build` (CLI package) — succeeded, `dist/templates` correctly mirrors `src/templates`
- Generated a real project (`ai website create --site-type dental ...`) — 51 files produced, no leftover unsubstituted `{{...}}` placeholders (confirmed via `grep -rn "{{"`, all remaining matches were legitimate JS/JSX double-brace syntax: `style={{...}}`, `dangerouslySetInnerHTML={{...}}`, JSX prop objects)
- `npm install` in the generated project — succeeded (356 packages)
- `npm run build` — succeeded: all 11 pages + `/api/contact` + `/api/newsletter` + `robots.txt`/`sitemap.xml`/`opengraph-image`/`icon.svg` built without error
- `npm run lint` — zero warnings/errors
- `npm run start` + `curl` against every route — all 200 (or 404 for an intentionally-missing route), dental palette color (`#0ea5e9`) confirmed present in `manifest.json`'s `theme_color`
- `/api/contact` and `/api/newsletter` — real POST requests returned `{"success":true}`
- Regenerated with an invalid `--site-type` to confirm the fallback warning + default palette

## Summary status

| Feature | Status | Evidence |
|---|---|---|
| Site type selection (11 types + fallback) | ✅ Complete | `website/types.ts`, verified this session |
| Fixed 11-page generation | ✅ Complete | `templates/website/app/**`, verified this session |
| Per-site-type page customization | ❌ Missing | design trade-off, see above |
| Design system (tokens/theme/theme.css) | ✅ Complete | `templates/website/styles/*` |
| 12 components | ✅ Complete | `templates/website/components/*` |
| SEO (robots/sitemap/OG/manifest/JSON-LD/metadata) | ✅ Complete | `templates/website/app/{robots,sitemap,opengraph-image}.ts(x)`, `public/manifest.json` |
| Assets (logo/icon/placeholders) | ✅ Complete (SVG only, no raster) | `templates/website/app/icon.svg`, `public/*` |
| Deployment files (.env.example/vercel.json/README) | ✅ Complete | `templates/website/{.env.example,vercel.json,README.md}` |
| Content generation via Provider Layer | ✅ Complete, with deterministic fallback | `website/content.ts` |
| Actual email delivery | ❌ Missing | `templates/website/app/api/{contact,newsletter}/route.ts` — logs only |
| Blog detail pages / CMS | ❌ Missing | `templates/website/app/blog/page.tsx` — listing only |
| Dark mode | ❌ Missing | `templates/website/styles/theme.css` |
| CLI menu integration | ❌ Missing | not in `menu.json` |
