const state = {
    token: localStorage.getItem("token") || "",
    user: JSON.parse(localStorage.getItem("user") || "null"),
    categories: [],
    products: [],
    cart: null,
    orders: [],
    inventory: [],
    search: "",
    categoryId: ""
};

const dom = {
    flash: document.getElementById("flash-message"),
    logoutBtn: document.getElementById("logout-btn"),
    sessionUser: document.getElementById("session-user"),
    sessionEmail: document.getElementById("session-email"),
    sessionRole: document.getElementById("session-role"),
    productCount: document.getElementById("product-count"),
    categoryCount: document.getElementById("category-count"),
    productGrid: document.getElementById("product-grid"),
    categoryFilter: document.getElementById("category-filter"),
    categoryPills: document.getElementById("category-pills"),
    searchInput: document.getElementById("search-input"),
    cartItems: document.getElementById("cart-items"),
    cartTotal: document.getElementById("cart-total"),
    ordersList: document.getElementById("orders-list"),
    adminPanel: document.getElementById("admin-panel"),
    adminCategorySelect: document.getElementById("admin-category-select"),
    inventoryProductSelect: document.getElementById("inventory-product-select"),
    inventoryList: document.getElementById("inventory-list")
};

function currency(value) {
    const amount = Number(value || 0);
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(amount);
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    }[char]));
}

function showFlash(message, type = "success") {
    dom.flash.hidden = false;
    dom.flash.textContent = message;
    dom.flash.className = `flash is-${type}`;
    clearTimeout(showFlash.timer);
    showFlash.timer = setTimeout(() => {
        dom.flash.hidden = true;
    }, 3200);
}

async function api(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };
    if (state.token) {
        headers.Authorization = `Bearer ${state.token}`;
    }

    const response = await fetch(path, { ...options, headers });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};

    if (!response.ok || payload.success === false) {
        throw new Error(payload.message || `Request failed with status ${response.status}`);
    }

    return payload.data;
}

function persistSession(authData) {
    state.token = authData.token;
    state.user = {
        name: authData.name,
        email: authData.email,
        role: authData.role
    };
    localStorage.setItem("token", state.token);
    localStorage.setItem("user", JSON.stringify(state.user));
    renderSession();
}

function clearSession() {
    state.token = "";
    state.user = null;
    state.cart = null;
    state.orders = [];
    state.inventory = [];
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    renderSession();
    renderCart();
    renderOrders();
    renderInventory();
}

function renderSession() {
    const user = state.user;
    dom.sessionUser.textContent = user ? user.name : "Guest session";
    dom.sessionEmail.textContent = user ? user.email : "Browse products without logging in.";
    dom.sessionRole.textContent = user ? user.role : "Guest";
    dom.logoutBtn.hidden = !user;
    dom.adminPanel.hidden = !(user && user.role === "ADMIN");
}

function populateCategoryControls() {
    const options = ['<option value="">All categories</option>']
        .concat(state.categories.map((category) => (
            `<option value="${category.id}">${escapeHtml(category.name)}</option>`
        )));
    dom.categoryFilter.innerHTML = options.join("");
    dom.adminCategorySelect.innerHTML = state.categories.map((category) => (
        `<option value="${category.id}">${escapeHtml(category.name)}${category.brand ? ` - ${escapeHtml(category.brand)}` : ""}</option>`
    )).join("");

    const pills = [
        `<button class="pill ${state.categoryId === "" ? "active" : ""}" data-category="">All</button>`
    ].concat(state.categories.map((category) => (
        `<button class="pill ${String(state.categoryId) === String(category.id) ? "active" : ""}" data-category="${category.id}">
            ${escapeHtml(category.name)}
        </button>`
    )));
    dom.categoryPills.innerHTML = pills.join("");
}

function populateProductSelect() {
    dom.inventoryProductSelect.innerHTML = state.products.map((product) => (
        `<option value="${product.id}">${escapeHtml(product.name)} (${product.stockQuantity ?? 0} in catalog)</option>`
    )).join("");
}

function filteredProducts() {
    return state.products.filter((product) => {
        const matchesCategory = !state.categoryId || String(product.category?.id || "") === String(state.categoryId);
        const haystack = `${product.name} ${product.description || ""} ${product.category?.name || ""}`.toLowerCase();
        const matchesSearch = !state.search || haystack.includes(state.search.toLowerCase());
        return matchesCategory && matchesSearch;
    });
}

function renderProducts() {
    const items = filteredProducts();
    dom.productCount.textContent = String(state.products.length);
    dom.categoryCount.textContent = String(state.categories.length);

    if (!items.length) {
        dom.productGrid.innerHTML = '<div class="empty-state">No products match the current filters.</div>';
        return;
    }

    dom.productGrid.innerHTML = items.map((product) => `
        <article class="product-card">
            <div class="product-media">
                ${product.imageUrl
                    ? `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)}">`
                    : `<div class="placeholder-art">${escapeHtml(product.name)}</div>`}
            </div>
            <div>
                <div class="product-meta">
                    <span>${escapeHtml(product.category?.name || "Uncategorized")}</span>
                    <span>${product.stockQuantity ?? 0} in stock</span>
                </div>
                <h3>${escapeHtml(product.name)}</h3>
                <p class="muted">${escapeHtml(product.description || "No description available.")}</p>
            </div>
            <div class="list-item__row">
                <strong>${currency(product.price)}</strong>
                <span class="status-badge">${product.active === false ? "Inactive" : "Active"}</span>
            </div>
            <div class="product-actions">
                <input class="qty-input" id="qty-${product.id}" type="number" min="1" value="1">
                <button class="button" data-add-to-cart="${product.id}" ${state.user ? "" : "disabled"}>Add to cart</button>
            </div>
        </article>
    `).join("");
}

function renderCart() {
    if (!state.user) {
        dom.cartItems.className = "stack-list empty-state";
        dom.cartItems.textContent = "Login to manage your cart.";
        dom.cartTotal.textContent = currency(0);
        return;
    }

    const items = state.cart?.items || [];
    if (!items.length) {
        dom.cartItems.className = "stack-list empty-state";
        dom.cartItems.textContent = "Your cart is empty. Add products from the catalog.";
        dom.cartTotal.textContent = currency(0);
        return;
    }

    dom.cartItems.className = "stack-list";
    dom.cartItems.innerHTML = items.map((item) => `
        <article class="list-item">
            <div class="list-item__row">
                <div>
                    <strong>${escapeHtml(item.product?.name || "Product")}</strong>
                    <p class="muted">${currency(item.product?.price)} each</p>
                </div>
                <strong>${currency(item.subtotal)}</strong>
            </div>
            <div class="product-actions">
                <input class="qty-input" id="cart-qty-${item.id}" type="number" min="1" value="${item.quantity}">
                <button class="button button--ghost" data-update-cart="${item.id}">Update</button>
                <button class="button button--ghost" data-remove-cart="${item.id}">Remove</button>
            </div>
        </article>
    `).join("");
    dom.cartTotal.textContent = currency(state.cart?.totalAmount);
}

function renderOrders() {
    if (!state.user) {
        dom.ordersList.className = "stack-list empty-state";
        dom.ordersList.textContent = "Login to see your orders.";
        return;
    }

    if (!state.orders.length) {
        dom.ordersList.className = "stack-list empty-state";
        dom.ordersList.textContent = "No orders yet. Place one from your cart.";
        return;
    }

    dom.ordersList.className = "stack-list";
    dom.ordersList.innerHTML = state.orders.map((order) => `
        <article class="list-item">
            <div class="list-item__row">
                <div>
                    <strong>Order #${order.id}</strong>
                    <p class="muted">${new Date(order.orderDate).toLocaleString("en-IN")}</p>
                </div>
                <span class="status-badge">${escapeHtml(order.status)}</span>
            </div>
            <p class="muted">${(order.items || []).length} items</p>
            <strong>${currency(order.totalAmount)}</strong>
        </article>
    `).join("");
}

function renderInventory() {
    if (!(state.user && state.user.role === "ADMIN")) {
        dom.inventoryList.className = "stack-list empty-state";
        dom.inventoryList.textContent = "Admin access required.";
        return;
    }

    if (!state.inventory.length) {
        dom.inventoryList.className = "stack-list empty-state";
        dom.inventoryList.textContent = "No inventory records loaded.";
        return;
    }

    dom.inventoryList.className = "stack-list";
    dom.inventoryList.innerHTML = state.inventory.map((entry) => `
        <article class="list-item">
            <div class="list-item__row">
                <div>
                    <strong>${escapeHtml(entry.product?.name || `Product #${entry.id || ""}`)}</strong>
                    <p class="muted">${entry.lastUpdated ? `Updated ${new Date(entry.lastUpdated).toLocaleString("en-IN")}` : "Inventory record"}</p>
                </div>
                <strong>${entry.availableStock ?? 0} units</strong>
            </div>
        </article>
    `).join("");
}

async function loadCatalog() {
    const [categories, products] = await Promise.all([
        api("/api/categories"),
        api("/api/products")
    ]);
    state.categories = categories || [];
    state.products = products || [];
    populateCategoryControls();
    populateProductSelect();
    renderProducts();
}

async function loadCart() {
    if (!state.user) {
        renderCart();
        return;
    }
    state.cart = await api("/api/cart");
    renderCart();
}

async function loadOrders() {
    if (!state.user) {
        renderOrders();
        return;
    }
    state.orders = await api("/api/orders/my");
    renderOrders();
}

async function loadInventory() {
    if (!(state.user && state.user.role === "ADMIN")) {
        renderInventory();
        return;
    }
    state.inventory = await api("/api/admin/inventory");
    renderInventory();
}

async function refreshPrivateData() {
    try {
        await Promise.all([loadCart(), loadOrders(), loadInventory()]);
    } catch (error) {
        if (String(error.message).toLowerCase().includes("unauthorized") || String(error.message).includes("403")) {
            clearSession();
        }
        showFlash(error.message, "error");
    }
}

document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
        const data = await api("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({
                email: form.get("email"),
                password: form.get("password")
            })
        });
        persistSession(data);
        event.currentTarget.reset();
        showFlash("Login successful.");
        await refreshPrivateData();
        renderProducts();
    } catch (error) {
        showFlash(error.message, "error");
    }
});

document.getElementById("register-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
        const data = await api("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({
                name: form.get("name"),
                email: form.get("email"),
                password: form.get("password"),
                phone: form.get("phone"),
                address: form.get("address")
            })
        });
        persistSession(data);
        event.currentTarget.reset();
        showFlash("Account created and logged in.");
        await refreshPrivateData();
        renderProducts();
    } catch (error) {
        showFlash(error.message, "error");
    }
});

document.getElementById("category-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
        await api("/api/categories", {
            method: "POST",
            body: JSON.stringify({
                name: form.get("name"),
                brand: form.get("brand"),
                packagingType: form.get("packagingType")
            })
        });
        event.currentTarget.reset();
        showFlash("Category created.");
        await loadCatalog();
    } catch (error) {
        showFlash(error.message, "error");
    }
});

document.getElementById("product-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
        await api("/api/products", {
            method: "POST",
            body: JSON.stringify({
                name: form.get("name"),
                description: form.get("description"),
                price: Number(form.get("price")),
                categoryId: Number(form.get("categoryId")),
                imageUrl: form.get("imageUrl"),
                stockQuantity: Number(form.get("stockQuantity"))
            })
        });
        event.currentTarget.reset();
        showFlash("Product created.");
        await loadCatalog();
    } catch (error) {
        showFlash(error.message, "error");
    }
});

document.getElementById("inventory-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
        await api(`/api/admin/inventory/${form.get("productId")}`, {
            method: "PUT",
            body: JSON.stringify({
                availableStock: Number(form.get("availableStock"))
            })
        });
        event.currentTarget.reset();
        showFlash("Inventory updated.");
        await Promise.all([loadCatalog(), loadInventory()]);
    } catch (error) {
        showFlash(error.message, "error");
    }
});

dom.logoutBtn.addEventListener("click", () => {
    clearSession();
    showFlash("Logged out.");
    renderProducts();
});

dom.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim();
    renderProducts();
});

dom.categoryFilter.addEventListener("change", (event) => {
    state.categoryId = event.target.value;
    populateCategoryControls();
    renderProducts();
});

dom.categoryPills.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) {
        return;
    }
    state.categoryId = button.dataset.category || "";
    dom.categoryFilter.value = state.categoryId;
    populateCategoryControls();
    renderProducts();
});

document.getElementById("refresh-products").addEventListener("click", async () => {
    try {
        await loadCatalog();
        showFlash("Catalog refreshed.");
    } catch (error) {
        showFlash(error.message, "error");
    }
});

document.getElementById("refresh-orders").addEventListener("click", async () => {
    try {
        await loadOrders();
        showFlash("Orders refreshed.");
    } catch (error) {
        showFlash(error.message, "error");
    }
});

document.getElementById("refresh-inventory").addEventListener("click", async () => {
    try {
        await loadInventory();
        showFlash("Inventory refreshed.");
    } catch (error) {
        showFlash(error.message, "error");
    }
});

document.getElementById("clear-cart-btn").addEventListener("click", async () => {
    if (!state.user) {
        showFlash("Login required.", "error");
        return;
    }
    try {
        await api("/api/cart/clear", { method: "DELETE" });
        state.cart = { items: [], totalAmount: 0 };
        renderCart();
        showFlash("Cart cleared.");
    } catch (error) {
        showFlash(error.message, "error");
    }
});

document.getElementById("place-order-btn").addEventListener("click", async () => {
    if (!state.user) {
        showFlash("Login required.", "error");
        return;
    }
    try {
        await api("/api/orders/place", { method: "POST" });
        showFlash("Order placed successfully.");
        await refreshPrivateData();
    } catch (error) {
        showFlash(error.message, "error");
    }
});

dom.productGrid.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-add-to-cart]");
    if (!button) {
        return;
    }
    if (!state.user) {
        showFlash("Login to add items to the cart.", "error");
        return;
    }
    const productId = button.dataset.addToCart;
    const quantity = Number(document.getElementById(`qty-${productId}`)?.value || 1);
    try {
        state.cart = await api("/api/cart/add", {
            method: "POST",
            body: JSON.stringify({ productId: Number(productId), quantity })
        });
        renderCart();
        showFlash("Item added to cart.");
    } catch (error) {
        showFlash(error.message, "error");
    }
});

dom.cartItems.addEventListener("click", async (event) => {
    const updateButton = event.target.closest("[data-update-cart]");
    const removeButton = event.target.closest("[data-remove-cart]");

    try {
        if (updateButton) {
            const itemId = updateButton.dataset.updateCart;
            const quantity = Number(document.getElementById(`cart-qty-${itemId}`)?.value || 1);
            const existing = (state.cart?.items || []).find((item) => String(item.id) === String(itemId));
            state.cart = await api(`/api/cart/update/${itemId}`, {
                method: "PUT",
                body: JSON.stringify({
                    productId: existing?.product?.id,
                    quantity
                })
            });
            renderCart();
            showFlash("Cart updated.");
        }

        if (removeButton) {
            const itemId = removeButton.dataset.removeCart;
            state.cart = await api(`/api/cart/remove/${itemId}`, { method: "DELETE" });
            renderCart();
            showFlash("Item removed from cart.");
        }
    } catch (error) {
        showFlash(error.message, "error");
    }
});

async function boot() {
    renderSession();
    renderCart();
    renderOrders();
    renderInventory();

    try {
        await loadCatalog();
        if (state.user) {
            await refreshPrivateData();
        }
    } catch (error) {
        showFlash(error.message, "error");
    }
}

boot();
