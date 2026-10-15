// =====================================================
// ZORA - TELA INICIAL & CARRINHO DE PEDIDOS (COMPLETO)
// =====================================================

// MENU LATERAL & OVERLAY (MOBILE)
function showSidebar() {
    const sidebar = document.getElementById("sidebar") || document.querySelector(".sidebar");
    const overlay = document.getElementById("overlay");

    if (sidebar) {
        sidebar.style.display = "flex";
        sidebar.classList.add("ativo", "active");
    }
    if (overlay) {
        overlay.classList.add("ativo");
    }
}

function hideSidebar() {
    const sidebar = document.getElementById("sidebar") || document.querySelector(".sidebar");
    const overlay = document.getElementById("overlay");

    if (sidebar) {
        sidebar.style.display = "none";
        sidebar.classList.remove("ativo", "active");
    }

    const pedidos = document.getElementById("Pedidos");
    if (overlay && (!pedidos || !pedidos.classList.contains("ativo"))) {
        overlay.classList.remove("ativo");
    }
}

function fecharTudo() {
    hideSidebar();
    fecharPedidos();
    const overlay = document.getElementById("overlay");
    if (overlay) overlay.classList.remove("ativo");
}

async function abrirPerfil() {
    let usuario = null;

    if (typeof obterUsuarioLogado === "function") {
        usuario = await obterUsuarioLogado();
    } else {
        const dadosLocais = localStorage.getItem("usuarioLogado");
        if (dadosLocais) {
            try {
                usuario = JSON.parse(dadosLocais);
            } catch (e) {
                usuario = null;
            }
        }
    }

    if (usuario && (usuario.nome || usuario.email || usuario.id_cliente)) {
        const ehAdmin = usuario.is_admin === true || usuario.is_admin === 1 || usuario.is_admin === "1" || usuario.nivel === "admin";

        if (ehAdmin) {
            window.location.href = "/TelaAdmin/admin.html";
        } else {
            // CORRIGIDO: Redirecionamento correto para a tela do cliente
            window.location.href = "/TelaCliente/cliente.html";
        }
    } else {
        window.location.href = "/TelaLogin/login.html";
    }
}

// ATUALIZAÇÃO DO MENU
async function checarEAtualizarMenu() {
    if (typeof atualizarMenuUsuario === "function") {
        await atualizarMenuUsuario();
        return;
    }

    let usuario = null;
    const dadosLocais = localStorage.getItem("usuarioLogado");
    if (dadosLocais) {
        try {
            usuario = JSON.parse(dadosLocais);
        } catch (e) {
            usuario = null;
        }
    }

    const menuDesktop = document.getElementById("menuUsuario");
    const menuMobile = document.getElementById("menuUsuarioMobile");

    if (usuario && (usuario.nome || usuario.email)) {
        const ehAdmin = usuario.is_admin === true || usuario.is_admin === 1 || usuario.is_admin === "1" || usuario.nivel === "admin";

        if (ehAdmin) {
            if (menuDesktop) menuDesktop.textContent = "📊 Dashboard Adm";
            if (menuMobile) menuMobile.textContent = "📊 Dashboard Adm";
        } else {
            const primeiroNome = usuario.nome ? usuario.nome.split(" ")[0] : "Perfil";
            if (menuDesktop) menuDesktop.textContent = `Olá, ${primeiroNome}`;
            if (menuMobile) menuMobile.textContent = `Olá, ${primeiroNome}`;
        }
    } else {
        if (menuDesktop) menuDesktop.textContent = "Login";
        if (menuMobile) menuMobile.textContent = "Login";
    }
}

// CATÁLOGO DO POSTGRESQL
async function carregarCatalogo() {
    const container = document.getElementById("catalogoProdutos");
    if (!container) return;

    container.innerHTML = "<p class='carregando'>Carregando produtos...</p>";

    try {
        const resposta = await fetch("/produtos_catalogo.php");
        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            throw new Error(resultado.mensagem || "Não foi possível carregar os produtos.");
        }

        renderizarCatalogo(resultado.produtos);
    } catch (erro) {
        console.error("Erro ao carregar catálogo:", erro);
        container.innerHTML = "<p class='carregando'>Não foi possível carregar os produtos no momento.</p>";
    }
}

function renderizarCatalogo(produtos) {
    const container = document.getElementById("catalogoProdutos");
    if (!container) return;

    container.innerHTML = "";

    if (!Array.isArray(produtos) || produtos.length === 0) {
        container.innerHTML = "<p class='carregando'>Nenhum produto disponível no momento.</p>";
        return;
    }

    produtos.forEach(produto => {
        const id = Number(produto.id_produto);
        const nome = produto.nome || "Produto ZORA";
        const preco = Number(produto.preco) || 0;
        const estoque = Number(produto.estoque) || 0;
        const imagemSrc = produto.imagem ? `/img/${produto.imagem}` : "/img/Logo 1.png";

        const card = document.createElement("div");
        card.className = "produto";

        const link = document.createElement("a");
        link.href = `/TelaProdutos/produtos.html?id=${id}`;

        const imagem = document.createElement("img");
        imagem.src = imagemSrc;
        imagem.alt = nome;
        imagem.onerror = function () {
            this.onerror = null;
            this.src = "/img/Logo 1.png";
        };

        link.appendChild(imagem);

        const titulo = document.createElement("h3");
        titulo.textContent = nome;

        const precoElemento = document.createElement("p");
        precoElemento.textContent = `R$ ${preco.toFixed(2).replace(".", ",")}`;

        const botao = document.createElement("button");
        botao.type = "button";

        if (estoque <= 0) {
            botao.textContent = "Esgotado";
            botao.disabled = true;
            botao.style.opacity = "0.6";
            botao.style.cursor = "not-allowed";
        } else {
            botao.textContent = "Comprar";
            botao.addEventListener("click", function () {
                adicionarPedidos(id, nome, preco, imagemSrc);
            });
        }

        card.appendChild(link);
        card.appendChild(titulo);
        card.appendChild(precoElemento);
        card.appendChild(botao);

        container.appendChild(card);
    });
}

async function obterEstoqueBD(idProduto) {
    try {
        const resposta = await fetch(`/consultar_estoque.php?id=${idProduto}`);
        const resultado = await resposta.json();
        if (resposta.ok && resultado.sucesso) {
            return Number(resultado.estoque);
        }
    } catch (erro) {
        console.error("Erro ao verificar estoque do produto:", idProduto, erro);
    }
    return null;
}

// CARRINHO DE PEDIDOS
let pedidosArray = [];

function carregarCarrinho() {
    const carrinhoSalvo = localStorage.getItem("carrinho");
    if (!carrinhoSalvo) {
        pedidosArray = [];
        atualizarTotal();
        atualizarBadge();
        renderizarPedidos();
        return;
    }

    try {
        pedidosArray = JSON.parse(carrinhoSalvo);
        if (!Array.isArray(pedidosArray)) pedidosArray = [];
    } catch (erro) {
        console.error("Erro ao carregar carrinho:", erro);
        pedidosArray = [];
    }

    renderizarPedidos();
    atualizarBadge();
}

function salvarCarrinho() {
    localStorage.setItem("carrinho", JSON.stringify(pedidosArray));
}

function calcularTotal() {
    return pedidosArray.reduce((total, produto) => {
        const preco = Number(produto.preco) || 0;
        const quantidade = Number(produto.quantidade) || 1;
        return total + (preco * quantidade);
    }, 0);
}

function renderizarPedidos() {
    const lista = document.getElementById("listaPedidos");
    if (!lista) return;

    lista.innerHTML = "";

    if (pedidosArray.length === 0) {
        atualizarTotal();
        return;
    }

    pedidosArray.forEach((produto, indice) => {
        const id = Number(produto.id_produto);
        const preco = Number(produto.preco) || 0;
        const quantidade = Number(produto.quantidade) || 1;
        const imagemSrc = produto.imagem || "/img/Logo 1.png";

        const item = document.createElement("li");
        item.className = "item-carrinho";

        const linkFoto = document.createElement("a");
        linkFoto.href = `/TelaProdutos/produtos.html?id=${id}`;
        linkFoto.className = "carrinho-foto-link";

        const foto = document.createElement("img");
        foto.src = imagemSrc;
        foto.alt = produto.nome;
        foto.className = "carrinho-foto";
        foto.onerror = function () {
            this.onerror = null;
            this.src = "/img/Logo 1.png";
        };
        linkFoto.appendChild(foto);

        const detalhes = document.createElement("div");
        detalhes.className = "carrinho-detalhes";

        const linkNome = document.createElement("a");
        linkNome.href = `/TelaProdutos/produtos.html?id=${id}`;
        linkNome.className = "carrinho-nome";
        linkNome.textContent = produto.nome;

        const precoUnitario = document.createElement("span");
        precoUnitario.className = "carrinho-preco-unitario";
        precoUnitario.textContent = `R$ ${preco.toFixed(2).replace(".", ",")}`;

        const qtdContainer = document.createElement("div");
        qtdContainer.className = "qtd-controle";

        const btnMenos = document.createElement("button");
        btnMenos.type = "button";
        btnMenos.className = "qtd-btn";
        btnMenos.textContent = "-";
        btnMenos.addEventListener("click", () => alterarQuantidade(indice, -1));

        const numQtd = document.createElement("span");
        numQtd.className = "qtd-numero";
        numQtd.textContent = quantidade;

        const btnMais = document.createElement("button");
        btnMais.type = "button";
        btnMais.className = "qtd-btn";
        btnMais.textContent = "+";
        btnMais.addEventListener("click", () => alterarQuantidade(indice, 1));

        qtdContainer.appendChild(btnMenos);
        qtdContainer.appendChild(numQtd);
        qtdContainer.appendChild(btnMais);

        detalhes.appendChild(linkNome);
        detalhes.appendChild(precoUnitario);
        detalhes.appendChild(qtdContainer);

        const acoes = document.createElement("div");
        acoes.className = "carrinho-acoes";

        const subtotal = document.createElement("span");
        subtotal.className = "carrinho-subtotal";
        subtotal.textContent = `R$ ${(preco * quantidade).toFixed(2).replace(".", ",")}`;

        const btnRemover = document.createElement("button");
        btnRemover.type = "button";
        btnRemover.className = "remover-item";
        btnRemover.innerHTML = "🗑";
        btnRemover.title = "Remover produto";
        btnRemover.addEventListener("click", () => removerPedido(indice));

        acoes.appendChild(subtotal);
        acoes.appendChild(btnRemover);

        item.appendChild(linkFoto);
        item.appendChild(detalhes);
        item.appendChild(acoes);

        lista.appendChild(item);
    });

    atualizarTotal();
}

async function adicionarPedidos(idProduto, nome, preco, imagem) {
    const id = Number(idProduto);
    const valor = Number(preco);

    if (!Number.isInteger(id) || id <= 0) {
        alert("Não foi possível adicionar este produto.");
        return;
    }

    const produtoExistente = pedidosArray.find(p => Number(p.id_produto) === id);
    const qtdAtual = produtoExistente ? Number(produtoExistente.quantidade) : 0;

    const estoqueDisponivel = await obterEstoqueBD(id);

    if (estoqueDisponivel !== null && (qtdAtual + 1) > estoqueDisponivel) {
        alert(`Desculpe, apenas ${estoqueDisponivel} unidade(s) disponível(is) em estoque.`);
        return;
    }

    if (produtoExistente) {
        produtoExistente.quantidade = qtdAtual + 1;
    } else {
        pedidosArray.push({
            id_produto: id,
            nome: nome,
            preco: valor,
            imagem: imagem || "/img/Logo 1.png",
            quantidade: 1
        });
    }

    salvarCarrinho();
    renderizarPedidos();
    atualizarBadge();
    abrirPedidos();
}

async function alterarQuantidade(indice, delta) {
    const produto = pedidosArray[indice];
    if (!produto) return;

    const novaQuantidade = (Number(produto.quantidade) || 1) + delta;

    if (delta > 0) {
        const estoqueDisponivel = await obterEstoqueBD(produto.id_produto);

        if (estoqueDisponivel !== null && novaQuantidade > estoqueDisponivel) {
            alert(`Quantidade máxima em estoque atingida (${estoqueDisponivel} unidades disponíveis).`);
            return;
        }
    }

    produto.quantidade = novaQuantidade;

    if (produto.quantidade <= 0) {
        pedidosArray.splice(indice, 1);
    }

    salvarCarrinho();
    renderizarPedidos();
    atualizarBadge();
}

function removerPedido(indice) {
    if (indice < 0 || indice >= pedidosArray.length) return;

    pedidosArray.splice(indice, 1);
    salvarCarrinho();
    renderizarPedidos();
    atualizarBadge();
}

function atualizarTotal() {
    const total = calcularTotal();
    const elemento = document.getElementById("total");
    if (elemento) {
        elemento.textContent = total.toFixed(2).replace(".", ",");
    }
}

function atualizarBadge() {
    const quantidadeTotal = pedidosArray.reduce(
        (soma, p) => soma + (Number(p.quantidade) || 0), 0
    );

    document.querySelectorAll(".badge-carrinho").forEach(badge => {
        if (quantidadeTotal > 0) {
            badge.textContent = quantidadeTotal;
            badge.classList.add("show");
        } else {
            badge.textContent = "";
            badge.classList.remove("show");
        }
    });
}

function abrirPedidos() {
    const pedidos = document.getElementById("Pedidos");
    if (pedidos) {
        pedidos.classList.add("ativo");
    }
    const overlay = document.getElementById("overlay");
    if (overlay) overlay.classList.add("ativo");
}

function fecharPedidos() {
    const pedidos = document.getElementById("Pedidos");
    if (pedidos) {
        pedidos.classList.remove("ativo");
    }
    const overlay = document.getElementById("overlay");
    const sidebar = document.getElementById("sidebar") || document.querySelector(".sidebar");
    if (overlay && (!sidebar || sidebar.style.display !== "flex")) {
        overlay.classList.remove("ativo");
    }
}

function scrollProdutos(direcao) {
    const container = document.getElementById("catalogoProdutos");
    if (container) {
        const scrollAmount = container.clientWidth * 0.6;
        container.scrollBy({ left: direcao * scrollAmount, behavior: "smooth" });
    }
}

async function pagarPedido() {
    if (!pedidosArray || pedidosArray.length === 0) {
        alert("Seu carrinho está vazio.");
        return;
    }

    let estoqueInvalido = false;

    for (let i = 0; i < pedidosArray.length; i++) {
        const item = pedidosArray[i];
        const estoqueBD = await obterEstoqueBD(item.id_produto);

        if (estoqueBD !== null && item.quantidade > estoqueBD) {
            if (estoqueBD === 0) {
                alert(`O produto "${item.nome}" esgotou no estoque.`);
            } else {
                alert(`A quantidade solicitada para "${item.nome}" (${item.quantidade}) excede o estoque disponível (${estoqueBD}). A quantidade foi ajustada.`);
                item.quantidade = estoqueBD;
            }
            estoqueInvalido = true;
        }
    }

    if (estoqueInvalido) {
        salvarCarrinho();
        renderizarPedidos();
        atualizarBadge();
        return;
    }

    if (typeof estaLogado === "function") {
        const logado = await estaLogado();
        if (!logado) {
            alert("Você precisa estar logado para fazer um pedido!");
            window.location.href = "/TelaLogin/login.html";
            return;
        }
    }

    const total = calcularTotal();
    localStorage.setItem("totalPedido", total.toFixed(2));
    localStorage.setItem("pedidos", JSON.stringify(pedidosArray));

    window.location.href = "/TelaEntrega/entrega.html";
}

// CARROSSEL DE PROMOÇÕES
const slides = document.querySelectorAll(".promocao-slide");
const indicadores = document.querySelectorAll(".indicador");
let slideAtual = 0;
let carrosselTimer = null;

function mostrarSlide(numero) {
    if (!slides.length) return;

    slides.forEach(slide => slide.classList.remove("ativo"));
    indicadores.forEach(indicador => indicador.classList.remove("ativo"));

    if (slides[numero]) slides[numero].classList.add("ativo");
    if (indicadores[numero]) indicadores[numero].classList.add("ativo");

    slideAtual = numero;
}

function proximoSlide() {
    if (!slides.length) return;
    let proximo = slideAtual + 1;
    if (proximo >= slides.length) proximo = 0;
    mostrarSlide(proximo);
}

function slideAnterior() {
    if (!slides.length) return;
    let anterior = slideAtual - 1;
    if (anterior < 0) anterior = slides.length - 1;
    mostrarSlide(anterior);
}

function irParaSlide(numero) {
    if (numero < 0 || numero >= slides.length) return;
    mostrarSlide(numero);
}

function iniciarCarrosselAuto() {
    if (slides.length > 0 && !carrosselTimer) {
        carrosselTimer = setInterval(proximoSlide, 5000);
    }
}

function pausarCarrosselAuto() {
    if (carrosselTimer) {
        clearInterval(carrosselTimer);
        carrosselTimer = null;
    }
}

// INICIALIZAÇÃO
document.addEventListener("DOMContentLoaded", async function () {
    await checarEAtualizarMenu();
    carregarCarrinho();
    carregarCatalogo();

    if (slides.length > 0) {
        iniciarCarrosselAuto();
        const containerCarrossel = document.querySelector(".carousel-promocoes");
        if (containerCarrossel) {
            containerCarrossel.addEventListener("mouseenter", pausarCarrosselAuto);
            containerCarrossel.addEventListener("mouseleave", iniciarCarrosselAuto);
        }
    }
});
