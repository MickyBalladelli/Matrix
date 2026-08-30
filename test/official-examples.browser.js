import { mountAdminDashboardApp } from '../examples/admin-dashboard/src/app.ts'
import { mountBlogApp } from '../examples/blog/src/app.ts'
import { mountEcommerceApp } from '../examples/e-commerce/src/app.ts'
import { mountServerIntegrationApp } from '../examples/server-integration/src/app.ts'
import { mountSpaApp } from '../examples/spa/src/app.ts'

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
const setInputValue = (element, value) => {
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
}
const createHost = name => {
  const host = document.createElement('div')
  host.dataset.officialExample = name
  document.body.append(host)
  return host
}

const originalUrl = window.location.href

const blogHost = createHost('blog')
const blog = mountBlogApp(blogHost, {
  posts: [
    { slug: 'safe', title: 'Safe Markdown', date: 'today', tags: ['security'], body: '# Safe Markdown\n\n**Bold** text and <script>window.__MATRIX_OFFICIAL_XSS__ = true</script>' },
    { slug: 'matrix', title: 'Matrix State', date: 'yesterday', tags: ['guide'], body: '# Matrix State\n\nSignals keep views small.' }
  ]
})
await blog.ready
assert(blogHost.querySelector('[data-blog-post="safe"]'), 'Blog must render Markdown posts')
assert(blogHost.querySelector('[data-blog-content] strong')?.textContent === 'Bold', 'Blog must render bold Markdown as a view')
assert(blogHost.querySelector('[data-blog-content] script') === null, 'Blog Markdown must not become raw HTML')
setInputValue(blogHost.querySelector('[data-blog-search]'), 'state')
assert(blogHost.querySelector('[data-blog-count]').textContent === '1 article(s)', 'Blog search must filter articles')
blogHost.querySelector('[data-blog-post="matrix"]').click()
assert(blogHost.querySelector('[data-blog-content] h1')?.textContent === 'Matrix State', 'Blog selection must update the article')
blog.dispose()
blogHost.remove()

const adminHost = createHost('admin-dashboard')
const admin = mountAdminDashboardApp(adminHost, {
  api: {
    async load() {
      return {
        users: [
          { id: 'ada', name: 'Ada', email: 'ada@example.com', role: 'Admin', status: 'active', spend: 900, lastSeen: 'now' },
          { id: 'cato', name: 'Cato', email: 'cato@example.com', role: 'Viewer', status: 'invited', spend: 100, lastSeen: 'never' },
          { id: 'dido', name: 'Dido', email: 'dido@example.com', role: 'Editor', status: 'active', spend: 400, lastSeen: 'today' }
        ]
      }
    }
  }
})
await admin.ready
assert(adminHost.querySelector('[data-admin-table]'), 'Admin Dashboard must render a data table')
assert(adminHost.querySelectorAll('[data-admin-row]').length === 3, 'Admin Dashboard must render all rows')
setInputValue(adminHost.querySelector('[data-admin-search]'), 'cato')
assert(adminHost.querySelectorAll('[data-admin-row]').length === 1, 'Admin Dashboard search must filter rows')
adminHost.querySelector('[data-admin-search]').value = ''
adminHost.querySelector('[data-admin-search]').dispatchEvent(new Event('input', { bubbles: true }))
adminHost.querySelector('[data-admin-sort]').value = 'spend'
adminHost.querySelector('[data-admin-sort]').dispatchEvent(new Event('change', { bubbles: true }))
assert(adminHost.querySelector('[data-admin-row]').dataset.adminRow === 'ada', 'Admin Dashboard sort must reorder rows')
adminHost.querySelector('[data-admin-record]').click()
assert(admin.timeline.isRecording, 'Admin Dashboard must start timeline recording')
adminHost.querySelector('[data-admin-record]').click()
assert(!admin.timeline.isRecording, 'Admin Dashboard must stop timeline recording')
admin.dispose()
adminHost.remove()

const storeHost = createHost('e-commerce')
const store = mountEcommerceApp(storeHost, {
  api: {
    async list() {
      return [
        { id: 'mug', name: 'Matrix mug', category: 'Desk', price: 18, rating: 4.8, description: 'A mug' },
        { id: 'hoodie', name: 'Signal hoodie', category: 'Wearables', price: 64, rating: 4.6, description: 'A hoodie' },
        { id: 'notebook', name: 'Reactive notebook', category: 'Stationery', price: 14, rating: 4.9, description: 'A notebook' }
      ]
    }
  }
})
await store.ready
assert(storeHost.querySelector('[data-store-product="mug"]'), 'E-commerce must render products')
storeHost.querySelector('[data-store-category]').value = 'Wearables'
storeHost.querySelector('[data-store-category]').dispatchEvent(new Event('change', { bubbles: true }))
assert(storeHost.querySelectorAll('[data-store-product]').length === 1, 'E-commerce category filters must update products')
storeHost.querySelector('[data-store-add="hoodie"]').click()
assert(storeHost.querySelector('[data-store-cart]').textContent.includes('1'), 'E-commerce cart state must update')
storeHost.querySelector('[data-store-search]').value = 'missing'
storeHost.querySelector('[data-store-search]').dispatchEvent(new Event('input', { bubbles: true }))
assert(storeHost.querySelector('[data-store-empty]'), 'E-commerce must render an empty filter state')
store.dispose()
storeHost.remove()

const spaHost = createHost('spa')
const spa = mountSpaApp(spaHost)
await spa.ready
assert(spaHost.querySelector('[data-spa-home]'), 'SPA must render its home route')
assert(await spa.router.navigate('/tasks', { scroll: false }), 'SPA must navigate to tasks')
setInputValue(spaHost.querySelector('[data-spa-task-input]'), 'Write an example test')
spaHost.querySelector('[data-spa-task-form]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
assert(spaHost.textContent.includes('Write an example test'), 'SPA form must add a task')
assert(await spa.router.navigate('/settings', { scroll: false }), 'SPA must navigate to settings')
spaHost.querySelector('[data-spa-theme]').value = 'dark'
spaHost.querySelector('[data-spa-theme]').dispatchEvent(new Event('change', { bubbles: true }))
assert(spa.themeMode.value === 'dark', 'SPA theme state must update')
spa.dispose()
spaHost.remove()
window.history.replaceState({}, '', originalUrl)

const serverHost = createHost('server-integration')
let savedProfile
const server = mountServerIntegrationApp(serverHost, {
  api: {
    async loadProfile(requestSignal) {
      assert(requestSignal instanceof AbortSignal, 'Server integration must pass cancellation to API calls')
      return { displayName: 'Ada', team: 'Runtime' }
    },
    async saveProfile(values) {
      savedProfile = { ...values }
      return savedProfile
    }
  }
})
await server.ready
assert(serverHost.querySelector('[data-server-name]').value === 'Ada', 'Server integration must hydrate form data')
setInputValue(serverHost.querySelector('[data-server-name]'), 'Boudica')
serverHost.querySelector('[data-server-form]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
await wait(0)
assert(savedProfile?.displayName === 'Boudica', 'Server integration must submit edited form data')
assert(serverHost.querySelector('[data-server-message]').textContent.includes('saved'), 'Server integration must show save status')
server.dispose()
serverHost.remove()

document.body.dataset.matrixOfficialExamples = 'passed'
window.__MATRIX_TEST_RESULT__ = 'passed'
