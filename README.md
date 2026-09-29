# Check AGENTS.md

Hold an `AGENTS.md` to rules that live. Two checks run over what a pull request adds:

- **`rules`** — a model reads each new paragraph and says whether it states a rule or
  explains an implementation. Implementation fails the step.
- **`refs`** — every backticked path, command and identifier the file names is resolved
  against the repository. One that no longer exists fails the step.

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
- uses: 1hachem/check-agents-md@v1
  with:
    api-key: ${{ secrets.OPENROUTER_API_KEY }}
```

`fetch-depth: 0` matters: both checks judge the diff against the pull request base, and a
shallow clone has no base to diff against.

## What the file is for

An `AGENTS.md` holds the rules a coding agent works under: how things are interfaced,
which way dependencies run, where a thing belongs. It points at the files, packages,
commands and exported names the agent will need, and says in a phrase what each one is
for.

What it must never do is say how any of them works. The steps, the order they run in, the
data that moves and what happens at runtime are read in the code, because prose rots and
the code does not. A paragraph explaining the resolver's walk is wrong the day the
resolver changes, and nothing fails when it does — except the agent that believed it.

These two checks are the two ways the file rots: prose that drifted out of date, and
names that no longer exist.

## The `rules` check

Each paragraph the branch touches is judged whole, with the heading above it as context
and the added lines marked. Six questions go out in one call — where the passage sits
between naming a thing and explaining it, whether it walks through a mechanism, whether
it names a source identifier, whether it reads as a design note, what it is doing, and
(in the root file only) whether the rule really governs one package.

A passage **fails** when the model is confident it explains a mechanism, or when its
implementation mass is high and its classification agrees. A passage **warns** when it
leans that way without clearing the bar, when it names an identifier, when it reads as a
design note, or when a repository-wide file states a rule that belongs to one package. A
warning is printed and annotated; it does not fail the step.

```
FAIL  packages/interpreter/AGENTS.md:31  implementation 2.71 mass 0.93 (confidence 0.88)  mechanism 0.91  identifiers 0.74  design-note 0.12  kind=mechanism 0.87
    The evaluator walks the scope chain outwards, binding each frame as it
    goes, and returns the first hit.
```

The judgement is a probability, not a verdict. A paragraph the model did not answer for
is never counted as a paragraph that passed: the step fails and says which ones went
unjudged, even under `fail-on-violations: false`.

### The judge

The default judge is jev, asked through OpenRouter. It answers a set of typed questions
rather than returning prose, so the thresholds above are applied to numbers rather than
parsed out of a sentence.

Three values say who is asked, and where:

| | Default |
|---|---|
| `model` | `~typesafe/jev-latest` |
| `endpoint` | `https://openrouter.ai/api/alpha/decisions` |
| `api-key` | the `OPENROUTER_API_KEY` variable in the environment |

```yaml
- uses: 1hachem/check-agents-md@v1
  with:
    model: '~typesafe/jev-latest'
    endpoint: 'https://openrouter.ai/api/alpha/decisions'
    api-key: ${{ secrets.OPENROUTER_API_KEY }}
```

Pin `model` to a dated jev release rather than `-latest` when a run has to stay
reproducible, and move `endpoint` to reach the same model through another decisions
provider. Whatever answers there must take the same typed questions.

Only the `rules` check needs a key. Run `checks: refs` alone and nothing leaves the
runner.

## The `refs` check

Anything in backticks is a claim about the repository, so it is resolved:

| In the file | Resolved against |
|---|---|
| `src/parser.ts`, `packages/ui` | a tracked path, tried next to the file that names it and then from the root |
| `pnpm build`, `turbo run lint` | a `scripts` entry in some `package.json` |
| `task check:agents` | a target in `Taskfile.yml`, its aliases, and every taskfile it includes |
| `parseArgv`, `Block` | a whole-word hit in a tracked non-Markdown file |

Placeholders, globs, flags, scoped package names and `NODE_ENV`-shaped variables are not
claims, so they are skipped. Prose that names a thing which *must not* exist carries no
backticks, so it is never read as a reference.

## Modes

**Changed** (default) — only the lines the branch adds are judged, so adopting the action
on a repository with a large `AGENTS.md` costs nothing until someone edits it.

**All** — `all: true` judges every tracked agent file. Useful once, to see where a file
stands, and in a scheduled job.

**Staged** — `--staged` judges what is staged for commit. This is the git hook.

## From the command line

The action and the CLI are the same program, so a hook, a terminal and CI can share one
set of rules. Nothing is installed to try it:

```sh
npx check-agents-md --checks refs --all
```

As a dev dependency, which is what a hook wants:

```sh
npm install --save-dev check-agents-md
pnpm add -D check-agents-md
```

Or on the `PATH`, for a repository that has no package manifest of its own:

```sh
npm install -g check-agents-md
```

The published tag works too, and pins the exact bundle CI runs:

```sh
pnpm add -D github:1hachem/check-agents-md#v1
```

```sh
check-agents-md --staged --checks refs   # cheap, offline, no key
check-agents-md --staged                 # both checks, needs a key
check-agents-md --all --checks refs      # sweep the whole tree
check-agents-md --help
```

Every input below has a flag of the same name. Booleans need no value and take a `--no-`
form, and `--ignore` may be repeated. It reads the repository through `git`, so it must be
run from inside a working tree; it never takes paths as bare arguments.

## As a git hook

`--staged` narrows the run to the agent files staged for commit, which is what makes a
pre-commit hook cheap. Without it the branch diff is judged, which is what you want on
pre-push.

### husky

`.husky/pre-commit` — the offline check, so a commit never waits on the network:

```bash
pnpm exec check-agents-md --staged --checks refs
```

`.husky/pre-push` — the branch is about to be shared, so judge the prose too:

```bash
pnpm exec check-agents-md --checks rules
```

### pre-commit

```yaml
- repo: local
  hooks:
    - id: check-agents-md
      name: check-agents-md
      entry: pnpm exec check-agents-md --staged --checks refs
      language: system
      pass_filenames: false
      files: AGENTS\.md$
```

`pass_filenames: false` matters: the tool finds its own files through git, and passing
paths as bare arguments is an error.

## Configuration

Flags and `with:` are fine for one-offs, but a hook, CI and a manual run should agree. Put
the shared rules in `check-agents-md.json` at the repo root:

```json
{
  "checks": ["rules", "refs"],
  "filenames": ["AGENTS.md", "CLAUDE.md"],
  "ignore": ["^vendor/", "^examples/"],
  "model": "~typesafe/jev-latest",
  "endpoint": "https://openrouter.ai/api/alpha/decisions",
  "jobs": 4
}
```

A `"check-agents-md"` key in `package.json` works the same way. Precedence is **flag >
action input > config file > built-in default**, so CI can override a single rule with
`with:` without the config file drifting from what runs locally.

## Where the key comes from

A secret works:

```yaml
- uses: 1hachem/check-agents-md@v1
  with:
    api-key: ${{ secrets.OPENROUTER_API_KEY }}
```

So does anything that puts `OPENROUTER_API_KEY` in the environment first — a secrets
manager step, for instance:

```yaml
- uses: Infisical/secrets-action@v1.0.9
  with:
    method: universal
    client-id: ${{ secrets.INFISICAL_CLIENT_ID }}
    client-secret: ${{ secrets.INFISICAL_CLIENT_SECRET }}
    project-slug: ${{ vars.INFISICAL_PROJECT_SLUG }}
    env-slug: ci
    secret-path: /ai
    export-type: env

- uses: 1hachem/check-agents-md@v1
```

A pull request from a fork gets no secrets, so run the two checks as two jobs and let the
`refs` one cover forks.

## Inputs

| Input | Default | Description |
|---|---|---|
| `checks` | `rules refs` | Which checks to run. |
| `base` | the pull request base, else `origin/main` | Judge what the branch adds on top of this ref. |
| `all` | `false` | Judge every tracked agent file, not only what changed. |
| `only` | `''` | Restrict to one agent file, or to everything under a directory. |
| `filenames` | `AGENTS.md` | Space separated basenames read as agent files. |
| `ignore` | `''` | Regexes; an agent file whose path matches any is skipped. |
| `model` | `~typesafe/jev-latest` | Model asked to judge the prose. |
| `endpoint` | OpenRouter decisions | Provider URL it is asked through. |
| `api-key` | `''` | Key for that provider. Falls back to `OPENROUTER_API_KEY`. |
| `jobs` | `4` | Paragraphs judged in parallel. |
| `annotations` | `true` | Emit `::error` and `::warning` annotations. |
| `fail-on-violations` | `true` | Set `false` to adopt the check in warn-only mode. |
| `working-directory` | `.` | Directory to run from. |

## Outputs

| Output | Description |
|---|---|
| `files` | Agent files examined. |
| `blocks` | Prose blocks judged. |
| `failures` | Blocks carrying implementation detail. |
| `warnings` | Blocks leaning that way. |
| `references` | Backticked references resolved. |
| `dead-references` | References that no longer resolve. |

## Known limits

- Only tracked files are read — it runs `git ls-files` and `git diff`, so
  `actions/checkout` must run first, with `fetch-depth: 0`.
- Fenced code blocks are neither judged nor resolved. An example is not a claim.
- The identifier lookup is a whole-word `git grep` over non-Markdown files, so a name that
  appears anywhere in the tree resolves, even from an unrelated file.
- A model judgement is a probability. Run with `--print` to see exactly which paragraphs
  would be sent, and `--raw` to see what came back.
- GitHub renders at most 10 annotations of a level per step. The full report is always in
  the step log.

## Licence

MIT
