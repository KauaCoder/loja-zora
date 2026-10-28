// =====================================================
// ZORA - CATÁLOGO
// Compatível com a Tela Inicial: mesma sacola (localStorage "carrinho"),
// mesmo menu/sidebar/overlay, mesma API (/produtos_catalogo.php),
// mesmo tratamento de imagens e mesmo login (auth.js).
// =====================================================

// ---------- Utilidades ----------
function formatarPreco(valor) {
    const n = Number(valor);
    return (Number.isFinite(n) ? n : 0).toFixed(2).replace(".", ",");
}

function normalizarTexto(t) {
    return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function mostrarToast(msg) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(mostrarToast._t);
    mostrarToast._t = setTimeout(() => el.classList.remove("show"), 2200);
}

// =====================================================
// 1. MENU LATERAL, OVERLAY E PERFIL (igual à tela inicial)
// =====================================================

function obterSidebar() { return document.getElementById("sidebar") || document.querySelector(".sidebar"); }
function obterOverlay() { return document.getElementById("overlay") || document.querySelector(".overlay"); }

function sincronizarOverlay() {
    const sidebar = obterSidebar();
    const overlay = obterOverlay();
    const pedidos = document.getElementById("Pedidos");
    const filtros = document.getElementById("filtros");

    const menuAberto = sidebar && (sidebar.classList.contains("ativo") || sidebar.classList.contains("active"));
    const pedidosAberto = pedidos && pedidos.classList.contains("ativo");
    const filtrosAberto = filtros && filtros.classList.contains("aberto");
    const algum = Boolean(menuAberto || pedidosAberto || filtrosAberto);

    if (overlay) overlay.classList.toggle("ativo", algum);
    document.body.classList.toggle("painel-aberto", algum);
}

function showSidebar() {
    const s = obterSidebar();
    if (!s) return;
    s.classList.add("ativo", "active");
    sincronizarOverlay();
}

function hideSidebar() {
    const s = obterSidebar();
    if (s) s.classList.remove("ativo", "active");
    sincronizarOverlay();
}

function fecharTudo() {
    const s = obterSidebar();
    const p = document.getElementById("Pedidos");
    const f = document.getElementById("filtros");
    if (s) s.classList.remove("ativo", "active");
    if (p) p.classList.remove("ativo");
    if (f) f.classList.remove("aberto");
    sincronizarOverlay();
}

async function abrirPerfil() {
    let usuario = null;

    if (typeof obterUsuarioLogado === "function") {
        try { usuario = await obterUsuarioLogado(); } catch (e) { console.error("Erro ao obter usuário:", e); }
    } else {
        try { usuario = JSON.parse(localStorage.getItem("usuarioLogado") || "null"); } catch (e) { usuario = null; }
    }

    if (usuario && (usuario.nome || usuario.email || usuario.id_cliente)) {
        const ehAdmin = usuario.is_admin === true || usuario.is_admin === 1
            || usuario.is_admin === "1" || usuario.nivel === "admin";
        window.location.href = ehAdmin ? "/TelaAdmin/admin.html" : "/TelaCliente/cliente.html";
    } else {
        window.location.href = "/TelaLogin/login.html";
    }
}

async function checarEAtualizarMenu() {
    if (typeof atualizarMenuUsuario === "function") {
        try { await atualizarMenuUsuario(); return; } catch (e) { console.error("Erro ao atualizar menu:", e); }
    }

    let usuario = null;
    try { usuario = JSON.parse(localStorage.getItem("usuarioLogado") || "null"); } catch (e) { usuario = null; }

    let texto = "Login";
    if (usuario && (usuario.nome || usuario.email)) {
        const ehAdmin = usuario.is_admin === true || usuario.is_admin === 1
            || usuario.is_admin === "1" || usuario.nivel === "admin";
        texto = ehAdmin ? "Painel do Adm" : `Olá, ${usuario.nome ? usuario.nome.split(" ")[0] : "Perfil"}`;
    }

    const d = document.getElementById("menuUsuario");
    const m = document.getElementById("menuUsuarioMobile");
    if (d) d.textContent = texto;
    if (m) m.textContent = texto;
}

// =====================================================
// 2. IMAGENS (mesma lógica híbrida /img/ e /img/roupazora/)
// =====================================================

function obterImagemProduto(imagem) {
    if (!imagem || String(imagem).trim() === "" || imagem === "null" || imagem === "undefined") {
        return "/img/Logo 1.png";
    }
    const src = String(imagem).trim();

    if (src.startsWith("/")) return src;

    if (src.startsWith("http://") || src.startsWith("https://")) {
        if (src.includes("susercontent.com") || src.includes("shopee") || src.includes("down-br")) {
            return `https://wsrv.nl/?url=${encodeURIComponent(src)}`;
        }
        return src;
    }

    if (src.startsWith("roupazora/")) return `/img/${src}`;
    return `/img/roupazora/${src}`;
}

window.gerenciarFalhaImagem = function (img, productId) {
    if (!img) return;
    const tentativa = Number(img.dataset.tentativa || 0);
    img.dataset.tentativa = tentativa + 1;

    if (tentativa === 0 && img.src.includes("/img/roupazora/")) {
        img.src = `/img/${img.src.split("/img/roupazora/").pop()}`;
        return;
    }
    if (tentativa === 1 && productId) { img.src = `/img/roupazora/${productId}.jpeg`; return; }
    if (tentativa === 2 && productId) { img.src = `/img/roupazora/img${productId}.jpeg`; return; }

    img.onerror = null;
    img.src = "/img/Logo 1.png";
};

// =====================================================
// 3. SACOLA (mesmo formato do localStorage da tela inicial)
// =====================================================

let pedidosArray = [];

function carregarCarrinho() {
    try {
        const salvo = localStorage.getItem("carrinho");
        const dados = salvo ? JSON.parse(salvo) : [];

        pedidosArray = Array.isArray(dados)
            ? dados.filter(p => p && Number.isInteger(Number(p.id_produto)) && Number(p.id_produto) > 0)
                .map(p => ({
                    ...p,
                    id_produto: Number(p.id_produto),
                    preco: Math.max(0, Number(p.preco) || 0),
                    quantidade: Math.max(1, Math.floor(Number(p.quantidade) || 1)),
                    nome: String(p.nome || p.nm_produto || "Produto ZORA"),
                    imagem: p.imagem || "/img/Logo 1.png",
                    estoque: Number.isFinite(Number(p.estoque)) ? Number(p.estoque) : Infinity
                }))
            : [];
    } catch (e) {
        console.error("Erro ao carregar carrinho:", e);
        pedidosArray = [];
    }
    salvarCarrinho();
    renderizarPedidos();
}

function salvarCarrinho() {
    try {
        localStorage.setItem("carrinho", JSON.stringify(pedidosArray));
        return true;
    } catch (e) {
        console.error("Erro ao salvar carrinho:", e);
        alert("Não foi possível salvar o carrinho neste dispositivo.");
        return false;
    }
}

function calcularTotal() {
    return pedidosArray.reduce((t, p) => t + (Number(p.preco) || 0) * (Number(p.quantidade) || 0), 0);
}

function atualizarBadge() {
    const qtd = pedidosArray.reduce((s, p) => s + (Number(p.quantidade) || 0), 0);
    document.querySelectorAll(".badge-carrinho").forEach(b => {
        b.textContent = qtd > 0 ? qtd : "";
        b.classList.toggle("show", qtd > 0);
    });
}

function renderizarPedidos() {
    const lista = document.getElementById("listaPedidos");
    const total = document.getElementById("total");
    if (total) total.textContent = formatarPreco(calcularTotal());

    atualizarBadge();
    if (!lista) return;
    lista.replaceChildren();

    pedidosArray.forEach((produto, indice) => {
        const id = Number(produto.id_produto);
        const preco = Number(produto.preco) || 0;
        const quantidade = Number(produto.quantidade) || 1;
        const url = `/TelaProdutos/produtos.html?id=${encodeURIComponent(id)}`;

        const item = document.createElement("li");
        item.className = "item-carrinho";

        const linkFoto = document.createElement("a");
        linkFoto.href = url;
        linkFoto.className = "carrinho-foto-link";
        const foto = document.createElement("img");
        foto.src = obterImagemProduto(produto.imagem);
        foto.alt = produto.nome;
        foto.className = "carrinho-foto";
        foto.loading = "lazy";
        foto.onerror = function () { window.gerenciarFalhaImagem(this, id); };
        linkFoto.appendChild(foto);

        const detalhes = document.createElement("div");
        detalhes.className = "carrinho-detalhes";

        const linkNome = document.createElement("a");
        linkNome.href = url;
        linkNome.className = "carrinho-nome";
        linkNome.textContent = produto.tamanho ? `${produto.nome} (${produto.tamanho})` : produto.nome;

        const unit = document.createElement("span");
        unit.className = "carrinho-preco-unitario";
        unit.textContent = `R$ ${formatarPreco(preco)}`;

        const qtdBox = document.createElement("div");
        qtdBox.className = "qtd-controle";

        const menos = document.createElement("button");
        menos.type = "button";
        menos.className = "qtd-btn";
        menos.textContent = "−";
        menos.setAttribute("aria-label", "Diminuir quantidade");
        menos.addEventListener("click", () => alterarQuantidade(indice, -1));

        const num = document.createElement("span");
        num.className = "qtd-numero";
        num.textContent = quantidade;

        const mais = document.createElement("button");
        mais.type = "button";
        mais.className = "qtd-btn";
        mais.textContent = "+";
        mais.setAttribute("aria-label", "Aumentar quantidade");
        mais.addEventListener("click", () => alterarQuantidade(indice, 1));

        qtdBox.append(menos, num, mais);
        detalhes.append(linkNome, unit, qtdBox);

        const acoes = document.createElement("div");
        acoes.className = "carrinho-acoes";
        const sub = document.createElement("span");
        sub.className = "carrinho-subtotal";
        sub.textContent = `R$ ${formatarPreco(preco * quantidade)}`;
        const rem = document.createElement("button");
        rem.type = "button";
        rem.className = "remover-item";
        rem.textContent = "🗑";
        rem.title = "Remover produto";
        rem.setAttribute("aria-label", "Remover produto");
        rem.addEventListener("click", () => removerPedido(indice));
        acoes.append(sub, rem);

        item.append(linkFoto, detalhes, acoes);
        lista.appendChild(item);
    });
}

function adicionarPedidos(idProduto, nome, preco, imagem, estoqueDisponivel) {
    const id = Number(idProduto);
    const valor = Number(preco);

    if (!Number.isInteger(id) || id <= 0 || !Number.isFinite(valor) || valor < 0) {
        alert("Não foi possível adicionar este produto.");
        return;
    }

    const existente = pedidosArray.find(p => Number(p.id_produto) === id);
    const atual = existente ? Number(existente.quantidade) || 0 : 0;
    const limite = Number.isFinite(Number(estoqueDisponivel)) ? Number(estoqueDisponivel) : Infinity;

    if (atual + 1 > limite) {
        alert(`Estoque insuficiente. Disponíveis: ${limite} unidade(s).`);
        return;
    }

    if (existente) {
        existente.quantidade = atual + 1;
        existente.estoque = limite;
    } else {
        pedidosArray.push({
            id_produto: id,
            nome: String(nome || "Produto ZORA"),
            preco: valor,
            imagem: imagem || "/img/Logo 1.png",
            quantidade: 1,
            estoque: limite
        });
    }

    if (!salvarCarrinho()) return;
    renderizarPedidos();
    abrirPedidos();
}

function alterarQuantidade(indice, delta) {
    const p = pedidosArray[indice];
    if (!p) return;

    const nova = (Number(p.quantidade) || 1) + delta;
    if (nova <= 0) { removerPedido(indice); return; }

    if (delta > 0 && Number.isFinite(Number(p.estoque)) && nova > p.estoque) {
        alert(`Quantidade máxima atingida. Disponíveis: ${p.estoque} unidade(s).`);
        return;
    }

    p.quantidade = nova;
    if (!salvarCarrinho()) return;
    renderizarPedidos();
}

function removerPedido(indice) {
    if (indice < 0 || indice >= pedidosArray.length) return;
    pedidosArray.splice(indice, 1);
    if (!salvarCarrinho()) return;
    renderizarPedidos();
}

function abrirPedidos() {
    const p = document.getElementById("Pedidos");
    if (!p) return;
    const s = obterSidebar();
    const f = document.getElementById("filtros");
    if (s) s.classList.remove("ativo", "active");
    if (f) f.classList.remove("aberto");
    p.classList.add("ativo");
    sincronizarOverlay();
}

function fecharPedidos() {
    const p = document.getElementById("Pedidos");
    if (p) p.classList.remove("ativo");
    sincronizarOverlay();
}

function pagarPedido() {
    // Relê a sacola salva (garante dados atuais mesmo se vierem de outra aba/página)
    if (pedidosArray.length === 0) {
        try {
            const salvo = JSON.parse(localStorage.getItem("carrinho") || "[]");
            if (Array.isArray(salvo)) pedidosArray = salvo;
        } catch (e) { /* ignora */ }
    }

    if (pedidosArray.length === 0) {
        alert("Seu carrinho está vazio.");
        return;
    }

    try {
        localStorage.setItem("carrinho", JSON.stringify(pedidosArray));
        localStorage.setItem("pedidos", JSON.stringify(pedidosArray));
        localStorage.setItem("totalPedido", calcularTotal());
    } catch (e) {
        alert("Não foi possível salvar o pedido neste dispositivo.");
        return;
    }

    window.location.href = "/TelaEntrega/entrega.html";
}

// Garante o clique do botão mesmo sem o onclick inline
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.querySelector(".PedidosPagar button");
    if (btn) {
        btn.removeAttribute("onclick");
        btn.addEventListener("click", pagarPedido);
    }
});

// =====================================================
// 4. CATÁLOGO: DADOS, FAVORITOS, FILTROS E ORDENAÇÃO
// =====================================================

const LIMITE_INICIAL = 12;
const LIMITE_PASSO = 12;

let produtos = [];
let favoritos = new Set();
let somenteFavoritos = false;
let limiteVisivel = LIMITE_INICIAL;
let colunas = 3;
let busca = "";

function carregarFavoritos() {
    try {
        const salvo = JSON.parse(localStorage.getItem("favoritos") || "[]");
        favoritos = new Set((Array.isArray(salvo) ? salvo : []).map(Number));
    } catch (e) {
        favoritos = new Set();
    }
}

function salvarFavoritos() {
    try { localStorage.setItem("favoritos", JSON.stringify([...favoritos])); } catch (e) { /* ignora */ }
}

function limparCategoria(c) {
    return String(c || "Geral").replace("Categoria:", "").trim() || "Geral";
}

async function carregarProdutos() {
    const grid = document.getElementById("productGrid");
    if (grid) grid.innerHTML = "<p class='carregando'>Carregando produtos...</p>";

    const rotas = ["/produtos_catalogo.php", "../produtos_catalogo.php", "../../produtos_catalogo.php", "/Telainicial/produtos_catalogo.php", "./produtos_catalogo.php"];
    let lista = null;

    for (const rota of rotas) {
        try {
            const r = await fetch(rota, { headers: { "Accept": "application/json" } });
            if (!r.ok) continue;
            const json = await r.json();
            if (json && json.sucesso && Array.isArray(json.produtos)) { lista = json.produtos; break; }
        } catch (e) { /* tenta a próxima rota */ }
    }

    if (!lista) {
        produtos = [];
        if (grid) grid.innerHTML = "<p class='carregando'>Não foi possível carregar os produtos no momento.</p>";
        return;
    }

    produtos = lista.map((p, ordem) => {
        const id = Number(p.id_produto || p.id || 0);
        const estoque = p.qtd_item !== undefined ? Number(p.qtd_item) : (p.estoque !== undefined ? Number(p.estoque) : 0);
        const antigo = Number(p.preco_antigo);
        return {
            id,
            ordem,
            nome: String(p.nm_produto || p.nome || p.nome_produto || "Produto ZORA"),
            categoria: limparCategoria(p.categoria),
            preco: Number(p.preco || p.valor || 0),
            precoAntigo: Number.isFinite(antigo) && antigo > 0 ? antigo : null,
            estoque: Number.isFinite(estoque) ? estoque : 0,
            descricao: String(p.descricao || ""),
            imagem: obterImagemProduto(p.imagem || p.foto)
        };
    }).filter(p => Number.isInteger(p.id) && p.id > 0);

    montarFiltrosCategoria();
    aplicarParametrosURL();
    renderizarCatalogo();
}

function categoriasSelecionadas() {
    return [...document.querySelectorAll('input[name="category"]:checked')].map(el => el.value);
}

function montarFiltrosCategoria() {
    const holder = document.getElementById("categoryFilters");
    if (!holder) return;

    const contagem = new Map();
    produtos.forEach(p => contagem.set(p.categoria, (contagem.get(p.categoria) || 0) + 1));

    holder.replaceChildren();
    if (contagem.size === 0) {
        holder.innerHTML = "<p class='filtro-vazio'>Sem categorias.</p>";
        return;
    }

    [...contagem.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR")).forEach(([cat, qtd]) => {
        const label = document.createElement("label");
        label.className = "filtro-check";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.name = "category";
        input.value = cat;
        input.addEventListener("change", () => { limiteVisivel = LIMITE_INICIAL; renderizarCatalogo(); });
        const contador = document.createElement("span");
        contador.textContent = qtd;
        label.append(input, document.createTextNode(" " + cat), contador);
        holder.appendChild(label);
    });
}

function aplicarParametrosURL() {
    const params = new URLSearchParams(window.location.search);

    const q = params.get("q") || params.get("busca");
    if (q) definirBusca(q, false);

    const cat = params.get("categoria");
    if (cat) {
        const alvo = normalizarTexto(cat);
        document.querySelectorAll('input[name="category"]').forEach(el => {
            if (normalizarTexto(el.value) === alvo) el.checked = true;
        });
    }
}

function definirBusca(valor, render = true) {
    busca = valor;
    const d = document.getElementById("inputBusca");
    const m = document.getElementById("inputBuscaMobile");
    if (d && d.value !== valor) d.value = valor;
    if (m && m.value !== valor) m.value = valor;
    if (render) { limiteVisivel = LIMITE_INICIAL; renderizarCatalogo(); }
}

function produtosFiltrados() {
    const cats = categoriasSelecionadas();
    const minEl = document.getElementById("minPrice");
    const maxEl = document.getElementById("maxPrice");
    const min = minEl && minEl.value !== "" ? Number(minEl.value) : 0;
    const max = maxEl && maxEl.value !== "" ? Number(maxEl.value) : Infinity;
    const soEstoque = document.getElementById("onlyStock")?.checked;
    const q = normalizarTexto(busca);

    const lista = produtos.filter(p =>
        (!cats.length || cats.includes(p.categoria)) &&
        p.preco >= min && p.preco <= max &&
        (!soEstoque || p.estoque > 0) &&
        (!q || normalizarTexto(`${p.nome} ${p.categoria} ${p.descricao}`).includes(q)) &&
        (!somenteFavoritos || favoritos.has(p.id))
    );

    const ordem = document.getElementById("sortSelect")?.value;
    if (ordem === "price-low") lista.sort((a, b) => a.preco - b.preco);
    else if (ordem === "price-high") lista.sort((a, b) => b.preco - a.preco);
    else if (ordem === "name") lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    else lista.sort((a, b) => a.ordem - b.ordem);

    return lista;
}

// =====================================================
// 5. RENDERIZAÇÃO
// =====================================================

function criarCard(p) {
    const semEstoque = p.estoque <= 0;

    const card = document.createElement("div");
    card.className = "produto" + (semEstoque ? " sem-estoque" : "");

    if (semEstoque) {
        const selo = document.createElement("span");
        selo.className = "selo-produto esgotado";
        selo.textContent = "ESGOTADO";
        card.appendChild(selo);
    } else if (p.precoAntigo && p.precoAntigo > p.preco) {
        const selo = document.createElement("span");
        selo.className = "selo-produto";
        selo.textContent = "OFERTA";
        card.appendChild(selo);
    }

    const fav = document.createElement("button");
    fav.type = "button";
    const ativo = favoritos.has(p.id);
    fav.className = "btn-favorito" + (ativo ? " ativo" : "");
    fav.textContent = ativo ? "♥" : "♡";
    fav.setAttribute("aria-label", ativo ? "Remover dos favoritos" : "Adicionar aos favoritos");
    fav.addEventListener("click", () => alternarFavorito(p.id));
    card.appendChild(fav);

    const link = document.createElement("a");
    link.href = `/TelaProdutos/produtos.html?id=${encodeURIComponent(p.id)}`;
    const img = document.createElement("img");
    img.src = p.imagem;
    img.alt = p.nome;
    img.loading = "lazy";
    img.dataset.productId = p.id;
    img.onerror = function () { window.gerenciarFalhaImagem(this, p.id); };
    link.appendChild(img);

    const titulo = document.createElement("h3");
    titulo.textContent = p.nome;

    const preco = document.createElement("p");
    preco.className = "preco";
    if (p.precoAntigo && p.precoAntigo > p.preco) {
        const antigo = document.createElement("span");
        antigo.className = "preco-antigo";
        antigo.textContent = `R$ ${formatarPreco(p.precoAntigo)}`;
        preco.appendChild(antigo);
    }
    preco.appendChild(document.createTextNode(`R$ ${formatarPreco(p.preco)}`));

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "btn-comprar";
    if (semEstoque) {
        botao.textContent = "Esgotado";
        botao.disabled = true;
        botao.style.opacity = "0.6";
        botao.style.cursor = "not-allowed";
    } else {
        botao.textContent = "Comprar";
        botao.addEventListener("click", () => {
            adicionarPedidos(p.id, p.nome, p.preco, p.imagem, p.estoque);
        });
    }

    card.append(link, titulo, preco, botao);
    return card;
}

function renderizarCatalogo() {
    const grid = document.getElementById("productGrid");
    if (!grid) return;

    const lista = produtosFiltrados();
    const visiveis = lista.slice(0, limiteVisivel);

    grid.className = `catalogo-grid colunas-${colunas}`;
    grid.replaceChildren(...visiveis.map(criarCard));

    const contador = document.getElementById("resultCount");
    if (contador) contador.textContent = lista.length.toLocaleString("pt-BR");

    const favCount = document.getElementById("favoriteCount");
    if (favCount) favCount.textContent = favoritos.size;

    const vazio = document.getElementById("emptyState");
    if (vazio) vazio.hidden = lista.length !== 0 || produtos.length === 0;

    const mais = document.getElementById("loadMore");
    if (mais) mais.hidden = lista.length <= limiteVisivel;

    const ponto = document.getElementById("filterDot");
    if (ponto) {
        const minV = document.getElementById("minPrice")?.value || "";
        const maxV = document.getElementById("maxPrice")?.value || "";
        const soEstoque = document.getElementById("onlyStock")?.checked;
        ponto.classList.toggle("visivel", categoriasSelecionadas().length > 0 || minV !== "" || maxV !== "" || soEstoque);
    }

    renderizarChips();
}

function renderizarChips() {
    const holder = document.getElementById("activeFilters");
    if (!holder) return;

    const chips = [];

    categoriasSelecionadas().forEach(cat => chips.push({
        label: cat,
        remover: () => {
            document.querySelectorAll('input[name="category"]').forEach(el => { if (el.value === cat) el.checked = false; });
        }
    }));

    const minV = document.getElementById("minPrice")?.value;
    const maxV = document.getElementById("maxPrice")?.value;
    if (minV) chips.push({ label: `A partir de R$ ${minV}`, remover: () => { document.getElementById("minPrice").value = ""; } });
    if (maxV) chips.push({ label: `Até R$ ${maxV}`, remover: () => { document.getElementById("maxPrice").value = ""; } });

    if (document.getElementById("onlyStock")?.checked) {
        chips.push({ label: "Em estoque", remover: () => { document.getElementById("onlyStock").checked = false; } });
    }
    if (busca.trim()) chips.push({ label: `Busca: ${busca.trim()}`, remover: () => definirBusca("", false) });
    if (somenteFavoritos) chips.push({ label: "Favoritos", remover: () => definirFavoritosAtivo(false) });

    holder.replaceChildren();
    chips.forEach(c => {
        const span = document.createElement("span");
        span.className = "chip-filtro";
        span.append(document.createTextNode(c.label));
        const x = document.createElement("button");
        x.type = "button";
        x.textContent = "×";
        x.setAttribute("aria-label", `Remover filtro ${c.label}`);
        x.addEventListener("click", () => { c.remover(); limiteVisivel = LIMITE_INICIAL; renderizarCatalogo(); });
        span.appendChild(x);
        holder.appendChild(span);
    });
}

function alternarFavorito(id) {
    if (favoritos.has(id)) {
        favoritos.delete(id);
        mostrarToast("Removido dos favoritos");
    } else {
        favoritos.add(id);
        mostrarToast("Adicionado aos favoritos");
    }
    salvarFavoritos();
    renderizarCatalogo();
}

function definirFavoritosAtivo(ativo) {
    somenteFavoritos = ativo;
    const btn = document.getElementById("favToggle");
    if (btn) {
        btn.classList.toggle("ativo", ativo);
        btn.setAttribute("aria-pressed", String(ativo));
    }
}

function limparFiltros() {
    document.querySelectorAll('input[name="category"]').forEach(el => { el.checked = false; });
    ["minPrice", "maxPrice"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
    const so = document.getElementById("onlyStock");
    if (so) so.checked = false;
    definirFavoritosAtivo(false);
    definirBusca("", false);
    limiteVisivel = LIMITE_INICIAL;
    renderizarCatalogo();
}

// =====================================================
// 6. EVENTOS E INICIALIZAÇÃO
// =====================================================

function configurarEventos() {
    // Busca (desktop e mobile sincronizadas, filtra o próprio catálogo)
    ["inputBusca", "inputBuscaMobile"].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("input", e => definirBusca(e.target.value));
        el.addEventListener("keydown", e => {
            if (e.key === "Enter") {
                e.preventDefault();
                if (id === "inputBuscaMobile") hideSidebar();
                document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
            }
        });
    });

    document.querySelector(".btn-lupa")?.addEventListener("click", () => {
        document.getElementById("inputBusca")?.focus();
        document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
    });

    // Filtros
    document.getElementById("filterToggle")?.addEventListener("click", () => {
        document.getElementById("filtros")?.classList.add("aberto");
        sincronizarOverlay();
    });

    document.getElementById("applyMobile")?.addEventListener("click", () => { renderizarCatalogo(); fecharTudo(); });
    document.getElementById("clearFilters")?.addEventListener("click", limparFiltros);
    document.getElementById("emptyReset")?.addEventListener("click", limparFiltros);

    ["minPrice", "maxPrice"].forEach(id => {
        document.getElementById(id)?.addEventListener("input", () => { limiteVisivel = LIMITE_INICIAL; renderizarCatalogo(); });
    });
    document.getElementById("onlyStock")?.addEventListener("change", () => { limiteVisivel = LIMITE_INICIAL; renderizarCatalogo(); });

    // Ordenação
    document.getElementById("sortSelect")?.addEventListener("change", () => { limiteVisivel = LIMITE_INICIAL; renderizarCatalogo(); });

    // Favoritos
    document.getElementById("favToggle")?.addEventListener("click", () => {
        definirFavoritosAtivo(!somenteFavoritos);
        limiteVisivel = LIMITE_INICIAL;
        renderizarCatalogo();
        mostrarToast(somenteFavoritos ? "Mostrando seus favoritos" : "Mostrando todos os produtos");
    });

    // Visualização em colunas
    const botoesVisual = document.querySelectorAll(".view-button");
    botoesVisual.forEach(btn => btn.addEventListener("click", () => {
        colunas = Number(btn.dataset.columns);
        botoesVisual.forEach(b => b.classList.toggle("ativo", b === btn));
        renderizarCatalogo();
    }));
    document.querySelector(`.view-button[data-columns="${colunas}"]`)?.classList.add("ativo");

    // Carregar mais
    document.getElementById("loadMore")?.addEventListener("click", () => {
        limiteVisivel += LIMITE_PASSO;
        renderizarCatalogo();
    });

    // Overlay e ESC
    obterOverlay()?.addEventListener("click", fecharTudo);
    document.addEventListener("keydown", e => { if (e.key === "Escape") fecharTudo(); });
}

document.addEventListener("DOMContentLoaded", () => {
    const ano = document.getElementById("year");
    if (ano) ano.textContent = new Date().getFullYear();

    carregarFavoritos();
    carregarCarrinho();
    checarEAtualizarMenu();
    configurarEventos();
    carregarProdutos();
});
