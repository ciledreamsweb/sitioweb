
// ===== script.js =====

// Importamos el cliente de Supabase que creamos en el otro archivo.
import { supabase } from './supabase-client.js';

// ===== Variables Globales =====
let allProducts = []; // Aquí guardaremos todos los productos obtenidos de Supabase.
const cart = JSON.parse(localStorage.getItem("ciledreams_cart")) || [];

// ===== Funciones Principales de Productos =====

/**
 * Obtiene todos los productos desde la base de datos de Supabase.
 * Es una función asíncrona porque la consulta a la base de datos toma tiempo.
 */
async function fetchProducts() {
  try {
    // Hacemos una consulta a la tabla 'products', seleccionamos todas las columnas ('*') y ordenamos por 'id'.
    const { data, error } = await supabase.from('products').select('*').order('id');

    if (error) {
      // Si Supabase devuelve un error, lo mostramos en la consola.
      console.error('Error al obtener productos:', error);
      return [];
    }
    
    // Guardamos los productos en nuestra variable global y los devolvemos.
    allProducts = data;
    return data;
  } catch (error) {
    // Si hay un error de red o conexión, también lo capturamos.
    console.error('Error en la conexión con Supabase:', error);
    return [];
  }
}

/**
 * Renderiza (dibuja) una lista de productos en un contenedor HTML específico.
 * @param {Array} productsToShow - La lista de productos a mostrar.
 * @param {string} containerId - El ID del elemento HTML donde se mostrarán los productos.
 */
function renderProducts(productsToShow, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return; // Si el contenedor no existe en la página, no hacemos nada.

  const noResults = document.getElementById("noResults");

  // Si no hay productos que mostrar, mostramos el mensaje de "sin resultados".
  if (productsToShow.length === 0) {
    if (noResults) {
      container.style.display = "none";
      noResults.style.display = "block";
    }
    return;
  }
  
  // Si hay productos, nos aseguramos de que el contenedor sea visible y el mensaje de "sin resultados" esté oculto.
  container.style.display = "grid";
  if (noResults) noResults.style.display = "none";

  // Usamos .map() para convertir cada objeto de producto en un bloque de HTML (la tarjeta de producto).
  container.innerHTML = productsToShow.map(product => {
    const totalStock = product.stock_s + product.stock_m + product.stock_l;
    const isOutOfStock = totalStock === 0;

    // Generamos las opciones de talle dinámicamente, solo si hay stock para ese talle.
    const sizeOptions = `
      ${product.stock_s > 0 ? '<option value="S">1</option>' : ''}
      ${product.stock_m > 0 ? '<option value="M">2</option>' : ''}
      ${product.stock_l > 0 ? '<option value="L">3</option>' : ''}
    `;
    
    // Devolvemos el HTML de la tarjeta del producto.
    return `
    <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}" data-product-id="${product.id}">
        <!-- Clase 'js-open-modal' y data attributes para la Delegación de Eventos -->
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
// ... (funciones updateCartCount y addToCart se mantienen iguales, pero ahora se llama a addToCart desde la delegación)
function updateCartCount() {
  const cartCount = document.getElementById("cartCount");
  if (cartCount) {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
  }
}

/**
 * Agrega un producto al carrito.
 * @param {number} productId - El ID del producto a agregar.
 */
function addToCart(productId) {
  const product = allProducts.find((p) => p.id === productId);
  if (!product) return; 

  const sizeSelector = document.getElementById(`size-${productId}`);
  const selectedSize = sizeSelector ? sizeSelector.value : null;

  if (!selectedSize) {
    alert("Por favor, selecciona un talle antes de agregar al carrito.");
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
  alert(`${product.name} (Talle: ${selectedSize}) fue agregado al carrito.`);
}


// ===== Lógica Específica de Cada Página (Se mantiene) =====
// ... (funciones loadFeaturedProducts y applyFilters se mantienen)
function loadFeaturedProducts(products) {
  const featured = products.slice(0, 4);
  renderProducts(featured, "featuredProducts");
}

function applyFilters() {
  const categoryValue = document.getElementById("categoryFilter")?.value || 'all';
  const characterValue = document.getElementById("characterFilter")?.value || 'all';
  const priceValue = document.getElementById("priceFilter")?.value || 'all';

  let filteredProducts = [...allProducts];

  if (categoryValue !== 'all') {
    filteredProducts = filteredProducts.filter(p => p.category === categoryValue);
  }
  if (characterValue !== 'all') {
    filteredProducts = filteredProducts.filter(p => p.character === characterValue);
  }
  if (priceValue !== 'all') {
    if (priceValue === "low") {
      filteredProducts = filteredProducts.filter(p => p.price <= 28000);
    } else if (priceValue === "high") {
      filteredProducts = filteredProducts.filter(p => p.price > 28000 && p.price <= 36000);
    }
  }

  renderProducts(filteredProducts, 'productsGrid');
}

// ===== Lógica del Visor de Imágenes (Modal / Lightbox) con Event Delegation =====

const imageModal = document.getElementById('imageModal');
const fullImage = document.getElementById('fullImage');
const closeModalBtn = document.getElementById('closeModal');

/**
 * Abre el modal de la imagen con la fuente especificada.
 * @param {string} imageSrc - La URL de la imagen a mostrar.
 * @param {string} altText - El texto alternativo para la imagen.
 */
function openModal(imageSrc, altText) {
  if (!imageModal || !fullImage) return;

  fullImage.src = imageSrc;
  fullImage.alt = altText;
  imageModal.style.display = "flex"; // Usar flex para centrar
}

/**
 * Cierra el modal de la imagen.
 */
function closeModal() {
  if (imageModal) {
    imageModal.style.display = "none";
  }
}

// Event Listeners para cerrar el modal: Botón 'X' y Clic en el fondo.
if (closeModalBtn) {
  closeModalBtn.addEventListener('click', closeModal);
}

if (imageModal) {
  imageModal.addEventListener('click', (e) => {
    // Si el clic fue directamente en el contenedor del modal, cerrarlo.
    if (e.target === imageModal) {
      closeModal();
    }
  });
}


// ===== Inicialización y Event Listeners (Delegación de Eventos) =====

document.addEventListener("DOMContentLoaded", async () => {
  updateCartCount();

  await fetchProducts();

  // Ejecución de la lógica específica de la página después de cargar productos
  if (document.getElementById("featuredProducts")) {
    loadFeaturedProducts(allProducts);
  }
  
  if (document.getElementById("productsGrid")) {
    applyFilters();
    document.getElementById("categoryFilter")?.addEventListener("change", applyFilters);
    document.getElementById("characterFilter")?.addEventListener("change", applyFilters);
    document.getElementById("priceFilter")?.addEventListener("change", applyFilters);
  }


  // *** DELEGACIÓN DE EVENTOS PRINCIPAL EN document.body ***
  document.body.addEventListener('click', (e) => {
    
    // 1. Lógica del Modal (Abrir imagen ampliada)
    // Usamos .closest() para encontrar el ancestro más cercano con la clase 'js-open-modal'
    const openModalTrigger = e.target.closest('.js-open-modal');
    if (openModalTrigger) {
      // Previene cualquier comportamiento de navegación por defecto si el elemento fuera un <a>
      e.preventDefault(); 
      const imageUrl = openModalTrigger.dataset.imageUrl;
      const altText = openModalTrigger.dataset.altText;
      if (imageUrl) {
        openModal(imageUrl, altText);
      }
      return; // Detiene la ejecución para este clic
    }

    // 2. Lógica del Carrito (Agregar al Carrito)
    const addToCartBtn = e.target.closest('.js-add-to-cart');
    if (addToCartBtn && !addToCartBtn.disabled) {
      const productId = parseInt(addToCartBtn.dataset.productId);
      if (productId) {
        addToCart(productId);
      }
    }
  });
  // *** FIN DELEGACIÓN DE EVENTOS ***
});


// ===== Código Adicional (Menú, Newsletter, etc.) =====

// Lógica para el menú móvil
const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");
if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    navMenu.classList.toggle("active");
  });
}

// Lógica para el formulario de suscripción
const newsletterForm = document.getElementById("newsletterForm");
if (newsletterForm) {
  newsletterForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    alert(`¡Gracias por suscribirte! Recibirás un 10% OFF en ${email}`);
    e.target.reset();
  });
}

// Función de ayuda para formatear números como moneda ARS.
function formatPrice(price) {
  if (typeof price !== 'number') return '$0';
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(price);
}