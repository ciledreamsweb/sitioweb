// ===== contacto.js =====

// ===== Contact Form Handling =====
const contactForm = document.getElementById("contactForm");
const formSuccess = document.getElementById("formSuccess");

if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault(); // Prevenimos el envío tradicional del formulario.

    // Recolectamos los datos de los campos del formulario.
    const formData = {
      name: document.getElementById("name").value,
      email: document.getElementById("email").value,
      phone: document.getElementById("phone").value,
      subject: document.getElementById("subject").value,
      product: document.getElementById("product").value,
      size: document.getElementById("size").value,
      message: document.getElementById("message").value,
    };

    // En una aplicación real, aquí enviarías 'formData' a un servidor.
    console.log("Formulario de contacto enviado:", formData);

    // Ocultamos el formulario y mostramos el mensaje de éxito.
    contactForm.style.display = "none";
    formSuccess.style.display = "block";

    // Opcional: Después de 2 segundos, redirigimos a WhatsApp con un mensaje pre-cargado.
    setTimeout(() => {
      const whatsappMessage = `Hola! Soy ${formData.name}. ${formData.message}`;
      const whatsappUrl = `https://wa.me/5491112345678?text=${encodeURIComponent(whatsappMessage)}`;
      window.open(whatsappUrl, "_blank");
    }, 2000);
  });
}