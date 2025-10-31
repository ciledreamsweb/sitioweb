// ===== script.js (Completo y Corregido) =====

// Importamos el cliente de Supabase que creamos en el otro archivo.
import { supabase } from './supabase-client.js';

// ===== Variables Globales =====
let allProducts = []; // Aquí guardaremos todos los productos obtenidos de Supabase.
let cart = JSON.parse(localStorage.getItem("ciledreams_cart")) || [];

// ===== Funciones Principales de Productos =====

/**
 * Obtiene todos los productos desde la base de datos de Supabase.
 */
async function fetchProducts() {
  try {
    const { data, error } = await supabase.from('products').select('*').order('id');
    if (error) {
      console.error('Error al obtener productos:', error);
      return [];
    }
    allProducts = data;
    return data;
  } catch (error) {
    console.error('Error en la conexión con Supabase:', error);
    return [];
  }
}

/**
 * Renderiza (dibuja) una lista de productos en un contenedor HTML específico.
 */
function renderProducts(productsToShow, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const noResults = document.getElementById("noResults");

  if (productsToShow.length === 0) {
    if (noResults) {
      container.style.display = "none";
      noResults.style.display = "block";
    }
    return;
  }
  
  container.style.display = "grid";
  if (noResults) noResults.style.display = "none";

  container.innerHTML = productsToShow.map(product => {
    const totalStock = product.stock_s + product.stock_m + product.stock_l;
    const isOutOfStock = totalStock === 0;

    const sizeOptions = `
      ${product.stock_s > 0 ? '<option value="S">1</option>' : ''}
      ${product.stock_m > 0 ? '<option value="M">2</option>' : ''}
      ${product.stock_l > 0 ? '<option value="L">3</option>' : ''}
    `;
    
    return `
    <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}" data-product-id="${product.id}">
        <div class="product-image js-open-modal" data-image-url="${product.image_url}" data-alt-text="${product.name}">
            <img src="${product.image_url}" alt="${product.name}">
            ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ""}
            ${isOutOfStock ? `<span class="product-badge-stock">Sin Stock</span>` : ""}
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <p class="product-description">${product.description}</p>
            <p class="product-price">${formatPrice(product.price)}</p>
            
            <div class="product-size-selector ${isOutOfStock ? 'hidden' : ''}">
                <label for="size-${product.id}">Talle:</label>
                <select id="size-${product.id}" class="filter-select">
                    ${sizeOptions}
                </select>
            </div>

            <div class="product-actions">
                <button 
                    class="btn btn-primary js-add-to-cart" 
                    data-product-id="${product.id}" 
                    ${isOutOfStock ? 'disabled' : ''}
                >
                    ${isOutOfStock ? 'Sin Stock' : 'Agregar al Carrito'}
                </button>
                <a href="https://wa.me/5491158626516?text=Hola!%20Me%20interesa%20el%20${encodeURIComponent(product.name)}" 
                   class="btn btn-secondary" target="_blank">Consultar</a>
            </div>
        </div>
    </div>
    `;
  }).join('');
}

// ===== Lógica del Carrito =====
function updateCartCount() {
  const cartCount = document.getElementById("cartCount");
  if (cartCount) {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
  }
}

/**
 * Agrega un producto al carrito, validando el stock disponible.
 * @param {number} productId - El ID del producto a agregar.
 */
function addToCart(productId) {
  const product = allProducts.find((p) => p.id === productId);
  if (!product) return;

  const sizeSelector = document.getElementById(`size-${productId}`);
  const selectedSize = sizeSelector ? sizeSelector.value : null;

  if (!selectedSize) {
    showToast("Por favor, selecciona un talle.", 'error');
    return;
  }

  // --- LÓGICA DE VALIDACIÓN DE STOCK ---
  const stockKey = `stock_${selectedSize.toLowerCase()}`;
  const stockForSize = product[stockKey];
  const itemInCart = cart.find((item) => item.id === productId && item.size === selectedSize);
  const quantityInCart = itemInCart ? itemInCart.quantity : 0;

  if (quantityInCart >= stockForSize) {
    showToast(`¡No hay más stock para el talle ${getDisplaySize(selectedSize)}!`, 'error');
    return;
  }
  // --- FIN DE LA VALIDACIÓN ---

  const existingItem = cart.find((item) => item.id === productId && item.size === selectedSize);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image_url,
      quantity: 1,
      size: selectedSize,
    });
  }

  localStorage.setItem("ciledreams_cart", JSON.stringify(cart));
  updateCartCount();
  
  showToast(`${product.name} (Talle: ${getDisplaySize(selectedSize)}) fue agregado.`, 'success');
}


// ===== Lógica Específica de Cada Página =====
function loadFeaturedProducts(products) {
  const featured = products.slice(0, 4);
  renderProducts(featured, "featuredProducts");
}

function applyFilters() {
  const categoryValue = document.getElementById("categoryFilter")?.value || 'all';
  let filteredProducts = [...allProducts];

  if (categoryValue !== 'all') {
    filteredProducts = filteredProducts.filter(p => p.category === categoryValue);
  }
  
  renderProducts(filteredProducts, 'productsGrid');
}

// ===== Lógica del Visor de Imágenes (Modal / Lightbox) =====
const imageModal = document.getElementById('imageModal');
const fullImage = document.getElementById('fullImage');
const closeModalBtn = document.getElementById('closeModal');

function openModal(imageSrc, altText) {
  if (!imageModal || !fullImage) return;
  fullImage.src = imageSrc;
  fullImage.alt = altText;
  imageModal.style.display = "flex";
}

function closeModal() {
  if (imageModal) {
    imageModal.style.display = "none";
  }
}

if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
if (imageModal) imageModal.addEventListener('click', (e) => {
  if (e.target === imageModal) closeModal();
});


// ===== Inicialización y Event Listeners =====
document.addEventListener("DOMContentLoaded", async () => {
  updateCartCount();
  await fetchProducts();

  if (document.getElementById("featuredProducts")) loadFeaturedProducts(allProducts);
  
  if (document.getElementById("productsGrid")) {
    applyFilters();
    document.getElementById("categoryFilter")?.addEventListener("change", applyFilters);
  }

  document.body.addEventListener('click', (e) => {
    const openModalTrigger = e.target.closest('.js-open-modal');
    if (openModalTrigger) {
      e.preventDefault(); 
      const imageUrl = openModalTrigger.dataset.imageUrl;
      const altText = openModalTrigger.dataset.altText;
      if (imageUrl) openModal(imageUrl, altText);
      return;
    }

    const addToCartBtn = e.target.closest('.js-add-to-cart');
    if (addToCartBtn && !addToCartBtn.disabled) {
      const productId = parseInt(addToCartBtn.dataset.productId);
      if (productId) addToCart(productId);
    }
  });
});


// ===== Código Adicional y Funciones de Ayuda =====

const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");
if (menuToggle) menuToggle.addEventListener("click", () => navMenu.classList.toggle("active"));

function getDisplaySize(size) {
  const sizeMap = { 'S': '1', 'M': '2', 'L': '3' };
  return sizeMap[size] || size;
}

function formatPrice(price) {
  if (typeof price !== 'number') return '$0';
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(price);
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast-notification');
  const toastMessage = document.getElementById('toast-message');

  if (!toast || !toastMessage) return;

  toastMessage.textContent = message;
  toast.className = 'toast';
  toast.classList.add(type, 'show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

window.showToast = showToast;