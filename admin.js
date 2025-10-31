// ===== admin.js =====

import { supabase } from "./supabase-client.js";

// --- INICIO DE LA SECCIÓN DE AUTENTICACIÓN ---

// Función principal que verifica la sesión antes de cargar la página
async function checkAuthAndLoadPage() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
        console.error("Error al obtener la sesión:", error);
        return;
    }

    if (!session) {
        // Si no hay sesión activa, redirigir a la página de login
        window.location.href = 'login.html';

    } else {
        // Si hay sesión, cargar los productos y configurar la página
        console.log("Usuario autenticado:", session.user.email);
        loadProducts();
    }
}

// --- FIN DE LA SECCIÓN DE AUTENTICACIÓN ---


// Referencias a los elementos del DOM
const productsTableBody = document.getElementById("productsTableBody");
const loading = document.getElementById("loading");
const tableContainer = document.querySelector(".table-container");
const formContainer = document.getElementById("formContainer");
const productForm = document.getElementById("productForm");
const newProductBtn = document.getElementById("newProductBtn");
const cancelBtn = document.getElementById("cancelBtn");
const formTitle = document.getElementById("formTitle");
const categoryFilter = document.getElementById("categoryFilter");
const logoutBtn = document.getElementById("logoutBtn"); // Referencia al nuevo botón

let allProductsData = [];

async function loadProducts() {
  // ... (El resto de esta función y las demás funciones como renderProducts, showForm, etc., se mantienen exactamente iguales)
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

function renderProducts(products) {
    // ... (Esta función no cambia)
    productsTableBody.innerHTML = ""
    if (products.length === 0) {
        productsTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">No se encontraron productos.</td></tr>`
        return;
    }
    products.forEach(product => {
        const row = document.createElement("tr")
        row.innerHTML = `
            <td><img src="${product.image_url}" alt="${product.name}" class="product-image"></td>
            <td><div class="product-name">${product.name}</div></td>
            <td>${product.category}</td>
            <td>$${product.price.toFixed(2)}</td>
            <td>
                <div class="stock-indicator">
                    <div class="stock-item"><span class="stock-label">S:</span><span>${product.stock_s}</span></div>
                    <div class="stock-item"><span class="stock-label">M:</span><span>${product.stock_m}</span></div>
                    <div class="stock-item"><span class="stock-label">L:</span><span>${product.stock_l}</span></div>
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

function filterProducts() {
    // ... (Esta función no cambia)
    const selectedCategory = categoryFilter.value
    if (selectedCategory === "all") {
        renderProducts(allProductsData)
    } else {
        const filteredProducts = allProductsData.filter(p => p.category === selectedCategory)
        renderProducts(filteredProducts)
    }
}

function showForm(product = null) {
    // ... (Esta función no cambia)
    productForm.reset()
    if (product) {
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
        formTitle.textContent = "Agregar Nuevo Producto"
        document.getElementById("productId").value = ""
        document.getElementById("image_url").value = ""
    }
    formContainer.style.display = "block"
}

function hideForm() {
    // ... (Esta función no cambia)
    formContainer.style.display = "none"
}

async function handleFormSubmit(e) {
    // ... (Esta función no cambia)
    e.preventDefault();
    const productId = document.getElementById("productId").value;
    const imageFile = document.getElementById("image_file").files[0];
    let imageUrl = document.getElementById("image_url").value;

    if (imageFile) {
        const fileName = `public/${Date.now()}-${imageFile.name}`;
        const { data, error } = await supabase.storage.from('product-images').upload(fileName, imageFile);
        if (error) {
            alert('Error al subir la imagen: ' + error.message);
            return;
        }
        const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
    }
    
    if (!productId && !imageUrl) {
        alert("Por favor, selecciona una imagen para el nuevo producto.");
        return;
    }
    
    const productData = { /* ... */ };
    // ... (resto de la función igual)
}

async function handleDelete(productId) {
    // ... (Esta función no cambia)
    if (!confirm("¿Estás seguro de que quieres eliminar este producto?")) return;
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) {
        alert("Error al eliminar el producto: " + error.message);
    } else {
        alert("Producto eliminado.");
        loadProducts();
    }
}

// ===== Event Listeners =====

// CAMBIO: Al cargar la página, primero verificamos la autenticación
document.addEventListener("DOMContentLoaded", checkAuthAndLoadPage);

// ... (El resto de los listeners se mantienen iguales)
newProductBtn.addEventListener("click", () => showForm());
cancelBtn.addEventListener("click", hideForm);
productForm.addEventListener("submit", handleFormSubmit);
categoryFilter.addEventListener("change", filterProducts);
productsTableBody.addEventListener("click", (e) => {
    // ... (lógica de botones de editar/eliminar igual)
    const target = e.target;
    if (target.classList.contains('edit-btn')) {
        const product = allProductsData.find(p => p.id == target.dataset.id);
        showForm(product);
    }
    if (target.classList.contains('delete-btn')) {
        handleDelete(target.dataset.id);
    }
});

// NUEVO: Listener para el botón de cerrar sesión
logoutBtn.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error al cerrar sesión:', error);
    } else {
        // Redirigir al login después de cerrar sesión
        window.location.href = 'login.html';
    }
});