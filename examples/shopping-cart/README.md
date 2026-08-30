# Shopping Cart example

This app demonstrates a small catalog, cart state, History API routes, form validation, and an asynchronous order API.

Run it from a local static server and open `examples/shopping-cart/index.html`. The default API is an in-memory adapter, so the example works without a backend. Pass an `api` object with `listProducts(signal)` and `submitOrder(order, signal)` to connect a real service.

## Test

The local browser fixture at `test/examples.browser.js` injects a deterministic API, adds a product, navigates to checkout, and submits a valid order.

## Performance notes

Products and cart lines are keyed. Cart totals are Computeds, and a quantity update only changes the affected line and totals. Keep product API responses paginated when the catalog grows.
