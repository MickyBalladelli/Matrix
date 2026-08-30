import { computed, mount, signal } from '@mickyballadelli/matrix'
import './style.css'

const posts = signal([
  { id: 'welcome', title: 'Welcome to Matrix', body: 'Signals keep the page small and reactive.' },
  { id: 'next', title: 'What to build next', body: 'Try adding tags, routes, or a server API.' }
])
const selectedId = signal('welcome')
const selected = computed(() => posts.value.find(post => post.id === selectedId.value) ?? posts.value[0])

const App = () => (
  <main className="app">
    <p className="eyebrow">Matrix example template</p>
    <h1>My Matrix blog</h1>
    <p>A small starter with a reactive article list.</p>
    <nav className="actions" aria-label="Articles">
      {posts.value.map(post => (
        <button onClick={() => selectedId.value = post.id}>{post.title}</button>
      ))}
    </nav>
    <article>
      <h2>{selected.value?.title}</h2>
      <p>{selected.value?.body}</p>
    </article>
  </main>
)

mount(App, document.querySelector('#app'))
