

// ===== script.js (Completo y Corregido con 'export' y Paginación) =====

import { supabase } from './supabase-client.js';

let allProducts = [];
let cart = JSON.parse(localStorage.getItem("ciledreams_cart")) || [];

// Nuevas variables para paginación (Requisito B)
const PRODUCT_LIMIT = 9; // Límite inicial y por carga
let productsOffset = 0;
let currentFilteredProducts = []; 

// CLAVE (A): Función para barajar un array (Fisher-Yates shuffle)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

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

// Nota: Esta función renderProducts SÓLO se usará para 'featuredProducts'
// ya que applyFilters ahora maneja el renderizado paginado para 'productsGrid'
function renderProducts(productsToShow, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const noResults = document.getElementById("noResults");

  if (productsToShow.length === 0) {
    if (noResults) {
      container.innerHTML = ''; // Limpiar la grilla
      noResults.style.display = "block";
    }
    return;
  }
  
  if (noResults) noResults.style.display = "none";

  container.innerHTML = productsToShow.map(product => {
    const totalStock = product.stock_s + product.stock_m + product.stock_l + product.stock_xl;
    const isOutOfStock = totalStock === 0;

    const sizeOptions = `
      ${product.stock_s > 0 ? '<option value="S">1</option>' : ''}
      ${product.stock_m > 0 ? '<option value="M">2</option>' : ''}
      ${product.stock_l > 0 ? '<option value="L">3</option>' : ''}
      ${product.stock_xl > 0 ? '<option value="XL">4</option>' : ''}

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
                    ${sizeOptions.trim() === '' ? '<option disabled>Sin stock</option>' : sizeOptions}
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

function updateCartCount() {
  const cartCountElements = document.querySelectorAll("#cartCount");
  if(cartCountElements.length > 0) {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCountElements.forEach(el => el.textContent = totalItems);
  }
}

function addToCart(productId) {
  const product = allProducts.find((p) => p.id === productId);
  if (!product) return;

  const sizeSelector = document.getElementById(`size-${productId}`);
  const selectedSize = sizeSelector ? sizeSelector.value : null;

  if (!selectedSize) {
    showToast("Por favor, selecciona un talle.", 'error');
    return;
  }

  // REQUISITO (A): Verifica el stock localmente antes de agregar.
  const stockKey = `stock_${selectedSize.toLowerCase()}`;
  const stockForSize = product[stockKey];
  const itemInCart = cart.find((item) => item.id === productId && item.size === selectedSize);
  const quantityInCart = itemInCart ? itemInCart.quantity : 0;

  if (quantityInCart >= stockForSize) {
    showToast(`¡No hay más stock para el talle ${getDisplaySize(selectedSize)}!`, 'error');
    return;
  }

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

function loadFeaturedProducts(products) {
  // CLAVE (A): Barajar los productos y seleccionar los primeros 6
  const shuffledProducts = shuffleArray([...products]); 
  const featured = shuffledProducts.slice(0, 6);
  renderProducts(featured, "featuredProducts");
}

function applyFilters(isNewFilter = true) {
    const categoryValue = document.getElementById("categoryFilter")?.value || 'all';
    const container = document.getElementById('productsGrid');
    const loadMoreBtn = document.getElementById("loadMoreBtn");
    const noResults = document.getElementById("noResults");
    
    if (!container) return;

    let filteredProducts = [...allProducts];

    if (categoryValue !== 'all') {
        filteredProducts = filteredProducts.filter(p => p.category === categoryValue);
    }
    
    currentFilteredProducts = filteredProducts;

    if (isNewFilter) {
        productsOffset = 0;
        container.innerHTML = ''; // Limpiar para un nuevo filtro
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    }
    
    // CLAVE (B): Obtener el lote de productos a mostrar
    const productsToShow = currentFilteredProducts.slice(productsOffset, productsOffset + PRODUCT_LIMIT);
    
    if (productsOffset === 0 && productsToShow.length === 0) {
        // No hay resultados para el filtro
        if (noResults) noResults.style.display = "block";
        return;
    }
    
    if (productsToShow.length === 0) {
        // Ya se cargaron todos los productos
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        if (noResults) noResults.style.display = "none";
        return;
    }
    
    if (noResults) noResults.style.display = "none";

    // Generar el HTML para el nuevo lote de productos
    const newProductsHtml = productsToShow.map(product => {
      const totalStock = product.stock_s + product.stock_m + product.stock_l + product.stock_xl;
      const isOutOfStock = totalStock === 0;

      const sizeOptions = `
        ${product.stock_s > 0 ? '<option value="S">1</option>' : ''}
        ${product.stock_m > 0 ? '<option value="M">2</option>' : ''}
        ${product.stock_l > 0 ? '<option value="L">3</option>' : ''}
        ${product.stock_xl > 0 ? '<option value="XL">4</option>' : ''}

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
                      ${sizeOptions.trim() === '' ? '<option disabled>Sin stock</option>' : sizeOptions}
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

    container.insertAdjacentHTML('beforeend', newProductsHtml); // Agregar al final
    productsOffset += productsToShow.length;

    // Mostrar/Ocultar el botón "Ver más"
    if (loadMoreBtn) {
        if (productsOffset < currentFilteredProducts.length) {
            loadMoreBtn.style.display = 'block';
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }
}

// CLAVE (B): Función llamada por el botón "Ver más"
function loadMoreProducts() {
    applyFilters(false); // Cargar el siguiente lote
}


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

document.addEventListener("DOMContentLoaded", async () => {
  updateCartCount();
  await fetchProducts();

  if (document.getElementById("featuredProducts")) loadFeaturedProducts(allProducts);
  
  if (document.getElementById("productsGrid")) {
    window.loadMoreProducts = loadMoreProducts; // Hacemos la función global para el onclick del botón
    
    applyFilters(true); // Carga inicial (los primeros 9 productos)
    document.getElementById("categoryFilter")?.addEventListener("change", () => applyFilters(true));
    
    // Agregamos el listener al botón "Ver más"
    document.getElementById("loadMoreBtn")?.addEventListener("click", loadMoreProducts);
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

// 1. Añadimos 'export' para que la función sea visible para otros archivos
export function showToast(message, type = 'success') {
  const toast = document.getElementById('toast-notification');
  const toastMessage = document.getElementById('toast-message');

  if (!toast || !toastMessage) {
    console.error("No se encontró el elemento toast en el HTML.");
    return;
  }

  toastMessage.textContent = message;
  toast.className = 'toast';
  toast.classList.add(type, 'show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
