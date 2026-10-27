=====================================================
// ZORA - TELA INICIAL, CATÁLOGO, SLIDES, CARRINHO E PESQUISA
// Versão Completa & Definitiva
// =====================================================


// =====================================================
// 1. MENU LATERAL, OVERLAY E PERFIL
// =====================================================

function obterSidebar() {
    return document.getElementById("sidebar")
        || document.querySelector(".sidebar");
}

function obterOverlay() {
    return document.getElementById("overlay")
        || document.querySelector(".overlay");
}

function sincronizarOverlay() {
    const sidebar = obterSidebar();
    const overlay = obterOverlay();
    const pedidos = document.getElementById("Pedidos");

    const menuAberto = sidebar && (
        sidebar.classList.contains("ativo")
        || sidebar.classList.contains("active")
    );

    const pedidosAberto = pedidos
        && pedidos.classList.contains("ativo");

    const algumPainelAberto = Boolean(
        menuAberto || pedidosAberto
    );

    if (overlay) {
        overlay.classList.toggle(
            "ativo",
            algumPainelAberto
        );
    }

    // Impede a rolagem da página quando um painel está aberto.
    document.body.classList.toggle(
        "painel-aberto",
        algumPainelAberto
    );
}

function showSidebar() {
    const sidebar = obterSidebar();

    if (!sidebar) {
        console.warn("ZORA: menu lateral não encontrado.");
        return;
    }

    sidebar.classList.add("ativo", "active");
    sincronizarOverlay();
}

function hideSidebar() {
    const sidebar = obterSidebar();

    if (sidebar) {
        sidebar.classList.remove("ativo", "active");
    }

    sincronizarOverlay();
}

function fecharTudo() {
    const sidebar = obterSidebar();
    const pedidos = document.getElementById("Pedidos");

    if (sidebar) {
        sidebar.classList.remove("ativo", "active");
    }

    if (pedidos) {
        pedidos.classList.remove("ativo");
    }

    // Esconde os dropdowns de busca ao fechar tudo
    const dropdownDesktop = document.getElementById("resultadoBusca");
    const dropdownMobile = document.getElementById("resultadoBuscaMobile");
    if (dropdownDesktop) dropdownDesktop.style.display = "none";
    if (dropdownMobile) dropdownMobile.style.display = "none";

    sincronizarOverlay();
}

async function abrirPerfil() {
    let usuario = null;

    if (typeof obterUsuarioLogado === "function") {
        try {
            usuario = await obterUsuarioLogado();
        } catch (erro) {
            console.error("Erro ao obter usuário:", erro);
        }
    } else {
        try {
            usuario = JSON.parse(
                localStorage.getItem("usuarioLogado") || "null"
            );
        } catch (erro) {
            usuario = null;
        }
    }

    if (usuario && (
        usuario.nome
        || usuario.email
        || usuario.id_cliente
    )) {
        const ehAdmin =
            usuario.is_admin === true
            || usuario.is_admin === 1
            || usuario.is_admin === "1"
            || usuario.nivel === "admin";

        window.location.href = ehAdmin
            ? "/TelaAdmin/admin.html"
            : "/TelaCliente/cliente.html";

    } else {
        window.location.href = "/TelaLogin/login.html";
    }
}

async function checarEAtualizarMenu() {
    if (typeof atualizarMenuUsuario === "function") {
        try {
            await atualizarMenuUsuario();
            return;
        } catch (erro) {
            console.error("Erro ao atualizar menu:", erro);
        }
    }

    let usuario = null;

    try {
        usuario = JSON.parse(
            localStorage.getItem("usuarioLogado") || "null"
        );
    } catch (erro) {
        usuario = null;
    }

    const menuDesktop = document.getElementById("menuUsuario");
    const menuMobile = document.getElementById("menuUsuarioMobile");

    let texto = "Login";

    if (usuario && (usuario.nome || usuario.email)) {
        const ehAdmin =
            usuario.is_admin === true
            || usuario.is_admin === 1
            || usuario.is_admin === "1"
            || usuario.nivel === "admin";

        if (ehAdmin) {
            texto = "Painel do Adm";
        } else {
            const primeiroNome = usuario.nome
                ? usuario.nome.split(" ")[0]
                : "Perfil";

            texto = `Olá, ${primeiroNome}`;
        }
    }

    if (menuDesktop) menuDesktop.textContent = texto;
    if (menuMobile) menuMobile.textContent = texto;
}


// =====================================================
// 2. CARROSSEL DE PROMOÇÕES (SLIDE PRINCIPAL)
// =====================================================

let slideIndiceAtual = 0;
let temporizadorSlide = null;

function mostrarSlide(indice) {
    const slides = document.querySelectorAll(".promocao-slide");
    const indicadores = document.querySelectorAll(".carousel-indicadores .indicador");

    if (!slides || slides.length === 0) return;

    if (indice >= slides.length) {
        slideIndiceAtual = 0;
    } else if (indice < 0) {
        slideIndiceAtual = slides.length - 1;
    } else {
        slideIndiceAtual = indice;
    }

    slides.forEach((slide, i) => {
        slide.classList.toggle("ativo", i === slideIndiceAtual);
    });

    if (indicadores && indicadores.length > 0) {
        indicadores.forEach((ind, i) => {
            ind.classList.toggle("ativo", i === slideIndiceAtual);
        });
    }
}

function proximoSlide() {
    mostrarSlide(slideIndiceAtual + 1);
    reiniciarTemporizadorSlide();
}

function slideAnterior() {
    mostrarSlide(slideIndiceAtual - 1);
    reiniciarTemporizadorSlide();
}

function irParaSlide(indice) {
    mostrarSlide(indice);
    reiniciarTemporizadorSlide();
}

function reiniciarTemporizadorSlide() {
    if (temporizadorSlide) clearInterval(temporizadorSlide);
    temporizadorSlide = setInterval(() => {
        mostrarSlide(slideIndiceAtual + 1);
    }, 6000); // Passa de slide automaticamente a cada 6 segundos
}


// =====================================================
// 3. CATÁLOGO DE PRODUTOS E ROLAGEM HORIZONTAL
// =====================================================

let produtosGlobais = []; // Armazena a lista de produtos carregados para uso na busca

async function carregarCatalogo() {
    const container = document.getElementById("catalogoProdutos");

    if (!container) return;

    container.innerHTML =
        "<p class='carregando'>Carregando produtos...</p>";

    try {
        const resposta = await fetch("/produtos_catalogo.php", {
            headers: {
                "Accept": "application/json"
            }
        });

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            throw new Error(
                resultado.mensagem
                || "Não foi possível carregar os produtos."
            );
        }

        produtosGlobais = Array.isArray(resultado.produtos) ? resultado.produtos : [];
        renderizarCatalogo(produtosGlobais);

    } catch (erro) {
        console.error("Erro ao carregar catálogo:", erro);
        produtosGlobais = [];

        container.innerHTML =
            "<p class='carregando'>" +
            "Não foi possível carregar os produtos no momento." +
            "</p>";
    }
}

function formatarPreco(valor) {
    const numero = Number(valor);

    return (Number.isFinite(numero) ? numero : 0)
        .toFixed(2)
        .replace(".", ",");
}

function obterImagemProduto(imagem) {
    if (!imagem) {
        return "/img/Logo%201.png";
    }

    if (/^(https?:\/\/|\/)/i.test(imagem)) {
        return imagem;
    }

    return "/img/" + encodeURIComponent(imagem);
}

function renderizarCatalogo(produtos) {
    const container = document.getElementById("catalogoProdutos");

    if (!container) return;

    container.replaceChildren();

    if (!Array.isArray(produtos) || produtos.length === 0) {
        container.innerHTML =
            "<p class='carregando'>" +
            "Nenhum produto disponível no momento." +
            "</p>";
        return;
    }

    produtos.forEach(produto => {
        const id = Number(produto.id_produto);
        const nome = String(produto.nome || "Produto ZORA");
        const preco = Number(produto.preco);
        const estoque = Number(produto.estoque);

        if (!Number.isInteger(id) || id <= 0) {
            return;
        }

        const precoValido = Number.isFinite(preco) && preco >= 0 ? preco : 0;
        const estoqueValido = Number.isFinite(estoque) ? estoque : 0;
        const imagemSrc = obterImagemProduto(produto.imagem);

        const card = document.createElement("div");
        card.className = "produto";

        const link = document.createElement("a");
        link.href = "/TelaProdutos/produtos.html?id=" + encodeURIComponent(id);

        const imagem = document.createElement("img");
        imagem.src = imagemSrc;
        imagem.alt = nome;
        imagem.loading = "lazy";

        imagem.onerror = function () {
            this.onerror = null;
            this.src = "/img/Logo%201.png";
        };

        link.appendChild(imagem);

        const titulo = document.createElement("h3");
        titulo.textContent = nome;

        const precoElemento = document.createElement("p");
        precoElemento.textContent = `R$ ${formatarPreco(precoValido)}`;

        const botao = document.createElement("button");
        botao.type = "button";

        if (estoqueValido <= 0) {
            botao.textContent = "Esgotado";
            botao.disabled = true;
            botao.style.opacity = "0.6";
            botao.style.cursor = "not-allowed";
        } else {
            botao.textContent = "Comprar";

            botao.addEventListener("click", function () {
                adicionarPedidos(
                    id,
                    nome,
                    precoValido,
                    imagemSrc,
                    estoqueValido
                );
            });
        }

        card.appendChild(link);
        card.appendChild(titulo);
        card.appendChild(precoElemento);
        card.appendChild(botao);

        container.appendChild(card);
    });
}

function scrollProdutos(direcao) {
    const container = document.getElementById("catalogoProdutos");
    if (!container) return;
    const larguraItem = 280; // Largura do card + gap
    container.scrollBy({
        left: direcao * larguraItem * 2,
        behavior: "smooth"
    });
}


// =====================================================
// 3.1. SISTEMA DE PESQUISA FUNCIONAL EM TEMPO REAL
// =====================================================

function configurarBusca() {
    const inputDesktop = document.getElementById("inputBusca");
    const dropdownDesktop = document.getElementById("resultadoBusca");

    const inputMobile = document.getElementById("inputBuscaMobile");
    const dropdownMobile = document.getElementById("resultadoBuscaMobile");

    if (inputDesktop && dropdownDesktop) {
        inputDesktop.addEventListener("input", (e) => {
            executarBusca(e.target.value, dropdownDesktop);
        });

        inputDesktop.addEventListener("focus", (e) => {
            if (e.target.value.trim().length > 0) {
                dropdownDesktop.style.display = "block";
            }
        });
    }

    if (inputMobile && dropdownMobile) {
        inputMobile.addEventListener("input", (e) => {
            executarBusca(e.target.value, dropdownMobile);
        });

        inputMobile.addEventListener("focus", (e) => {
            if (e.target.value.trim().length > 0) {
                dropdownMobile.style.display = "block";
            }
        });
    }

    // Fecha os dropdowns ao clicar fora
    document.addEventListener("click", (e) => {
        if (inputDesktop && dropdownDesktop && !inputDesktop.contains(e.target) && !dropdownDesktop.contains(e.target)) {
            dropdownDesktop.style.display = "none";
        }
        if (inputMobile && dropdownMobile && !inputMobile.contains(e.target) && !dropdownMobile.contains(e.target)) {
            dropdownMobile.style.display = "none";
        }
    });
}

function executarBusca(termo, containerDropdown) {
    const termoLimpo = termo.trim().toLowerCase();

    if (!containerDropdown) return;

    if (termoLimpo.length === 0) {
        containerDropdown.innerHTML = "";
        containerDropdown.style.display = "none";
        return;
    }

    const resultados = produtosGlobais.filter(produto => {
        const nome = String(produto.nome || "").toLowerCase();
        const descricao = String(produto.descricao || "").toLowerCase();
        const categoria = String(produto.categoria || "").toLowerCase();
        return nome.includes(termoLimpo) || descricao.includes(termoLimpo) || categoria.includes(termoLimpo);
    });

    containerDropdown.innerHTML = "";

    if (resultados.length === 0) {
        const itemVazio = document.createElement("div");
        itemVazio.className = "busca-item-vazio";
        itemVazio.textContent = "Nenhum produto encontrado";
        containerDropdown.appendChild(itemVazio);
    } else {
        resultados.forEach(produto => {
            const id = Number(produto.id_produto);
            const nome = String(produto.nome || "Produto ZORA");
            const preco = Number(produto.preco) || 0;
            const imagemSrc = obterImagemProduto(produto.imagem);

            const linkItem = document.createElement("a");
            linkItem.href = `/TelaProdutos/produtos.html?id=${encodeURIComponent(id)}`;
            linkItem.className = "busca-item-resultado";

            const img = document.createElement("img");
            img.src = imagemSrc;
            img.alt = nome;
            img.loading = "lazy";
            img.onerror = function() {
                this.onerror = null;
                this.src = "/img/Logo%201.png";
            };

            const infoDiv = document.createElement("div");
            infoDiv.className = "busca-item-info";

            const tituloEl = document.createElement("span");
            tituloEl.className = "busca-item-nome";
            tituloEl.textContent = nome;

            const precoEl = document.createElement("span");
            precoEl.className = "busca-item-preco";
            precoEl.textContent = `R$ ${formatarPreco(preco)}`;

            infoDiv.append(tituloEl, precoEl);
            linkItem.append(img, infoDiv);
            containerDropdown.appendChild(linkItem);
        });
    }

    containerDropdown.style.display = "block";
}


// =====================================================
// 4. CARRINHO DE COMPRAS
// =====================================================

let pedidosArray = [];

function carregarCarrinho() {
    try {
        const carrinhoSalvo = localStorage.getItem("carrinho");

        if (!carrinhoSalvo) {
            pedidosArray = [];
        } else {
            const dados = JSON.parse(carrinhoSalvo);

            pedidosArray = Array.isArray(dados)
                ? dados.filter(produto => (
                    produto
                    && Number.isInteger(Number(produto.id_produto))
                    && Number(produto.id_produto) > 0
                )).map(produto => ({
                    ...produto,
                    id_produto: Number(produto.id_produto),
                    preco: Math.max(0, Number(produto.preco) || 0),
                    quantidade: Math.max(
                        1,
                        Math.floor(Number(produto.quantidade) || 1)
                    ),
                    nome: String(produto.nome || "Produto ZORA"),
                    imagem: produto.imagem || "/img/Logo%201.png",
                    estoque: Number.isFinite(Number(produto.estoque)) ? Number(produto.estoque) : Infinity
                }))
                : [];
        }

    } catch (erro) {
        console.error("Erro ao carregar carrinho:", erro);
        pedidosArray = [];
    }

    salvarCarrinho();
    renderizarPedidos();
    atualizarBadge();
}

function salvarCarrinho() {
    try {
        localStorage.setItem(
            "carrinho",
            JSON.stringify(pedidosArray)
        );
        return true;

    } catch (erro) {
        console.error("Erro ao salvar carrinho:", erro);

        alert(
            "Não foi possível salvar o carrinho neste dispositivo."
        );

        return false;
    }
}

function calcularTotal() {
    return pedidosArray.reduce((total, produto) => {
        const preco = Number(produto.preco) || 0;
        const quantidade = Number(produto.quantidade) || 0;

        return total + preco * quantidade;
    }, 0);
}

function atualizarTotal() {
    const elemento = document.getElementById("total");

    if (elemento) {
        elemento.textContent = formatarPreco(calcularTotal());
    }
}

function atualizarBadge() {
    const quantidadeTotal = pedidosArray.reduce(
        (soma, produto) =>
            soma + (Number(produto.quantidade) || 0),
        0
    );

    document.querySelectorAll(".badge-carrinho").forEach(badge => {
        badge.textContent =
            quantidadeTotal > 0 ? quantidadeTotal : "";

        badge.classList.toggle("show", quantidadeTotal > 0);
    });
}

function renderizarPedidos() {
    const lista = document.getElementById("listaPedidos");

    atualizarTotal();

    if (!lista) {
        atualizarBadge();
        return;
    }

    lista.replaceChildren();

    if (pedidosArray.length === 0) {
        atualizarBadge();
        return;
    }

    pedidosArray.forEach((produto, indice) => {
        const id = Number(produto.id_produto);
        const preco = Number(produto.preco) || 0;
        const quantidade = Number(produto.quantidade) || 1;
        const imagemSrc = obterImagemProduto(produto.imagem);

        const item = document.createElement("li");
        item.className = "item-carrinho";

        const linkFoto = document.createElement("a");
        linkFoto.href =
            `/TelaProdutos/produtos.html?id=${encodeURIComponent(id)}`;
        linkFoto.className = "carrinho-foto-link";

        const foto = document.createElement("img");
        foto.src = imagemSrc;
        foto.alt = produto.nome;
        foto.className = "carrinho-foto";
        foto.loading = "lazy";

        foto.onerror = function () {
            this.onerror = null;
            this.src = "/img/Logo%201.png";
        };

        linkFoto.appendChild(foto);

        const detalhes = document.createElement("div");
        detalhes.className = "carrinho-detalhes";

        const linkNome = document.createElement("a");
        linkNome.href =
            `/TelaProdutos/produtos.html?id=${encodeURIComponent(id)}`;
        linkNome.className = "carrinho-nome";

        linkNome.textContent = produto.tamanho
            ? `${produto.nome} (${produto.tamanho})`
            : produto.nome;

        const precoUnitario = document.createElement("span");
        precoUnitario.className = "carrinho-preco-unitario";
        precoUnitario.textContent = `R$ ${formatarPreco(preco)}`;

        const qtdContainer = document.createElement("div");
        qtdContainer.className = "qtd-controle";

        const btnMenos = document.createElement("button");
        btnMenos.type = "button";
        btnMenos.className = "qtd-btn";
        btnMenos.textContent = "−";
        btnMenos.setAttribute("aria-label", "Diminuir quantidade");

        btnMenos.addEventListener("click", () => {
            alterarQuantidade(indice, -1);
        });

        const numQtd = document.createElement("span");
        numQtd.className = "qtd-numero";
        numQtd.textContent = quantidade;

        const btnMais = document.createElement("button");
        btnMais.type = "button";
        btnMais.className = "qtd-btn";
        btnMais.textContent = "+";
        btnMais.setAttribute("aria-label", "Aumentar quantidade");

        btnMais.addEvent
