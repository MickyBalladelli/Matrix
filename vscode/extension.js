const vscode = require('vscode')

const output = vscode.window.createOutputChannel('Matrix DevTools')

async function evaluate(expression) {
  const session = vscode.debug.activeDebugSession
  if (!session) {
    throw new Error('Start a JavaScript debug session before using Matrix DevTools')
  }

  const response = await session.customRequest('evaluate', {
    expression,
    context: 'repl'
  })
  return response?.body?.result ?? response?.result ?? response
}

async function showSnapshot() {
  const snapshot = await evaluate('globalThis.__MATRIX_DEVTOOLS__?.snapshot?.()')
  output.clear()
  output.appendLine(typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot ?? {
    error: 'Call createDevtools() in the application first'
  }, null, 2))
  output.show(true)
}

async function setTimeline(method) {
  await evaluate(`globalThis.__MATRIX_DEVTOOLS__?.timeline?.${method}?.()`)
  vscode.window.showInformationMessage(`Matrix performance timeline ${method}ed`)
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('matrix.inspect', () => showSnapshot().catch(error => vscode.window.showErrorMessage(error.message))),
    vscode.commands.registerCommand('matrix.timeline.start', () => setTimeline('start').catch(error => vscode.window.showErrorMessage(error.message))),
    vscode.commands.registerCommand('matrix.timeline.stop', () => setTimeline('stop').catch(error => vscode.window.showErrorMessage(error.message))),
    output
  )
}

function deactivate() {
  output.dispose()
}

module.exports = { activate, deactivate }
