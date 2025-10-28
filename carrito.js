// ===== carrito.js =====

// Leemos el carrito desde el localStorage. Si no existe, creamos un array vacío.
let cart = JSON.parse(localStorage.getItem("ciledreams_cart")) || [];

/**
 * Carga y muestra los items del carrito en la página.
 */
function loadCartItems() {
  const cartItemsContainer = document.getElementById("cartItems");
  const emptyCart = document.getElementById("emptyCart");
  const cartSummary = document.getElementById("cartSummary");

  if (!cartItemsContainer) return; // Salir si no estamos en la página del carrito.

  if (cart.length === 0) {
    // Si el carrito está vacío, mostramos el mensaje correspondiente y ocultamos lo demás.
    cartItemsContainer.style.display = "none";
    emptyCart.style.display = "block";
    cartSummary.style.display = "none";
    return;
  }

  // Si hay items, mostramos el contenedor y el resumen.
  cartItemsContainer.style.display = "block";
  emptyCart.style.display = "none";
  cartSummary.style.display = "block";

  // Generamos el HTML para cada item en el carrito.
  cartItemsContainer.innerHTML = cart
    .map(
      (item) => `
        <div class="cart-item">
            <div class="cart-item-image">
                <img src="${item.image}" alt="${item.name}">
            </div>
            <div class="cart-item-details">
                <h3>${item.name}</h3>
                <p>Talle: ${item.size}</p>
                <p>Cantidad: ${item.quantity}</p>
                <p class="cart-item-price">${formatPrice(item.price * item.quantity)}</p>
            </div>
            <div class="cart-item-actions">
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, '${item.size}', -1)">-</button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, '${item.size}', 1)">+</button>
                </div>
                <button class="remove-btn" onclick="removeFromCart(${item.id}, '${item.size}')">Eliminar</button>
            </div>
        </div>
    `,
    )
    .join("");

  updateCartSummary();
  updateCartCount(); // Aseguramos que el contador de la nav también se actualice.
}

/**
 * Actualiza la cantidad de un item específico en el carrito.
 * @param {number} productId - El ID del producto.
 * @param {string} size - El talle del producto (necesario para identificarlo unívocamente).
 * @param {number} change - El cambio en la cantidad (+1 o -1).
 */
function updateQuantity(productId, size, change) {
  const item = cart.find((item) => item.id === productId && item.size === size);
  if (!item) return;

  item.quantity += change;

  // Si la cantidad llega a 0 o menos, eliminamos el item del carrito.
  if (item.quantity <= 0) {
    removeFromCart(productId, size);
    return;
  }
  
  // Guardamos los cambios y recargamos la vista.
  localStorage.setItem("ciledreams_cart", JSON.stringify(cart));
  loadCartItems();
}

/**
 * Elimina un item del carrito.
 * @param {number} productId - El ID del producto a eliminar.
 * @param {string} size - El talle del producto a eliminar.
 */
function removeFromCart(productId, size) {
  // Filtramos el carrito, quedándonos solo con los items que NO coinciden con el id y talle a eliminar.
  cart = cart.filter((item) => !(item.id === productId && item.size === size));
  localStorage.setItem("ciledreams_cart", JSON.stringify(cart));
  loadCartItems();
}

/**
 * Calcula y muestra el subtotal y total del pedido.
 */
function updateCartSummary() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  document.getElementById("subtotal").textContent = formatPrice(subtotal);
  document.getElementById("total").textContent = formatPrice(subtotal); // Asumimos que el envío se calcula después.
}

// Lógica para el botón de "Finalizar Compra por WhatsApp".
const checkoutBtn = document.getElementById("checkoutBtn");
if (checkoutBtn) {
  checkoutBtn.addEventListener("click", () => {
    if (cart.length === 0) return;

    let message = "¡Hola! Quiero realizar el siguiente pedido:\n\n";

    cart.forEach((item) => {
      message += `• ${item.name}\n`;
      message += `  Talle: ${item.size}\n`;
      message += `  Cantidad: ${item.quantity}\n`;
      message += `  Precio: ${formatPrice(item.price * item.quantity)}\n\n`;
    });

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    message += `Total: ${formatPrice(total)}\n\n`;
    message += "¿Podrían confirmar disponibilidad y costo de envío?";

    const whatsappUrl = `https://wa.me/5491158626516?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  });
}

// ===== Inicialización de la Página del Carrito =====
document.addEventListener("DOMContentLoaded", () => {
  loadCartItems();
});

// ===== Funciones de Ayuda (pueden ser duplicadas con script.js, pero es seguro tenerlas aquí) =====
function formatPrice(price) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(price);
}

function updateCartCount() {
  const cartCountElements = document.querySelectorAll("#cartCount"); // Seleccionamos todos por si acaso.
  if (cartCountElements.length > 0) {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCountElements.forEach(el => el.textContent = totalItems);
  }
}