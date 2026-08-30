# Matrix TODO: Path to V1 Stability

Review date: 2026-08-30
Current version: 0.1.0-alpha.1
Published on npm: @mickyballadelli/matrix@next

## Foundation: Stability and Testing

### Core runtime stability
- [x] Add comprehensive error boundary tests for failures after partial DOM insertion
- [x] Add error boundary tests for failures inside lifecycle callbacks
- [x] Test error propagation through component trees
- [x] Add leak detection tests for repeated mount/unmount cycles (1000x+ unmounts)
- [x] Add leak detection for keyed list replacements
- [x] Add leak detection for forms with debounce cleanup
- [x] Add leak detection for router start/stop cycles
- [x] Add leak detection for scoped CSS and theme changes
- [x] Add leak detection for aborted resources (resource cleanup)
- [x] Verify effect cleanup runs in correct order during unmount
- [x] Test concurrent signal updates and batch behavior under stress
- [x] Test very large keyed lists (10k+ items) for performance and memory

### Browser test automation
- [x] Add browser tests (Chromium, Firefox, WebKit)
- [ ] Add test coverage for Node 18, 20, 22
- [x] Verify browser test suite runs before release
- [x] Add performance regression testing

### Type safety
- [x] Run TypeScript strict mode on entire codebase
- [x] Add strict type tests for component props mutation prevention
- [x] Verify JSX IntrinsicElements types catch misspelled attributes
- [x] Add type tests for reactive prop updates
- [x] Test that invalid event names cause type errors
- [x] Verify readonly signal types prevent direct mutation

## Documentation: Completeness and Clarity

### Core documentation
- [x] Write "Common Patterns" guide (conditional rendering, loops, forms, async loading)
- [x] Write "Performance Tips" guide with anti-patterns to avoid
- [x] Write "Troubleshooting" guide with diagnostic steps for common issues
- [x] Write "Security" guide covering XSS, CSRF, dynamic URLs, raw HTML
- [x] Create "10-Minute Tutorial" starting from npm install
- [x] Expand "Form Validation" example with error messages, async validation, complex fields
- [x] Add "Routing Advanced" guide covering guards, transitions, deep linking
- [x] Add "CSS Scoping" guide with complex selector examples and limitations

### Developer experience docs
- [x] Document all error messages with causes and solutions
- [x] Add "IDE Setup" guide for JSX autocomplete and type hints
- [x] Create "Build Tool Integration" guide for Vite, Rollup, Webpack, esbuild
- [x] Document "Debugging" with browser DevTools tips and Matrix logger
- [x] Add "DevTools Integration" guide for custom plugins
- [x] Write "Testing Strategies" with example test suites
- [x] Document "Accessibility Checklist" for applications

### API documentation
- [x] Document all plugin extension points with examples
- [x] Add examples for router guards, transitions, and redirects
- [x] Document `batch()` usage patterns and gotchas
- [x] Add `scope.run()` usage examples
- [x] Document lifecycle hook execution order
- [x] Add computed with custom setters example
- [x] Document `inspect()` and `inspectEffects()` output format

## Developer Experience: Tools and Errors

### Error messages
- [x] Improve error message for invalid component render function
- [x] Add stack trace that points to user component, not internals
- [x] Add "Did you mean?" suggestions for common typos
- [x] Improve "Multiple runtimes loaded" warning with debug info
- [x] Add warnings for stale closures in effects (reading past scope)
- [x] Add warnings for effect dependency changes
- [x] Warn when component returns non-template, non-component value
- [x] Warn about duplicate keys before runtime error

### Development mode
- [x] Add `development` mode flag that enables strict checks
- [x] Add warnings for prop mutations with helpful stack traces
- [x] Add warning for reading signals outside effect/template
- [x] Add detection for forgotten `${}` in template literals
- [x] Add warnings for common router misconfigurations
- [x] Add form field validation debugging helpers
- [x] Add performance warnings for unoptimized bindings

### DevTools enhancements
- [x] Create browser DevTools extension (Chrome/Firefox/Edge)
- [x] Add component tree inspector in DevTools, I want to see which component is in which file.
- [x] Add signal/computed inspection panel
- [x] Add effect dependency visualizer
- [x] Add router state inspector
- [x] Add performance timeline recording
- [x] Create VS Code debugging integration for Matrix components

## Testing: Comprehensive Coverage

### Integration tests
- [x] Test complex form with conditional fields, validation, async submission
- [x] Test multi-page router with guards, transitions, redirects
- [x] Test dynamic theme switching with CSS variable updates
- [x] Test component composition with deeply nested props
- [x] Test mixed JSX and template literal syntax
- [x] Test SVG and namespace handling in depth
- [x] Test mobile touch events and gestures
- [x] Test keyboard navigation through router links and form fields

### Example applications
- [x] Create "Shopping Cart" example (routing, forms, API calls, state)
- [x] Create "Notes App" example (complex forms, search, local storage)
- [x] Create "Dashboard" example (many components, performance considerations)
- [x] Create "Real-time Chat" example (WebSocket, message handling)
- [x] Each example should include tests and performance notes

### Edge cases
- [x] Test re-rendering during unmount
- [x] Test signal updates during effect cleanup
- [x] Test component updates during mount callbacks
- [x] Test router navigation during component mount/unmount
- [x] Test form submission with component unmount
- [x] Test CSS style injection timing edge cases
- [x] Test very long text content in templates
- [x] Test rapid mounting/unmounting of same component

## Performance: Benchmarks and Regression Prevention

### Benchmark suite
- [x] Add memory baseline for idle application
- [x] Add memory baseline for 1000 signals
- [x] Add memory baseline for 1000 effects
- [x] Benchmark large keyed list (10k items) mount, update, unmount
- [x] Benchmark CSS variable update performance (100 variables)
- [x] Benchmark rapid signal updates with many subscribers
- [x] Create performance comparison against React, Vue, Preact
- [x] Document performance profiles by use case

### Regression prevention
- [x] Lock size budgets with 2% tolerance before release
- [x] Add performance regression history tracking
- [x] Benchmark before and after every optimization attempt
- [x] Keep detailed performance notes for each version
- [x] Create public performance dashboard or tracking

### Optimization opportunities
- [x] Consider lazy compilation of templates on first use
- [x] Evaluate event delegation efficiency for large DOMs
- [x] Profile CSS scoping implementation for bottlenecks
- [x] Analyze router matching performance with large route tables
- [x] Consider worker offloading for CPU-heavy operations
- [x] Evaluate signal batching effectiveness

## Platform Support: Verification and Documentation

### Browser compatibility
- [x] Test on Safari 15+
- [x] Test on Chrome 90+, Firefox 88+, Edge 90+
- [x] Test on iOS Safari
- [x] Test on mobile Chrome (Android)
- [x] Verify touch event handling
- [x] Test Dark Mode support
- [x] Test RTL language rendering (with `dir="rtl"`)
- [x] Document minimum versions for each browser

### Node.js compatibility
- [x] Verify signal/computed work in Node (no DOM)
- [x] Test Node 18.x through current LTS
- [x] Verify errors on Node for browser-only APIs
- [x] Test in Cloudflare Workers environment
- [x] Test in Bun runtime
- [x] Test in Deno compatibility mode

### Build tool integration
- [x] Create Rollup plugin example for tree-shaking
- [x] Verify esbuild handles JSX properly
- [x] Test Webpack 5 module federation
- [x] Verify Next.js App Router compatibility
- [x] Test Astro integration patterns
- [x] Test Remix integration patterns

## Security: Hardening and Best Practices

### Security testing
- [x] Fuzz XSS prevention with random HTML/SVG/XML
- [x] Test all escape pathways with malicious input
- [x] Verify CSS scoping prevents style leakage attacks
- [x] Test router path handling with malicious URLs
- [x] Verify form binding doesn't expose sensitive data
- [x] Test plugin system for sandbox breaks
- [x] Document SECURITY.md with security considerations
- [x] Add security regression test suite

### Input handling
- [x] Test HTML entity escaping in all contexts
- [x] Test SVG namespace edge cases
- [x] Verify CSS custom property values are safe
- [x] Test router params with special characters
- [x] Verify form input sanitization options
- [x] Test resource loader with untrusted URLs
- [x] Add CSP (Content Security Policy) compatibility notes

## Ecosystem: Examples and Patterns

### Official examples
- [ ] Create "Blog" example with markdown rendering
- [ ] Create "Admin Dashboard" with complex data tables
- [ ] Create "E-commerce" example with filters and sorting
- [ ] Create "SPA" example showcasing full Matrix capabilities
- [ ] Create "Server Integration" example with real API
- [ ] Each example with Vite, TypeScript, complete tests
- [ ] Add example template to create-matrix-app

### Extension patterns
- [ ] Example: Custom form input component with validation
- [ ] Example: State persistence plugin (localStorage)
- [ ] Example: Analytics plugin for tracking
- [ ] Example: Error reporting plugin
- [ ] Example: A11y audit plugin
- [ ] Example: Performance monitoring plugin
- [ ] Create "Plugins" documentation section

### Integration patterns
- [ ] Pattern: Loading and caching data with resource()
- [ ] Pattern: Debouncing/throttling signal updates
- [ ] Pattern: Undo/redo with signals
- [ ] Pattern: Infinite scroll with router and signals
- [ ] Pattern: Real-time collaboration patterns
- [ ] Pattern: Offline-first applications
- [ ] Create "Patterns" documentation section

## Release: Quality Assurance

### Pre-release checklist
- [ ] Run `npm pack --dry-run` and verify file list
- [ ] Verify all exports are documented
- [ ] Verify no console.warn or console.error in production builds
- [ ] Run full test suite: `npm test && npm run test:types && npm run test:browser && npm run test:package`
- [ ] Verify bundle sizes are under budget
- [ ] Run performance benchmarks and compare with previous version
- [ ] Check for any deprecation warnings in Node
- [ ] Verify CHANGELOG is complete and accurate

### Release process
- [ ] Set version to stable (0.1.0 or 1.0.0)
- [ ] Update CHANGELOG with release date
- [ ] Create git tag and release notes
- [ ] Publish to npm with `--tag latest` (moving from `next`)
- [ ] Publish create-matrix-app if updated
- [ ] Verify installation works: `npm install @mickyballadelli/matrix`
- [ ] Create blog post or announcement
- [ ] Update README with stable install command

### Post-release
- [ ] Monitor npm downloads and issues
- [ ] Respond to community feedback
- [ ] Plan next minor version features
- [ ] Start tracking deprecations for breaking changes

## Suggested Priority Order

1. **Stability (Weeks 1-2)**
   - Add memory leak tests
   - Browser test automation
   - Type strictness verification
   - Error boundary edge cases

2. **Developer Experience (Weeks 2-3)**
   - Error message improvements
   - Common patterns documentation
   - Troubleshooting guide
   - DevTools enhancement

3. **Testing & Examples (Weeks 3-4)**
   - Integration tests for complex scenarios
   - "Shopping Cart" and "Notes App" examples
   - Performance regression detection
   - Browser compatibility verification

4. **Polish & Release Readiness (Week 4-5)**
   - Security audit
   - Pre-release checklist
   - Performance benchmarking
   - Final documentation review

5. **V1 Release**
   - Stable version 1.0.0
   - Monitor adoption and feedback
