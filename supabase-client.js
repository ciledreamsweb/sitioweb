// 1. Configura tus credenciales aquí (COPIA LAS QUE YA TENÍAS)
const SUPABASE_URL = 'https://htrzdowjnnnjubjzgslc.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0cnpkb3dqbm5uanVianpnc2xjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDczMDQsImV4cCI6MjA3NzE4MzMwNH0.s95Yh34wkTbEmyjKHEMJ1GZ1KWly5-UGO_Aar25TIgg';

// 2. Verificación de seguridad para saber si el script del HTML cargó
if (!window.supabase) {
    console.error("CRÍTICO: La librería de Supabase no se cargó. Revisa que hayas puesto el script <script src='...'> en el <head> de tu HTML.");
}

// 3. Creamos el cliente usando la variable global que inyectó el script del HTML
// Nota: Usamos window.supabase.createClient en lugar de importar createClient
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 4. Exportamos el cliente para que script.js, admin.js y carrito.js lo puedan usar
export const supabase = client;