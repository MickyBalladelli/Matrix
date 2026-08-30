# Security

Matrix helps with safe defaults, but application code still owns authentication, authorization, network requests, and the handling of untrusted data.

## XSS and text rendering

Interpolated text and ordinary attribute values are escaped by the renderer. Prefer interpolation:

```js
html`<p>${untrustedText}</p>`
```

Matrix does not provide a `dangerouslySetInnerHTML` primitive. Do not put untrusted content into `.innerHTML`, `outerHTML`, or another DOM property that parses markup. If trusted raw HTML is truly required, sanitize it with a maintained, correctly configured sanitizer before assigning it and keep that boundary explicit.

Never build template source from user input. Template strings must be authored code; user values belong in expressions.

## URLs

Matrix rejects dynamic `javascript:`, `vbscript:`, and `data:` values in URL attributes and URL properties. Still validate application URLs against an allowlist when they come from users or a remote API.

Prefer relative or known-origin URLs for links, images, forms, and redirects. For links that open a new window, use `rel="noopener noreferrer"` with `target="_blank"`.

## Input handling

Dynamic values remain data in text, ordinary attributes, DOM properties, SVG text, and `foreignObject` content. Matrix does not parse an interpolated string as HTML or XML. Route parameters are decoded as data; malformed percent-encoding is rejected before a route is committed.

## CSS and style values

CSS source is not an HTML sanitizer. Keep `css()` and `globalCss()` definitions static. `cssVariables()` accepts only simple CSS custom-property names and primitive values; it rejects declaration delimiters, CSS rule delimiters, executable protocols, and dangerous CSS functions. Treat user-controlled values as data and pass only validated values through `cssVariables` or an allowlisted class/token map.

Do not use a user string as a selector, property name, or CSS rule. A CSS value can affect layout, privacy, or the ability to spoof application UI even when it is not JavaScript.

## Form sanitization

`use:bind` does not sanitize by default. Give it an explicit `sanitize` function when a field needs normalization before its signal is updated:

```js
const sanitizeName = value => String(value).replace(/[<>]/g, '')

html`<input use:bind=${{ source: form.fields.name, sanitize: sanitizeName }}>`
```

This hook is application code, not an HTML sanitizer. Use a maintained sanitizer for rich text, validate again on the server, and remember that direct writes to a field signal bypass the binding hook.

## CSRF and requests

Matrix does not provide CSRF protection. For cookie-authenticated state-changing requests:

- Use the server's CSRF token mechanism.
- Configure cookies with appropriate `SameSite`, `Secure`, and `HttpOnly` flags.
- Check the request origin on the server.
- Keep authorization decisions on the server; hiding a route in the client is not access control.

`resource` forwards an `AbortSignal` and untrusted loader arguments to application code; it does not fetch, validate URLs, validate responses, or enforce permissions. Parse and allowlist URLs inside the loader, check `response.ok`, validate the response shape, and handle authorization failures.

## Router boundaries

`router.navigate()` only accepts same-origin URLs, but route parameters and query strings are still untrusted input. Validate them before using them in HTML, CSS, filesystem-like paths, or API requests. Redirect functions must not copy arbitrary user input into an external destination.

## Secrets and deployment

Anything shipped to the browser is public. Do not place API keys, signing secrets, database credentials, or privileged tokens in signals, route definitions, source maps, or client configuration. Use a server boundary for privileged operations.

Set a restrictive Content Security Policy, keep dependencies current, and deploy over HTTPS. Matrix's runtime does not use `eval` or `new Function`; template compilation uses the DOM template API. Runtime `css()` and `globalCss()` create `<style>` elements, so strict `style-src` policies need an approved nonce or hash strategy for those styles. `runInWorker()` creates a Blob URL and needs a compatible `worker-src` policy such as `blob:`. CSP is defense in depth; it does not replace escaping, validation, or server authorization.
