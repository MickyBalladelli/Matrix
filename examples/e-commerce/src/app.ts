import { component, computed, css, cssVariables, html, keyed, mount, resource, signal } from '../../../src/index.js'

const DEFAULT_PRODUCTS = [
  { id: 'mug', name: 'Matrix mug', category: 'Desk', price: 18, rating: 4.8, description: 'A sturdy mug for long reactive sessions.' },
  { id: 'hoodie', name: 'Signal hoodie', category: 'Wearables', price: 64, rating: 4.6, description: 'Soft cotton with a tiny signal badge.' },
  { id: 'stickers', name: 'Computed sticker pack', category: 'Desk', price: 8, rating: 4.4, description: 'Five stickers for your favorite laptop.' },
  { id: 'notebook', name: 'Reactive notebook', category: 'Stationery', price: 14, rating: 4.9, description: 'A paper companion for better state design.' },
  { id: 'cap', name: 'Fine-grained cap', category: 'Wearables', price: 28, rating: 4.2, description: 'A cap for people who batch updates.' }
]

const appStyle = css`
  .store { max-width: 76rem; margin: 2rem auto; padding: 1rem; font-family: system-ui, sans-serif; color: #172033; }
  .store-header, .store-controls, .product-footer { display: flex; gap: 1rem; align-items: center; justify-content: space-between; }
  .store-header { margin-bottom: 1rem; }
  .store-header h1 { margin: 0; }
  .store-controls { align-items: end; padding: 1rem; border: 1px solid #dbe3ef; border-radius: .7rem; background: white; }
  .store-controls label { display: grid; gap: .3rem; flex: 1; }
  input, select, button { padding: .55rem .7rem; border: 1px solid #aebbd0; border-radius: .4rem; font: inherit; }
  button { color: white; border-color: #2563eb; background: var(--store-accent); cursor: pointer; }
  .cart-badge { padding: .35rem .6rem; border-radius: 1rem; color: #1e3a8a; background: #dbeafe; }
  .product-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: 1rem; margin-top: 1rem; padding: 0; list-style: none; }
  .product { display: grid; gap: .7rem; padding: 1rem; border: 1px solid #dbe3ef; border-radius: .7rem; background: white; }
  .product h2 { margin: 0; font-size: 1.1rem; }
  .product small { color: #64748b; }
  .product-footer strong { font-size: 1.1rem; }
  .empty { padding: 2rem; text-align: center; color: #64748b; }
  @media (max-width: 700px) { .store-header, .store-controls { align-items: stretch; flex-direction: column; } }
`

export function createEcommerceApi(options = {}) {
  const products = options.products ?? DEFAULT_PRODUCTS
  const delay = options.delay ?? 0
  return {
    async list(abortSignal) {
      if (delay) await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, delay)
        abortSignal?.addEventListener('abort', () => {
          clearTimeout(timer)
          reject(new DOMException('Aborted', 'AbortError'))
        }, { once: true })
      })
      return products.map(product => ({ ...product }))
    }
  }
}

function ProductCard({ product, onAdd }) {
  return html`
    <li class="product" data-store-product=${product.id}>
      <small>${product.category} · ${product.rating}★</small>
      <h2>${product.name}</h2>
      <p>${product.description}</p>
      <div class="product-footer"><strong>$${product.price}</strong><button data-store-add=${product.id} @click=${() => onAdd(product)}>Add to cart</button></div>
    </li>
  `
}

export function mountEcommerceApp(container, options = {}) {
  const api = options.api ?? createEcommerceApi()
  const products = resource(signalValue => api.list(signalValue), { initialValue: options.initialProducts ?? [] })
  const search = signal('')
  const category = signal('all')
  const sort = signal('featured')
  const cart = signal([])
  const categories = computed(() => [...new Set((products.data.value ?? []).map(product => product.category))])
  const categoryOptions = computed(() => categories.value.map(value => html`<option value=${value}>${value}</option>`))
  const filteredProducts = computed(() => {
    const query = search.value.trim().toLowerCase()
    return [...(products.data.value ?? [])]
      .filter(product => category.value === 'all' || product.category === category.value)
      .filter(product => !query || `${product.name} ${product.description}`.toLowerCase().includes(query))
      .sort((left, right) => sort.value === 'price-low' ? left.price - right.price : sort.value === 'price-high' ? right.price - left.price : right.rating - left.rating)
  })
  const productCards = computed(() => filteredProducts.value.map(product => component(ProductCard, { product, onAdd: addToCart })))
  const cartCount = computed(() => cart.value.reduce((total, item) => total + item.quantity, 0))

  function addToCart(product) {
    cart.update(items => {
      const existing = items.find(item => item.id === product.id)
      return existing
        ? items.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...items, { id: product.id, quantity: 1 }]
    })
  }

  const app = mount(() => html`
    <main use:style=${appStyle} use:vars=${cssVariables({ '--store-accent': '#2563eb' })} class="store">
      <header class="store-header"><div><p>Matrix official example</p><h1>Reactive Supply</h1></div><span class="cart-badge" data-store-cart>${cartCount} item(s)</span></header>
      <section class="store-controls">
        <label>Search <input data-store-search placeholder="Find a product" use:bind=${search}></label>
        <label>Category <select data-store-category .value=${category} @change=${event => category.value = event.currentTarget.value}><option value="all">All categories</option>${categoryOptions}</select></label>
        <label>Sort <select data-store-sort .value=${sort} @change=${event => sort.value = event.currentTarget.value}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label>
      </section>
      <p data-store-status aria-live="polite">${computed(() => products.loading.value ? 'Loading catalog…' : `${filteredProducts.value.length} product(s)`)}</p>
      ${computed(() => filteredProducts.value.length === 0 ? html`<p class="empty" data-store-empty>No products match those filters.</p>` : html`<ul class="product-grid">${keyed(productCards, item => item.props.product.id)}</ul>`)}
    </main>
  `, container)

  return {
    app,
    api,
    products,
    search,
    category,
    sort,
    cart,
    ready: products.reload().catch(() => undefined),
    addToCart,
    dispose() {
      app.unmount()
      products.dispose()
      categories.dispose()
      categoryOptions.dispose()
      filteredProducts.dispose()
      productCards.dispose()
      cartCount.dispose()
      search.dispose()
      category.dispose()
      sort.dispose()
      cart.dispose()
    }
  }
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  mountEcommerceApp(document.querySelector('#app'))
}
