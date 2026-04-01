# Automated Docs Protocol — Reusable Setup Prompt

Copy the section below into your `CLAUDE.md` (or equivalent AI builder instruction file) to enable the same automated docs architecture used in this project. Adjust folder paths, doc filenames, and language to match your project.

---

## PROMPT START — Copy from here

---

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

## PROMPT END

---

## Task: Setup CLAUDE.md for a New Project

Give this task to the AI builder when setting up a new project. The AI will create or update `CLAUDE.md` with the automated docs protocol and generate all required stub doc files.

---

**Task prompt — copy and give to your AI builder:**

> **Task: Setup Automated Docs for This Project**
>
> Read `docs/setup-automated-docs.md` in this repository (or the one I've shared with you) to understand the automated docs architecture. Then do the following:
>
> 1. **Inspect `CLAUDE.md`** in this project root.
>    - If it does not exist: create it from scratch.
>    - If it already exists: read it, then append the automated docs protocol at the end without removing existing content.
>
> 2. **Add the following sections to `CLAUDE.md`** (adapt paths to match this project's actual structure):
>    - `## Project Context — Read These First` — a table linking to all the doc files listed below
>    - `## Automated Docs Protocol` — full protocol rules for `current.md`, `tasks.md`, `changelog.md`, `decisions.md`, `memory.md`, `feats/*.md`, and the stable reference docs
>
> 3. **Create the doc stub files** if they don't already exist:
>    - `docs/product_spec.md` — stub: ask me to fill in the product description, or leave a `<!-- TODO -->` placeholder
>    - `docs/architecture.md` — stub: ask me to fill in the architecture, or leave a `<!-- TODO -->` placeholder
>    - `docs/builder/current.md` — stub with `## Phase\nBootstrap`
>    - `docs/builder/tasks.md` — stub with `## Backlog\n(empty)`
>    - `docs/builder/changelog.md` — stub with `# Changelog`
>    - `docs/builder/decisions.md` — stub with `# Decisions`
>    - `docs/builder/memory.md` — stub with `# Memory`
>    - `docs/feats/` — create the directory (leave empty for now)
>
> 4. **Do not overwrite** any file that already has meaningful content — append or merge instead.
>
> 5. After completing setup, update `docs/builder/current.md` with phase = "Bootstrap" and note what was just created.
>
> 6. Log the setup in `docs/builder/changelog.md` with today's date.

---

## How to Adapt This to Your Project

1. **Change folder paths** if your project uses a different structure (e.g., `.docs/`, `wiki/`, `notes/`).
2. **Rename files** to match your conventions (e.g., `CURRENT.md`, `BACKLOG.md`).
3. **Remove sections** you don't need (e.g., skip `feats/` if you have no feature-scoped docs).
4. **Add project-specific rules** after the protocol block (e.g., runtime preferences, testing commands).
5. **Translate** the language of the instructions if your team works in a non-English language — the AI builder will follow instructions in any language.

## File Structure to Bootstrap

Create these files before your first session so the AI builder has something to read and update:

```
docs/
├── product_spec.md        ← describe what the project is
├── architecture.md        ← describe the system structure
├── feats/                 ← one file per feature domain (optional)
└── builder/
    ├── current.md         ← start with "## Phase\nBootstrap" 
    ├── tasks.md           ← start with "## Backlog\n(empty)"
    ├── changelog.md       ← start with "# Changelog"
    ├── decisions.md       ← start with "# Decisions"
    └── memory.md          ← start with "# Memory"
```

Tip: the files can be empty stubs — the AI builder will populate them as it works.
