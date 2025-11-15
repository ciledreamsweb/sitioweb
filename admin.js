// ===== admin.js =====

// Importamos el cliente de Supabase
import { supabase } from "./supabase-client.js"

// Referencias a los elementos del DOM
const productsTableBody = document.getElementById("productsTableBody")
const loading = document.getElementById("loading")
const tableContainer = document.querySelector(".table-container")
const formContainer = document.getElementById("formContainer")
const productForm = document.getElementById("productForm")
const newProductBtn = document.getElementById("newProductBtn")
const cancelBtn = document.getElementById("cancelBtn")
const formTitle = document.getElementById("formTitle")
const categoryFilter = document.getElementById("categoryFilter")
const logoutBtn = document.getElementById("logoutBtn")
const categoryFormSelect = document.getElementById("category"); // Referencia al select de categoría del formulario

let allProductsData = [] // Caché para los datos de los productos

/**
 * Muestra u oculta los campos de stock según la categoría seleccionada en el formulario.
 */
function toggleStockFields() {
    const selectedCategory = categoryFormSelect.value;
    const stockTallesContainer = document.getElementById('stockTalles');
    const stockUnicoContainer = document.getElementById('stockUnico');
    const oneSizeCategories = ['Maxitoallon', 'Lona Playera'];

    if (oneSizeCategories.includes(selectedCategory)) {
        stockTallesContainer.style.display = 'none';
        stockUnicoContainer.style.display = 'block';
    } else {
        stockTallesContainer.style.display = 'grid';
        stockUnicoContainer.style.display = 'none';
    }
}

/**
 * Carga todos los productos de Supabase y los muestra en la tabla.
 */
async function loadProducts() {
  loading.style.display = "block"
  tableContainer.style.display = "none"
  productsTableBody.innerHTML = ""

  const { data, error } = await supabase.from("products").select("*").order("id", { ascending: true })

  if (error) {
    console.error("Error cargando productos:", error)
    loading.textContent = "Error al cargar productos."
    return
  }

  allProductsData = data
  renderProducts(allProductsData)

  loading.style.display = "none"
  tableContainer.style.display = "block"
}

/**
 * Renderiza los productos en la tabla según los datos proporcionados
 * @param {Array} products - Array de productos a renderizar
 */
function renderProducts(products) {
  productsTableBody.innerHTML = ""

  if (products.length === 0) {
    productsTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 3rem; color: var(--color-text-secondary);">
                    <div class="empty-state">
                        <div class="empty-state-icon">📦</div>
                        <p>No se encontraron productos</p>
                    </div>
                </td>
            </tr>
        `
    return
  }

  products.forEach((product) => {
    const row = document.createElement("tr")

    const categoryNames = {
      short: "Conjuntos Cortos",
      Camisolin: "Camisolines",
      Camiseros: "Camiseros",
      Remerones: "Remerones",
      "Remera y Short": "Remera + Short",
    }
    const categoryDisplay = categoryNames[product.category] || product.category

    let stockHtml;
    const oneSizeCategories = ['Maxitoallon', 'Lona Playera'];

    if (oneSizeCategories.includes(product.category)) {
        stockHtml = `
            <div class="stock-indicator">
                <div class="stock-item">
                    <span class="stock-label">Único:</span>
                    <span>${product.stock_s}</span>
                </div>
            </div>`;
    } else {
        stockHtml = `
            <div class="stock-indicator">
                <div class="stock-item"><span class="stock-label">S:</span><span>${product.stock_s || 0}</span></div>
                <div class="stock-item"><span class="stock-label">M:</span><span>${product.stock_m || 0}</span></div>
                <div class="stock-item"><span class="stock-label">L:</span><span>${product.stock_l || 0}</span></div>
                <div class="stock-item"><span class="stock-label">XL:</span><span>${product.stock_xl || 0}</span></div>
            </div>`;
    }

    row.innerHTML = `
            <td>
                <img src="${product.image_url}" alt="${product.name}" class="product-image" onerror="this.src='/generic-product-display.png'">
            </td>
            <td>
                <div class="product-name">${product.name}</div>
                ${product.badge ? `<span class="badge">${product.badge}</span>` : ""}
            </td>
            <td>${categoryDisplay}</td>
            <td style="font-weight: 500;">$${Number.parseFloat(product.price).toFixed(2)}</td>
            <td>${stockHtml}</td>
            <td class="actions">
                <button class="btn btn-warning edit-btn" data-id="${product.id}">Editar</button>
                <button class="btn btn-danger delete-btn" data-id="${product.id}">Eliminar</button>
            </td>
        `
    productsTableBody.appendChild(row)
  })
}

/**
 * Filtra los productos según la categoría seleccionada
 */
function filterProducts() {
  const selectedCategory = categoryFilter.value

  if (selectedCategory === "all") {
    renderProducts(allProductsData)
  } else {
    const filteredProducts = allProductsData.filter((product) => product.category === selectedCategory)
    renderProducts(filteredProducts)
  }
}

/**
 * Muestra el formulario para agregar o editar un producto.
 * @param {object|null} product - El objeto del producto a editar, o null para crear uno nuevo.
 */
function showForm(product = null) {
  productForm.reset()
  const oneSizeCategories = ['Maxitoallon', 'Lona Playera'];

  if (product) {
    // Modo Edición
    formTitle.textContent = "Editar Producto"
    document.getElementById("productId").value = product.id
    document.getElementById("name").value = product.name
    document.getElementById("price").value = product.price
    document.getElementById("description").value = product.description
    document.getElementById("image_url").value = product.image_url
    document.getElementById("category").value = product.category
    document.getElementById("badge").value = product.badge || ""
    
    if (oneSizeCategories.includes(product.category)) {
        document.getElementById("stock_unico_input").value = product.stock_s || 0;
        document.getElementById("stock_s").value = 0;
        document.getElementById("stock_m").value = 0;
        document.getElementById("stock_l").value = 0;
        document.getElementById("stock_xl").value = 0;
    } else {
        document.getElementById("stock_unico_input").value = 0;
        document.getElementById("stock_s").value = product.stock_s || 0;
        document.getElementById("stock_m").value = product.stock_m || 0;
        document.getElementById("stock_l").value = product.stock_l || 0;
        document.getElementById("stock_xl").value = product.stock_xl || 0;
    }
  } else {
    // Modo Creación
    formTitle.textContent = "Agregar Nuevo Producto"
    document.getElementById("productId").value = ""
    document.getElementById("image_url").value = ""
    document.getElementById("stock_s").value = 0
    document.getElementById("stock_m").value = 0
    document.getElementById("stock_l").value = 0
    document.getElementById("stock_xl").value = 0
    document.getElementById("stock_unico_input").value = 0
  }

  toggleStockFields();
  formContainer.style.display = "block"
  formContainer.scrollIntoView({ behavior: "smooth" })
}

/**
 * Oculta el formulario.
 */
function hideForm() {
  formContainer.style.display = "none"
  productForm.reset()
}

/**
 * Maneja el envío del formulario para crear o actualizar un producto.
 * @param {Event} e - El evento de envío del formulario.
 */
async function handleFormSubmit(e) {
  e.preventDefault()
  const productId = document.getElementById("productId").value
  const imageFile = document.getElementById("image_file").files[0]
  let imageUrl = document.getElementById("image_url").value

  const selectedCategory = document.getElementById("category").value;
  const oneSizeCategories = ['Maxitoallon', 'Lona Playera'];
  let stockS, stockM, stockL, stockXL;

  if (oneSizeCategories.includes(selectedCategory)) {
      stockS = Number.parseInt(document.getElementById("stock_unico_input").value, 10);
      stockM = 0;
      stockL = 0;
      stockXL = 0;
  } else {
      stockS = Number.parseInt(document.getElementById("stock_s").value, 10);
      stockM = Number.parseInt(document.getElementById("stock_m").value, 10);
      stockL = Number.parseInt(document.getElementById("stock_l").value, 10);
      stockXL = Number.parseInt(document.getElementById("stock_xl").value, 10);
  }
  
  if (stockS < 0 || stockM < 0 || stockL < 0 || stockXL < 0) {
    alert("El stock no puede ser un número negativo. Por favor, corrige los valores.");
    return;
  }

  if (imageFile) {
    const fileName = `public/${Date.now()}-${imageFile.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(fileName, imageFile)

    if (uploadError) {
      alert("Error al subir la imagen: " + uploadError.message)
      return
    }

    const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(fileName)
    imageUrl = publicUrlData.publicUrl
  }

  if (!productId && !imageUrl) {
    alert("Por favor, selecciona una imagen para el nuevo producto.")
    return
  }

  const productData = {
    name: document.getElementById("name").value,
    price: Number.parseFloat(document.getElementById("price").value),
    description: document.getElementById("description").value,
    image_url: imageUrl,
    category: selectedCategory,
    badge: document.getElementById("badge").value,
    stock_s: stockS,
    stock_m: stockM,
    stock_l: stockL,
    stock_xl: stockXL,
  }

  let error
  if (productId) {
    const { error: updateError } = await supabase.from("products").update(productData).eq("id", productId)
    error = updateError
  } else {
    const { error: insertError } = await supabase.from("products").insert([productData])
    error = insertError
  }

  if (error) {
    alert("Error al guardar el producto: " + error.message)
  } else {
    alert("Producto guardado exitosamente!")
    hideForm()
    loadProducts()
  }
}

/**
 * Maneja la eliminación de un producto.
 * @param {string} productId - El ID del producto a eliminar.
 */
async function handleDelete(productId) {
  if (!confirm("¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.")) {
    return
  }
  const { error } = await supabase.from("products").delete().eq("id", productId)
  if (error) {
    alert("Error al eliminar el producto: " + error.message)
  } else {
    alert("Producto eliminado exitosamente.")
    loadProducts()
  }
}

// =================================================================
// --- FUNCIONES DE AUTENTICACIÓN ---
// =================================================================

async function handleLogout() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error("Error al cerrar sesión:", error.message)
    alert("Error al cerrar sesión. Inténtalo de nuevo.")
  } else {
    window.location.href = '/login.html'
  }
}

async function checkAuthAndLoad() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '/login.html'; 
        return;
    }
    loadProducts();
}

// ===== Event Listeners =====
document.addEventListener("DOMContentLoaded", checkAuthAndLoad) 
newProductBtn.addEventListener("click", () => showForm())
cancelBtn.addEventListener("click", hideForm)
productForm.addEventListener("submit", handleFormSubmit)
categoryFilter.addEventListener("change", filterProducts)
logoutBtn.addEventListener("click", handleLogout)
categoryFormSelect.addEventListener('change', toggleStockFields); // Listener para el formulario

productsTableBody.addEventListener("click", (e) => {
  const target = e.target
  const productId = target.dataset.id
  if (target.classList.contains("edit-btn")) {
    const productToEdit = allProductsData.find((p) => p.id == productId)
    if (productToEdit) {
      showForm(productToEdit)
    }
  }
  if (target.classList.contains("delete-btn")) {
    handleDelete(productId)
  }
})