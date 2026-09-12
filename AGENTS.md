<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
## Directory Exclusions (ALL Agents Must Respect)

The following directories are **AI agent infrastructure**, not application source code.
**Never** browse, index, search, read, or include files from these directories when answering questions or generating code — they contain thousands of irrelevant files that will pollute context:

| Directory | What it is |
|---|---|
| `ruflo/` | Cloned Ruflo agent harness source (5000+ files, not this app) |
| `.swarm/` | Ruflo's vector memory database |
| `.claude-flow/` | Ruflo runtime data (logs, sessions, config) |
| `.claude/` | Claude Code settings, hooks, and agent configs |
| `.agents/` | Cross-agent skills and MCP configs (meta-config only) |
| `graphify-out/` | Auto-generated knowledge graph output |
| `dist/` | Build output |

When a user asks about "the codebase", focus on `components/`, `src/`, `hooks/`, `lib/`, `pages/`, `public/`, and root-level config files (`.ts`, `.tsx`, `.json`) only.

---

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.


Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## BigQuery Crashlytics Protocol
When asked to investigate a recent crash:
1. **Use the Helper Script**: Do not write SQL manually. Run the helper script `.\fetch_crash.ps1 -Version "TARGET_VERSION"` to instantly fetch the most recent crashes.
2. **What the Script Does**:
   - Queries the `_REALTIME` table for instant results.
   - Extracts the exact **file and line number** of the crash (`exceptions[0].frames[0].file/line`).
   - Extracts the **OS Version** for reproducing device-specific bugs.
   - Restricts the query to the **last 7 days** (`TIMESTAMP_SUB`) to optimize BigQuery data scanning costs.
   - Automatically handles PowerShell escaping and SQL file generation.

## UI Modification Rules
To avoid unnecessary back-and-forth when modifying UI components:
1. **Preserve Element Structure**: When asked to apply a "theme color" to a button or icon, DO NOT change the background or turn it into a solid filled button unless explicitly told to. Only apply the color to the relevant icon, text, or border to preserve the original design.

## B2 Storage
- The `cpbs-videos` Backblaze B2 bucket is **private**. It requires authentication (e.g. `aws4fetch` signed requests) to access files. Never assume it is public or proxy to it without signing.

## Environment & Credentials (`.env` Fallback)
Before working on any service-related task, always check the environment (.env) file first and use the available credentials/configurations from it.

The .env file may contain access credentials/configuration for:
- Backblaze B2 Storage
- YouTube API
- Cloudflare
- GitHub
- Firebase

For GitHub and Firebase specifically:
- If terminal authentication/login is already available, use it.
- If GitHub is not authenticated through the terminal, use the GitHub Personal Access Token (PAT) stored in the .env file.
- If Firebase Admin is not configured or terminal authentication is not available, use the Firebase credentials available in the .env file.

For other services like Backblaze B2 Storage, YouTube API, and Cloudflare:
- Use the credentials/configuration available in the .env file directly when required.

Always check the available environment variables and existing project configuration first before assuming any service is unavailable or asking for manual credentials.

Keep this workflow in mind for all future development, debugging, and infrastructure-related tasks.

## B2 Video Optimization Pipeline
- **Problem**: MP4 videos uploaded directly to cloud storage often buffer endlessly because the `moov` atom is at the end of the file, preventing the browser from parsing metadata until the whole video is downloaded.
- **Solution**: The project uses a zero-cost FFmpeg optimization pipeline via GitHub Actions to run `ffmpeg -movflags +faststart` on all videos.
- **How it works**:
  1. **New Uploads**: When the app (React/Capacitor) uploads a video using `b2Uploader.ts`, it automatically calls the Cloudflare Worker webhook at `/api/trigger-optimization`. The Cloudflare worker securely triggers the `.github/workflows/optimize-new-video.yml` GitHub Action using a PAT.
  2. **Batch/Direct Uploads**: The `.github/workflows/optimize-batch-videos.yml` runs weekly (or manually) to scan the entire B2 bucket, uses `ffprobe` to check for unoptimized videos (where `mdat` comes before `moov`), and optimizes them.
- **Rules**:
  - Never change the public video URLs, names, or B2 bucket folder structures during optimization. The GitHub Actions download, optimize, and *overwrite* the file in place.
  - Do NOT give GitHub Actions direct access to Firebase Database. The Actions should only interact with B2 storage or Cloudflare workers to keep concerns separated.
  - Notifications for successes and failures are sent to Telegram using `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` secrets.
  - **Zero-Egress B2 Access**: When writing any new GitHub Actions (YAML files) or scripts that download or scan files from Backblaze B2, NEVER use direct `b2 file url` or `fXXX.backblazeb2.com` endpoints. ALWAYS use the Cloudflare CDN proxy URLs (e.g., `https://audios.chaitanyaprembhakti.org/...` or `videos...`) to ensure Bandwidth Alliance zero-egress billing applies.

## Client-Side Uploads to B2 (Preventing Ghost Files)
When implementing direct client-side uploads (e.g., from the React frontend to Backblaze B2 via Cloudflare worker), ALWAYS use the **Draft/Placeholder Pattern** to prevent orphaned "ghost" files in B2 if the app is killed during upload:
1. **Pre-Save**: Save a placeholder document in Firestore with `status: "uploading"` *before* starting the B2 upload.
2. **Upload**: Perform the `uploadFileToB2` call.
3. **Commit**: Update the Firestore document to `status: "pending" / "published"` with the actual CDN URL.
4. **Filter**: Ensure `getUserGlorifications` or equivalent queries explicitly filter out `status === "uploading"` so drafts never appear in the UI. 
**Tracking Ghost Files is Easy**: Ghost files will no longer be hidden! If you ever need to delete incomplete files, just look for the documents in Firebase that have had the `status` of `"uploading"` for several hours. (In the future, you can write a small script to clean up these documents and B2 files all at once).

## PowerShell & Unicode File Safety (CRITICAL)

This project contains **Hindi (Devanagari) text** inside source files (`.tsx`, `.ts`). Using PowerShell to read and rewrite these files without explicit UTF-8 encoding **will corrupt all Hindi text** (turns `ठाकुर जी के दर्शन` into mojibake like `à¤ à¤¾à¤•à¥à¤° à¤œà¥€`).

**Rules — strictly follow every time:**
- **NEVER** use bare `Get-Content` + `Set-Content` on any `.tsx`/`.ts`/`.json` file in this project.
- If PowerShell reads are unavoidable, ALWAYS specify `-Encoding UTF8`:
  ```powershell
  Get-Content $path -Encoding UTF8
  Set-Content $path $lines -Encoding UTF8
  ```
- **Preferred approach**: Use the built-in `replace_file_content` or `multi_replace_file_content` editor tools instead of PowerShell for any source file edits — these are UTF-8 safe by design.
- If a file gets corrupted by encoding issue: run `git stash -- <file>` to restore the original, then re-apply only the needed change using editor tools.
- **Files most at risk**: `components/HomeScreen.tsx`, any file with `isHindi ?` ternaries, or any file with inline Devanagari string literals.



# Design System Generator — Agent Instructions
#
# This file enables the Design System Generator skill for OpenAI Codex and similar agents.
# https://github.com/XINGANLIU/design-system-generator-skill

## Skill: Design System Generator

When the user asks to create a design system, generate a color palette, build a theme,
create UI tokens, or set up brand styles, follow the workflow defined in:

**Main instructions**: `skills/design-system-generator/SKILL.md`

### Quick Reference

This skill generates a complete, production-ready design system from a single brand color:

1. **Brand Input** → Collect brand color (hex/rgb/oklch), font family, border radius style
2. **Color System** → OKLCH palettes: primary (10 steps), neutral (10 steps), semantic (success/warning/error/info)
3. **Tokens** → W3C Design Tokens JSON + CSS custom properties with Light/Dark theme support
4. **Components** → Button, Card, Input, Badge, Alert, Avatar, Skeleton, Tooltip, Modal, Navbar, Divider
5. **Preview** → Self-contained HTML preview page with theme toggle

### Reference Documents

Read these as needed during generation:

| File | Content |
|------|---------|
| `skills/design-system-generator/references/color-system.md` | OKLCH color palette algorithm |
| `skills/design-system-generator/references/typography-scale.md` | Font size/weight/line-height scales |
| `skills/design-system-generator/references/spacing-system.md` | Spacing, radius, shadow, z-index, transitions |
| `skills/design-system-generator/references/component-patterns.md` | CSS patterns for each component |
| `skills/design-system-generator/references/dark-mode-guide.md` | light-dark(), theme toggle, semantic token mapping |

### Output Structure

```
design-system/
├── tokens.json       # W3C Design Tokens
├── tokens.css        # CSS Custom Properties
├── components.css    # Component styles
└── preview.html      # Visual preview page
```

### Key Constraints

- All colors MUST use OKLCH color space
- Components MUST only use `var(--token-name)` — no hardcoded values
- WCAG 2.2 AA contrast compliance required
- Support Light and Dark themes via `light-dark()` + `[data-theme]`
- Follow phases in order, confirm with user between phases




### Instructions

- Use the `docs/` directory as the source of truth for internal project contracts and implementation-planning documents.
- All repository-wide rules must be defined in this `AGENTS.md`.
- List files in `docs/` before starting each task, and keep `docs/` up-to-date.
- After completing each task, update the relevant `AGENTS.md` and `docs/` files in the same change when policies, structure, or contracts changed.
- Write all content in English, including code, comments, commit messages, PR titles, PR descriptions, issue titles, and issue bodies.
- Run `bash scripts/validate-skill-md.sh` before finishing any task that modifies skill bundle files.
- Run `bash skills/design-farmer/tests/run-all.sh` before finishing any task that modifies phase files, tests, or cross-phase contracts.
- Commit when each logical unit of work is complete; do NOT use the `--no-verify` flag.
- Run `git commit` only after `git add`; keep each commit atomic and independently revertible.
- After addressing pull request review comments and pushing updates, mark the corresponding review threads as resolved.
- When no explicit scope is specified and you are currently working within a pull request scope, interpret instructions within the current pull request scope.
- Do not guess; search the web instead.
- When accessing `github.com`, use the GitHub CLI (`gh`) instead of browser-based workflows when possible.
- Rules using MUST/NEVER are mandatory. Rules using prefer/whenever possible are guidance.

### Repository Structure Map

- `docs/`: Source of truth for internal project contracts and implementation-planning documents.
  - `docs/project-template.md`: Required structure for every new project document.
  - `docs/project-<id>.md`: Per-project contract document (created before implementation begins).
  - `docs/README.md`: Explains the role of internal project-contract docs and how they differ from user-facing docs.
- `skills/`: Skill bundles distributed to end-user AI tools.
  - `skills/design-farmer/SKILL.md`: Router — frontmatter, voice, phase index, cross-phase contracts.
  - `skills/design-farmer/phases/`: Phase instruction files (`phase-*.md`, `operational-notes.md`).
  - `skills/design-farmer/docs/`: Companion docs (`PHASE-INDEX.md`, `QUALITY-GATES.md`, `MAINTENANCE.md`, `EXAMPLES-GALLERY.md`).
  - `skills/design-farmer/examples/`: Reference examples (`DESIGN.md` — Nova UI greenfield reference).
  - `skills/design-farmer/bin/`: Executable utilities (`version-check`).
  - `skills/design-farmer/tests/`: Test suites (`run-all.sh`, `test-semantic-consistency.sh`, `test-version-check.sh`).
- `scripts/`: Repository-level validation and CI scripts.
  - `scripts/validate-skill-md.sh`: Structural validation (phase files, router references, contracts).
  - `scripts/release.sh`: Atomic release automation (version bump, file sync, tag creation).
  - `scripts/release-sync-manifests.mjs`: Schema-aware synchronization of `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` from `package.json`; importable as a library and invokable as a CLI from `release.sh`.
  - `scripts/__tests__/release-sync-manifests.test.mjs`: `node --test` unit tests for the manifest sync module (baseline, unknown-field preservation, schema-forbidden stripping).
  - `scripts/test-install-smoke.sh`: Install/uninstall smoke tests across tools and shells.
- `.github/`: GitHub configuration.
  - `.github/workflows/skill-quality.yml`: CI pipeline (structural validation, plugin manifest validation, install/uninstall smoke tests).
  - `.github/pull_request_template.md`: PR template with validation evidence checklist.
  - `.github/dependabot.yml`: Dependabot configuration that tracks GitHub Actions pins on a weekly schedule.
- `.claude-plugin/`: Claude Code Marketplace plugin metadata.
  - `.claude-plugin/plugin.json`: Marketplace plugin manifest (name, version, skills path).
  - `.claude-plugin/marketplace.json`: Marketplace listing metadata (owner, plugins array, tags, category).
- `package.json`: Single source of truth for version and release metadata (`private: true`, no npm publish).
- `INSTALLATION.md`: Canonical install lifecycle guide, including Marketplace UI and CLI flows, curl installer, manual setup, troubleshooting, and optional removal.
- `install.sh`: Automated installer (detects tools, supports selective target flags, downloads skill bundle atomically).
- `uninstall.sh`: Automated uninstaller (detects/selects tools and removes only `skills/design-farmer` targets safely).
- `docs/marketplace-release-procedure.md`: Step-by-step marketplace release workflow.
- `AGENTS.md`: This file — repository-wide rules.
- `CONTRIBUTING.md`: Contributor workflow (branch naming, commit convention, PR requirements).
- `README.md`: Project overview, installation, and documentation links.
- `README.*.md`: Localized overview and installation entrypoint documents.

### Documentation Policy

- New feature or subsystem creation requires a `docs/project-<id>.md` before implementation begins.
- Every structural change to file paths or phase boundaries must update the corresponding `docs/` file in the same change.
- Repository-wide policy updates must be written in this `AGENTS.md` in the same change.

### Naming Rules

- Use lowercase kebab-case for directory names.
- Phase files follow the pattern `phase-{N}-{short-name}.md` where `{N}` is the phase number (including sub-phases like `3.5`, `4b`, `4.5`, `8.5`).
- Internal sections within a phase file use `{phase_number}.{section}` numbering scoped to that file. When a section number coincides with a sub-phase file number (e.g., section 8.5 within Phase 8 vs Phase 8.5 file), they are distinguished by file context. Prefer structural merging to eliminate overlaps when content allows it (e.g., Phase 3 absorbed section 3.5 into 3.2). When merging is not feasible, accept the shared number — each phase file is loaded independently so no execution ambiguity arises.
- Companion docs use UPPER-KEBAB-CASE filenames (`PHASE-INDEX.md`, `QUALITY-GATES.md`).

### GitHub Issue Style Contract

- Use issue titles in the format `<domain>: <description>`.
- `<domain>` must use a stable lowercase identifier (e.g. `skill`, `phase`, `installer`, `ci`, `docs`, `tests`).
- `<description>` should be concise and specific, starting with a lowercase verb phrase when possible.
- Do not use bracket-style prefixes like `[phase]`.
- Use the following Markdown section order for issue bodies:
  - `## Summary`
  - `## Evidence`
  - `## Current Gap`
  - `## Proposed Scope`
  - `## Acceptance Criteria`
  - `## Out of Scope`
- Optional `## Additional Notes` may be appended only when needed.

### PR Review Response Policy

When asked to review comments on a GitHub PR:

1. Evaluate each comment and decide whether to apply the feedback.
2. Apply the change if it is clearly necessary (correctness, security, documented contract).
3. Reply to each comment thread with the decision and reasoning:
   - **Applied**: explain what was changed and why.
   - **Rejected**: explain why the feedback does not apply or conflicts with intentional design.
4. Resolve the comment thread after replying.

**GitHub API notes:**
- Reply: `gh api --method POST repos/{owner}/{repo}/pulls/{pr}/comments/{comment_id}/replies -f body="..."`
- Get thread node IDs (`PRRT_...`): GraphQL `repository.pullRequest.reviewThreads` -> `nodes { id isResolved comments(first:1) { nodes { databaseId } } }`
- Resolve: GraphQL `mutation { resolveReviewThread(input: {threadId: "PRRT_..."}) { thread { isResolved } } }`
- Always reply first, then resolve every thread.

### Skill Bundle Rules

- `SKILL.md` is the canonical runtime entrypoint. Phase instructions live in `phases/phase-{N}-*.md`.
- If phase boundaries, file names, or quality criteria change, update the corresponding phase file, `docs/PHASE-INDEX.md`, `docs/QUALITY-GATES.md`, `docs/MAINTENANCE.md`, and `scripts/validate-skill-md.sh` in the same PR.
- Phase files MUST NOT reference nonexistent companion documents or removed phases.
- The installer (`install.sh`) MUST ship every file referenced by `SKILL.md`. Adding or removing a bundle file requires updating `BUNDLE_FILES` in `install.sh` in the same PR.
- Cross-phase contracts in `SKILL.md` MUST accurately reflect phase file contents.

### Testing Rules

- All test suites MUST pass before a PR is merged.
- Three test suites exist:
  1. **Structural validation** (`scripts/validate-skill-md.sh`): phase file existence, router references, orphan detection, completion status protocol, cross-phase contracts, discovery interview gating, tool-contract keywords.
  2. **Semantic consistency** (`skills/design-farmer/tests/test-semantic-consistency.sh`): cross-reference section numbers, config field coverage, phase flow sequence, status message completeness, handoff chain, docs alignment, Fix Loop Protocol coverage, Phase 0 re-entry paths, conditional question gates, Phase 4b light-only guard, Phase 6 non-React guardrail, cross-phase data dependencies, pipeline state tracking.
  3. **version-check behavior** (`skills/design-farmer/tests/test-version-check.sh`): Releases API primary path, SKILL.md-on-main fallback path, and silent exit when both upstream sources are unreachable — uses `file://` URL overrides so the suite runs offline.
- All three suites are run together by `skills/design-farmer/tests/run-all.sh`.
- When adding a new phase, branching condition, or config field, add corresponding test coverage in the appropriate suite.

### Commit Convention

Use concise, purpose-first messages:

- `feat: ...`
- `fix: ...`
- `test: ...`
- `docs: ...`
- `chore: ...`

Recommended format:

```text
<type>: <what changed and why>
```

### Shell Command Safety Rules

- Use `$(...)` for command substitution; do not use legacy backticks in new scripts.
- Wrap all file paths in quotes by default in shell commands and scripts to prevent whitespace and glob-expansion bugs.
- Apply strict quoting and escaping for all dynamic shell values to prevent command injection and parsing bugs.
- Use `mktemp` for temporary files; never write to predictable paths in `/tmp`.

### GitHub Actions Major Upgrade Policy

- Treat GitHub Action major-version bumps as compatibility changes, not routine dependency updates.
- Review upstream release notes for each intermediate major version before merging a bump.
- Classify documented breaking changes against this repository's actual workflow inputs and job behavior.
- Require green PR checks on the bumped branch before merge.
- If a major cannot be merged safely, document the reason and use the narrowest possible `.github/dependabot.yml` ignore rule.

### CI Baseline

Repository-wide quality CI runs on every pull request and push to `main`.

Jobs:
- `validate-skill`: runs `bash scripts/validate-skill-md.sh` and `bash skills/design-farmer/tests/run-all.sh` — fails if any structural, semantic consistency, or version-check behavior suite fails.
- `validate-plugin`: pins `actions/setup-node@v6` to Node `20.18`, explicitly disables package-manager auto-cache to keep CI behavior stable, runs `node --test scripts/__tests__/release-sync-manifests.test.mjs` to exercise the schema-aware manifest sync module, then installs `@anthropic-ai/claude-code@~2.1.0` and runs `claude plugin validate .` — fails if the sync module regresses or if `.claude-plugin/plugin.json` or `.claude-plugin/marketplace.json` drifts from the Claude Code plugin/marketplace schema. Both the Node and CLI versions are pinned so upstream releases cannot break unrelated PRs without a commit in this repository; Dependabot (`.github/dependabot.yml`) bumps the GitHub Actions pins on a weekly schedule.
- `install-smoke`: runs `bash scripts/test-install-smoke.sh` across 5 tools x 2 shells (bash, zsh) — fails if any install/uninstall smoke test fails.

## UI & Design Generation Guidelines

When generating UI components, web pages, or applying design systems, you **MUST** automatically adhere to the following internal guidelines and reference skills without the user needing to explicitly invoke them:
1. **Taste Skill**: Actively apply principles from `.agents/skills/taste-skill` to avoid generic, "slop" UI code. Focus on good layout, typography, spacing, hierarchy, and motion.
2. **Web Design Guidelines**: Ensure components comply with standard web heuristics and accessibility patterns outlined in `.agents/skills/web-design-guidelines`.
3. **Image-to-Code**: When implementing UIs from images, utilize the patterns described in `.agents/skills/image-to-code-skill` to achieve accurate translations.
4. **Awesome Design MD**: Before creating a new design system from scratch, explore `.agents/skills/awesome-design-md/design-md` for existing top-tier references and integrate those patterns when appropriate.
5. **Goldie**: When the user requests to generate App Store or Google Play screenshots, preview videos, or captures for mobile apps, automatically utilize the `goldie` skill located at `.agents/skills/goldie`.

Always build high-quality, non-templated interfaces that feel "tasty" and production-ready by default.

## AI Agent Behavior & Workflow Guidelines

When interacting with the user, generating responses, or building workflows, you **MUST** automatically adhere to the following internal guidelines without the user needing to explicitly invoke them:
1. **No AI Slop**: Actively apply principles from `.agents/skills/no-ai-slop` to remove generic AI-writing habits and ensure your text feels natural and human-like.
2. **I Have ADHD**: Follow `.agents/skills/i-have-adhd` to make your responses shorter, clearer, and straight to the point.
3. **Book to Skill**: Use `.agents/skills/book-to-skill` when the user wants to turn books and documents into reusable knowledge.
4. **Omni Route**: When building autonomous multi-model routing or when checking API quotas and health, automatically utilize `.agents/skills/omni-route`.
