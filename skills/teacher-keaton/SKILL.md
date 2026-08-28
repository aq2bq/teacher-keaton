---
name: teacher-keaton
description: "Reverse-engineer an existing codebase into a formal specification model (CUE for structure, Quint for behavior) and project it into consistent views — glossary, concept map, sequence/state diagrams — to build and reconcile a human's mental model of the system. Use when the user wants to understand, formalize, or document an existing system's structure and behavior, or asks to reverse-engineer code into a specification, or wants a 'mental model' / 'semantic' view of a codebase. Do not use for greenfield feature implementation or ordinary code edits."
---

# Teacher Keaton

Teacher Keaton turns an existing codebase into a **formal specification model** and then
**projects** that model into consistent, human-readable views. The goal is not to generate
code but to build and reconcile a **mental model** of what a system is and how it behaves.

The method is **semantic reverse engineering**:

```
real code (source of truth)
   |  reverse-engineer
   v
formal model (Specification IR)
   |-- CUE   : structure, vocabulary, relations  (static)
   |-- Quint : states, transitions, invariants   (behavior)
   |  project
   v
views: glossary / concept map / sequence diagram / state diagram
   |  reconcile
   v
human mental model  <-- compare, find gaps, refine the model, re-project
```

All views derive from the same CUE vocabulary and Quint behavior, so terminology and
structure stay consistent across every view by construction.

## When to use

Use this skill when the user wants to:
- Understand or explain an existing system they did not write (or wrote long ago).
- Formalize a system's structure and behavior into a checkable specification.
- Produce a glossary, concept map, or behavior diagrams that stay consistent with a model.
- Onboard onto a codebase by building a mental model of it.

Do **not** use it for greenfield feature work, refactors, or ordinary code edits.

## Prerequisites

The tools require three CLIs on `PATH`. Check first and tell the user what is missing:

```sh
cue --version     # CUE   (structural validation)   https://cuelang.org
quint --version   # Quint (behavioral validation)   https://quint-lang.org
bun --version     # Bun   (runs the tools)          https://bun.sh
```

If any is missing, stop and ask the user to install it (e.g. `brew install cue quint bun`).

The tools live in this skill's `tools/` directory. Invoke them with `bun`:

```sh
bun <skill-dir>/tools/<tool> <spec-path> [options]
```

A `<spec-path>` is a directory containing the CUE (`*.cue`) and Quint (`*.qnt`) files of one
system. See `examples/` in the source repository for two complete worked examples
(`momotaro` = narrative, `todo-cli` = state machine).

## The two layers

| Layer | Tool | Question it answers | Files |
|---|---|---|---|
| Structure | CUE | "What exists and how is it connected?" | `schema.cue`, `vocabulary.cue`, `statuses.cue`, … |
| Behavior | Quint | "What can happen, and what must always hold?" | `<name>.qnt` |
| Projection | `projection.cue` | "How do state changes mean something?" | `projection.cue` |

**CUE is the source of truth for vocabulary.** Every concept has a stable id and a
display term; Quint and all diagrams reference CUE's ids/terms and never invent their own.

## Workflow

Follow these phases in order. Keep the model **sound but not complete**: formalize only
what is worth machine-checking. Leave rationale and fuzzy intent as prose.

### 1. Survey the code

Read the codebase and identify, taking notes:
- **Concepts/entities**: the nouns (e.g. Task, Character, Order). Their attributes.
- **States**: discrete states an entity can be in (e.g. a task's `backlog/active/done`).
- **Transitions**: operations that change state, and their **guards** (preconditions).
- **Invariants**: what must always be true (e.g. ids never reused; `completedAt` only when done).
- **Relations**: how concepts connect (e.g. "A is paid to B", "X starts Y").

Distinguish **observable facts** (what the code provably does) from **assumed intent**
(why it does it). Model the facts; mark intent as prose.

### 2. Author the CUE structure

Create the `spec/` directory. Define:
- `schema.cue`: the entity/record schemas, enums, and structural constraints
  (required fields, types, value ranges). Mirror any validation the code does on load.
- Domain files (e.g. `statuses.cue`): each concept with `id`, `preferredName`,
  `definition`, and `relations`.
- `vocabulary.cue`: the `vocabulary` (term→{id,kind}), `glossary` (term→{id,kind,definition}),
  `knownIds`, `relations`, and referential-integrity checks. Use `templates/` as a starting point.

Validate: `cue vet -c <spec-path>`.

### 3. Author the Quint behavior

- Write `<name>.qnt`: `var` state variables, `action init`, `action step`, one action per
  transition (with guards), and `val` invariants. Add `run ...Test` scenarios.
- Generate the constants that bind Quint to CUE's ids:
  `bun <skill-dir>/tools/gen-quint-constants <spec-path>`. This writes `constants.qnt`.
  In `<name>.qnt`, `import <Module>Constants.* from "./constants"` and use those constants —
  never raw strings.
- Validate:
  ```sh
  quint typecheck <spec-path>/<name>.qnt
  quint test      <spec-path>/<name>.qnt
  quint verify    <spec-path>/<name>.qnt --invariant <A>,<B>,<C>   # list invariants explicitly
  ```

### 4. Author the projection

Write `projection.cue`: declare, for each meaningful event, **which state change triggers it**
and **how to render it** (a `message` between participants, or a `transition` between states).
This file holds the domain interpretation that used to be hardcoded in tools. See
`docs/conventions.md` and `examples/*/spec/projection.cue`.

### 5. Check consistency

```sh
bun <skill-dir>/tools/check-consistency <spec-path>
```
This verifies Quint string literals are known CUE ids, no Japanese/raw literals leak into
`.qnt`, and `constants.qnt` is fresh.

### 6. Project and reconcile

```sh
bun <skill-dir>/tools/explain <spec-path>            # all-in-one explainer (Markdown)
bun <skill-dir>/tools/explain <spec-path> --test <testName>   # a specific scenario
```

Individual views:
```sh
bun <skill-dir>/tools/glossary            <spec-path>   # glossary (Markdown table)
bun <skill-dir>/tools/gen-mermaid-diagram <spec-path>   # concept map (Mermaid graph)
bun <skill-dir>/tools/project             <spec-path>   # behavior diagram (sequence/state/json)
```

Then **reconcile**: show the views to the human and compare against their understanding and
the real behavior. A mismatch is a finding — either the model is wrong (fix it) or the human's
mental model was incomplete (the view taught them something). Iterate: refine the model,
re-project, re-reconcile.

## Conventions (must follow)

- **Stable identity**: every concept has an id that survives renaming. Prefix by kind
  (`char-`, `item-`) or use the state name for statuses.
- **CUE owns vocabulary**: display terms and definitions live in CUE. Quint and diagrams
  resolve labels from CUE; they never hardcode names.
- **No raw strings in Quint**: reference `constants.qnt`. `check-consistency` enforces this.
- **Adaptive views**: output only the views that fit the system. A narrative suits a sequence
  diagram; a state machine suits a state diagram. Never force all four.
- **Projection is for reconciliation**, not decoration. Every view should be something a human
  can compare against reality.

## Tool reference

| Tool | Purpose |
|---|---|
| `explain` | All-in-one explainer: glossary + concept map + behavior diagram in one Markdown |
| `glossary` | Glossary (Markdown table) from CUE `glossary` |
| `gen-mermaid-diagram` | Concept map (Mermaid `graph LR`) from CUE vocabulary + relations |
| `project` | Behavior diagram from `projection.cue` + a Quint trace (`--format sequenceDiagram\|stateDiagram\|json`) |
| `gen-quint-constants` | Generate `constants.qnt` from CUE `knownIds` |
| `check-consistency` | Verify CUE↔Quint vocabulary consistency |

## Gotchas

- `quint verify` checks **only deadlocks** unless you pass `--invariant A,B,C`. Always list
  the invariants explicitly.
- `quint test` runs only `run` definitions whose names end in `Test` (case-sensitive).
- `gen-quint-constants` sanitizes hyphens in the module name (`todo-cli` → `TodoCliConstants`).
- `project`/`explain` need a trace: they run `quint run` (observation) by default, or
  `quint test --match <name>` with `--test`. Pass `--seed` for reproducibility.
- The model is **sound but not complete**. Do not try to formalize everything; formalize what
  is worth checking, and keep the rest as prose.
