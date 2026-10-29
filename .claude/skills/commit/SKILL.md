---
name: commit
description: Commit the working tree as micro commits in Conventional Commits format (feat, fix, docs, chore, ...). Checks .gitignore for gaps first, splits the diff into the smallest self-contained commits, writes industry-standard messages, and never pushes unless asked. Use when the user says "commit", "commit this", "commit the progress", "make a commit", or runs /commit.
argument-hint: "[optional scope or note, e.g. 'only the gate changes']"
---

# Commit

Commit what is in the working tree as small, reviewable commits that follow
[Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).
Project rules in CLAUDE.md win over anything here.

## 1. Look before staging

Run these and read the output in full:

```bash
git status --short --untracked-files=all
git diff --stat
git diff --cached --stat
git log --oneline -10
```

Read the actual diff of every file you are about to commit (`git diff <path>`). Never commit a change you have not seen. If a change was not made in this session and its purpose is unclear, ask instead of guessing.

## 2. Check .gitignore first

Before committing anything else, look for files that should never be tracked:

- secrets and env files (`.env*`, `*.pem`, keys, tokens)
- build and cache output (`.next/`, `out/`, `dist/`, `coverage/`, `*.tsbuildinfo`)
- dependencies (`node_modules/`)
- per-machine settings (`.claude/settings.local.json`, editor state)
- downloaded binaries and large generated files
- tool runtime state (Impeccable's block in `.gitignore` covers `.impeccable/` caches, reviews and question logs)

If something slipped through, fix `.gitignore` and, for files already tracked, run `git rm --cached <path>`. Do this in its own `chore` commit before the others. If a secret was ever committed, stop and tell the user; ignoring it now does not remove it from history.

## 3. Micro commits

Always micro-commit. Never fold a session's work into one commit, even when the user says "commit everything". Split the diff into the smallest commits that each still build and make sense alone: one change a reviewer could read, revert, or cherry-pick without touching anything else.

**Before staging, write the plan.** List every commit you intend to make, in order, each with its message and files, and show it to the user in one short list. Then make them.

How small:

- One concern per commit. If a subject needs "and", it is two commits.
- One component, route, or config change per commit where they are independent: a new `Butterfly.tsx` and a new `Registry.tsx` are two commits; a component and the CSS that styles only it are one.
- Separate kinds of change: content and copy (`src/content/`), styling, behavior, dependencies, config, docs, and vendored tool updates each go in their own commits.
- Deletions and renames get their own commit, apart from the edits that motivated them.
- A rename or move is never mixed with content changes to the moved file.

What still belongs together:

- Files that cannot work without each other (a component and its only call site when the call site would not compile alone) stay in one commit.
- A dependency bump and its lockfile change stay together.
- Do not split so far that a commit breaks the build, fails lint, or leaves dead references. Every commit must pass `pnpm lint` and `pnpm build` on its own; when you are unsure, check the risky ones.

Order the series so each commit depends only on earlier ones: ignore and tooling fixes, dependencies and config, then core pieces (content model, shared components), then the code that wires them in, then styling passes, then tests, then docs.

**Splitting one file.** When a single file holds two concerns, split its hunks without interactive staging (`git add -p` does not work in agent shells):

```bash
git diff path/to/file > /tmp/file.patch   # edit the copy down to the first concern's hunks
git apply --cached /tmp/file.patch        # stage only those hunks
git diff --cached path/to/file            # confirm what is staged
```

If the hunks cannot be separated cleanly, commit the file with the concern it mostly serves and say so in the body.

Stage by explicit path. Do not use `git add -A` or `git add .`.

## 4. Write the message

```
<type>(<optional scope>)<!>: <subject>

<body: why the change was made, what it affects>

<footers: BREAKING CHANGE: ..., Refs: #123>
```

**Type**, from this set only:

| Type | Use for |
|---|---|
| `feat` | a new user-facing capability |
| `fix` | a bug fix |
| `docs` | documentation only (README, PRODUCT.md, DESIGN.md, comments-only changes) |
| `style` | formatting with no behavior change (not CSS design work; that is `feat` or `fix`) |
| `refactor` | code change that neither fixes a bug nor adds a feature |
| `perf` | a performance improvement |
| `test` | adding or fixing tests |
| `build` | build system, dependencies, `package.json`, `next.config.ts` |
| `ci` | CI configuration |
| `chore` | maintenance that touches no app code (`.gitignore`, tooling config, vendored tool updates) |
| `revert` | reverting an earlier commit; body names the reverted hash |

**Scope** (optional): the area touched, lowercase, one word. For this repo: `gate`, `volumes`, `experience`, `about`, `nav`, `content`, `styles`, `layout`, `fonts`, `impeccable`, `deps`, `lint`.

**Subject**:
- imperative mood ("add", not "added" or "adds")
- lowercase first word, no trailing period
- 50 characters ideal, 72 maximum including the type and scope
- says what changes, not which files ("add scroll-linked gate doors", not "update Gate.tsx")

**Body**: wrap at 72 columns, separated from the subject by one blank line. Explain why, and anything a reviewer could not tell from the diff. Skip it only for changes that need no explanation.

**Breaking changes**: add `!` after the type or scope and a `BREAKING CHANGE: <what breaks and how to migrate>` footer.

**Attribution**: follow CLAUDE.md. This project asks for no `Co-Authored-By: Claude` trailer unless the project explicitly wants it.

Avoid: vague subjects ("update files", "fix bug", "wip", "changes"), several concerns joined by "and", and emoji.

## 5. Commit and verify

Pass multi-line messages through a heredoc so nothing gets mangled:

```bash
git add path/one path/two
git commit -F - <<'EOF'
feat(gate): add scroll-linked door parting

The doors slide apart as the gate scrolls, the seam light floods,
and the screen holds black before the work section arrives.
Reduced motion keeps the gate closed.
EOF
```

- Never skip hooks (`--no-verify`) or signing. If a hook fails, fix the cause and make a new commit; do not amend a commit that was already pushed.
- After the last commit, show `git log --oneline -<n>` and `git status --short` so the user sees the result and a clean (or intentionally dirty) tree.
- Do not push. Pushing publishes the work; do it only when the user asks.

## Examples

```
chore: ignore downloaded Impeccable engine binary
build(deps): bump next to 16.4.1 for security advisory
feat(volumes): add compact project index after the gate
fix(gate): keep verse columns clear of the resume tag on mobile
refactor(content): split placeholder flag per section
docs: record Senkaimon Verse design system in DESIGN.md
feat(nav)!: point registry at in-page anchors

BREAKING CHANGE: /projects, /experience and /about routes are removed;
links now target #work, #path and #about on the homepage.
```
