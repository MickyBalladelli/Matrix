import { component, computed, css, html, keyed, mount, signal } from '../../../src/index.js'

const DEFAULT_POSTS = [
  {
    slug: 'signals-for-humans',
    title: 'Signals for humans',
    date: '2026-08-01',
    tags: ['reactivity', 'guide'],
    body: '# Signals for humans\n\nA signal is a small piece of state. **Read it in a view** and Matrix updates only the binding that depends on it.\n\n- Keep state close to the feature\n- Derive values with Computeds\n- Dispose work with its owner'
  },
  {
    slug: 'scoped-css',
    title: 'Scoped CSS without a build step',
    date: '2026-07-18',
    tags: ['styles', 'css'],
    body: '# Scoped CSS without a build step\n\nThe `css` helper scopes authored selectors to a component boundary. Read the [CSS guide](https://matrix.example/docs/css) for the trade-offs.\n\nKeep user content as data and validate values before putting them in CSS.'
  }
]

const appStyle = css`
  .blog { max-width: 70rem; margin: 2rem auto; padding: 1rem; font-family: system-ui, sans-serif; color: #172033; }
  .blog-header, .blog-layout { display: grid; gap: 1rem; }
  .blog-header { margin-bottom: 1rem; }
  .blog-header h1 { margin: 0; }
  .blog-layout { grid-template-columns: minmax(14rem, 22rem) 1fr; }
  .blog-panel, .blog-article { padding: 1rem; border: 1px solid #dbe3ef; border-radius: .75rem; background: white; }
  .blog-search { box-sizing: border-box; width: 100%; padding: .65rem; border: 1px solid #aebbd0; border-radius: .45rem; font: inherit; }
  .post-list { display: grid; gap: .5rem; padding: 0; list-style: none; }
  .post-card { display: grid; gap: .25rem; width: 100%; padding: .7rem; border: 1px solid transparent; border-radius: .45rem; text-align: left; background: transparent; cursor: pointer; font: inherit; }
  .post-card.selected { border-color: #93c5fd; background: #eff6ff; }
  .post-card small, .post-tags { color: #64748b; }
  .post-tags { display: flex; gap: .4rem; flex-wrap: wrap; font-size: .85rem; }
  .post-tags span { padding: .15rem .4rem; border-radius: 1rem; background: #e2e8f0; }
  .blog-article { min-height: 20rem; }
  .blog-article a { color: #2563eb; }
  .blog-article li { margin: .4rem 0; }
  @media (max-width: 700px) { .blog-layout { grid-template-columns: 1fr; } }
`

function safeMarkdownHref(value) {
  try {
    const url = new URL(value, globalThis.location?.href ?? 'https://matrix.example/')
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '#'
  } catch {
    return '#'
  }
}

function renderInlineMarkdown(source) {
  const views = []
  const pattern = /(\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\))/g
  let cursor = 0
  let match

  while ((match = pattern.exec(source))) {
    if (match.index > cursor) {
      views.push(html`${source.slice(cursor, match.index)}`)
    }
    if (match[2]) {
      views.push(html`<strong>${match[2]}</strong>`)
    } else {
      views.push(html`<a href=${safeMarkdownHref(match[4])} target="_blank" rel="noopener noreferrer">${match[3]}</a>`)
    }
    cursor = match.index + match[0].length
  }

  if (cursor < source.length) {
    views.push(html`${source.slice(cursor)}`)
  }
  return views
}

function renderMarkdown(markdown) {
  return String(markdown).split('\n').map((line, index) => {
    if (line.startsWith('### ')) return html`<h3 data-blog-heading=${index}>${renderInlineMarkdown(line.slice(4))}</h3>`
    if (line.startsWith('## ')) return html`<h2 data-blog-heading=${index}>${renderInlineMarkdown(line.slice(3))}</h2>`
    if (line.startsWith('# ')) return html`<h1 data-blog-heading=${index}>${renderInlineMarkdown(line.slice(2))}</h1>`
    if (line.startsWith('- ')) return html`<li data-blog-list-item=${index}>${renderInlineMarkdown(line.slice(2))}</li>`
    return line ? html`<p data-blog-paragraph=${index}>${renderInlineMarkdown(line)}</p>` : html`<br data-blog-break=${index}>`
  })
}

function PostCard({ post, selected, onSelect }) {
  return html`
    <li>
      <button class=${selected ? 'post-card selected' : 'post-card'} data-blog-post=${post.slug} @click=${() => onSelect(post.slug)}>
        <strong>${post.title}</strong>
        <small>${post.date}</small>
        <span class="post-tags">${post.tags.map(tag => html`<span>${tag}</span>`)}</span>
      </button>
    </li>
  `
}

export function mountBlogApp(container, options = {}) {
  const posts = signal(options.posts ?? DEFAULT_POSTS.map(post => ({ ...post, tags: [...post.tags] })))
  const search = signal('')
  const selectedSlug = signal(options.selectedSlug ?? posts.value[0]?.slug ?? '')
  const filteredPosts = computed(() => {
    const query = search.value.trim().toLowerCase()
    return posts.value.filter(post => !query || [post.title, post.body, ...post.tags].some(value => value.toLowerCase().includes(query)))
  })
  const selectedPost = computed(() => posts.value.find(post => post.slug === selectedSlug.value) ?? filteredPosts.value[0] ?? null)
  const postCards = computed(() => filteredPosts.value.map(post => component(PostCard, {
    post,
    selected: post.slug === selectedPost.value?.slug,
    onSelect: slug => { selectedSlug.value = slug }
  })))
  const article = computed(() => renderMarkdown(selectedPost.value?.body ?? 'No article selected.'))

  const app = mount(() => html`
    <main use:style=${appStyle} class="blog">
      <header class="blog-header">
        <p>Matrix official example</p>
        <h1>Field Notes</h1>
        <p>Markdown rendered as safe Matrix views.</p>
        <input data-blog-search class="blog-search" aria-label="Search articles" placeholder="Search articles" use:bind=${search}>
      </header>
      <div class="blog-layout">
        <aside class="blog-panel">
          <strong data-blog-count>${computed(() => `${filteredPosts.value.length} article(s)`)}</strong>
          <ul class="post-list">${keyed(postCards, item => item.props.post.slug)}</ul>
        </aside>
        <article data-blog-content class="blog-article">${article}</article>
      </div>
    </main>
  `, container)

  return {
    app,
    posts,
    search,
    selectedSlug,
    selectedPost,
    ready: Promise.resolve(),
    dispose() {
      app.unmount()
      filteredPosts.dispose()
      selectedPost.dispose()
      postCards.dispose()
      article.dispose()
      posts.dispose()
      search.dispose()
      selectedSlug.dispose()
    }
  }
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  mountBlogApp(document.querySelector('#app'))
}
