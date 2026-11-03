// ===== scripts/build-seo.mjs =====
// Genera páginas estáticas por producto + sitemap + llms.txt + feed de Merchant Center
// a partir de la tabla `products` de Supabase (solo usa la anon key pública).
// Uso: node scripts/build-seo.mjs

import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.ciledreams.com.ar';
const WHATSAPP = '5491158626516';
const SUPABASE_URL = 'https://htrzdowjnnnjubjzgslc.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0cnpkb3dqbm5uanVianpnc2xjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDczMDQsImV4cCI6MjA3NzE4MzMwNH0.s95Yh34wkTbEmyjKHEMJ1GZ1KWly5-UGO_Aar25TIgg';

const STATIC_PAGES = [
  { path: '/index.html', priority: '1.0', changefreq: 'weekly' },
  { path: '/productos.html', priority: '0.9', changefreq: 'weekly' },
  { path: '/talles.html', priority: '0.7', changefreq: 'yearly' },
  { path: '/sobre-mi.html', priority: '0.5', changefreq: 'yearly' },
  { path: '/contacto.html', priority: '0.5', changefreq: 'yearly' },
];

// IMPORTANTE: debe ser idéntica a productSlug() en script.js
export function productSlug(p) {
  const base = String(p.name || 'producto')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${base}-${p.id}`;
}

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ars = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
const oneLine = (s = '') => String(s).replace(/\s+/g, ' ').trim();

// ---- Talles / stock (misma lógica que script.js) ----
function sizesOf(p) {
  if (p.category === 'Pijamas para niños') {
    return ['6', '8', '10', '12', '14', '16'].map((k) => ({ value: k, label: k, stock: p[`stock_${k}`] || 0 }));
  }
  if (['Maxitoallon', 'Lona Playera'].includes(p.category)) {
    return [{ value: 'U', label: 'Único', stock: p.stock_s || 0 }];
  }
  return [['S', '1'], ['M', '2'], ['L', '3'], ['XL', '4']].map(([k, label]) => ({
    value: k, label, stock: p[`stock_${k.toLowerCase()}`] || 0,
  }));
}
const totalStock = (p) => sizesOf(p).reduce((a, s) => a + s.stock, 0);
const priceOf = (p) => (p.promo_price && p.promo_price < p.price ? p.promo_price : p.price);

async function fetchProducts() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=id`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase respondió ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error('No se obtuvieron productos');
  return data;
}

// ---- Página de producto ----
function productPage(p, all) {
  const slug = productSlug(p);
  const url = `${SITE}/producto/${slug}/`;
  const desc = oneLine(p.description);
  const sizes = sizesOf(p);
  const stock = totalStock(p);
  const inStock = stock > 0;
  const price = priceOf(p);
  const title = `${p.name} | Pijama de modal y lycra - CileDreams`;
  const metaDesc = `${p.name}: ${desc}`.slice(0, 158) + ` Precio ${ars(price)}. Envíos a todo Argentina.`;
  const sizeOptions = sizes.filter((s) => s.stock > 0)
    .map((s) => `<option value="${s.value}">${esc(s.label)}</option>`).join('');
  const related = all.filter((o) => o.id !== p.id && o.category === p.category).slice(0, 4);
  const relatedFill = related.length < 4
    ? related.concat(all.filter((o) => o.id !== p.id && o.category !== p.category).slice(0, 4 - related.length))
    : related;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      '@id': `${url}#product`,
      name: p.name,
      description: desc,
      image: [p.image_url],
      sku: `CD-${p.id}`,
      category: p.category,
      brand: { '@type': 'Brand', name: 'CileDreams' },
      material: 'Modal y lycra',
      url,
      offers: {
        '@type': 'Offer',
        url,
        priceCurrency: 'ARS',
        price: String(price),
        itemCondition: 'https://schema.org/NewCondition',
        availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        seller: { '@type': 'Organization', name: 'CileDreams' },
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE}/index.html` },
        { '@type': 'ListItem', position: 2, name: 'Productos', item: `${SITE}/productos.html` },
        { '@type': 'ListItem', position: 3, name: p.name, item: url },
      ],
    },
  ];

  return `<!DOCTYPE html>
<html lang="es">
<head>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-EHGFCB2Q6C"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-EHGFCB2Q6C');
</script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(metaDesc)}">
    <link rel="canonical" href="${url}">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(metaDesc)}">
    <meta property="og:image" content="${esc(p.image_url)}">
    <meta property="og:url" content="${url}">
    <meta property="og:type" content="product">
    <meta property="og:site_name" content="CileDreams">
    <meta property="product:price:amount" content="${price}">
    <meta property="product:price:currency" content="ARS">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(metaDesc)}">
    <meta name="twitter:image" content="${esc(p.image_url)}">
    <link rel="stylesheet" href="/styles.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Pacifico&display=swap" rel="stylesheet">
    <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2).replace(/</g, '\\u003c')}
    </script>
</head>
<body>
    <nav class="navbar">
        <div class="container nav-container">
            <a href="/index.html" class="logo">CileDreams</a>
            <button class="menu-toggle" id="menuToggle" aria-label="Abrir menú"><span></span><span></span><span></span></button>
            <ul class="nav-menu" id="navMenu">
                <li><a href="/index.html">Inicio</a></li>
                <li><a href="/productos.html" class="active">Productos</a></li>
                <li><a href="/sobre-mi.html">Sobre Mi</a></li>
                <li><a href="/contacto.html">Contacto</a></li>
                <li><a href="/carrito.html" class="cart-link">🛒 Carrito (<span id="cartCount">0</span>)</a></li>
            </ul>
        </div>
    </nav>

    <main class="container" style="padding:2rem 1rem;">
        <nav aria-label="breadcrumb" style="margin-bottom:1rem;font-size:.9rem;">
            <a href="/index.html">Inicio</a> › <a href="/productos.html">Productos</a> › ${esc(p.name)}
        </nav>
        <article class="product-card ${inStock ? '' : 'out-of-stock'}" data-product-id="${p.id}" style="max-width:900px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem;">
            <div class="product-image js-open-modal" data-image-url="${esc(p.image_url)}" data-alt-text="${esc(p.name)}">
                <img src="${esc(p.image_url)}" alt="${esc(p.name)} - pijama CileDreams" width="600" height="600">
                ${p.badge ? `<span class="product-badge">${esc(p.badge)}</span>` : ''}
                ${inStock ? '' : '<span class="product-badge-stock">Sin Stock</span>'}
            </div>
            <div class="product-info">
                <h1 class="product-title">${esc(p.name)}</h1>
                <p class="product-category">Categoría: ${esc(p.category)}</p>
                <p class="product-description">${esc(p.description).replace(/\n/g, '<br>')}</p>
                <p class="product-price">${p.promo_price && p.promo_price < p.price ? `<s>${ars(p.price)}</s> ` : ''}${ars(price)}</p>
                <p>${inStock ? '✅ Disponible' : '❌ Sin stock por el momento'} · Envíos a todo el país · <a href="/talles.html">Guía de talles</a></p>
                <div class="product-size-selector ${inStock ? '' : 'hidden'}">
                    <label for="size-${p.id}">Talle:</label>
                    <select id="size-${p.id}" class="filter-select">${sizeOptions || '<option disabled>Sin stock</option>'}</select>
                </div>
                <div class="product-actions">
                    <button class="btn btn-primary js-add-to-cart" data-product-id="${p.id}" ${inStock ? '' : 'disabled'}>${inStock ? 'Agregar al Carrito' : 'Sin Stock'}</button>
                    <a href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hola! Me interesa el ' + p.name)}" class="btn btn-secondary" target="_blank" rel="noopener">Consultar</a>
                </div>
            </div>
        </article>

        <section style="margin-top:3rem;">
            <h2>Otros pijamas que te pueden gustar</h2>
            <ul>
${relatedFill.map((o) => `                <li><a href="/producto/${productSlug(o)}/">${esc(o.name)}</a> – ${ars(priceOf(o))}</li>`).join('\n')}
            </ul>
            <p><a href="/productos.html">Ver todos los pijamas</a></p>
        </section>
    </main>

    <footer class="footer">
        <div class="container">
            <div class="footer-bottom"><p>&copy; ${new Date().getFullYear()} CileDreams. Pijamas de modal y lycra hechos en Argentina. · <a href="/index.html">Inicio</a> · <a href="/productos.html">Productos</a> · <a href="/talles.html">Talles</a> · <a href="/contacto.html">Contacto</a></p></div>
        </div>
    </footer>
    <div id="imageModal" class="modal" style="display:none;">
        <span class="modal-close-btn" id="closeModal">&times;</span>
        <img class="modal-content" id="fullImage" alt="Imagen de producto ampliada">
    </div>
    <script type="module" src="/supabase-client.js"></script>
    <script type="module" src="/script.js"></script>
    <div id="toast-notification" class="toast"><p id="toast-message"></p></div>
</body>
</html>
`;
}

// ---- Sitemap ----
function sitemap(products, today) {
  const urls = [
    ...STATIC_PAGES.map((s) => `  <url><loc>${SITE}${s.path}</loc><lastmod>${today}</lastmod><changefreq>${s.changefreq}</changefreq><priority>${s.priority}</priority></url>`),
    ...products.map((p) => {
      const last = (p.created_at || today).slice(0, 10);
      return `  <url><loc>${SITE}/producto/${productSlug(p)}/</loc><lastmod>${last}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority><image:image><image:loc>${esc(p.image_url)}</image:loc><image:title>${esc(p.name)}</image:title></image:image></url>`;
    }),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>
`;
}

// ---- llms.txt ----
function llmsTxt(products) {
  const byCat = {};
  products.forEach((p) => (byCat[p.category] ||= []).push(p));
  const cats = Object.entries(byCat).map(([c, list]) =>
    `## ${c}\n` + list.map((p) => `- [${p.name}](${SITE}/producto/${productSlug(p)}/): ${oneLine(p.description).slice(0, 140)} Precio ${ars(priceOf(p))}${totalStock(p) > 0 ? '' : ' (sin stock)'}.`).join('\n')
  ).join('\n\n');
  return `# CileDreams

> CileDreams es una marca argentina (Ciudad de Buenos Aires) de pijamas de diseño en modal y lycra: camisolines, remerones, conjuntos de remera con short o culote, camiseros y pijamas para niños, con estampas de personajes como Stitch, Hello Kitty, Mickey, Minnie y Chimuelo. Envíos a todo el país. Ventas por la web y WhatsApp (+54 9 11 5862-6516).

## Información clave
- [Todos los productos](${SITE}/productos.html): catálogo completo.
- [Guía de talles](${SITE}/talles.html): tablas de medidas.
- [Sobre CileDreams](${SITE}/sobre-mi.html): historia de la marca.
- [Contacto](${SITE}/contacto.html): consultas y pedidos.
- Telas: modal y lycra, suaves, frescas y livianas. Moneda: pesos argentinos (ARS).
- Catálogo completo en texto: ${SITE}/llms-full.txt

${cats}
`;
}

function llmsFull(products) {
  return `# CileDreams – Catálogo completo\n\n` + products.map((p) => {
    const sizes = sizesOf(p).filter((s) => s.stock > 0).map((s) => s.label).join(', ') || 'sin stock';
    return `## ${p.name}\n- URL: ${SITE}/producto/${productSlug(p)}/\n- Categoría: ${p.category}\n- Precio: ${ars(priceOf(p))}\n- Talles disponibles: ${sizes}\n- Descripción: ${oneLine(p.description)}\n- Imagen: ${p.image_url}\n`;
  }).join('\n');
}

// ---- Feed Google Merchant Center (RSS 2.0) ----
function merchantFeed(products) {
  const items = products.map((p) => `    <item>
      <g:id>CD-${p.id}</g:id>
      <title>${esc(p.name)}</title>
      <description>${esc(oneLine(p.description))}</description>
      <link>${SITE}/producto/${productSlug(p)}/</link>
      <g:image_link>${esc(p.image_url)}</g:image_link>
      <g:availability>${totalStock(p) > 0 ? 'in_stock' : 'out_of_stock'}</g:availability>
      <g:price>${p.price}.00 ARS</g:price>${p.promo_price && p.promo_price < p.price ? `\n      <g:sale_price>${p.promo_price}.00 ARS</g:sale_price>` : ''}
      <g:brand>CileDreams</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>no</g:identifier_exists>
      <g:google_product_category>Apparel &amp; Accessories &gt; Clothing &gt; Sleepwear &amp; Loungewear</g:google_product_category>
      <g:product_type>${esc(p.category)}</g:product_type>
      <g:material>Modal y lycra</g:material>
    </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>CileDreams</title>
    <link>${SITE}</link>
    <description>Pijamas de diseño en modal y lycra</description>
${items}
  </channel>
</rss>
`;
}

async function main() {
  const products = await fetchProducts();
  // Fecha determinística (último producto cargado) para no generar cambios vacíos en cada build
  const today = products.map((p) => (p.created_at || '').slice(0, 10)).sort().pop() || '2025-11-03';

  const outDir = path.join(ROOT, 'producto');
  await rm(outDir, { recursive: true, force: true });
  for (const p of products) {
    const dir = path.join(outDir, productSlug(p));
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'index.html'), productPage(p, products));
  }
  // Lista estática de productos (rastreable sin JS) dentro de productos.html
  const prodHtml = await readFile(path.join(ROOT, 'productos.html'), 'utf-8');
  const list = '<!--SEO-LIST-START-->' + products.map((p) =>
    `<div class="product-card"><h3 class="product-title"><a href="/producto/${productSlug(p)}/">${esc(p.name)}</a></h3><p>${esc(p.category)} – ${ars(priceOf(p))}</p></div>`
  ).join('') + '<!--SEO-LIST-END-->';
  await writeFile(path.join(ROOT, 'productos.html'),
    prodHtml.replace(/<!--SEO-LIST-START-->[\s\S]*?<!--SEO-LIST-END-->/, () => list));
  await writeFile(path.join(ROOT, 'sitemap.xml'), sitemap(products, today));
  await writeFile(path.join(ROOT, 'llms.txt'), llmsTxt(products));
  await writeFile(path.join(ROOT, 'llms-full.txt'), llmsFull(products));
  await mkdir(path.join(ROOT, 'feeds'), { recursive: true });
  await writeFile(path.join(ROOT, 'feeds', 'merchant.xml'), merchantFeed(products));
  console.log(`OK: ${products.length} páginas de producto, sitemap, llms.txt, llms-full.txt y feeds/merchant.xml`);
}

main().catch((e) => { console.error('ERROR build-seo:', e.message); process.exit(1); });
