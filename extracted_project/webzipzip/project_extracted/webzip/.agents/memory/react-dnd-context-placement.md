---
name: react-dnd DndProvider placement
description: Where to place DndProvider relative to components that call useDrag/useDrop, and the error you get if it's wrong.
---

`DndProvider` (from `react-dnd`) must be rendered by an ANCESTOR component, never by the same component function that calls `useDrag` or `useDrop`.

**Why:** Hooks execute during a component's own render phase, before its returned JSX (including any `<DndProvider>` it renders) becomes part of the mounted tree. A component can't supply context to its own hook calls by wrapping its own return value — the hook looks for context from already-mounted ancestors, not future children. Doing this throws `Invariant Violation: Expected drag drop context` and crashes the subtree.

**How to apply:** Wrap the *call site* that renders the drag/drop component, e.g.:
```
<DndProvider backend={HTML5Backend}>
  <MyDndFeatureSection />
</DndProvider>
```
not:
```
function MyDndFeatureSection() {
  const [, drop] = useDrop(...); // fails — no ancestor provider yet
  return <DndProvider backend={HTML5Backend}>...</DndProvider>;
}
```
