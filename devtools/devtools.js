const devtools = globalThis.browser ?? globalThis.chrome

devtools.devtools.panels.create('Matrix', '', 'panel.html')
