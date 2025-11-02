// ===== carrito.js (Corregido: Usando múltiples 'update' para mayor estabilidad) =====

import { supabase } from './supabase-client.js';
// Importamos la función showToast desde script.js
import { showToast } from './script.js';

let cart = JSON.parse(localStorage.getItem("ciledreams_cart")) || [];

function getDisplaySize(size) {
  const sizeMap = { 'S': '1', 'M': '2', 'L': '3' };
  return sizeMap[size] || size;
}

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
    updateCartCount();
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

// REQUISITO (A) - Límite de stock al modificar cantidad (sin descontar)
async function updateQuantity(productId, size, change) {
  const item = cart.find(item => item.id === productId && item.size === size);
  if (!item) return;

  if (change > 0) {
    try {
      // 1. Verificar stock en la base (sin descontar)
      const { data: product, error } = await supabase
        .from('products')
        .select('stock_s, stock_m, stock_l, stock_xl')
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

// FUNCIÓN CLAVE CORREGIDA: Débito de stock usando múltiples 'update'
async function debitStockFromDatabase(cartItems) {
  if (cartItems.length === 0) return { success: true };
  
  const productIds = [...new Set(cartItems.map(item => item.id))];

  // 1. Obtenemos el stock actual de todos los productos en el carrito
  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('id, stock_s, stock_m, stock_l, stock_xl, name')
    .in('id', productIds);
  
  if (fetchError || !products) throw new Error("Error al verificar el stock actual en la base de datos.");

  const productMap = products.reduce((map, p) => {
    map[p.id] = p;
    return map;
  }, {});
  
  const updatePromises = [];

  // 2. Verificación de stock y preparación de las promesas de actualización
  for (const item of cartItems) {
    const product = productMap[item.id];
    const stockKey = `stock_${item.size.toLowerCase()}`;
    
    if (!product) throw new Error(`Producto ID ${item.id} no encontrado.`);

    const currentStock = product[stockKey];
    const requiredQuantity = item.quantity;

    if (currentStock < requiredQuantity) {
      // Si el stock es insuficiente, lanzamos un error que detendrá el Promise.all
      throw new Error(`¡Stock insuficiente para ${product.name} (Talle: ${getDisplaySize(item.size)})!`);
    }

    const newStockValue = currentStock - requiredQuantity;
    
    // Preparamos el objeto de actualización: solo la columna de stock cambia
    let updateObject = {};
    updateObject[stockKey] = newStockValue;
    
    // Creamos la promesa de actualización individual (update + eq)
    const updatePromise = supabase
      .from('products')
      .update(updateObject)
      .eq('id', item.id)
      .select(); // El select es opcional, pero ayuda a debuggear

    updatePromises.push(updatePromise);
  }
  
  // 3. Ejecución de las actualizaciones
  // Promise.all espera que todas las promesas se resuelvan. Si una falla, falla todo el bloque.
  // Esto simula una transacción (rollback) de forma simple en el frontend.
  try {
      const results = await Promise.all(updatePromises);
      
      // Chequeamos si alguno de los resultados individuales tiene un error (aunque Promise.all ya lo haría)
      for (const result of results) {
          if (result.error) {
              // Lanzamos el primer error encontrado
              console.error("Error en una actualización de stock individual:", result.error);
              throw new Error("Error al guardar la actualización de stock en la base de datos.");
          }
      }
  } catch(e) {
      // El error de stock insuficiente o el error de la base se captura aquí
      console.error("Error al actualizar el stock:", e);
      // Relanzamos el error para que sea capturado por el bloque 'catch' principal
      throw e.message.includes('Stock insuficiente') ? e : new Error("Error interno al actualizar el stock. Contacte a soporte.");
  }

  return { success: true };
}


const checkoutBtn = document.getElementById("checkoutBtn");
if (checkoutBtn) {
  // REQUISITO (B): Descontar el stock de la base al hacer click en checkout
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
    const cartSnapshot = [...cart]; // Copia del carrito para el mensaje

    try {
      // 1. DEBITAR STOCK DIRECTAMENTE EN LA BASE DE DATOS
      await debitStockFromDatabase(cartSnapshot); // Usamos la función corregida
      
      // 2. Si el débito fue exitoso, procede a generar el mensaje de WhatsApp:
      let message = `¡Hola! Quiero realizar un pedido:\n\n*DATOS DEL CLIENTE*\n-------------------\n*Nombre:* ${customerName}\n*Código Postal:* ${postalCode}\n\n*DETALLES DEL PEDIDO*\n---------------------\n`;
      cartSnapshot.forEach(item => {
        message += `\n• *Producto:* ${item.name}`;
        message += `\n  *Talle:* ${getDisplaySize(item.size)}`;
        message += `\n  *Cantidad:* ${item.quantity}`;
      });

      const total = cartSnapshot.reduce((sum, item) => sum + item.price * item.quantity, 0);
      message += `\n\n*Total del Pedido:* ${formatPrice(total)}`;
      message += `\n\n_Por favor, confirmar disponibilidad y costo de envío._`;
      
      // 3. Limpia el carrito solo si el débito de stock fue exitoso
      cart = [];
      localStorage.removeItem("ciledreams_cart");
      
      const whatsappUrl = `https://wa.me/5491158626516?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");
      
      showToast("¡Stock reservado y pedido enviado! Serás redirigida a WhatsApp.", 'success');
      loadCartItems();
      
    } catch (error) {
      console.error("Error al procesar la compra:", error);
      // Muestra el mensaje de error específico de stock o el genérico
      showToast(error.message || 'Error desconocido al procesar la compra.', 'error');
    } finally {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Finalizar Compra por WhatsApp";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadCartItems();
});

// Hacemos las funciones globales para que los onclick de loadCartItems funcionen
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;