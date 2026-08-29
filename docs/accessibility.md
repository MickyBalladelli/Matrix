# Accessibility

Matrix renders native DOM and does not replace browser accessibility behavior.

- Prefer semantic HTML before adding ARIA.
- Use labels for every form control.
- Use real links with `router.link()` so modified clicks and browser navigation still work.
- Keep visible `:focus-visible` styles. `utilityCss()` includes the opt-in `matrix-focus-ring` class.
- Respect reduced motion. `utilityCss()` includes the opt-in `matrix-motion-safe` class.
- Default text and primary color tokens are intended for light surfaces, but applications must verify contrast after overriding tokens.
- Announce async errors and loading changes when they affect task completion.

Prism integration browser checks cover keyboard interaction and focus behavior for its popup, select, table, and form controls.
