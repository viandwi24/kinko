# CLAUDE.md

## Project Context — Read These First

Before making any changes, always read the relevant docs:

| File | Purpose |
|------|---------|
| `docs/product_spec.md` | What the product is, goals, target users |
| `docs/architecture.md` | System architecture, packages, tech decisions |
| `docs/builder/current.md` | What is actively being worked on right now |
| `docs/builder/tasks.md` | Backlog and planned work |
| `docs/builder/memory.md` | Persistent context, conventions, gotchas |
| `docs/builder/decisions.md` | Architectural and product decisions log |
| `docs/builder/changelog.md` | History of completed changes |

Feature-specific docs live in `docs/feats/`:
- Each file covers one feature domain: what it does, its public API, known limitations, related files.

---

## Automated Docs Protocol

You must maintain these docs automatically as part of every task. The rules below define when and where to write.

---

### docs/builder/current.md — Active Work & Context Recovery

`current.md` is **persistent working memory**. Its primary function is not just a status tracker — it is a **context recovery point**. After context compaction or a new session, read this file first to immediately know what is being worked on, which files are relevant, and what temporary decisions have been made.

**Update BEFORE starting a task:** Fill in the phase, goal, active tasks, relevant files, and important context.
**Update AFTER finishing or pausing:** Move temporary decisions to `decisions.md`, check off the checklist, update "Next Up".

When opening a new session or after compaction:
1. Read `current.md` first.
2. Resume from the "Currently Working On" and "Important Context" sections.
3. Do not start from scratch if context is still relevant.

**When to update:**
- Starting any new task (trivial or not)
- Switching focus to another area
- Hitting a blocker
- Making a temporary decision not yet in `decisions.md`
- Finishing something

**Suggested structure:**
```markdown
## Phase
<current phase name or goal>

## Currently Working On
- <active task with brief context>

## Relevant Files
- <file path> — <why it matters>

## Important Context / Temporary Decisions
- <anything that should not be lost between sessions>

## Next Up
- <what comes after the current task>
```

---

### docs/builder/tasks.md — Backlog

**When to update:**
- User requests a new feature or fix that can't be done immediately.
- You discover something that needs to be done later while working.
- A task is completed (mark done or remove it).

**Format:** checklist with short context per item.

```markdown
## Backlog

- [ ] <task> — <short context>
- [ ] <task> — <short context>

## Done

- [x] <task> — completed YYYY-MM-DD
```

---

### docs/builder/changelog.md — Done Log

**Update after every completed change.** One entry per session or per meaningful change. Include: date, what changed, which files were touched.

**Format:**
```markdown
## YYYY-MM-DD — <short title>

- <what changed>
- Files: `<file1>`, `<file2>`
```

---

### docs/builder/decisions.md — Decision Log

**When to update:**
- A non-obvious architectural or product decision is made.
- A library or pattern is chosen over an alternative.
- A tradeoff is accepted consciously.

**Format:**
```markdown
## ADR-NNN — <title>

**Context:** <why this decision was needed>
**Decision:** <what was decided>
**Consequences:** <tradeoffs, future implications>
```

---

### docs/builder/memory.md — Persistent Context

**When to update:**
- You learn a convention or pattern specific to this codebase.
- You find a gotcha or non-obvious behavior.
- The user clarifies something that should always be remembered.

**Read at the start of every session** — this is the source of truth for accumulated project knowledge.

**Format:**
```markdown
## <topic>

<short description of the convention, gotcha, or clarification>
```

---

### docs/feats/*.md — Feature Scope

**When to update:**
- A new feature domain is introduced.
- A feature's API, behavior, or scope changes significantly.

**Each file should describe:**
- What the feature does
- Its public API or interface
- Known limitations
- Related files

---

### docs/architecture.md and docs/product_spec.md

Update only when the architecture or product direction meaningfully changes. These are stable reference docs, not frequently updated.

---

## Project-Specific Rules

- **Runtime:** Bun — always use `bun` instead of `npm`, `node`, or `npx`
- **Monorepo:** Bun workspaces via root `package.json`
- **Language:** TypeScript throughout (Bun runs TS natively, no build step needed for scripts)
- **Project name:** Kinko

### Setup TUI — Wajib Diupdate Saat Ada Config Baru

Project ini punya interactive setup CLI di `apps/setup-tui/`. Setiap kali kamu:
- Menambahkan **env var baru** ke salah satu service
- Menambahkan **runtime config baru** yang perlu diisi user
- Membuat **service atau app baru** yang butuh file `.env`

**Kamu WAJIB** menambahkan field atau service-nya ke:

```
apps/setup-tui/src/config/services.ts
```

File ini adalah satu-satunya sumber kebenaran untuk setup TUI. Format field:

```ts
{
  key: 'NAMA_ENV_VAR',
  label: 'Label yang tampil di TUI',
  hint: 'Penjelasan singkat cara mengisinya',        // opsional
  default: (env) => env === 'dev' ? 'nilai-dev' : '', // opsional
  required: true,   // jika wajib diisi
  secret: true,     // jika harus di-mask (API key, private key)
}
```

**Cara jalankan setup:** `bun run setup` dari root project.

## Skills

### Metaplex

Skill files tersedia di `.claude/skills/metaplex/`. Gunakan skill ini saat bekerja dengan Solana NFTs, tokens, compressed NFTs, candy machines, token launches, atau autonomous agents.

**Wajib dibaca sebelum mengerjakan task Metaplex:**
1. `.claude/skills/metaplex/SKILL.md` — overview, tool selection, dan task router
2. File referensi sesuai task (lihat Task Router di SKILL.md)

Jangan menebak command atau API — selalu baca file referensi yang relevan terlebih dahulu.

### shadcn/ui

Skill files tersedia di `.claude/skills/shadcn/`. Gunakan skill ini saat bekerja dengan shadcn/ui components, component registries, presets, atau project dengan file `components.json`.

**Wajib dibaca sebelum mengerjakan task shadcn:**
- `.claude/skills/shadcn/SKILL.md` — principles, critical rules, workflow, component selection

Rules detail ada di subfolder `rules/`: `styling.md`, `forms.md`, `composition.md`, `icons.md`, `base-vs-radix.md`.

Gunakan `bunx --bun shadcn@latest` (bukan `npx` atau `pnpm dlx`) karena project ini menggunakan Bun.

---

### Solana Anchor

Skill files tersedia di `.claude/skills/solana-anchor-claude-skill/`. Gunakan skill ini saat bekerja dengan Solana Anchor programs, Rust program files, TypeScript tests, atau Anchor.toml configuration.

**Wajib dibaca sebelum mengerjakan task Anchor:**
- `.claude/skills/solana-anchor-claude-skill/SKILL.md` — coding guidelines, Rust & TypeScript conventions, project structure

Acknowledge bahwa guidelines telah dibaca saat mulai mengerjakan task Anchor.

---

## Confidential References — STRICT RULE

Files inside `docs/refs/` are **confidential and gitignored**. They may only be used as silent context during a session.

**Never, under any circumstances:**
- Mention the name of any file inside `docs/refs/`
- Quote, paraphrase, or cite content from `docs/refs/` in any generated file or doc
- Reference that a piece of information came from `docs/refs/`
- Expose any detail that would reveal the existence or contents of a specific ref file

This applies to: all generated code, all docs (`docs/builder/`, `docs/feats/`, `docs/product_spec.md`, `docs/architecture.md`, comments in code, commit messages, etc.)

**In-session chat only:** You may discuss contents from `docs/refs/` directly in the conversation with the user, but never write it to any file.
