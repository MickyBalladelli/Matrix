# Blog example

This Vite + TypeScript example renders a small Markdown subset as safe Matrix views. Text, headings, lists, bold text, and links are composed with `html` interpolation; Markdown is never assigned to `innerHTML`.

Run it with `npm install`, then `npm run dev`. Build it with `npm run build`.

The local browser fixture supplies deterministic posts, searches the article index, selects an article, and checks that Markdown markup is rendered without creating executable HTML.

## Performance notes

Keep Markdown parsing outside hot render paths for large documents. This small example parses only the selected article and uses keyed post cards.
