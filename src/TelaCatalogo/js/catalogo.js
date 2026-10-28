const products = [
  {id:1,name:"Vestido Infantil de Tule Bordado",category:"Vestidos",price:159.99,oldPrice:199.99,sizes:["P","M","G"],age:"4 a 12 anos",promo:"35% OFF - CUPOM",badge:"MAIS VENDIDO",image:"img/vestido-tule.svg"},
  {id:2,name:"Vestido Infantil de Algodão",category:"Vestidos",price:159.99,oldPrice:null,sizes:["P","M","G","GG"],age:"4 a 12 anos",promo:"ESQUENTABLACK",badge:"NOVO",image:"img/vestido-algodao.svg"},
  {id:3,name:"Short Saia Infantil de Sarja",category:"Saias",price:129.99,oldPrice:149.99,sizes:["P","M","G"],age:"4 a 12 anos",promo:"35% OFF - CUPOM",badge:null,image:"img/short-saia.svg"},
  {id:4,name:"Short Saia Infantil Cós Elástico",category:"Saias",price:79.99,oldPrice:null,sizes:["P","M","G","GG"],age:"4 a 12 anos",promo:"35% OFF - CUPOM",badge:null,image:"img/saia.svg"},
  {id:5,name:"Blusa Básica de Algodão",category:"Blusas",price:59.99,oldPrice:null,sizes:["P","M","G","GG"],age:"Tamanhos P ao GG",promo:"Leve 2 com desconto",badge:null,image:"img/blusa.svg"},
  {id:6,name:"Conjunto Blusa e Short",category:"Conjuntos",price:119.99,oldPrice:139.99,sizes:["P","M","G"],age:"4 a 12 anos",promo:"Oferta especial",badge:"OFERTA",image:"img/conjunto.svg"},
  {id:7,name:"Vestido Floral de Verão",category:"Vestidos",price:139.99,oldPrice:null,sizes:["P","M","G","GG"],age:"4 a 12 anos",promo:"Nova coleção",badge:"NOVO",image:"img/vestido-floral.svg"},
  {id:8,name:"Blusa com Manga Bufante",category:"Blusas",price:69.99,oldPrice:null,sizes:["P","M","G"],age:"Tamanhos P ao G",promo:"35% OFF - CUPOM",badge:null,image:"img/blusa.svg"},
  {id:9,name:"Saia Plissada Estampada",category:"Saias",price:89.99,oldPrice:109.99,sizes:["P","M","G","GG"],age:"4 a 12 anos",promo:"Oferta especial",badge:null,image:"img/saia.svg"},
  {id:10,name:"Conjunto Casual de Verão",category:"Conjuntos",price:149.99,oldPrice:null,sizes:["P","M","G"],age:"Tamanhos P ao G",promo:"Nova coleção",badge:null,image:"img/conjunto.svg"},
  {id:11,name:"Blusa Regata Texturizada",category:"Blusas",price:49.99,oldPrice:null,sizes:["P","M","G","GG"],age:"Tamanhos P ao GG",promo:"Preço especial",badge:null,image:"img/blusa.svg"},
  {id:12,name:"Vestido Festa Infantil",category:"Vestidos",price:189.99,oldPrice:229.99,sizes:["P","M","G"],age:"4 a 12 anos",promo:"35% OFF - CUPOM",badge:"DESTAQUE",image:"img/vestido-tule.svg"}
];

const grid = document.querySelector("#productGrid");
const filters = document.querySelector("#filters");
const overlay = document.querySelector("#overlay");
const drawer = document.querySelector("#cartDrawer");
const cartItemsEl = document.querySelector("#cartItems");
const toastEl = document.querySelector("#toast");
let favorites = new Set();
let cart = [];
let visibleLimit = 8;
let currentColumns = 2;
let favoritesOnly = false;
let toastTimer;

const money = value => value.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const checkedValues = name => [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(el=>el.value);

function filteredProducts() {
  const categories = checkedValues("category");
  const sizes = checkedValues("size");
  const query = document.querySelector("#searchInput").value.trim().toLocaleLowerCase("pt-BR");
  const min = document.querySelector("#minPrice").value === "" ? 0 : Number(document.querySelector("#minPrice").value);
  const max = document.querySelector("#maxPrice").value === "" ? Infinity : Number(document.querySelector("#maxPrice").value);
  let list = products.filter(p =>
    (!categories.length || categories.includes(p.category)) &&
    (!sizes.length || sizes.some(s => p.sizes.includes(s))) &&
    p.price >= min && p.price <= max &&
    (!query || `${p.name} ${p.category}`.toLocaleLowerCase("pt-BR").includes(query)) &&
    (!favoritesOnly || favorites.has(p.id))
  );
  const sort = document.querySelector("#sortSelect").value;
  if (sort === "price-low") list.sort((a,b)=>a.price-b.price);
  if (sort === "price-high") list.sort((a,b)=>b.price-a.price);
  if (sort === "name") list.sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
  return list;
}

function productCard(p) {
  const isFavorite = favorites.has(p.id);
  return `<article class="product-card">
    <div class="product-image-wrap">
      <img class="product-image" src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.hidden=false">
      <div class="product-image-fallback" hidden>ZORA</div>
      ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ""}
      <button class="favorite-button ${isFavorite ? "active" : ""}" data-favorite="${p.id}" aria-label="${isFavorite ? "Remover dos" : "Adicionar aos"} favoritos"><svg viewBox="0 0 24 24"><path d="M20.8 8.7c0 5.1-8.8 10.1-8.8 10.1S3.2 13.8 3.2 8.7A4.7 4.7 0 0 1 12 6.5a4.7 4.7 0 0 1 8.8 2.2Z"/></svg></button>
    </div>
    <div class="product-info">
      <div class="product-title-row"><div class="product-name" title="${p.name}">${p.name}</div><button class="favorite-button ${isFavorite ? "active" : ""}" data-favorite="${p.id}" aria-label="Favoritar ${p.name}"><svg viewBox="0 0 24 24"><path d="M20.8 8.7c0 5.1-8.8 10.1-8.8 10.1S3.2 13.8 3.2 8.7A4.7 4.7 0 0 1 12 6.5a4.7 4.7 0 0 1 8.8 2.2Z"/></svg></button></div>
      <p class="product-price">${money(p.price)} ${p.oldPrice ? `<span class="old-price">${money(p.oldPrice)}</span>` : ""}</p>
      <div class="product-detail"><p>${p.age}</p><p class="promo">${p.promo}</p></div>
      <button class="add-cart" data-add="${p.id}">Adicionar à sacola</button>
    </div>
  </article>`;
}

function renderProducts() {
  const list = filteredProducts();
  document.querySelector("#resultCount").textContent = list.length.toLocaleString("pt-BR");
  document.querySelector("#favoriteCount").textContent = favorites.size;
  document.querySelector("#cartCount").textContent = cart.reduce((sum,item)=>sum+item.qty,0);
  document.querySelector("#filterDot").classList.toggle("visible", checkedValues("category").length>0 || checkedValues("size").length>0 || document.querySelector("#minPrice").value!=="" || document.querySelector("#maxPrice").value!=="");
  grid.className = `product-grid columns-${currentColumns}`;
  grid.innerHTML = list.slice(0,visibleLimit).map(productCard).join("");
  document.querySelector("#emptyState").hidden = list.length !== 0;
  document.querySelector("#loadMore").hidden = list.length <= visibleLimit;
  renderActiveFilters();
}

function renderActiveFilters() {
  const holder = document.querySelector("#activeFilters");
  const active = [
    ...[...document.querySelectorAll('input[name="category"]:checked')].map(el=>({label:el.value,clear:()=>{el.checked=false;renderProducts()}})),
    ...[...document.querySelectorAll('input[name="size"]:checked')].map(el=>({label:`Tam. ${el.value}`,clear:()=>{el.checked=false;renderProducts()}})),
    ...(favoritesOnly ? [{label:"Favoritos",clear:()=>{favoritesOnly=false;renderProducts()}}] : [])
  ];
  holder.innerHTML = active.map((item,i)=>`<span class="filter-chip">${item.label}<button data-clear-chip="${i}" aria-label="Remover filtro ${item.label}">×</button></span>`).join("");
  holder.querySelectorAll("[data-clear-chip]").forEach(btn=>btn.addEventListener("click",()=>active[Number(btn.dataset.clearChip)].clear()));
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>toastEl.classList.remove("show"),2200);
}
function openPanel(panel) {
  overlay.classList.add("open");
  if(panel === "cart") {
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden","false");
  } else filters.classList.add("open");
}
function closePanels() {
  overlay.classList.remove("open");
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden","true");
  filters.classList.remove("open");
}
function renderCart() {
  if(!cart.length) cartItemsEl.innerHTML = '<p class="cart-empty">Sua sacola está vazia.</p>';
  else cartItemsEl.innerHTML = cart.map(item=>`<div class="cart-line">
    <img class="cart-thumb" src="${item.image}" alt="">
    <div><h3>${item.name}</h3><p>${money(item.price)}</p><div class="quantity-controls"><button data-qty="${item.id}" data-delta="-1" aria-label="Diminuir quantidade">−</button><span>${item.qty}</span><button data-qty="${item.id}" data-delta="1" aria-label="Aumentar quantidade">+</button></div></div>
    <button class="remove-line" data-remove="${item.id}" aria-label="Remover produto">×</button>
  </div>`).join("");
  document.querySelector("#cartTotal").textContent = money(cart.reduce((sum,item)=>sum+item.price*item.qty,0));
  document.querySelector("#cartCount").textContent = cart.reduce((sum,item)=>sum+item.qty,0);
}
grid.addEventListener("click", e=>{
  const fav = e.target.closest("[data-favorite]");
  if(fav) {
    const id=Number(fav.dataset.favorite);
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    renderProducts();
    if(favoritesOnly) showToast(favorites.has(id)?"Adicionado aos favoritos":"Removido dos favoritos");
    return;
  }
  const add = e.target.closest("[data-add]");
  if(add) {
    const p=products.find(item=>item.id===Number(add.dataset.add));
    const existing=cart.find(item=>item.id===p.id);
    existing ? existing.qty++ : cart.push({...p,qty:1});
    renderCart(); renderProducts(); showToast("Produto adicionado à sacola");
  }
});
document.querySelector("#filterToggle").addEventListener("click",()=>openPanel("filters"));
document.querySelector("#openCart").addEventListener("click",()=>{renderCart();openPanel("cart")});
document.querySelector("#openFavorites").addEventListener("click",()=>{
  favoritesOnly=!favoritesOnly;
  visibleLimit=8;
  renderProducts();
  document.querySelector("#catalogo").scrollIntoView({behavior:"smooth"});
  showToast(favoritesOnly?"Mostrando seus favoritos":"Mostrando todos os produtos");
});
document.querySelector("#openSearch").addEventListener("click",()=>{
  const panel=document.querySelector("#searchPanel");
  panel.classList.toggle("open");
  if(panel.classList.contains("open")) document.querySelector("#searchInput").focus();
});
document.querySelector("#searchPanel").addEventListener("submit",e=>{e.preventDefault();visibleLimit=8;renderProducts()});
document.querySelector("#sortSelect").addEventListener("change",()=>{visibleLimit=8;renderProducts()});
document.querySelectorAll(".view-button").forEach(btn=>btn.addEventListener("click",()=>{
  currentColumns=Number(btn.dataset.columns);
  document.querySelectorAll(".view-button").forEach(b=>b.classList.toggle("active",b===btn));
  renderProducts();
}));
document.querySelectorAll('input[name="category"],input[name="size"]').forEach(el=>el.addEventListener("change",()=>{visibleLimit=8;renderProducts()}));
document.querySelector("#applyPrice").addEventListener("click",()=>{visibleLimit=8;renderProducts()});
document.querySelector("#applyMobile").addEventListener("click",()=>{renderProducts();closePanels()});
document.querySelector("#clearFilters").addEventListener("click",clearFilters);
document.querySelector("#emptyReset").addEventListener("click",clearFilters);
document.querySelector("#loadMore").addEventListener("click",()=>{visibleLimit+=4;renderProducts()});
function clearFilters(){
  document.querySelectorAll('input[name="category"],input[name="size"]').forEach(el=>el.checked=false);
  document.querySelector("#minPrice").value="";
  document.querySelector("#maxPrice").value="";
  document.querySelector("#searchInput").value="";
  favoritesOnly=false;visibleLimit=8;renderProducts();
}
overlay.addEventListener("click",closePanels);
document.querySelectorAll("[data-close]").forEach(btn=>btn.addEventListener("click",closePanels));
cartItemsEl.addEventListener("click",e=>{
  const qty=e.target.closest("[data-qty]");
  const remove=e.target.closest("[data-remove]");
  if(qty){
    const item=cart.find(i=>i.id===Number(qty.dataset.qty));
    item.qty+=Number(qty.dataset.delta);
    if(item.qty<=0)cart=cart.filter(i=>i.id!==item.id);
    renderCart();renderProducts();
  }
  if(remove){cart=cart.filter(i=>i.id!==Number(remove.dataset.remove));renderCart();renderProducts()}
});
document.querySelector("#checkout").addEventListener("click",()=>{
  if(!cart.length){showToast("Adicione produtos à sacola primeiro.");return}
  showToast("Demonstração: conecte aqui o checkout da loja.");
});
document.querySelector("#year").textContent=new Date().getFullYear();
renderProducts();
