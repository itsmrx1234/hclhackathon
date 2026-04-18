const { useEffect, useMemo, useState } = React;

const PROMOTIONS = {
    PIZZA10: { label: "Pizza 10% off", discountRate: 0.1 },
    DRINK5: { label: "Cold Drinks 5% off", discountRate: 0.05 },
    BREAD7: { label: "Fresh Breads 7% off", discountRate: 0.07 },
    FESTIVE15: { label: "Seasonal Offer 15% off", discountRate: 0.15 }
};

const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

function currency(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(value || 0));
}

function parseMenuGroup(product) {
    const text = `${product?.name || ""} ${product?.description || ""} ${product?.category?.name || ""}`.toLowerCase();
    if (text.includes("pizza")) return "Pizza";
    if (text.includes("drink") || text.includes("cola") || text.includes("cold")) return "Cold Drinks";
    if (text.includes("bread") || text.includes("bun") || text.includes("garlic")) return "Breads";
    return "Other";
}

function App() {
    const [token, setToken] = useState(localStorage.getItem("token") || "");
    const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState(null);
    const [orders, setOrders] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [adminOrders, setAdminOrders] = useState([]);
    const [search, setSearch] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [flash, setFlash] = useState(null);
    const [qtyByProduct, setQtyByProduct] = useState({});
    const [cartQty, setCartQty] = useState({});
    const [promoCode, setPromoCode] = useState("");
    const [adminStatusDraft, setAdminStatusDraft] = useState({});

    const isAdmin = user?.role === "ADMIN";

    function showFlash(message, type = "success") {
        setFlash({ message, type });
        clearTimeout(showFlash.timer);
        showFlash.timer = setTimeout(() => setFlash(null), 3200);
    }

    function clearSession() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken("");
        setUser(null);
        setCart(null);
        setOrders([]);
        setInventory([]);
        setAdminOrders([]);
        setCartQty({});
    }

    async function api(path, options = {}) {
        const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
        if (token) headers.Authorization = `Bearer ${token}`;

        const response = await fetch(path, { ...options, headers });
        const text = await response.text();
        const payload = text ? JSON.parse(text) : {};

        if (!response.ok || payload.success === false) {
            const message = payload.message || `Request failed with status ${response.status}`;
            if (response.status === 401 || response.status === 403 || String(message).toLowerCase().includes("unauthorized")) {
                clearSession();
            }
            throw new Error(message);
        }
        return payload.data;
    }

    function persistSession(authData) {
        const nextUser = { name: authData.name, email: authData.email, role: authData.role };
        localStorage.setItem("token", authData.token);
        localStorage.setItem("user", JSON.stringify(nextUser));
        setToken(authData.token);
        setUser(nextUser);
    }

    async function loadCatalog() {
        const [categoryData, productData] = await Promise.all([api("/api/categories"), api("/api/products")]);
        setCategories(categoryData || []);
        setProducts(productData || []);
    }

    async function loadCart() {
        if (!user) return;
        const data = await api("/api/cart");
        setCart(data);
        const draft = {};
        (data?.items || []).forEach((item) => {
            draft[item.id] = item.quantity;
        });
        setCartQty(draft);
    }

    async function loadOrders() {
        if (!user) return;
        setOrders((await api("/api/orders/my")) || []);
    }

    async function loadInventory() {
        if (!isAdmin) return;
        setInventory((await api("/api/admin/inventory")) || []);
    }

    async function loadAdminOrders() {
        if (!isAdmin) return;
        const data = (await api("/api/admin/orders")) || [];
        setAdminOrders(data);
        const draft = {};
        data.forEach((order) => {
            draft[order.id] = order.status;
        });
        setAdminStatusDraft(draft);
    }

    async function refreshPrivateData() {
        if (!user) return;
        await Promise.all([loadCart(), loadOrders(), loadInventory(), loadAdminOrders()]);
    }

    useEffect(() => {
        (async () => {
            try {
                await loadCatalog();
                if (user) await refreshPrivateData();
            } catch (error) {
                showFlash(error.message, "error");
            }
        })();
    }, [user]);

    const filteredProducts = useMemo(() => products.filter((product) => {
        const byCategory = !categoryId || String(product.category?.id || "") === String(categoryId);
        const bySearch = !search || `${product.name} ${product.description || ""} ${product.category?.name || ""}`.toLowerCase().includes(search.toLowerCase());
        return byCategory && bySearch;
    }), [products, categoryId, search]);

    const menuStats = useMemo(() => products.reduce((acc, product) => {
        const key = parseMenuGroup(product);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, { Pizza: 0, "Cold Drinks": 0, Breads: 0, Other: 0 }), [products]);

    const loyaltyPoints = Math.floor(orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0) / 100);
    const promotion = PROMOTIONS[promoCode.trim().toUpperCase()];
    const cartTotal = Number(cart?.totalAmount || 0);
    const promoDiscount = promotion ? cartTotal * promotion.discountRate : 0;
    const payableTotal = Math.max(cartTotal - promoDiscount, 0);

    const callWithFlash = (promise, okMessage) => promise.then(() => showFlash(okMessage)).catch((e) => showFlash(e.message, "error"));

    async function addToCart(productId) {
        if (!user) return showFlash("Login to add items to cart.", "error");
        const quantity = Number(qtyByProduct[productId] || 1);
        if (quantity < 1) return showFlash("Quantity must be at least 1.", "error");
        try {
            setCart(await api("/api/cart/add", { method: "POST", body: JSON.stringify({ productId: Number(productId), quantity }) }));
            showFlash("Item added to cart.");
        } catch (error) {
            showFlash(error.message, "error");
        }
    }

    async function quickReorder(order) {
        if (!user) return showFlash("Login required.", "error");
        try {
            const requests = (order.items || [])
                .filter((item) => item.product?.id)
                .map((item) => api("/api/cart/add", {
                    method: "POST",
                    body: JSON.stringify({
                        productId: Number(item.product.id),
                        quantity: Number(item.quantity || 1)
                    })
                }));
            await Promise.all(requests);
            await loadCart();
            showFlash(`Order #${order.id} added to cart.`);
        } catch (error) {
            showFlash(error.message, "error");
        }
    }

    return (
        <div className="page-shell">
            <header className="hero">
                <div className="hero__copy">
                    <p className="eyebrow">Retail Ordering Website</p>
                    <h1>Browse, order, and receive Pizza, Cold Drinks, and Breads seamlessly.</h1>
                    <p className="hero__text">Secure operations with authenticated APIs, centralized catalog management, and live cart-to-order workflows.</p>
                    <div className="hero__stats">
                        <article><span>{products.length}</span><p>Menu Items</p></article>
                        <article><span>{categories.length}</span><p>Categories</p></article>
                        <article><span>{user?.role || "Guest"}</span><p>Current Role</p></article>
                    </div>
                </div>
                <div className="hero__panel glass">
                    <div className="session-bar">
                        <div>
                            <p className="label">Signed In As</p>
                            <strong>{user?.name || "Guest session"}</strong>
                            <p className="muted">{user?.email || "Browse menus without logging in."}</p>
                            {user && <p className="muted">Loyalty points: {loyaltyPoints}</p>}
                        </div>
                        {user && <button className="button button--ghost" onClick={() => { clearSession(); showFlash("Logged out."); }}>Logout</button>}
                    </div>
                    {flash && <div className={`flash is-${flash.type}`}>{flash.message}</div>}
                </div>
            </header>

            <main className="dashboard">
                <section className="panel panel--auth">
                    <div className="panel__heading"><div><p className="eyebrow">Customer Enablement</p><h2>Login or create account</h2></div></div>
                    <div className="auth-grid">
                        <form className="card form-card" onSubmit={(event) => callWithFlash((async () => {
                            event.preventDefault();
                            const form = new FormData(event.currentTarget);
                            const data = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
                            persistSession(data);
                            event.currentTarget.reset();
                            await refreshPrivateData();
                        })(), "Login successful.")}>
                            <h3>Login</h3>
                            <label><span>Email</span><input name="email" type="email" required /></label>
                            <label><span>Password</span><input name="password" type="password" required /></label>
                            <button className="button" type="submit">Login</button>
                        </form>
                        <form className="card form-card" onSubmit={(event) => callWithFlash((async () => {
                            event.preventDefault();
                            const form = new FormData(event.currentTarget);
                            const data = await api("/api/auth/register", { method: "POST", body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password"), phone: form.get("phone"), address: form.get("address") }) });
                            persistSession(data);
                            event.currentTarget.reset();
                            await refreshPrivateData();
                        })(), "Account created and logged in.")}>
                            <h3>Register</h3>
                            <label><span>Name</span><input name="name" required /></label>
                            <label><span>Email</span><input name="email" type="email" required /></label>
                            <label><span>Password</span><input name="password" type="password" minLength="6" required /></label>
                            <label><span>Phone</span><input name="phone" /></label>
                            <label><span>Address</span><textarea name="address" rows="3"></textarea></label>
                            <button className="button button--accent" type="submit">Create account</button>
                        </form>
                    </div>
                </section>

                <section className="panel">
                    <div className="panel__heading">
                        <div><p className="eyebrow">Centralized Portal</p><h2>Brands, categories, and packaging</h2></div>
                        <div className="toolbar">
                            <input type="search" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} />
                            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                                <option value="">All categories</option>
                                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                            </select>
                            <button className="button button--ghost" type="button" onClick={() => callWithFlash(loadCatalog(), "Catalog refreshed.")}>Refresh</button>
                        </div>
                    </div>
                    <div className="pill-row">
                        {Object.entries(menuStats).filter(([key]) => key !== "Other").map(([key, count]) => <button key={key} className="pill" onClick={() => setSearch(key)}>{key} ({count})</button>)}
                        <button className="pill" onClick={() => { setSearch(""); setCategoryId(""); }}>Reset filters</button>
                    </div>
                    <div className="stack-list">
                        {categories.map((category) => (
                            <article key={category.id} className="list-item">
                                <div className="list-item__row"><strong>{category.name}</strong><span className="status-badge">{category.packagingType || "Packaging N/A"}</span></div>
                                <p className="muted">Brand: {category.brand || "Standard"}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="panel">
                    <div className="panel__heading"><div><p className="eyebrow">Menu</p><h2>Browse and add to cart</h2></div></div>
                    <div className="product-grid">
                        {!filteredProducts.length && <div className="empty-state">No products match current filters.</div>}
                        {filteredProducts.map((product) => (
                            <article key={product.id} className="product-card">
                                <div className="product-media">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <div className="placeholder-art">{product.name}</div>}</div>
                                <div><div className="product-meta"><span>{product.category?.name || "Uncategorized"}</span><span>{product.stockQuantity || 0} in stock</span></div><h3>{product.name}</h3><p className="muted">{product.description || "No description available."}</p></div>
                                <div className="list-item__row"><strong>{currency(product.price)}</strong><span className="status-badge">{parseMenuGroup(product)}</span></div>
                                <div className="product-actions">
                                    <input
                                        className="qty-input"
                                        type="number"
                                        min="1"
                                        aria-label={`Quantity for ${product.name}`}
                                        value={qtyByProduct[product.id] || 1}
                                        onChange={(e) => setQtyByProduct((prev) => ({ ...prev, [product.id]: Math.max(1, Number(e.target.value) || 1) }))}
                                    />
                                    <button className="button" disabled={!user} onClick={() => addToCart(product.id)}>Add to cart</button>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="panel panel--split">
                    <div className="card cart-card">
                        <div className="panel__heading"><div><p className="eyebrow">Cart</p><h2>Your basket</h2></div><button className="button button--ghost" onClick={() => callWithFlash(api("/api/cart/clear", { method: "DELETE" }).then(() => { setCart({ items: [], totalAmount: 0 }); setCartQty({}); }), "Cart cleared.")}>Clear cart</button></div>
                        {!user && <div className="stack-list empty-state">Login to manage cart.</div>}
                        {user && !((cart?.items || []).length > 0) && <div className="stack-list empty-state">Your cart is empty.</div>}
                        {user && (cart?.items || []).length > 0 && (
                            <div className="stack-list">
                                {cart.items.map((item) => (
                                    <article key={item.id} className="list-item">
                                        <div className="list-item__row">
                                            <div>
                                                <strong>{item.product?.name}</strong>
                                                <p className="muted">{currency(item.product?.price)} each</p>
                                            </div>
                                            <strong>{currency(item.subtotal)}</strong>
                                        </div>
                                        <div className="product-actions">
                                            <input
                                                className="qty-input"
                                                min="1"
                                                type="number"
                                                aria-label={`Cart quantity for ${item.product?.name || "item"}`}
                                                value={cartQty[item.id] || item.quantity}
                                                onChange={(e) => setCartQty((prev) => ({ ...prev, [item.id]: Math.max(1, Number(e.target.value) || 1) }))}
                                            />
                                            <button
                                                className="button button--ghost"
                                                onClick={() => callWithFlash(
                                                    api(`/api/cart/update/${item.id}`, {
                                                        method: "PUT",
                                                        body: JSON.stringify({
                                                            productId: Number(item.product?.id),
                                                            quantity: Number(cartQty[item.id] || 1)
                                                        })
                                                    }).then(setCart),
                                                    "Cart updated."
                                                )}
                                            >
                                                Update
                                            </button>
                                            <button
                                                className="button button--ghost"
                                                onClick={() => callWithFlash(api(`/api/cart/remove/${item.id}`, { method: "DELETE" }).then(setCart), "Item removed.")}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                        <div className="cart-footer">
                            <div><p className="label">Total</p><strong>{currency(cartTotal)}</strong>{promotion && <p className="muted">Promo preview: -{currency(promoDiscount)} ({promotion.label})</p>}{promotion && <p className="label">Payable Preview: {currency(payableTotal)}</p>}</div>
                            <button className="button button--accent" onClick={() => callWithFlash(api("/api/orders/place", { method: "POST" }).then(refreshPrivateData).then(() => setPromoCode("")), "Order placed successfully.")}>Place order</button>
                        </div>
                        <div className="toolbar">
                            <input
                                type="text"
                                aria-label="Coupon code"
                                placeholder="Coupon code (PIZZA10, DRINK5, BREAD7, FESTIVE15)"
                                value={promoCode}
                                onChange={(e) => setPromoCode(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="card orders-card">
                        <div className="panel__heading"><div><p className="eyebrow">Orders</p><h2>Order history & quick reorder</h2></div><button className="button button--ghost" onClick={() => callWithFlash(loadOrders(), "Orders refreshed.")}>Refresh</button></div>
                        {!user && <div className="stack-list empty-state">Login to see orders.</div>}
                        {user && !orders.length && <div className="stack-list empty-state">No orders yet.</div>}
                        {user && !!orders.length && <div className="stack-list">{orders.map((order) => <article key={order.id} className="list-item"><div className="list-item__row"><div><strong>Order #{order.id}</strong><p className="muted">{new Date(order.orderDate).toLocaleString("en-IN")}</p></div><span className="status-badge">{order.status}</span></div><p className="muted">{(order.items || []).length} items • Delivery: {order.deliveryAddress || "Default Address"}</p><div className="list-item__row"><strong>{currency(order.totalAmount)}</strong><button className="button button--ghost" onClick={() => quickReorder(order)}>Quick reorder</button></div></article>)}</div>}
                    </div>
                </section>

                {isAdmin && <section className="panel admin-panel">
                    <div className="panel__heading"><div><p className="eyebrow">Admin</p><h2>Manage catalog, inventory, and order operations</h2></div></div>
                    <div className="admin-grid">
                        <form className="card form-card" onSubmit={(event) => callWithFlash((async () => {
                            event.preventDefault();
                            const form = new FormData(event.currentTarget);
                            await api("/api/categories", { method: "POST", body: JSON.stringify({ name: form.get("name"), brand: form.get("brand"), packagingType: form.get("packagingType") }) });
                            event.currentTarget.reset();
                            await loadCatalog();
                        })(), "Category created.")}>
                            <h3>Create category</h3>
                            <label><span>Name</span><input name="name" required /></label>
                            <label><span>Brand</span><input name="brand" /></label>
                            <label><span>Packaging Type</span><input name="packagingType" /></label>
                            <button className="button" type="submit">Save category</button>
                        </form>
                        <form className="card form-card" onSubmit={(event) => callWithFlash((async () => {
                            event.preventDefault();
                            const form = new FormData(event.currentTarget);
                            await api("/api/products", { method: "POST", body: JSON.stringify({ name: form.get("name"), description: form.get("description"), price: Number(form.get("price")), categoryId: Number(form.get("categoryId")), imageUrl: form.get("imageUrl"), stockQuantity: Number(form.get("stockQuantity")) }) });
                            event.currentTarget.reset();
                            await loadCatalog();
                        })(), "Product created.")}>
                            <h3>Create product</h3>
                            <label><span>Name</span><input name="name" required /></label>
                            <label><span>Description</span><textarea name="description" rows="3"></textarea></label>
                            <label><span>Price</span><input name="price" type="number" min="0.1" step="0.01" required /></label>
                            <label><span>Category</span><select name="categoryId" required>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                            <label><span>Image URL</span><input name="imageUrl" type="url" /></label>
                            <label><span>Stock Quantity</span><input name="stockQuantity" type="number" min="0" step="1" required /></label>
                            <button className="button button--accent" type="submit">Save product</button>
                        </form>
                        <form className="card form-card" onSubmit={(event) => callWithFlash((async () => {
                            event.preventDefault();
                            const form = new FormData(event.currentTarget);
                            await api(`/api/admin/inventory/${form.get("productId")}`, { method: "PUT", body: JSON.stringify({ availableStock: Number(form.get("availableStock")) }) });
                            event.currentTarget.reset();
                            await Promise.all([loadCatalog(), loadInventory()]);
                        })(), "Inventory updated.")}>
                            <h3>Update stock</h3>
                            <label><span>Product</span><select name="productId" required>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
                            <label><span>Available Stock</span><input name="availableStock" type="number" min="0" step="1" required /></label>
                            <button className="button" type="submit">Update inventory</button>
                        </form>
                    </div>
                    <div className="card">
                        <div className="panel__heading"><div><p className="eyebrow">Inventory Snapshot</p><h3>Current stock</h3></div><button className="button button--ghost" onClick={() => callWithFlash(loadInventory(), "Inventory refreshed.")}>Refresh</button></div>
                        <div className="stack-list">{!inventory.length && <div className="empty-state">No inventory records loaded.</div>}{inventory.map((entry) => <article key={entry.id} className="list-item"><div className="list-item__row"><div><strong>{entry.product?.name || `Product #${entry.id}`}</strong><p className="muted">{entry.lastUpdated ? new Date(entry.lastUpdated).toLocaleString("en-IN") : "Inventory record"}</p></div><strong>{entry.availableStock || 0} units</strong></div></article>)}</div>
                    </div>
                    <div className="card">
                        <div className="panel__heading"><div><p className="eyebrow">Secure & Efficient Operations</p><h3>Admin order status updates</h3></div><button className="button button--ghost" onClick={() => callWithFlash(loadAdminOrders(), "Admin orders refreshed.")}>Refresh</button></div>
                        <div className="stack-list">
                            {!adminOrders.length && <div className="empty-state">No orders available.</div>}
                            {adminOrders.map((order) => (
                                <article key={order.id} className="list-item">
                                    <div className="list-item__row">
                                        <strong>Order #{order.id}</strong>
                                        <span className="status-badge">{order.status}</span>
                                    </div>
                                    <p className="muted">{order.items?.length || 0} items • {currency(order.totalAmount)}</p>
                                    <div className="product-actions">
                                        <select
                                            value={adminStatusDraft[order.id] || order.status}
                                            onChange={(e) => setAdminStatusDraft((prev) => ({ ...prev, [order.id]: e.target.value }))}
                                        >
                                            {ORDER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                                        </select>
                                        <button
                                            className="button"
                                            onClick={() => callWithFlash(
                                                api(`/api/admin/orders/${order.id}/status?status=${encodeURIComponent(adminStatusDraft[order.id] || "PENDING")}`, { method: "PUT" })
                                                    .then(loadAdminOrders),
                                                `Order #${order.id} status updated.`
                                            )}
                                        >
                                            Update status
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>}
            </main>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
