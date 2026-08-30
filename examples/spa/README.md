# SPA example

This Vite + TypeScript example combines Matrix routing, guarded view boundaries, keyed task components, form validation, resource state, lifecycle hooks, and a reactive theme.

Run it with `npm install`, then `npm run dev`. Build it with `npm run build`.

The local browser fixture navigates between Home, Tasks, and Settings, adds and toggles a task, and changes the theme without a backend.

## Performance notes

Route views are lazy at the view boundary and task rows are keyed. Keep route data in resources owned by the route component so disposal stays automatic.
