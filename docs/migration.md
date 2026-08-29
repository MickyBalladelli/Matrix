# Migration guide

## From manual DOM rendering

1. Replace a mutable variable with `signal(value)`.
2. Move the initial markup into `html`.
3. Replace update-time `querySelector` calls with a signal interpolation.
4. Mount the view with `mount`.

## From React

- Replace `useState` with a local `signal`.
- Keep JSX by enabling Matrix's `jsx-runtime` in Vite, or use `html` for a compiler-free view.
- JSX components use normal Matrix functions and receive props as usual.
- Replace `useEffect` with `effect` or `onMount`, depending on the need.
- Replace generated CSS classes with `css` and `use:style`.

Avoid copying React abstractions that only compensate for the Virtual DOM.
