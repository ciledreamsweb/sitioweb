import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Reemplaza con la URL y la clave anónima de tu proyecto de Supabase
const supabaseUrl = 'https://htrzdowjnnnjubjzgslc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0cnpkb3dqbm5uanVianpnc2xjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDczMDQsImV4cCI6MjA3NzE4MzMwNH0.s95Yh34wkTbEmyjKHEMJ1GZ1KWly5-UGO_Aar25TIgg';

// Exporta el cliente para usarlo en otros archivos
export const supabase = createClient(supabaseUrl, supabaseKey);