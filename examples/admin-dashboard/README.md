# Admin Dashboard example

This Vite + TypeScript example shows a keyed, filterable, sortable data table with pagination, computed metrics, injectable data loading, and the Matrix performance timeline.

Run it with `npm install`, then `npm run dev`. Build it with `npm run build`.

The local browser fixture provides deterministic users, filters by status and name, sorts by account value, paginates rows, and records a timeline without a network service.

## Performance notes

Rows and metric cards are keyed. For production tables, paginate or virtualize server-side data before it reaches the browser.
