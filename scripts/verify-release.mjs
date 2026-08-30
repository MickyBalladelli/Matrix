import { execFileSync } from 'node:child_process'

const commands = [
  ['npm', ['test']],
  ['npm', ['run', 'test:types']],
  ['npm', ['run', 'test:browser']],
  ['npm', ['run', 'test:performance']],
  ['npm', ['run', 'test:package']],
  ['npm', ['run', 'size']]
]

for (const [command, args] of commands) {
  console.log(`\n> ${command} ${args.join(' ')}`)
  execFileSync(command, args, { stdio: 'inherit' })
}
