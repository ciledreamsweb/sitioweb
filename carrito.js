// ===== carrito.js =====

import { supabase } from './supabase-client.js';

let cart = JSON.parse(localStorage.getItem("ciledreams_cart")) || [];

// CAMBIO 1: Función para traducir los talles
// Esta función convierte 'S' en '1', 'M' en '2', etc.
function getDisplaySize(size) {
  const sizeMap = {
    'S': '1',
    'M': '2',
    'L': '3'
  };
  // Si el talle es S, M, o L, devuelve el número. Si no, devuelve el valor original.
  return sizeMap[size] || size;
}

function loadCartItems() {
  const cartItemsContainer = document.getElementById("cartItems");
  const emptyCart = document.getElementById("emptyCart");
  const cartSummary = document.getElementById("cartSummary");

  if (!cartItemsContainer) return;

  if (cart.length === 0) {
    cartItemsContainer.style.display = "none";
    emptyCart.style.display = "block";
    cartSummary.style.display = "none";
    return;
  }

  cartItemsContainer.style.display = "block";
  emptyCart.style.display = "none";
  cartSummary.style.display = "block";

  cartItemsContainer.innerHTML = cart.map(item => `
    <div class="cart-item">
        <div class="cart-item-image"><img src="${item.image}" alt="${item.name}"></div>
        <div class="cart-item-details">
            <h3>${item.name}</h3>
            <!-- CAMBIO 2: Usamos la nueva función para mostrar el talle correcto -->
            <p>Talle: ${getDisplaySize(item.size)}</p>
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
    </div>`
  ).join("");

  updateCartSummary();
  updateCartCount();
}

function updateQuantity(productId, size, change) {
  const item = cart.find(item => item.id === productId && item.size === size);
  if (!item) return;
  item.quantity += change;
  if (item.quantity <= 0) {
    removeFromCart(productId, size);
    return;
  }
  localStorage.setItem("ciledreams_cart", JSON.stringify(cart));
  loadCartItems();
}

function removeFromCart(productId, size) {
  cart = cart.filter(item => !(item.id === productId && item.size === size));
  localStorage.setItem("ciledreams_cart", JSON.stringify(cart));
  loadCartItems();
}

function updateCartSummary() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotalEl = document.getElementById("subtotal");
  const totalEl = document.getElementById("total");
  if(subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
  if(totalEl) totalEl.textContent = formatPrice(subtotal);
}

const checkoutBtn = document.getElementById("checkoutBtn");
if (checkoutBtn) {
  checkoutBtn.addEventListener("click", async () => {
    if (cart.length === 0) return;

    const customerName = document.getElementById('customerName').value.trim();
    const postalCode = document.getElementById('postalCode').value.trim();

    if (!customerName || !postalCode) {
      showToast("Por favor, completa tus datos para continuar.", 'error');
      return;
    }

    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Procesando...";

    try {
      const stockUpdatePromises = cart.map(item =>
        supabase.rpc('decrement_stock', {
          product_id_to_update: item.id,
          size_to_decrement: item.size,
          quantity_to_decrement: item.quantity
        })
      );
      const results = await Promise.all(stockUpdatePromises);
      results.forEach(res => {
        if (res.error) throw new Error(`Error al actualizar stock: ${res.error.message}`);
      });
      
      // CAMBIO 3: Mensaje de WhatsApp mejorado, más limpio y compatible
      let message = `¡Hola! Quiero realizar un pedido:\n\n`;
      message += `*DATOS DEL CLIENTE*\n`;
      message += `-------------------\n`;
      message += `*Nombre:* ${customerName}\n`;
      message += `*Código Postal:* ${postalCode}\n\n`;
      message += `*DETALLES DEL PEDIDO*\n`;
      message += `---------------------\n`;

      cart.forEach(item => {
        message += `\n• *Producto:* ${item.name}`;
        // Usamos la función de talle también aquí
        message += `\n  *Talle:* ${getDisplaySize(item.size)}`;
        message += `\n  *Cantidad:* ${item.quantity}`;
        message += `\n  *Precio:* ${formatPrice(item.price * item.quantity)}`;
      });

      const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      message += `\n\n*Total del Pedido:* ${formatPrice(total)}`;
      message += `\n\n_Por favor, confirmar disponibilidad y costo de envío._`;
      
      cart = [];
      localStorage.removeItem("ciledreams_cart");
      
      const whatsappUrl = `https://wa.me/5491158626516?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");
      
      showToast("¡Pedido enviado! Serás redirigida a WhatsApp.", 'success');
      loadCartItems();
      
    } catch (error) {
      console.error("Error al procesar la compra:", error);
      showToast("Hubo un problema al procesar tu pedido.", 'error');
    } finally {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Finalizar Compra por WhatsApp";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadCartItems();
});

function formatPrice(price) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(price);
}

function updateCartCount() {
  const cartCountElements = document.querySelectorAll("#cartCount");
  if (cartCountElements.length > 0) {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCountElements.forEach(el => el.textContent = totalItems);
  }
}

window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;