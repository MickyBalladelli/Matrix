# Accessibility checklist

Matrix renders native DOM and does not replace browser accessibility behavior. Use this checklist before shipping each page or interaction.

## Structure and semantics

- [ ] Use one clear page heading and a logical heading order.
- [ ] Prefer semantic elements such as `button`, `a`, `nav`, `main`, `form`, `label`, `fieldset`, and `output` before adding ARIA.
- [ ] Give repeated content a meaningful list structure.
- [ ] Give icon-only controls an accessible name with visible text or `aria-label`.
- [ ] Set the document language with `<html lang="…">`.

## Forms and validation

- [ ] Associate every control with a visible `label`.
- [ ] Set an input `type`, `autocomplete`, and `name` when they describe the field.
- [ ] Connect field help and errors with `aria-describedby`.
- [ ] Use `aria-invalid="true"` only while a field has an error.
- [ ] Put changing validation summaries in `role="alert"` or an appropriate `aria-live` region.
- [ ] Keep validation messages specific and explain how to fix the field.

```js
html`
  <label for="email">Email</label>
  <input
    id="email"
    type="email"
    use:bind=${form.fields.email}
    aria-describedby="email-error"
    aria-invalid=${computed(() => Boolean(form.errors.value.email))}
  >
  <p id="email-error" role="alert">${computed(() => form.errors.value.email ?? '')}</p>
`
```

## Keyboard and focus

- [ ] Every action works with keyboard input alone.
- [ ] Focus order follows the visual and task order.
- [ ] Focus is visible; do not remove the browser outline without a stronger replacement.
- [ ] Dialogs move focus in, keep it contained, and return it to the trigger when closed.
- [ ] Do not make a clickable `div` where a `button` or link is correct.
- [ ] Use `router.link()` on real anchors so modified clicks and browser navigation remain available.

`utilityCss()` includes the opt-in `matrix-focus-ring` class. Apply it only when its contrast and size meet the application's design requirements.

## Dynamic content and motion

- [ ] Announce loading, success, and error changes when they affect task completion.
- [ ] Do not move focus on every reactive update.
- [ ] Respect `prefers-reduced-motion` for route and list transitions.
- [ ] Provide a pause, stop, or hide mechanism for moving content that lasts longer than a few seconds.
- [ ] Ensure an async error remains visible long enough to read and recover from.

`utilityCss()` includes the opt-in `matrix-motion-safe` class, but application transitions still need a reduced-motion rule.

## Visual and touch checks

- [ ] Text and controls meet the application's contrast target after token overrides.
- [ ] Information is not conveyed by color alone.
- [ ] Content remains usable at 200% zoom and in a narrow viewport.
- [ ] Touch targets have enough size and spacing for the task.
- [ ] Placeholder text is not the only label or instruction.
- [ ] Images have useful alternative text, or are marked decorative when appropriate.

## Test the result

Run the local browser suite, then test the page manually with keyboard-only navigation, browser zoom, a screen reader, high contrast settings, and reduced motion enabled. Automated assertions can catch missing names and states, but they cannot replace a task walkthrough with assistive technology.

```bash
npm run test:browser
```
