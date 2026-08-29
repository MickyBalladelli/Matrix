# TODO App, step by step

The example shows Matrix's minimal flow: state in signals, derivations in computed states, targeted DOM updates and simple components.

1. `todos` contains the source list and `filter` contains the current filter.
2. `visibleTodos` calculates only the selection needed by the interface.
3. `remaining` displays the remaining count without rebuilding the list.
4. `TodoInput` receives an `onAdd` callback and keeps the typed text locally.
5. `TodoList` receives visible tasks and uses `keyed` with `todo.id`.
6. `TodoRow` owns its local editing state and calls parent callbacks.
7. `use:style` adds scoped CSS and `use:vars` drives the color with a CSS variable.
8. `localStorage` keeps the tasks; cleanup removes the Effect associated with the component.

Open `index.html` through a local static server to test browser ESM imports.
