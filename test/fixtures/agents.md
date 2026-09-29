# Agents

Rules, not implementation. Put the constraint in a name, a type or a test.

## Layout

The `packages/ui` package owns every component, and nothing under `apps/` may
import from another app.

```sh
task check:agents
```

## Runtime

The resolver walks the scope chain outwards, binding each frame as it goes,
then returns the first hit.
