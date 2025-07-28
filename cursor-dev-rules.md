# 🧠 Modular Health – Cursor Dev Rules

## ✅ File Naming & Structure

- **Components** go in `src/components/`  
  Use `PascalCase.tsx` for component files (e.g., `SleepChart.tsx`)
- **Pages** live in `src/pages/`  
  Follow Next.js conventions. Keep routes shallow.
- **APIs** go in `src/pages/api/`  
  Use RESTful naming: `log-entry.ts`, `oura-sync.ts`, etc.
- **Utils** go in `src/utils/`  
  Group by purpose: `supabaseClient.ts`, `healthCalculations.ts`
- **Styles** go in `src/styles/`  
  Tailwind preferred; custom styles only if necessary.

## ✍️ Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

- `feat:` for new features  
- `fix:` for bug fixes  
- `refactor:` for code structure changes  
- `chore:` for tooling or non-functional changes  
- `docs:` for README or comments  
- `test:` for adding/modifying tests

Examples:
```bash
feat: add Apple Health sync on deep link open
fix: timezone bug in Withings edge function
```

## 🧪 Code Quality & Reviews

- Use `strict` TypeScript.
- All API routes must be typed (`zod` or `ts type`).
- Use `async/await`, not `.then()`.
- Avoid `any`. Prefer `unknown` if unsure.
- Validate all inputs (API, components, and hooks).
- All logic >10 lines or with branching should be tested or documented inline.
- Reusable logic goes in `src/utils/` or custom hooks.

## 🌐 API / DB Rules

- Backend = Supabase
- Always use `supabaseClient` from `utils/`.
- Prefer **RLS** (Row-Level Security) and **Edge Functions** for sensitive ops.
- All date/time handling should be timezone-aware. Default to Europe/Stockholm.
- Use `camelCase` in TypeScript, `snake_case` in Supabase tables.

### 🔒 Security-Critical Changes

**IMPORTANT:** Any database changes with significant security impact must be confirmed before implementation, including:
- Upserting or modifying RLS policies
- Creating/altering security functions
- Changing user permissions or roles
- Modifying authentication-related tables or functions

Always ask for explicit confirmation before executing these changes.

## Xcode Project Synchronization

**CRITICAL**: Always keep Xcode project files synchronized between locations:

- **Project Structure**: `~/modularhealth/xcode-project/` (version control)
- **Xcode Project**: `~/Documents/Modular Health/Modular Health/` (active development)

### Mandatory Sync Protocol:
1. **Before modifying iOS files**: Run `npm run sync-xcode` or `./sync-xcode-files.sh`
2. **After modifying iOS files**: Run sync again to save to both locations
3. **Always verify compilation**: Ensure Xcode builds successfully after changes
4. **Use syntax-aware editing**: Avoid crude text manipulation that breaks Swift syntax

### File Modification Rules:
- ✅ Make incremental, targeted changes
- ✅ Test compilation after each change
- ✅ Preserve Swift code structure and syntax
- ❌ Never make bulk modifications without testing
- ❌ Never leave files out of sync between locations

## 📊 Logging / Tracking

- Log health data using `logEntries` table.
- Always store:
  - `user_id` (from Supabase Auth)
  - `variable_id` or `source`
  - `value`, `unit`, `timestamp`
- Logs created automatically via:
  - Manual entry (frontend)
  - Edge function (scheduled or webhook)
  - HealthKit/Oura sync (via API)

## 🎓 Educational Approach

**Always educate when knowledge gaps are apparent:**

- If a user seems unfamiliar with concepts relevant to the Modular Health app, provide educational context
- Explain domain-specific knowledge about health tracking, data integrations, or app architecture when relevant
- Share best practices and reasoning behind implementation decisions
- Provide background on technologies used (Supabase, Next.js, HealthKit, Oura API, etc.) when users seem unclear
- Offer insights into health data patterns, privacy considerations, or user experience principles when applicable
- Use examples from the codebase to illustrate concepts and explain how they apply to the user's specific situation
- Balance being helpful with being concise - educate without overwhelming

**Goal:** Empower users to become more knowledgeable developers and health app creators through each interaction.

## ⚙️ Dev Tips in Cursor

- Use `Cmd+K` to trigger commands and navigate files.
- Always split panes to keep `supabase.ts`, types, and current file visible.
- Use comments like `// @todo: refine sleep detection logic` to mark Cursor tasks.
- Use `⌘+.` to chat with AI on specific code sections.

## 🧠 Self-Experiment Design Philosophy

Even though this is not yet in MVP:
- Design with future experiments in mind.
- Variable + outcome logging should be flexible.
- All data should be traceable and visualizable.
- Avoid locking users into a rigid structure—favor `tagged`, `typed`, `timestamped` logs.

---

📁 **Save As:** `cursor-dev-rules.md`  
📂 **Location:** Root of project (`/ModularHealth/`) 