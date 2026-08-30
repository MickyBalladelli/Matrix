import {
  component,
  computed,
  createForm,
  createRouter,
  css,
  cssVariables,
  html,
  keyed,
  mount,
  resource,
  routerView,
  signal
} from '../../src/index.js'

const DEFAULT_PRODUCTS = [
  { id: 'mug', name: 'Matrix mug', price: 18, description: 'A sturdy mug for long reactive sessions.' },
  { id: 'hoodie', name: 'Signal hoodie', price: 64, description: 'Soft cotton with a tiny signal badge.' },
  { id: 'sticker', name: 'Computed sticker pack', price: 8, description: 'Five stickers for your favorite laptop.' }
]

const appStyle = css`
  .shop { max-width: 64rem; margin: 2rem auto; padding: 1rem; font-family: system-ui, sans-serif; color: #172033; }
  .shop-header, .shop-actions, .product-actions { display: flex; gap: .75rem; align-items: center; justify-content: space-between; }
  .shop-header { border-bottom: 1px solid #dbe3ef; padding-bottom: 1rem; }
  .shop-nav { display: flex; gap: .75rem; }
  .shop-nav a { color: #2563eb; }
  .product-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: 1rem; padding: 0; list-style: none; }
  .product, .cart-line, .checkout { padding: 1rem; border: 1px solid #dbe3ef; border-radius: .75rem; background: white; }
  .product h2, .cart-line h2 { margin-top: 0; font-size: 1.1rem; }
  button { border: 0; border-radius: .45rem; padding: .55rem .8rem; color: white; background: var(--shop-accent); cursor: pointer; }
  button[disabled] { opacity: .55; cursor: wait; }
  input { box-sizing: border-box; width: 100%; padding: .55rem; border: 1px solid #aebbd0; border-radius: .4rem; }
  label { display: grid; gap: .3rem; margin: .75rem 0; }
  .error { color: #b91c1c; }
  .cart-list { display: grid; gap: .75rem; padding: 0; list-style: none; }
`

const wait = (milliseconds, abortSignal) => new Promise((resolve, reject) => {
  if (abortSignal?.aborted) {
    reject(new DOMException('Aborted', 'AbortError'))
    return
  }

  const timer = setTimeout(() => {
    abortSignal?.removeEventListener('abort', cancel)
    resolve()
  }, milliseconds)
  const cancel = () => {
    clearTimeout(timer)
    reject(new DOMException('Aborted', 'AbortError'))
  }
  abortSignal?.addEventListener('abort', cancel, { once: true })
})

export function createShoppingCartApi(options = {}) {
  const products = options.products ?? DEFAULT_PRODUCTS
  const delay = options.delay ?? 120

  return {
    async listProducts(abortSignal) {
      await wait(delay, abortSignal)
      return products.map(product => ({ ...product }))
    },
    async submitOrder(order, abortSignal) {
      await wait(delay, abortSignal)
      return { id: `order-${Date.now()}`, ...order }
    }
  }
}

const money = value => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
}).format(value)

function ProductCard({ product, onAdd }) {
  return html`
    <li class="product">
      <h2>${product.name}</h2>
      <p>${product.description}</p>
      <div class="product-actions">
        <strong>${money(product.price)}</strong>
        <button data-product=${product.id} @click=${() => onAdd(product)}>Add to cart</button>
      </div>
    </li>
  `
}

function CartLine({ line, onChange }) {
  return html`
    <li class="cart-line">
      <div class="shop-actions">
        <h2>${line.product.name}</h2>
        <strong>${money(line.total)}</strong>
      </div>
      <label>Quantity
        <input data-cart-quantity=${line.product.id} type="number" min="0" .value=${line.quantity} @input=${event => onChange(line.product.id, Number(event.currentTarget.value) || 0)}>
      </label>
    </li>
  `
}

function createCheckoutForm() {
  return createForm({ email: '', address: '' }, {
    email: value => /^\S+@\S+\.\S+$/.test(value) ? undefined : 'Enter a valid email',
    address: value => value.trim() ? undefined : 'Enter a delivery address'
  }, { name: 'shopping-checkout' })
}

export function mountShoppingCartApp(container, options = {}) {
  const api = options.api ?? createShoppingCartApi()
  const products = resource(abortSignal => api.listProducts(abortSignal))
  const cart = signal([])
  const checkout = createCheckoutForm()
  const checkoutErrors = computed(() => Object.entries(checkout.errors.value)
    .map(([field, message]) => html`<li data-checkout-error=${field} class="error">${message}</li>`))
  const cartCount = computed(() => cart.value.reduce((total, item) => total + item.quantity, 0))
  const cartLines = computed(() => cart.value.map(item => {
    const product = products.data.value?.find(candidate => candidate.id === item.id)
    return product ? { product, quantity: item.quantity, total: product.price * item.quantity } : null
  }).filter(Boolean))
  const cartTotal = computed(() => cartLines.value.reduce((total, line) => total + line.total, 0))
  const orderStatus = signal('')
  const submitting = signal(false)
  const router = createRouter([
    { path: '/', view: CatalogPage },
    { path: '/cart', view: CartPage },
    { path: '/checkout', view: CheckoutPage }
  ])

  function addToCart(product) {
    cart.update(items => {
      const existing = items.find(item => item.id === product.id)
      if (existing) {
        return items.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...items, { id: product.id, quantity: 1 }]
    })
  }

  function changeQuantity(id, quantity) {
    cart.update(items => quantity > 0
      ? items.map(item => item.id === id ? { ...item, quantity } : item)
      : items.filter(item => item.id !== id))
  }

  async function submitCheckout(event) {
    event.preventDefault()
    if (Object.keys(checkout.validate()).length > 0 || cart.value.length === 0) {
      return
    }

    submitting.value = true
    orderStatus.value = ''
    try {
      await api.submitOrder({
        items: cart.value.map(item => ({ ...item })),
        customer: checkout.values.value
      })
      cart.value = []
      orderStatus.value = 'Order sent successfully'
    } catch (error) {
      orderStatus.value = error.message
    } finally {
      submitting.value = false
    }
  }

  const productCards = computed(() => (products.data.value ?? [])
    .map(product => component(ProductCard, { product, onAdd: addToCart })))
  const cartLineViews = computed(() => cartLines.value
    .map(line => component(CartLine, { line, onChange: changeQuantity })))
  const catalogContent = computed(() => products.loading.value
    ? html`<p>Loading products…</p>`
    : products.error.value
      ? html`<p class="error">Could not load products.</p>`
      : html`<ul class="product-grid">${keyed(productCards, item => item.props.product.id)}</ul>`)
  const activeView = routerView(router, () => html`<p>Page not found</p>`)

  function CatalogPage() {
    return html`
      <section>
        <h1>Shop products</h1>
        ${catalogContent}
      </section>
    `
  }

  function CartPage() {
    return html`
      <section>
        <h1>Your cart</h1>
        ${cartLineViews}
        <p data-cart-total>Total: ${computed(() => money(cartTotal.value))}</p>
        <a href="/checkout" @click=${router.link('/checkout')}>Go to checkout</a>
      </section>
    `
  }

  function CheckoutPage() {
    return html`
      <section class="checkout">
        <h1>Checkout</h1>
        <p>Total: ${computed(() => money(cartTotal.value))}</p>
        <form data-checkout @submit.prevent=${submitCheckout}>
          <label>Email <input data-checkout-email type="email" use:bind=${checkout.fields.email}></label>
          <label>Address <input data-checkout-address use:bind=${checkout.fields.address}></label>
          <ul>${checkoutErrors}</ul>
          <button data-checkout-submit type="submit" disabled=${submitting}>Place order</button>
          <p data-order-status>${orderStatus}</p>
        </form>
      </section>
    `
  }

  const app = mount(() => html`
    <main use:style=${appStyle} use:vars=${cssVariables({ '--shop-accent': '#2563eb' })} class="shop">
      <header class="shop-header">
        <strong>Matrix Shop</strong>
        <nav class="shop-nav">
          <a href="/" @click=${router.link('/')}>Shop</a>
          <a href="/cart" data-cart-link @click=${router.link('/cart')}>Cart (<span data-cart-count>${cartCount}</span>)</a>
        </nav>
      </header>
      ${activeView}
    </main>
  `, container)

  router.start()
  const ready = Promise.all([
    products.reload(),
    router.current.value ? Promise.resolve() : router.navigate('/')
  ])

  return {
    app,
    api,
    router,
    products,
    cart,
    checkout,
    ready,
    dispose() {
      app.unmount()
      router.dispose()
      products.dispose()
    }
  }
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  mountShoppingCartApp(document.querySelector('#app'))
}
