# Advanced routing

`createRouter` uses the browser History API. Routes match the normalized pathname; query strings and hashes remain available through `router.search` and `router.hash`.

## Guards

`beforeEach` runs before the URL changes. Return `false` to cancel navigation. It may return a Promise for an asynchronous check.

```js
const session = signal(null)

const router = createRouter([
  { path: '/', view: Home },
  { path: '/login', view: Login },
  { path: '/admin', view: Admin }
], {
  beforeEach: async ({ to }) => {
    if (to?.path === '/admin' && !session.value) {
      return false
    }

    return true
  },
  afterEach: ({ to }) => {
    document.title = to?.path ?? 'Matrix app'
  }
})

router.start()
```

The result of `await router.navigate('/admin')` is `false` when the guard blocks the route and `true` after a successful navigation. Keep authorization on the server as well; a client guard is not access control.

## Parameters, query, and hash

Route parameters are decoded strings:

```js
const router = createRouter([
  { path: '/users/:id', view: User },
  { path: '/files/*path', view: FileBrowser }
])

const User = ({ id, route }) => html`
  <h1>User ${id}</h1>
  <p>Current path: ${route.path}</p>
`
```

`router.current.value` contains the matched route and its `params`. `router.search.value` includes the leading `?`; `router.hash.value` includes the leading `#`.

## Redirects

Use a string redirect for a fixed move or a function when the destination depends on route parameters:

```js
const router = createRouter([
  { path: '/home', redirect: '/dashboard' },
  {
    path: '/invite/:token',
    redirect: ({ route }) => `/signup?invite=${encodeURIComponent(route.params.token)}`
  },
  { path: '/dashboard', view: Dashboard }
])
```

Redirects replace history. Matrix stops after ten redirect hops and throws `Router redirect limit exceeded` for a loop.

## Navigation options

```js
await router.navigate('/settings?tab=profile', {
  replace: true,
  scroll: false
})
```

`replace` avoids adding a history entry. By default, a successful navigation scrolls to the top; `scroll: false` keeps the current position. A hash scrolls to the matching element ID.

Use `router.link(path)` for an anchor handler. It preserves modified-click behavior and lets normal browser navigation continue when the user uses a non-primary or modified click:

```js
html`<a href="/settings" @click=${router.link('/settings')}>Settings</a>`
```

## Deep links

Configure the deployed server to return the application `index.html` for unknown client routes. The browser must load the same application entry for `/users/7` as it does for `/`. Vercel example:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Set `base` when the application is served below a path:

```js
const router = createRouter(routes, { base: '/admin' })
```

The router accepts same-origin URLs only. It throws for a cross-origin navigation.

## Rendering the active route

`routerView` returns a Computed view. Give it a fallback for unmatched routes:

```js
const activeView = routerView(router, () => html`<h1>Not found</h1>`)
const App = () => html`<main>${activeView}</main>`
```

## Transitions

Matrix does not add a transition system. Wrap navigation with the browser View Transitions API when available and keep a normal navigation fallback:

```js
async function navigateWithTransition(path) {
  if (typeof document.startViewTransition !== 'function') {
    return router.navigate(path)
  }

  let result
  const transition = document.startViewTransition(async () => {
    result = await router.navigate(path)
  })
  await transition.finished
  return result
}
```

Add the animation in CSS with `::view-transition-old(root)` and `::view-transition-new(root)`. Respect `prefers-reduced-motion` and do not make navigation depend on the animation finishing.
