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
      ${product.stock_s > 0 ? '<option value="S">S (1) - 36/38</option>' : ''}
      ${product.stock_m > 0 ? '<option value="M">M (2) - 40/42</option>' : ''}
      ${product.stock_l > 0 ? '<option value="L">L (3) - 44/46</option>' : ''}
    `;

    // Devolvemos el HTML de la tarjeta del producto.
    return `
    <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}">
        <div class="product-image">
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
                    class="btn btn-primary" 
                    onclick="addToCart(${product.id})" 
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
  }).join(''); // .join('') une todos los bloques de HTML en un solo string.
}

// ===== Lógica del Carrito =====

/**
 * Actualiza el número que se muestra en el ícono del carrito en la barra de navegación.
 */
function updateCartCount() {
  const cartCount = document.getElementById("cartCount");
  if (cartCount) {
    // Usamos .reduce() para sumar las cantidades de todos los productos en el carrito.
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
  if (!product) return; // Si el producto no se encuentra, no hacemos nada.

  // Obtenemos el talle que el usuario seleccionó.
  const sizeSelector = document.getElementById(`size-${productId}`);
  const selectedSize = sizeSelector ? sizeSelector.value : null;

  if (!selectedSize) {
    alert("Por favor, selecciona un talle antes de agregar al carrito.");
    return;
  }
  
  // Buscamos si ya existe un item en el carrito con el mismo ID y el mismo talle.
  const existingItem = cart.find((item) => item.id === productId && item.size === selectedSize);

  if (existingItem) {
    // Si ya existe, solo aumentamos su cantidad.
    existingItem.quantity += 1;
  } else {
    // Si no existe, creamos un nuevo objeto y lo agregamos al carrito.
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image_url, // Usamos image_url que viene de Supabase
      quantity: 1,
      size: selectedSize,
    });
  }

  // Guardamos el carrito actualizado en el almacenamiento local del navegador.
  localStorage.setItem("ciledreams_cart", JSON.stringify(cart));
  // Actualizamos el contador visual del carrito.
  updateCartCount();
  // Mostramos una confirmación al usuario.
  alert(`${product.name} (Talle: ${selectedSize}) fue agregado al carrito.`);
}

// Hacemos `addToCart` una función global para que los botones `onclick` en el HTML puedan encontrarla.
window.addToCart = addToCart;

// ===== Lógica Específica de Cada Página =====

/**
 * Carga los productos destacados en la página de inicio.
 * @param {Array} products - La lista completa de productos.
 */
function loadFeaturedProducts(products) {
  // Mostramos los primeros 4 productos como "destacados".
  const featured = products.slice(0, 4);
  renderProducts(featured, "featuredProducts");
}

/**
 * Filtra y muestra los productos en la página de productos según los filtros seleccionados.
 */
function applyFilters() {
  const categoryValue = document.getElementById("categoryFilter")?.value || 'all';
  const characterValue = document.getElementById("characterFilter")?.value || 'all';
  const priceValue = document.getElementById("priceFilter")?.value || 'all';

  let filteredProducts = [...allProducts]; // Empezamos con la lista completa.

  // Aplicamos cada filtro uno por uno.
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

  // Renderizamos solo los productos que pasaron los filtros.
  renderProducts(filteredProducts, 'productsGrid');
}

// ===== Inicialización y Event Listeners =====

/**
 * El evento 'DOMContentLoaded' se dispara cuando el HTML inicial ha sido completamente cargado y parseado.
 * Es el punto de entrada principal de nuestra aplicación.
 */
document.addEventListener("DOMContentLoaded", async () => {
  updateCartCount(); // Actualizamos el contador del carrito al cargar cualquier página.

  await fetchProducts(); // Esperamos a que los productos se carguen desde Supabase.

  // Verificamos en qué página estamos para ejecutar solo el código necesario.
  if (document.getElementById("featuredProducts")) {
    // Si estamos en la página de inicio...
    loadFeaturedProducts(allProducts);
  }
  
  if (document.getElementById("productsGrid")) {
    // Si estamos en la página de productos...
    applyFilters(); // Mostramos todos los productos inicialmente.
    // Y asignamos el evento 'change' a cada filtro para que se actualice la lista.
    document.getElementById("categoryFilter")?.addEventListener("change", applyFilters);
    document.getElementById("characterFilter")?.addEventListener("change", applyFilters);
    document.getElementById("priceFilter")?.addEventListener("change", applyFilters);
  }
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