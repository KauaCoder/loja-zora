// =====================================================
// ZORA - CATÁLOGO, FILTROS, FAVORITOS E SACOLA
// Localização: TelaCatalogo/js/catalogo.js
// =====================================================

let products = [];
let favorites = new Set();
let cart = [];
let visibleLimit = 500;
let currentColumns = 2;
let favoritesOnly = false;
let toastTimer;

const grid = document.querySelector("#productGrid");
const filters = document.querySelector("#filters");
const overlay = document.querySelector("#overlay");
const drawer = document.querySelector("#cartDrawer");
const cartItemsEl = document.querySelector("#cartItems");
const toastEl = document.querySelector("#toast");

const money = value => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const checkedValues = name => [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(el => el.value);

function tratarCaminhoImagem(imgSrc, id) {
  if (!imgSrc) return `/img/img${id || 1}.jpeg`;
  if (imgSrc.startsWith("http://") || imgSrc.startsWith("https://") || imgSrc.startsWith("/")) {
    return imgSrc;
  }
  return `/img/${imgSrc}`;
}

async function carregarProdutosServidor() {
  try {
    let resposta = await fetch("/produtos_catalogo.php", {
      headers: { "Accept": "application/json" }
    });

    if (!resposta.ok) {
      resposta = await fetch("../produtos_catalogo.php", {
        headers: { "Accept": "application/json" }
      });
    }

    if (!resposta.ok) {
      resposta = await fetch("../../produtos_catalogo.php", {
        headers: { "Accept": "application/json" }
      });
    }

    const resultado = await resposta.json();

    if (resultado && resultado.sucesso && Array.isArray(resultado.produtos) && resultado.produtos.length > 0) {
      products = resultado.produtos.map(p => {
        const idProd = Number(p.id_produto);
        const nomeProd = p.nm_produto || p.nome || "Produto ZORA";
        const precoProd = Number(p.preco) || 0;
        const estoqueProd = p.qtd_item !== undefined ? Number(p.qtd_item) : (p.estoque !== undefined ? Number(p.estoque) : 10);
        
        const catBruta = p.categoria || "Geral";
        const cat = catBruta.replace("Categoria: ", "").trim();

        let tamanhos = ["P", "M", "G", "GG"];
        if (cat.toLowerCase().includes("calça") || cat.toLowerCase().includes("saia") || cat.toLowerCase().includes("calcas") || cat.toLowerCase().includes("saias")) {
          tamanhos = ["36", "38", "40", "42", "44"];
        }

        return {
          id: idProd,
          name: nomeProd,
          category: cat,
          price: precoProd,
          oldPrice: p.preco_antigo ? Number(p.preco_antigo) : null,
          sizes: tamanhos,
          age: "Coleção ZORA",
          promo: "Oferta Especial",
          badge: estoqueProd > 0 ? null : "ESGOTADO",
          image: tratarCaminhoImagem(p.imagem, idProd)
        };
      });

      renderProducts();
    }
  } catch (erro) {
    console.warn("Aviso ao carregar produtos no catálogo:", erro);
  }
}

function filteredProducts() {
  const categories = checkedValues("category");
  const sizes = checkedValues("size");
  const searchInput = document.querySelector("#searchInput");
  const query = searchInput ? searchInput.value.trim().toLocaleLowerCase("pt-BR") : "";
  
  const minInput = document.querySelector("#minPrice");
  const maxInput = document.querySelector("#maxPrice");
  const min = minInput && minInput.value !== "" ? Number(minInput.value) : 0;
  const max = maxInput && maxInput.value !== "" ? Number(maxInput.value) : Infinity;

  let list = products.filter(p =>
    (!categories.length || categories.some(c => p.category.toLowerCase().includes(c.toLowerCase()))) &&
    (!sizes.length || sizes.some(s => p.sizes.includes(s))) &&
    p.price >= min && p.price <= max &&
    (!query || `${p.name} ${p.category}`.toLocaleLowerCase("pt-BR").includes(query)) &&
    (!favoritesOnly || favorites.has(p.id))
  );

  const sortSelect = document.querySelector("#sortSelect");
  const sort = sortSelect ? sortSelect.value : "";
  if (sort === "price-low") list.sort((a, b) => a.price - b.price);
  if (sort === "price-high") list.sort((a, b) => b.price - a.price);
  if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  
  return list;
}

function productCard(p) {
  const isFavorite = favorites.has(p.id);
  return `<article class="product-card">
    <div class="product-image-wrap">
      <a href="/TelaProdutos/produtos.html?id=${p.id}">
        <img class="product-image" src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.onerror=null;this.src='/img/Logo 1.png'">
      </a>
      <div class="product-image-fallback" hidden>ZORA</div>
      ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ""}
      <button class="favorite-button ${isFavorite ? "active" : ""}" data-favorite="${p.id}" aria-label="${isFavorite ? "Remover dos" : "Adicionar aos"} favoritos">
        <svg viewBox="0 0 24 24"><path d="M20.8 8.7c0 5.1-8.8 10.1-8.8 10.1S3.2 13.8 3.2 8.7A4.7 4.7 0 0 1 12 6.5a4.7 4.7 0 0 1 8.8 2.2Z"/></svg>
      </button>
    </div>
    <div class="product-info">
      <div class="product-title-row">
        <a href="/TelaProdutos/produtos.html?id=${p.id}" class="product-name" title="${p.name}">${p.name}</a>
        <button class="favorite-button ${isFavorite ? "active" : ""}" data-favorite="${p.id}" aria-label="Favoritar ${p.name}">
          <svg viewBox="0 0 24 24"><path d="M20.8 8.7c0 5.1-8.8 10.1-8.8 10.1S3.2 13.8 3.2 8.7A4.7 4.7 0 0 1 12 6.5a4.7 4.7 0 0 1 8.8 2.2Z"/></svg>
        </button>
      </div>
      <p class="product-price">${money(p.price)} ${p.oldPrice ? `<span class="old-price">${money(p.oldPrice)}</span>` : ""}</p>
      <div class="product-detail"><p>${p.age}</p><p class="promo">${p.promo}</p></div>
      <button class="add-cart" data-add="${p.id}">Adicionar à sacola</button>
    </div>
  </article>`;
}

function renderProducts() {
  const gridEl = document.querySelector("#productGrid") || grid;
  if (!gridEl) return;

  const list = filteredProducts();

  const elResultCount = document.querySelector("#resultCount");
  if (elResultCount) elResultCount.textContent = list.length.toLocaleString("pt-BR");

  const elFavCount = document.querySelector("#favoriteCount");
  if (elFavCount) elFavCount.textContent = favorites.size;

  const elCartCount = document.querySelector("#cartCount");
  if (elCartCount) elCartCount.textContent = cart.reduce((sum, item) => sum + item.qty, 0);

  const filterDot = document.querySelector("#filterDot");
  if (filterDot) {
    const minVal = document.querySelector("#minPrice") ? document.querySelector("#minPrice").value : "";
    const maxVal = document.querySelector("#maxPrice") ? document.querySelector("#maxPrice").value : "";
    filterDot.classList.toggle("visible", checkedValues("category").length > 0 || checkedValues("size").length > 0 || minVal !== "" || maxVal !== "");
  }

  gridEl.className = `product-grid columns-${currentColumns}`;
  gridEl.innerHTML = list.slice(0, visibleLimit).map(productCard).join("");

  const emptyState = document.querySelector("#emptyState");
  if (emptyState) emptyState.hidden = list.length !== 0;

  const loadMore = document.querySelector("#loadMore");
  if (loadMore) loadMore.hidden = list.length <= visibleLimit;

  renderActiveFilters();
}

function renderActiveFilters() {
  const holder = document.querySelector("#activeFilters");
  if (!holder) return;

  const active = [
    ...[...document.querySelectorAll('input[name="category"]:checked')].map(el => ({ label: el.value, clear: () => { el.checked = false; renderProducts(); } })),
    ...[...document.querySelectorAll('input[name="size"]:checked')].map(el => ({ label: `Tam. ${el.value}`, clear: () => { el.checked = false; renderProducts(); } })),
    ...(favoritesOnly ? [{ label: "Favoritos", clear: () => { favoritesOnly = false; renderProducts(); } }] : [])
  ];

  holder.innerHTML = active.map((item, i) => `<span class="filter-chip">${item.label}<button data-clear-chip="${i}" aria-label="Remover filtro ${item.label}">×</button></span>`).join("");
  holder.querySelectorAll("[data-clear-chip]").forEach(btn => btn.addEventListener("click", () => active[Number(btn.dataset.clearChip)].clear()));
}

function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function openPanel(panel) {
  if (overlay) overlay.classList.add("open");
  if (panel === "cart" && drawer) {
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
  } else if (filters) {
    filters.classList.add("open");
  }
}

function closePanels() {
  if (overlay) overlay.classList.remove("open");
  if (drawer) {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  }
  if (filters) filters.classList.remove("open");
}

function renderCart() {
  if (!cartItemsEl) return;

  if (!cart.length) {
    cartItemsEl.innerHTML = '<p class="cart-empty">Sua sacola está vazia.</p>';
  } else {
    cartItemsEl.innerHTML = cart.map(item => `<div class="cart-line">
      <img class="cart-thumb" src="${item.image}" alt="${item.name}">
      <div>
        <h3>${item.name}</h3>
        <p>${money(item.price)}</p>
        <div class="quantity-controls">
          <button data-qty="${item.id}" data-delta="-1" aria-label="Diminuir quantidade">−</button>
          <span>${item.qty}</span>
          <button data-qty="${item.id}" data-delta="1" aria-label="Aumentar quantidade">+</button>
        </div>
      </div>
      <button class="remove-line" data-remove="${item.id}" aria-label="Remover produto">×</button>
    </div>`).join("");
  }

  const elCartTotal = document.querySelector("#cartTotal");
  if (elCartTotal) elCartTotal.textContent = money(cart.reduce((sum, item) => sum + item.price * item.qty, 0));

  const elCartCount = document.querySelector("#cartCount");
  if (elCartCount) elCartCount.textContent = cart.reduce((sum, item) => sum + item.qty, 0);

  localStorage.setItem("carrinho", JSON.stringify(cart.map(i => ({
    id_produto: i.id,
    nome: i.name,
    preco: i.price,
    quantidade: i.qty,
    imagem: i.image
  }))));
}

function carregarCarrinhoSalvo() {
  const salvo = localStorage.getItem("carrinho");
  if (salvo) {
    try {
      const parsed = JSON.parse(salvo);
      if (Array.isArray(parsed)) {
        cart = parsed.map(i => ({
          id: Number(i.id_produto || i.id),
          name: i.nome || i.name,
          price: Number(i.preco || i.price),
          qty: Number(i.quantidade || i.qty || 1),
          image: i.imagem || i.image || "/img/Logo 1.png"
        }));
      }
    } catch (e) {
      cart = [];
    }
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const gridEl = document.querySelector("#productGrid");

  if (gridEl) {
    gridEl.addEventListener("click", e => {
      const fav = e.target.closest("[data-favorite]");
      if (fav) {
        const id = Number(fav.dataset.favorite);
        favorites.has(id) ? favorites.delete(id) : favorites.add(id);
        renderProducts();
        showToast(favorites.has(id) ? "Adicionado aos favoritos" : "Removido dos favoritos");
        return;
      }

      const add = e.target.closest("[data-add]");
      if (add) {
        const p = products.find(item => item.id === Number(add.dataset.add));
        if (!p) return;
        const existing = cart.find(item => item.id === p.id);
        existing ? existing.qty++ : cart.push({ ...p, qty: 1 });
        renderCart();
        renderProducts();
        showToast("Produto adicionado à sacola");
      }
    });
  }

  const filterToggle = document.querySelector("#filterToggle");
  if (filterToggle) filterToggle.addEventListener("click", () => openPanel("filters"));

  const openCart = document.querySelector("#openCart");
  if (openCart) openCart.addEventListener("click", () => { renderCart(); openPanel("cart"); });

  const openFavorites = document.querySelector("#openFavorites");
  if (openFavorites) openFavorites.addEventListener("click", () => {
    favoritesOnly = !favoritesOnly;
    visibleLimit = 500;
    renderProducts();
    const cat = document.querySelector("#catalogo");
    if (cat) cat.scrollIntoView({ behavior: "smooth" });
    showToast(favoritesOnly ? "Mostrando seus favoritos" : "Mostrando todos os produtos");
  });

  const openSearch = document.querySelector("#openSearch");
  if (openSearch) openSearch.addEventListener("click", () => {
    const panel = document.querySelector("#searchPanel");
    if (panel) {
      panel.classList.toggle("open");
      if (panel.classList.contains("open")) {
        const input = document.querySelector("#searchInput");
        if (input) input.focus();
      }
    }
  });

  const searchPanel = document.querySelector("#searchPanel");
  if (searchPanel) searchPanel.addEventListener("submit", e => { e.preventDefault(); visibleLimit = 500; renderProducts(); });

  const sortSelect = document.querySelector("#sortSelect");
  if (sortSelect) sortSelect.addEventListener("change", () => { visibleLimit = 500; renderProducts(); });

  document.querySelectorAll(".view-button").forEach(btn => btn.addEventListener("click", () => {
    currentColumns = Number(btn.dataset.columns);
    document.querySelectorAll(".view-button").forEach(b => b.classList.toggle("active", b === btn));
    renderProducts();
  }));

  document.querySelectorAll('input[name="category"],input[name="size"]').forEach(el => el.addEventListener("change", () => { visibleLimit = 500; renderProducts(); }));

  const applyPrice = document.querySelector("#applyPrice");
  if (applyPrice) applyPrice.addEventListener("click", () => { visibleLimit = 500; renderProducts(); });

  const applyMobile = document.querySelector("#applyMobile");
  if (applyMobile) applyMobile.addEventListener("click", () => { renderProducts(); closePanels(); });

  const clearFiltersBtn = document.querySelector("#clearFilters");
  if (clearFiltersBtn) clearFiltersBtn.addEventListener("click", clearFilters);

  const emptyReset = document.querySelector("#emptyReset");
  if (emptyReset) emptyReset.addEventListener("click", clearFilters);

  const loadMore = document.querySelector("#loadMore");
  if (loadMore) loadMore.addEventListener("click", () => { visibleLimit += 8; renderProducts(); });

  if (overlay) overlay.addEventListener("click", closePanels);
  document.querySelectorAll("[data-close]").forEach(btn => btn.addEventListener("click", closePanels));

  if (cartItemsEl) {
    cartItemsEl.addEventListener("click", e => {
      const qty = e.target.closest("[data-qty]");
      const remove = e.target.closest("[data-remove]");
      if (qty) {
        const item = cart.find(i => i.id === Number(qty.dataset.qty));
        if (item) {
          item.qty += Number(qty.dataset.delta);
          if (item.qty <= 0) cart = cart.filter(i => i.id !== item.id);
          renderCart();
          renderProducts();
        }
      }
      if (remove) {
        cart = cart.filter(i => i.id !== Number(remove.dataset.remove));
        renderCart();
        renderProducts();
      }
    });
  }

  const checkoutBtn = document.querySelector("#checkout");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
      if (!cart.length) {
        showToast("Adicione produtos à sacola primeiro.");
        return;
      }
      window.location.href = "/TelaEntrega/entrega.html";
    });
  }

  const yearEl = document.querySelector("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Inicialização encadeada após o DOM estar pronto
  carregarCarrinhoSalvo();
  carregarProdutosServidor();
});

function clearFilters() {
  document.querySelectorAll('input[name="category"],input[name="size"]').forEach(el => el.checked = false);
  const minP = document.querySelector("#minPrice");
  const maxP = document.querySelector("#maxPrice");
  const sIn = document.querySelector("#searchInput");
  if (minP) minP.value = "";
  if (maxP) maxP.value = "";
  if (sIn) sIn.value = "";
  favoritesOnly = false;
  visibleLimit = 500;
  renderProducts();
}
