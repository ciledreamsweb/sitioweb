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

let allProductsData = [] // Caché para los datos de los productos

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

    // Determinar el nombre de la categoría para mostrar
    const categoryNames = {
      short: "Conjuntos Cortos",
      Camisolin: "Camisolines",
      Camiseros: "Camiseros",
      Remerones: "Remerones",
      "Remera y Short": "Remera + Short",
    }

    const categoryDisplay = categoryNames[product.category] || product.category

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
            <td>
                <div class="stock-indicator">
                    <div class="stock-item">
                        <span class="stock-label">S:</span>
                        <span>${product.stock_s}</span>
                    </div>
                    <div class="stock-item">
                        <span class="stock-label">M:</span>
                        <span>${product.stock_m}</span>
                    </div>
                    <div class="stock-item">
                        <span class="stock-label">L:</span>
                        <span>${product.stock_l}</span>
                    </div>
                </div>
            </td>
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
    document.getElementById("stock_s").value = product.stock_s
    document.getElementById("stock_m").value = product.stock_m
    document.getElementById("stock_l").value = product.stock_l
  } else {
    // Modo Creación
    formTitle.textContent = "Agregar Nuevo Producto"
    document.getElementById("productId").value = ""
    document.getElementById("image_url").value = ""
  }
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
 * Maneja el envío del formulario para crear o actualizar un producto,
 * incluyendo la subida de la imagen a Supabase Storage.
 * @param {Event} e - El evento de envío del formulario.
 */
async function handleFormSubmit(e) {
  e.preventDefault()
  const productId = document.getElementById("productId").value
  const imageFile = document.getElementById("image_file").files[0]
  let imageUrl = document.getElementById("image_url").value

  // 1. Lógica de subida de imagen
  if (imageFile) {
    const fileName = `public/${Date.now()}-${imageFile.name}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(fileName, imageFile)

    if (uploadError) {
      alert("Error al subir la imagen: " + uploadError.message)
      return
    }

    // 2. Obtener la URL pública de la imagen recién subida
    const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(fileName)

    imageUrl = publicUrlData.publicUrl
  }

  // Si estamos creando un producto nuevo y no se subió imagen, mostrar un error.
  if (!productId && !imageUrl) {
    alert("Por favor, selecciona una imagen para el nuevo producto.")
    return
  }

  // 3. Preparar los datos del producto para la base de datos
  const productData = {
    name: document.getElementById("name").value,
    price: Number.parseFloat(document.getElementById("price").value),
    description: document.getElementById("description").value,
    image_url: imageUrl,
    category: document.getElementById("category").value,
    badge: document.getElementById("badge").value,
    stock_s: Number.parseInt(document.getElementById("stock_s").value, 10),
    stock_m: Number.parseInt(document.getElementById("stock_m").value, 10),
    stock_l: Number.parseInt(document.getElementById("stock_l").value, 10),
  }

  // 4. Guardar los datos en la base de datos
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

// ===== Event Listeners =====

// Cargar productos al iniciar
document.addEventListener("DOMContentLoaded", loadProducts)

// Botón para mostrar el formulario de nuevo producto
newProductBtn.addEventListener("click", () => showForm())

// Botón para cancelar y ocultar el formulario
cancelBtn.addEventListener("click", hideForm)

// Enviar el formulario
productForm.addEventListener("submit", handleFormSubmit)

// Filtro de categoría
categoryFilter.addEventListener("change", filterProducts)

// Delegación de eventos para los botones de Editar y Eliminar
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
