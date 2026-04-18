import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '')

const initialAuthForm = {
  loginEmail: '',
  loginPassword: '',
  name: '',
  email: '',
  password: '',
  phone: '',
  address: '',
}

const initialAdminForm = {
  categoryName: '',
  brand: '',
  packagingType: '',
  productName: '',
  description: '',
  price: '',
  categoryId: '',
  imageUrl: '',
  stockQuantity: '',
  inventoryProductId: '',
  availableStock: '',
}

function formatCurrency(value) {
  const amount = Number(value || 0)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'))

  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState(null)
  const [orders, setOrders] = useState([])
  const [inventory, setInventory] = useState([])

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [productQty, setProductQty] = useState({})
  const [cartQty, setCartQty] = useState({})

  const [authForm, setAuthForm] = useState(initialAuthForm)
  const [adminForm, setAdminForm] = useState(initialAdminForm)

  const [flash, setFlash] = useState({ message: '', type: 'success' })
  const [loading, setLoading] = useState(false)

  const isAdmin = user?.role === 'ADMIN'

  const showFlash = (message, type = 'success') => {
    setFlash({ message, type })
    window.clearTimeout(showFlash.timer)
    showFlash.timer = window.setTimeout(() => {
      setFlash({ message: '', type: 'success' })
    }, 3000)
  }

  const api = async (path, options = {}) => {
    const headers = { ...(options.headers || {}) }
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    })

    const text = await response.text()
    let payload = {}
    if (text) {
      try {
        payload = JSON.parse(text)
      } catch {
        payload = { message: text }
      }
    }

    if (!response.ok || payload.success === false) {
      const message = payload.message || `Request failed with status ${response.status}`
      const error = new Error(message)
      error.status = response.status
      throw error
    }

    return payload.data
  }

  const persistSession = (authData) => {
    const nextUser = {
      name: authData.name,
      email: authData.email,
      role: authData.role,
    }
    setToken(authData.token)
    setUser(nextUser)
    localStorage.setItem('token', authData.token)
    localStorage.setItem('user', JSON.stringify(nextUser))
  }

  const clearSession = () => {
    setToken('')
    setUser(null)
    setCart(null)
    setOrders([])
    setInventory([])
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const loadCatalog = async () => {
    const [nextCategories, nextProducts] = await Promise.all([
      api('/api/categories'),
      api('/api/products'),
    ])
    setCategories(nextCategories || [])
    setProducts(nextProducts || [])

    setProductQty((prev) => {
      const updated = { ...prev }
      for (const product of nextProducts || []) {
        if (!updated[product.id]) {
          updated[product.id] = 1
        }
      }
      return updated
    })
  }

  const loadCart = async () => {
    if (!user) {
      setCart(null)
      return
    }
    const nextCart = await api('/api/cart')
    setCart(nextCart)
    setCartQty(
      Object.fromEntries((nextCart?.items || []).map((item) => [item.id, item.quantity]))
    )
  }

  const loadOrders = async () => {
    if (!user) {
      setOrders([])
      return
    }
    const nextOrders = await api('/api/orders/my')
    setOrders(nextOrders || [])
  }

  const loadInventory = async () => {
    if (!isAdmin) {
      setInventory([])
      return
    }
    const nextInventory = await api('/api/admin/inventory')
    setInventory(nextInventory || [])
  }

  const refreshPrivateData = async () => {
    try {
      await Promise.all([loadCart(), loadOrders(), loadInventory()])
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        clearSession()
      }
      showFlash(error.message, 'error')
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        await loadCatalog()
      } catch (error) {
        showFlash(error.message, 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      refreshPrivateData()
    }, 0)
    return () => window.clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email, user?.role])

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    return products.filter((product) => {
      const matchesCategory = !categoryId || String(product.category?.id || '') === String(categoryId)
      const haystack = `${product.name} ${product.description || ''} ${product.category?.name || ''}`.toLowerCase()
      const matchesSearch = !term || haystack.includes(term)
      return matchesCategory && matchesSearch
    })
  }, [products, search, categoryId])

  const onLogin = async (event) => {
    event.preventDefault()
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: authForm.loginEmail,
          password: authForm.loginPassword,
        }),
      })
      persistSession(data)
      setAuthForm((prev) => ({ ...prev, loginEmail: '', loginPassword: '' }))
      showFlash('Login successful.')
    } catch (error) {
      showFlash(error.message, 'error')
    }
  }

  const onRegister = async (event) => {
    event.preventDefault()
    try {
      const data = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: authForm.name,
          email: authForm.email,
          password: authForm.password,
          phone: authForm.phone,
          address: authForm.address,
        }),
      })
      persistSession(data)
      setAuthForm(initialAuthForm)
      showFlash('Account created.')
    } catch (error) {
      showFlash(error.message, 'error')
    }
  }

  const onAddToCart = async (productId) => {
    if (!user) {
      showFlash('Login required.', 'error')
      return
    }
    try {
      const quantity = Number(productQty[productId] || 1)
      const nextCart = await api('/api/cart/add', {
        method: 'POST',
        body: JSON.stringify({ productId: Number(productId), quantity }),
      })
      setCart(nextCart)
      showFlash('Added to cart.')
    } catch (error) {
      showFlash(error.message, 'error')
    }
  }

  const onUpdateCartItem = async (itemId, productId) => {
    try {
      const quantity = Number(cartQty[itemId] || 1)
      const nextCart = await api(`/api/cart/update/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ productId, quantity }),
      })
      setCart(nextCart)
      showFlash('Cart updated.')
    } catch (error) {
      showFlash(error.message, 'error')
    }
  }

  const onRemoveCartItem = async (itemId) => {
    try {
      const nextCart = await api(`/api/cart/remove/${itemId}`, { method: 'DELETE' })
      setCart(nextCart)
      showFlash('Item removed.')
    } catch (error) {
      showFlash(error.message, 'error')
    }
  }

  const onClearCart = async () => {
    try {
      await api('/api/cart/clear', { method: 'DELETE' })
      setCart({ items: [], totalAmount: 0 })
      showFlash('Cart cleared.')
    } catch (error) {
      showFlash(error.message, 'error')
    }
  }

  const onPlaceOrder = async () => {
    try {
      await api('/api/orders/place', { method: 'POST' })
      showFlash('Order placed.')
      await Promise.all([loadCart(), loadOrders(), loadInventory(), loadCatalog()])
    } catch (error) {
      showFlash(error.message, 'error')
    }
  }

  const onCreateCategory = async (event) => {
    event.preventDefault()
    try {
      await api('/api/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: adminForm.categoryName,
          brand: adminForm.brand,
          packagingType: adminForm.packagingType,
        }),
      })
      showFlash('Category created.')
      setAdminForm((prev) => ({ ...prev, categoryName: '', brand: '', packagingType: '' }))
      await loadCatalog()
    } catch (error) {
      showFlash(error.message, 'error')
    }
  }

  const onCreateProduct = async (event) => {
    event.preventDefault()
    try {
      await api('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: adminForm.productName,
          description: adminForm.description,
          price: Number(adminForm.price),
          categoryId: Number(adminForm.categoryId),
          imageUrl: adminForm.imageUrl,
          stockQuantity: Number(adminForm.stockQuantity),
        }),
      })
      showFlash('Product created.')
      setAdminForm((prev) => ({
        ...prev,
        productName: '',
        description: '',
        price: '',
        imageUrl: '',
        stockQuantity: '',
      }))
      await loadCatalog()
    } catch (error) {
      showFlash(error.message, 'error')
    }
  }

  const onUpdateInventory = async (event) => {
    event.preventDefault()
    try {
      await api(`/api/admin/inventory/${adminForm.inventoryProductId}`, {
        method: 'PUT',
        body: JSON.stringify({ availableStock: Number(adminForm.availableStock) }),
      })
      showFlash('Inventory updated.')
      setAdminForm((prev) => ({ ...prev, inventoryProductId: '', availableStock: '' }))
      await Promise.all([loadCatalog(), loadInventory()])
    } catch (error) {
      showFlash(error.message, 'error')
    }
  }

  return (
    <div className="app">
      <header className="header card">
        <div>
          <h1>Retail Ordering Frontend</h1>
          <p className="muted">React app connected to Spring Boot backend.</p>
          <p className="muted"><strong>API:</strong> {API_BASE_URL}</p>
        </div>
        <div className="session">
          <p><strong>User:</strong> {user?.name || 'Guest'}</p>
          <p><strong>Role:</strong> {user?.role || 'Guest'}</p>
          {user && (
            <button className="btn btn-secondary" onClick={() => { clearSession(); showFlash('Logged out.') }}>
              Logout
            </button>
          )}
        </div>
      </header>

      {flash.message && <p className={`flash ${flash.type}`}>{flash.message}</p>}

      <section className="grid two-col">
        <form className="card" onSubmit={onLogin}>
          <h2>Login</h2>
          <input
            type="email"
            placeholder="Email"
            value={authForm.loginEmail}
            onChange={(e) => setAuthForm((prev) => ({ ...prev, loginEmail: e.target.value }))}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={authForm.loginPassword}
            onChange={(e) => setAuthForm((prev) => ({ ...prev, loginPassword: e.target.value }))}
            required
          />
          <button className="btn" type="submit">Login</button>
        </form>

        <form className="card" onSubmit={onRegister}>
          <h2>Register</h2>
          <input type="text" placeholder="Name" value={authForm.name} onChange={(e) => setAuthForm((prev) => ({ ...prev, name: e.target.value }))} required />
          <input type="email" placeholder="Email" value={authForm.email} onChange={(e) => setAuthForm((prev) => ({ ...prev, email: e.target.value }))} required />
          <input type="password" placeholder="Password" minLength={6} value={authForm.password} onChange={(e) => setAuthForm((prev) => ({ ...prev, password: e.target.value }))} required />
          <input type="text" placeholder="Phone (optional)" value={authForm.phone} onChange={(e) => setAuthForm((prev) => ({ ...prev, phone: e.target.value }))} />
          <textarea placeholder="Address (optional)" value={authForm.address} onChange={(e) => setAuthForm((prev) => ({ ...prev, address: e.target.value }))} rows={2} />
          <button className="btn" type="submit">Create account</button>
        </form>
      </section>

      <section className="card">
        <h2>Products</h2>
        <div className="toolbar">
          <input type="search" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option value={category.id} key={category.id}>{category.name}</option>
            ))}
          </select>
          <button className="btn btn-secondary" type="button" onClick={loadCatalog}>Refresh</button>
        </div>
        {loading ? (
          <p className="muted">Loading products...</p>
        ) : (
          <div className="grid products">
            {filteredProducts.map((product) => (
              <article className="product card" key={product.id}>
                <p className="muted">{product.category?.name || 'Uncategorized'}</p>
                <h3>{product.name}</h3>
                <p className="muted">{product.description || 'No description'}</p>
                <p><strong>{formatCurrency(product.price)}</strong></p>
                <p className="muted">Stock: {product.stockQuantity ?? 0}</p>
                <div className="toolbar">
                  <input
                    type="number"
                    min={1}
                    value={productQty[product.id] || 1}
                    onChange={(e) => setProductQty((prev) => ({ ...prev, [product.id]: e.target.value }))}
                  />
                  <button className="btn" type="button" disabled={!user} onClick={() => onAddToCart(product.id)}>
                    Add to cart
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid two-col">
        <article className="card">
          <h2>Cart</h2>
          {!user && <p className="muted">Login to manage cart.</p>}
          {user && !(cart?.items?.length) && <p className="muted">Cart is empty.</p>}
          {(cart?.items || []).map((item) => (
            <div className="list-row" key={item.id}>
              <div>
                <p><strong>{item.product?.name}</strong></p>
                <p className="muted">{formatCurrency(item.subtotal)}</p>
              </div>
              <div className="toolbar">
                <input
                  type="number"
                  min={1}
                  value={cartQty[item.id] || item.quantity}
                  onChange={(e) => setCartQty((prev) => ({ ...prev, [item.id]: e.target.value }))}
                />
                <button className="btn btn-secondary" type="button" onClick={() => onUpdateCartItem(item.id, item.product?.id)}>Update</button>
                <button className="btn btn-secondary" type="button" onClick={() => onRemoveCartItem(item.id)}>Remove</button>
              </div>
            </div>
          ))}
          <p><strong>Total: {formatCurrency(cart?.totalAmount)}</strong></p>
          {user && (
            <div className="toolbar">
              <button className="btn btn-secondary" type="button" onClick={onClearCart}>Clear cart</button>
              <button className="btn" type="button" onClick={onPlaceOrder}>Place order</button>
            </div>
          )}
        </article>

        <article className="card">
          <h2>Orders</h2>
          {!user && <p className="muted">Login to view orders.</p>}
          {user && !orders.length && <p className="muted">No orders yet.</p>}
          {orders.map((order) => (
            <div className="list-row" key={order.id}>
              <div>
                <p><strong>Order #{order.id}</strong></p>
                <p className="muted">{new Date(order.orderDate).toLocaleString('en-IN')}</p>
                <p className="muted">Items: {order.items?.length || 0}</p>
              </div>
              <div>
                <p><strong>{formatCurrency(order.totalAmount)}</strong></p>
                <p className="muted">{order.status}</p>
              </div>
            </div>
          ))}
          {user && <button className="btn btn-secondary" type="button" onClick={loadOrders}>Refresh orders</button>}
        </article>
      </section>

      {isAdmin && (
        <section className="card">
          <h2>Admin</h2>
          <div className="grid three-col">
            <form className="card" onSubmit={onCreateCategory}>
              <h3>Create category</h3>
              <input type="text" placeholder="Name" value={adminForm.categoryName} onChange={(e) => setAdminForm((prev) => ({ ...prev, categoryName: e.target.value }))} required />
              <input type="text" placeholder="Brand" value={adminForm.brand} onChange={(e) => setAdminForm((prev) => ({ ...prev, brand: e.target.value }))} />
              <input type="text" placeholder="Packaging type" value={adminForm.packagingType} onChange={(e) => setAdminForm((prev) => ({ ...prev, packagingType: e.target.value }))} />
              <button className="btn" type="submit">Save category</button>
            </form>

            <form className="card" onSubmit={onCreateProduct}>
              <h3>Create product</h3>
              <input type="text" placeholder="Name" value={adminForm.productName} onChange={(e) => setAdminForm((prev) => ({ ...prev, productName: e.target.value }))} required />
              <textarea rows={2} placeholder="Description" value={adminForm.description} onChange={(e) => setAdminForm((prev) => ({ ...prev, description: e.target.value }))} />
              <input type="number" min={0.1} step={0.01} placeholder="Price" value={adminForm.price} onChange={(e) => setAdminForm((prev) => ({ ...prev, price: e.target.value }))} required />
              <select value={adminForm.categoryId} onChange={(e) => setAdminForm((prev) => ({ ...prev, categoryId: e.target.value }))} required>
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option value={category.id} key={category.id}>{category.name}</option>
                ))}
              </select>
              <input type="url" placeholder="Image URL" value={adminForm.imageUrl} onChange={(e) => setAdminForm((prev) => ({ ...prev, imageUrl: e.target.value }))} />
              <input type="number" min={0} step={1} placeholder="Stock quantity" value={adminForm.stockQuantity} onChange={(e) => setAdminForm((prev) => ({ ...prev, stockQuantity: e.target.value }))} required />
              <button className="btn" type="submit">Save product</button>
            </form>

            <form className="card" onSubmit={onUpdateInventory}>
              <h3>Update inventory</h3>
              <select value={adminForm.inventoryProductId} onChange={(e) => setAdminForm((prev) => ({ ...prev, inventoryProductId: e.target.value }))} required>
                <option value="">Select product</option>
                {products.map((product) => (
                  <option value={product.id} key={product.id}>{product.name}</option>
                ))}
              </select>
              <input type="number" min={0} step={1} placeholder="Available stock" value={adminForm.availableStock} onChange={(e) => setAdminForm((prev) => ({ ...prev, availableStock: e.target.value }))} required />
              <button className="btn" type="submit">Update stock</button>
            </form>
          </div>

          <h3>Inventory</h3>
          {!inventory.length && <p className="muted">No inventory loaded.</p>}
          {inventory.map((entry) => (
            <div className="list-row" key={entry.id}>
              <p><strong>{entry.product?.name}</strong></p>
              <p>{entry.availableStock} units</p>
            </div>
          ))}
          <button className="btn btn-secondary" type="button" onClick={loadInventory}>Refresh inventory</button>
        </section>
      )}
    </div>
  )
}

export default App
