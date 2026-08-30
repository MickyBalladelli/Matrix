# E-commerce example

This Vite + TypeScript example demonstrates a catalog resource with search, category filters, sorting, keyed product cards, CSS variables, and cart state.

Run it with `npm install`, then `npm run dev`. Build it with `npm run build`.

The local browser fixture injects a deterministic catalog, filters by category and search text, sorts by price, and adds a product to the cart without network access.

## Performance notes

Filtering and sorting are derived Computeds, while product cards use keyed reconciliation. Move catalog filtering to the server for very large inventories.
