# Matrix VS Code debugging

This small extension uses VS Code's active JavaScript debug session. It does not open a server or send data outside the editor.

1. Add `createDevtools()` to the application:

   ```js
   import { configure, createDevtools } from '@mickyballadelli/matrix'

   configure({ development: true })
   createDevtools({ redact: false })
   ```

2. Run the app with VS Code's JavaScript debugger (`pwa-chrome`, `pwa-msedge`, or a Firefox JavaScript debugger).
3. Open the Command Palette and run **Matrix: Inspect Active Page**.

The command shows the component tree, Signal/Computed snapshots, Effect dependency edges, router state, and timeline entries in the **Matrix DevTools** output channel. The timeline commands start and stop recording through the same page bridge used by the browser panel.

To try the extension locally, run VS Code's **Developer: Install Extension from Location...** and choose this `vscode/` directory.
