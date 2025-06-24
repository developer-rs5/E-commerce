// DOM elements
const loginPage = document.getElementById('login-page');
const adminPanel = document.getElementById('admin-panel');
const loginForm = document.getElementById('login-form');
const productList = document.getElementById('product-list');
const orderList = document.getElementById('order-list');
const productFormContainer = document.getElementById('product-form-container');
const productForm = document.getElementById('product-form');
const pageTitle = document.getElementById('page-title');
const totalProductsEl = document.getElementById('total-products');
const pendingOrdersEl = document.getElementById('pending-orders');
const totalRevenueEl = document.getElementById('total-revenue');

// API Configuration
const API_BASE_URL = "http://localhost:8000/api";

// Initialize the admin panel
function initAdminPanel() {
    // Check if already logged in
    verifyAdminToken();
    
    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            showLoading(true);
            try {
                const response = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password }),
                    credentials: 'include'
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Login failed');
                }
                
                const data = await response.json();
                if (!data.token) {
                    throw new Error('Token missing in login response');
                }

                localStorage.setItem('adminToken', data.token);
                
                if (loginPage) loginPage.style.display = 'none';
                if (adminPanel) adminPanel.style.display = 'flex';
                await loadDashboardData();
                await renderProducts();
                await renderOrders();
            } catch (error) {
                console.error('Login error:', error);
                showAlert(error.message || 'Login failed. Please check your credentials and server connection.', 'error');
            } finally {
                showLoading(false);
            }
        });
    }
    
    // Product form submission
    if (productForm) {
        productForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            showLoading(true);
            try {
                // Get additional images
                const additionalImages = [];
                document.querySelectorAll('.additional-image-input').forEach(input => {
                    if (input.value) additionalImages.push(input.value);
                });
                
                // Get tags
                const tags = [];
                document.querySelectorAll('.tag-input').forEach(input => {
                    if (input.value) tags.push(input.value.trim());
                });
                
                // Validate required fields
                const requiredFields = [
                    'product-name', 'main-image-url', 'product-price',
                    'product-stock', 'product-brand', 'product-category'
                ];
                
                const missingFields = [];
                requiredFields.forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    if (field && !field.value) {
                        missingFields.push(fieldId.replace('product-', '').replace('-', ' '));
                    }
                });
                
                if (missingFields.length > 0) {
                    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
                }
                
                const productData = {
                    name: document.getElementById('product-name').value,
                    price: parseFloat(document.getElementById('product-price').value),
                    countInStock: parseInt(document.getElementById('product-stock').value),
                    image: document.getElementById('main-image-url').value,
                    images: additionalImages,
                    tags: tags,
                    brand: document.getElementById('product-brand').value,
                    category: document.getElementById('product-category').value,
                    description: document.getElementById('product-description').value,
                    sizes: getSelectedSizes(),
                    colors: getSelectedColors(),
                    customAttributes: getCustomAttributes()
                };
                
                const productId = document.getElementById('product-id')?.value;
                const token = localStorage.getItem('adminToken');
                if (!token) throw new Error('Not authorized, no token');
                
                let response;
                if (productId) {
                    // Update existing product
                    response = await fetch(`${API_BASE_URL}/products/${productId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(productData)
                    });
                } else {
                    // Create new product
                    response = await fetch(`${API_BASE_URL}/products`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(productData)
                    });
                }
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to save product');
                }
                
                await renderProducts();
                hideProductForm();
                showAlert('Product saved successfully!', 'success');
                await loadDashboardData();
            } catch (error) {
                console.error('Product save error:', error);
                showAlert(error.message || 'Error saving product. Please try again.', 'error');
            } finally {
                showLoading(false);
            }
        });
    }
}

// Size options management
function addSizeOption(size = '') {
    const sizeInput = document.getElementById('new-size-input');
    const sizeValue = size || sizeInput.value.trim();
    
    if (!sizeValue) return;
    
    const container = document.getElementById('size-options-container');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-outline-primary size-option';
    button.textContent = sizeValue;
    button.innerHTML = `
        ${sizeValue}
        <span class="remove-option" onclick="this.parentElement.remove()">&times;</span>
    `;
    
    container.appendChild(button);
    if (sizeInput) sizeInput.value = '';
}

function getSelectedSizes() {
    const sizes = [];
    document.querySelectorAll('.size-option').forEach(button => {
        sizes.push(button.textContent.replace('×', '').trim());
    });
    return sizes;
}

// Color options management
function addColorOption(color = '') {
    const colorInput = document.getElementById('new-color-input');
    const colorValue = color || colorInput.value.trim();
    
    if (!colorValue) return;
    
    const container = document.getElementById('color-options-container');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-outline-secondary color-option';
    button.textContent = colorValue;
    button.innerHTML = `
        ${colorValue}
        <span class="remove-option" onclick="this.parentElement.remove()">&times;</span>
    `;
    
    container.appendChild(button);
    if (colorInput) colorInput.value = '';
}

function getSelectedColors() {
    const colors = [];
    document.querySelectorAll('.color-option').forEach(button => {
        colors.push(button.textContent.replace('×', '').trim());
    });
    return colors;
}

// Custom attributes management
function addCustomAttributeField(key = '', value = '') {
    const container = document.getElementById('custom-attributes-container');
    const div = document.createElement('div');
    div.className = 'custom-attribute-group input-group mb-2';
    div.innerHTML = `
        <input type="text" class="form-control attribute-key" placeholder="Attribute name" value="${key}">
        <input type="text" class="form-control attribute-value" placeholder="Attribute value" value="${value}">
        <div class="input-group-append">
            <button type="button" class="btn btn-outline-danger" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    container.appendChild(div);
}

function getCustomAttributes() {
    const attributes = {};
    document.querySelectorAll('.custom-attribute-group').forEach(group => {
        const keyInput = group.querySelector('.attribute-key');
        const valueInput = group.querySelector('.attribute-value');
        if (keyInput.value && valueInput.value) {
            attributes[keyInput.value] = valueInput.value;
        }
    });
    return attributes;
}

// Verify admin token
async function verifyAdminToken() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        if (loginPage) loginPage.style.display = 'flex';
        if (adminPanel) adminPanel.style.display = 'none';
        return;
    }
    
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Token verification failed');
        }
        
        const user = await response.json();
        if (!user.isAdmin) {
            throw new Error('Not an admin user');
        }
        
        if (loginPage) loginPage.style.display = 'none';
        if (adminPanel) adminPanel.style.display = 'flex';
        await loadDashboardData();
        await renderProducts();
        await renderOrders();
    } catch (error) {
        console.error('Token verification error:', error);
        localStorage.removeItem('adminToken');
        if (loginPage) loginPage.style.display = 'flex';
        if (adminPanel) adminPanel.style.display = 'none';
    } finally {
        showLoading(false);
    }
}

// Load dashboard data
async function loadDashboardData() {
    showLoading(true);
    try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('Not authenticated');
        
        // Get products count
        const productsResponse = await fetch(`${API_BASE_URL}/products`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!productsResponse.ok) {
            throw new Error('Failed to fetch products');
        }
        
        const productsData = await productsResponse.json();
        // Handle both array and object responses
        const products = Array.isArray(productsData) ? productsData : productsData.data || productsData.products || [];
        if (totalProductsEl) totalProductsEl.textContent = products.length;
        
        // Get orders data
        const ordersResponse = await fetch(`${API_BASE_URL}/orders`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!ordersResponse.ok) {
            throw new Error('Failed to fetch orders');
        }
        
        const ordersData = await ordersResponse.json();
        // Handle different response formats
        const orders = Array.isArray(ordersData) ? ordersData : 
                       ordersData.data ? ordersData.data : 
                       ordersData.orders ? ordersData.orders : [];
        
        // Calculate stats
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const totalRevenue = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
        
        if (pendingOrdersEl) pendingOrdersEl.textContent = pendingOrders;
        if (totalRevenueEl) totalRevenueEl.textContent = `$${totalRevenue.toFixed(2)}`;
    } catch (error) {
        console.error('Dashboard data error:', error);
        showAlert('Error loading dashboard data', 'error');
    } finally {
        showLoading(false);
    }
}

// Tab navigation
function showTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab content
    const tabContent = document.getElementById(tabId);
    if (tabContent) tabContent.classList.add('active');
    
    // Update page title
    if (pageTitle) {
        pageTitle.textContent = tabId.charAt(0).toUpperCase() + tabId.slice(1).replace('-', ' ');
    }
    
    // Update active tab in sidebar
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick')?.includes(tabId)) {
            link.classList.add('active');
        }
    });
}

// Product management
async function renderProducts() {
    showLoading(true);
    try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('Not authenticated');
        
        const response = await fetch(`${API_BASE_URL}/products`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch products');
        }
        
        const data = await response.json();
        
        // Handle both array response and paginated response
        const products = Array.isArray(data) ? data : data.products || [];
        
        if (productList) productList.innerHTML = '';
        
        if (products.length === 0) {
            if (productList) productList.innerHTML = '<tr><td colspan="7">No products found</td></tr>';
            return;
        }
        
        products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${product._id}</td>
                <td>${product.name}</td>
                <td><img src="${product.image}" alt="${product.name}" style="width: 50px; height: 50px; object-fit: cover;"></td>
                <td>$${product.price?.toFixed(2) || '0.00'}</td>
                <td>${product.countInStock || 0}</td>
                <td>
                    ${product.sizes?.join(', ') || 'No sizes'} / 
                    ${product.colors?.join(', ') || 'No colors'}
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editProduct('${product._id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product._id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            `;
            if (productList) productList.appendChild(row);
        });
    } catch (error) {
        console.error('Products render error:', error);
        if (productList) productList.innerHTML = '<tr><td colspan="7">Error loading products</td></tr>';
        showAlert('Error loading products', 'error');
    } finally {
        showLoading(false);
    }
}

async function editProduct(id) {
    showLoading(true);
    try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('Not authenticated');
        
        const response = await fetch(`${API_BASE_URL}/products/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch product');
        }
        
        const product = await response.json();
        showProductForm(product);
    } catch (error) {
        console.error('Product edit error:', error);
        showAlert('Error loading product for editing', 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    showLoading(true);
    try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('Not authenticated');
        
        const response = await fetch(`${API_BASE_URL}/products/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete product');
        }
        
        await renderProducts();
        await loadDashboardData();
        showAlert('Product deleted successfully!', 'success');
    } catch (error) {
        console.error('Product delete error:', error);
        showAlert('Error deleting product', 'error');
    } finally {
        showLoading(false);
    }
}

function showProductForm(product = null) {
    if (product) {
        document.getElementById('product-form-title').textContent = 'Edit Product';
        document.getElementById('product-id').value = product._id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-stock').value = product.countInStock;
        document.getElementById('main-image-url').value = product.image;
        document.getElementById('product-brand').value = product.brand;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-description').value = product.description || '';
        
        // Clear existing additional image inputs
        const additionalImagesContainer = document.getElementById('additional-images-container');
        if (additionalImagesContainer) additionalImagesContainer.innerHTML = '';
        
        // Add existing additional images
        if (product.images && product.images.length > 0) {
            product.images.forEach((image) => {
                addAdditionalImageInput(image);
            });
        } else {
            addAdditionalImageInput(); // Add one empty input by default
        }
        
        // Clear existing tag inputs
        const tagsContainer = document.getElementById('tags-container');
        if (tagsContainer) tagsContainer.innerHTML = '';
        
        // Add existing tags
        if (product.tags && product.tags.length > 0) {
            product.tags.forEach((tag) => {
                addTagInput(tag);
            });
        } else {
            addTagInput(); // Add one empty input by default
        }
        
        // Clear and populate size options
        const sizeContainer = document.getElementById('size-options-container');
        if (sizeContainer) sizeContainer.innerHTML = '';
        if (product.sizes && product.sizes.length > 0) {
            product.sizes.forEach(size => addSizeOption(size));
        }
        
        // Clear and populate color options
        const colorContainer = document.getElementById('color-options-container');
        if (colorContainer) colorContainer.innerHTML = '';
        if (product.colors && product.colors.length > 0) {
            product.colors.forEach(color => addColorOption(color));
        }
        
        // Clear and populate custom attributes
        const customAttrContainer = document.getElementById('custom-attributes-container');
        if (customAttrContainer) customAttrContainer.innerHTML = '';
        if (product.customAttributes) {
            for (const [key, value] of Object.entries(product.customAttributes)) {
                addCustomAttributeField(key, value);
            }
        } else {
            addCustomAttributeField(); // Add one empty field by default
        }
    } else {
        document.getElementById('product-form-title').textContent = 'Add New Product';
        if (productForm) productForm.reset();
        
        // Clear additional images and add one empty input
        const additionalImagesContainer = document.getElementById('additional-images-container');
        if (additionalImagesContainer) {
            additionalImagesContainer.innerHTML = '';
            addAdditionalImageInput();
        }
        
        // Clear tags and add one empty input
        const tagsContainer = document.getElementById('tags-container');
        if (tagsContainer) {
            tagsContainer.innerHTML = '';
            addTagInput();
        }
        
        // Clear sizes and colors
        const sizeContainer = document.getElementById('size-options-container');
        if (sizeContainer) sizeContainer.innerHTML = '';
        
        const colorContainer = document.getElementById('color-options-container');
        if (colorContainer) colorContainer.innerHTML = '';
        
        // Clear custom attributes and add one empty field
        const customAttrContainer = document.getElementById('custom-attributes-container');
        if (customAttrContainer) {
            customAttrContainer.innerHTML = '';
            addCustomAttributeField();
        }
    }
    document.getElementById('products').style.display = 'none';
    if (productFormContainer) productFormContainer.style.display = 'block';
}

function addAdditionalImageInput(value = '') {
    const container = document.getElementById('additional-images-container');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'additional-image-group input-group mb-2';
    div.innerHTML = `
        <input type="text" class="additional-image-input form-control" value="${value}" placeholder="Additional image URL">
        <div class="input-group-append">
            <button type="button" class="btn btn-outline-danger" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    container.appendChild(div);
}

function addTagInput(value = '') {
    const container = document.getElementById('tags-container');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'tag-group input-group mb-2';
    div.innerHTML = `
        <input type="text" class="tag-input form-control" value="${value}" placeholder="Tag (e.g., t-shirt, shirt)">
        <div class="input-group-append">
            <button type="button" class="btn btn-outline-danger" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    container.appendChild(div);
}

function hideProductForm() {
    if (productFormContainer) productFormContainer.style.display = 'none';
    document.getElementById('products').style.display = 'block';
}

async function renderOrders(filter = 'all') {
    showLoading(true);
    try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('Not authenticated');
        
        const response = await fetch(`${API_BASE_URL}/orders`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch orders');
        }
        
        const responseData = await response.json();
        // Handle different response formats
        const orders = Array.isArray(responseData) ? responseData : 
                      responseData.data ? responseData.data : 
                      responseData.orders ? responseData.orders : [];
        
        const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);
        if (orderList) orderList.innerHTML = '';
        
        if (filteredOrders.length === 0) {
            if (orderList) orderList.innerHTML = '<tr><td colspan="6">No orders found</td></tr>';
            return;
        }
        
        filteredOrders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${order._id}</td>
                <td>${order.user?.name || order.userId || 'Guest'}</td>
                <td>${new Date(order.createdAt || Date.now()).toLocaleDateString()}</td>
                <td>$${(order.totalPrice || 0).toFixed(2)}</td>
                <td><span class="badge badge-${order.status || 'pending'}">${(order.status || 'pending').charAt(0).toUpperCase() + (order.status || 'pending').slice(1)}</span></td>
                <td>
                    <select class="form-control" onchange="updateOrderStatus('${order._id}', this.value)" style="width: auto; display: inline-block;">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
            `;
            if (orderList) orderList.appendChild(row);
        });
    } catch (error) {
        console.error('Orders render error:', error);
        if (orderList) orderList.innerHTML = '<tr><td colspan="6">Error loading orders</td></tr>';
        showAlert('Error loading orders', 'error');
    } finally {
        showLoading(false);
    }
}
function filterOrders(status) {
    // Update active filter tab
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    renderOrders(status);
}

async function updateOrderStatus(orderId, status) {
    showLoading(true);
    try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('Not authenticated');
        
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update order status');
        }
        
        showAlert(`Order #${orderId} status updated to ${status}`, 'success');
        await loadDashboardData();
        
        // Refresh orders list
        const currentFilter = document.querySelector('.tab.active')?.textContent.toLowerCase() || 'all';
        await renderOrders(currentFilter);
    } catch (error) {
        console.error('Order status update error:', error);
        showAlert('Error updating order status', 'error');
    } finally {
        showLoading(false);
    }
}

// Helper functions
function showLoading(show) {
    const loader = document.getElementById('loading-overlay');
    if (!loader) {
        console.warn('Loading overlay element not found');
        return;
    }
    loader.style.display = show ? 'flex' : 'none';
}

function showAlert(message, type = 'info') {
    const alertsContainer = document.getElementById('alerts-container') || document.body;
    const alertBox = document.createElement('div');
    alertBox.className = `alert alert-${type}`;
    alertBox.innerHTML = `
        ${message}
        <button type="button" class="close" onclick="this.parentElement.remove()">
            <span aria-hidden="true">&times;</span>
        </button>
    `;
    
    alertsContainer.appendChild(alertBox);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        alertBox.remove();
    }, 5000);
}

// Logout
async function logout() {
    if (!confirm('Are you sure you want to logout?')) return;
    
    showLoading(true);
    try {
        const token = localStorage.getItem('adminToken');
        if (token) {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }
        
        localStorage.removeItem('adminToken');
        if (adminPanel) adminPanel.style.display = 'none';
        if (loginPage) loginPage.style.display = 'flex';
        if (loginForm) loginForm.reset();
    } catch (error) {
        console.error('Logout error:', error);
        showAlert('Error during logout', 'error');
    } finally {
        showLoading(false);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initAdminPanel);

// Make functions available globally for inline event handlers
window.showTab = showTab;
window.filterOrders = filterOrders;
window.updateOrderStatus = updateOrderStatus;
window.logout = logout;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.showProductForm = showProductForm;
window.hideProductForm = hideProductForm;
window.addAdditionalImageInput = addAdditionalImageInput;
window.addTagInput = addTagInput;
window.addSizeOption = addSizeOption;
window.addColorOption = addColorOption;
window.addCustomAttributeField = addCustomAttributeField;