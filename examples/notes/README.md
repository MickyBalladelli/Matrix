# Notes App example

This app demonstrates a complex editor form, reactive search across title/body/tags, selection state, and local storage persistence.

Run `examples/notes/index.html` through a local static server. The storage adapter can be replaced with an object implementing `getItem()` and `setItem()` for tests or another persistence layer.

## Test

`test/examples.browser.js` injects an in-memory storage adapter, searches notes, validates the editor, saves a note, and checks persistence writes.

## Performance notes

Search is one Computed over the note list, while note rows are keyed so selection and editing do not recreate unrelated DOM nodes. For large notebooks, index terms outside the render path and debounce remote search rather than serializing every keystroke.
