// ===== carrito.js (Completo y Corregido con 'import') =====

import { supabase } from './supabase-client.js';
// ===== INICIO DE LA MODIFICACIÓN CLAVE =====
// Importamos la función específica que necesitamos desde script.js
import { showToast } from './script.js';
// ===== FIN DE LA MODIFICACIÓN CLAVE =====

let cart = JSON.parse(localStorage.getItem("ciledreams_cart")) || [];

function getDisplaySize(size) {
  const sizeMap = { 'S': '1', 'M': '2', 'L': '3' };
  return sizeMap[size] || size;
}

function loadCartItems() {
  const cartItemsContainer = document.getElementById("cartItems");
  const emptyCart = document.getElementById("emptyCart");
  const cartSummary = document.getElementById("cartSummary");

  if (!cartItemsContainer) return;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '';
    cartItemsContainer.style.display = "none";
    emptyCart.style.display = "block";
    cartSummary.style.display = "none";
    return;
  }

  cartItemsContainer.style.display = "block";
  emptyCart.style.display = "none";
  cartSummary.style.display = "block";

  cartItemsContainer.innerHTML = cart.map(item => `
    <div class="cart-item-row">
        <div class="cart-item-image">
            <img src="${item.image}" alt="${item.name}">
        </div>
        <div class="cart-item-details">
            <h3 class="cart-item-title">${item.name}</h3>
            <p class="cart-item-size">Talle: ${getDisplaySize(item.size)}</p>
        </div>
        <div class="cart-item-quantity">
            <div class="quantity-controls">
                <button class="quantity-btn" onclick="updateQuantity(${item.id}, '${item.size}', -1)">-</button>
                <span class="quantity-display">${item.quantity}</span>
                <button class="quantity-btn" onclick="updateQuantity(${item.id}, '${item.size}', 1)">+</button>
            </div>
        </div>
        <div class="cart-item-subtotal">
            ${formatPrice(item.price * item.quantity)}
        </div>
        <div class="cart-item-remove">
            <button class="remove-btn" onclick="removeFromCart(${item.id}, '${item.size}')" title="Eliminar producto">×</button>
        </div>
    </div>`
  ).join("");

  updateCartSummary();
  updateCartCount();
}

async function updateQuantity(productId, size, change) {
  const item = cart.find(item => item.id === productId && item.size === size);
  if (!item) return;

  if (change > 0) {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('stock_s, stock_m, stock_l')
        .eq('id', productId)
        .single();
      if (error) throw new Error("No se pudo verificar el stock.");

      const stockKey = `stock_${size.toLowerCase()}`;
      if (item.quantity >= product[stockKey]) {
        showToast('¡No hay más stock disponible!', 'error');
        return;
      }
    } catch (err) {
      showToast(err.message, 'error');
      return;
    }
  }

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
      const { error } = await supabase.functions.invoke('update-stock', { body: cart });

      if (error) {
        throw new Error("Uno de los productos ya no tiene stock suficiente.");
      }
      
      let message = `¡Hola! Quiero realizar un pedido:\n\n*DATOS DEL CLIENTE*\n-------------------\n*Nombre:* ${customerName}\n*Código Postal:* ${postalCode}\n\n*DETALLES DEL PEDIDO*\n---------------------\n`;
      cart.forEach(item => {
        message += `\n• *Producto:* ${item.name}`;
        message += `\n  *Talle:* ${getDisplaySize(item.size)}`;
        message += `\n  *Cantidad:* ${item.quantity}`;
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
      showToast(error.message, 'error');
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