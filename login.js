// ===== login.js =====
import { supabase } from './supabase-client.js';

const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');

// Redirigir si el usuario ya está logueado
(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        window.location.href = 'admin.html';
    }
})();


loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    errorMessage.textContent = ''; // Limpiar errores previos

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            throw error;
        }

        // Si el login es exitoso, redirigir al dashboard
        if (data.user) {
            window.location.href = '/admin.html';
        }

    } catch (error) {
        console.error('Error en el inicio de sesión:', error);
        errorMessage.textContent = 'Email o contraseña incorrectos. Inténtalo de nuevo.';
    }
});