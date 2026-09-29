# AGENTS.md

This repository is one GitHub Action and one CLI, and they are the same program. A rule
that governs the check belongs here; how the check works is read in
`src/check-agents-md.ts`.

## Layout

- `src/check-agents-md.ts` — the whole tool, both checks.
- `dist/check-agents-md.cjs` — the bundle the action and the published binary both run.
- `action.yml` — the composite action's inputs and outputs.
- `test/check-agents-md.test.ts` — the unit tests, with their material in `test/fixtures`.

## Rules

- Every action input has a flag of the same name, and every flag has an input. Neither is
  added without the other, because a hook and CI must be able to agree.
- The bundle is built by `npm run build` and committed in the same change as its source.
  CI fails the change when the two disagree.
- The unit tests reach for what `npm test` can run without a network or a repository: the
  model is never called from a test.
- This code carries no comments. A constraint belongs in a name, a type or a test.
- A finding names the agent file and the line that carries it, never a line of this tool.
