// =====================================================
// ZORA - TELA INICIAL
// PostgreSQL + PHP + Carrinho
// =====================================================


// =====================================================
// MENU LATERAL
// =====================================================

const sidebar = document.querySelector(".sidebar");

function showSidebar() {

    if (sidebar) {
        sidebar.classList.add("active");
    }
}

function hideSidebar() {

    if (sidebar) {
        sidebar.classList.remove("active");
    }
}


// =====================================================
// LOGIN / PERFIL
// =====================================================

if (typeof atualizarMenuUsuario === "function") {

    atualizarMenuUsuario();
}


// =====================================================
// CATÁLOGO DO POSTGRESQL
// =====================================================

async function carregarCatalogo() {

    const container =
        document.getElementById("catalogoProdutos");

    if (!container) {
        return;
    }

    try {

        const resposta = await fetch(
            "../produtos_catalogo.php"
        );

        const resultado =
            await resposta.json();

        if (
            !resposta.ok ||
            !resultado.sucesso
        ) {

            throw new Error(
                resultado.mensagem ||
                "Não foi possível carregar os produtos."
            );
        }

        renderizarCatalogo(
            resultado.produtos
        );

    } catch (erro) {

        console.error(
            "Erro ao carregar catálogo:",
            erro
        );

        container.innerHTML = "";

        const mensagem =
            document.createElement("p");

        mensagem.textContent =
            "Não foi possível carregar os produtos.";

        container.appendChild(mensagem);
    }
}


// =====================================================
// RENDERIZAR CATÁLOGO
// =====================================================

function renderizarCatalogo(produtos) {

    const container =
        document.getElementById("catalogoProdutos");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (
        !Array.isArray(produtos) ||
        produtos.length === 0
    ) {

        const mensagem =
            document.createElement("p");

        mensagem.textContent =
            "Nenhum produto disponível.";

        container.appendChild(mensagem);

        return;
    }

    produtos.forEach(produto => {

        const id =
            Number(produto.id_produto);

        const nome =
            produto.nome || "Produto";

        const preco =
            Number(produto.preco) || 0;

        const estoque =
            Number(produto.estoque) || 0;


        // =========================
        // CARD
        // =========================

        const card =
            document.createElement("div");

        card.className = "produto";


        // =========================
        // LINK
        // =========================

        const link =
            document.createElement("a");

        link.href =
            `../TelaProdutos/produtos.html?id=${id}`;


        // =========================
        // IMAGEM
        // =========================

        const imagem =
            document.createElement("img");

if (produto.imagem) {

    imagem.src =
        `../img/${produto.imagem}`;

} else {

    imagem.removeAttribute("src");

}

        imagem.alt =
            nome;

        link.appendChild(imagem);


        // =========================
        // NOME
        // =========================

        const titulo =
            document.createElement("h3");

        titulo.textContent =
            nome;


        // =========================
        // PREÇO
        // =========================

        const precoElemento =
            document.createElement("p");

        precoElemento.textContent =
            `R$ ${preco
                .toFixed(2)
                .replace(".", ",")}`;


        // =========================
        // BOTÃO
        // =========================

        const botao =
            document.createElement("button");

        botao.type = "button";


        // Produto sem estoque

        if (estoque <= 0) {

            botao.textContent =
                "Produto esgotado";

            botao.disabled = true;

        } else {

            botao.textContent =
                "Comprar";

            botao.addEventListener(
                "click",
                function () {

                    adicionarPedidos(
                        id,
                        nome,
                        preco
                    );
                }
            );
        }


        // =========================
        // MONTAR CARD
        // =========================

        card.appendChild(link);
        card.appendChild(titulo);
        card.appendChild(precoElemento);
        card.appendChild(botao);

        container.appendChild(card);
    });
}


// =====================================================
// CARRINHO
// =====================================================

let pedidosArray = [];


// =====================================================
// CARREGAR CARRINHO
// =====================================================

function carregarCarrinho() {

    const carrinhoSalvo =
        localStorage.getItem("carrinho");

    if (!carrinhoSalvo) {

        pedidosArray = [];

        atualizarTotal();
        atualizarBadge();
        renderizarPedidos();

        return;
    }

    try {

        pedidosArray =
            JSON.parse(carrinhoSalvo);

        if (!Array.isArray(pedidosArray)) {
            pedidosArray = [];
        }

    } catch (erro) {

        console.error(
            "Erro ao carregar carrinho:",
            erro
        );

        pedidosArray = [];
    }

    renderizarPedidos();
    atualizarBadge();
}


// =====================================================
// SALVAR CARRINHO
// =====================================================

function salvarCarrinho() {

    localStorage.setItem(
        "carrinho",
        JSON.stringify(pedidosArray)
    );
}


// =====================================================
// CALCULAR TOTAL
// =====================================================

function calcularTotal() {

    let total = 0;

    pedidosArray.forEach(produto => {

        const preco =
            Number(produto.preco) || 0;

        const quantidade =
            Number(produto.quantidade) || 1;

        total +=
            preco * quantidade;
    });

    return total;
}


// =====================================================
// RENDERIZAR CARRINHO
// =====================================================

function renderizarPedidos() {

    const lista =
        document.getElementById(
            "listaPedidos"
        );

    if (!lista) {
        return;
    }

    lista.innerHTML = "";

    pedidosArray.forEach(
        (produto, indice) => {

            const preco =
                Number(produto.preco) || 0;

            const quantidade =
                Number(produto.quantidade) || 1;

            const item =
                document.createElement("li");


            const info =
                document.createElement("span");

            info.className =
                "info-item";

            info.textContent =
                `${quantidade}x ${produto.nome}`;


            const quebra =
                document.createElement("br");

            info.appendChild(quebra);


            const precoTexto =
                document.createTextNode(
                    `R$ ${(preco * quantidade)
                        .toFixed(2)
                        .replace(".", ",")}`
                );

            info.appendChild(precoTexto);


            const botao =
                document.createElement("button");

            botao.className =
                "remover-item";

            botao.textContent =
                "🗑";

            botao.addEventListener(
                "click",
                function () {

                    removerPedido(indice);
                }
            );


            item.appendChild(info);
            item.appendChild(botao);

            lista.appendChild(item);
        }
    );

    atualizarTotal();
}


// =====================================================
// ADICIONAR PRODUTO
// =====================================================

function adicionarPedidos(
    idProduto,
    nome,
    preco
) {

    const id =
        Number(idProduto);

    const valor =
        Number(preco);


    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {

        console.error(
            "ID do produto inválido:",
            idProduto
        );

        alert(
            "Não foi possível adicionar este produto."
        );

        return;
    }


    if (
        !Number.isFinite(valor) ||
        valor < 0
    ) {

        console.error(
            "Preço inválido:",
            preco
        );

        alert(
            "O preço deste produto é inválido."
        );

        return;
    }


    const produtoExistente =
        pedidosArray.find(
            produto =>
                Number(produto.id_produto) === id
        );


    if (produtoExistente) {

        produtoExistente.quantidade =
            (
                Number(
                    produtoExistente.quantidade
                ) || 1
            ) + 1;

    } else {

        pedidosArray.push({

            id_produto: id,

            nome: nome,

            preco: valor,

            quantidade: 1
        });
    }


    salvarCarrinho();

    renderizarPedidos();

    atualizarBadge();

    abrirPedidos();
}


// =====================================================
// ALTERAR QUANTIDADE
// =====================================================

function alterarQuantidade(
    indice,
    delta
) {

    const produto =
        pedidosArray[indice];

    if (!produto) {
        return;
    }

    produto.quantidade =
        (
            Number(produto.quantidade) || 1
        ) + delta;

    if (produto.quantidade <= 0) {

        pedidosArray.splice(
            indice,
            1
        );
    }

    salvarCarrinho();
    renderizarPedidos();
    atualizarBadge();
}


// =====================================================
// ATUALIZAR TOTAL
// =====================================================

function atualizarTotal() {

    const total =
        calcularTotal();

    const elemento =
        document.getElementById("total");

    if (elemento) {

        elemento.textContent =
            total
                .toFixed(2)
                .replace(".", ",");
    }
}


// =====================================================
// REMOVER PRODUTO
// =====================================================

function removerPedido(indice) {

    if (
        indice < 0 ||
        indice >= pedidosArray.length
    ) {

        return;
    }

    pedidosArray.splice(
        indice,
        1
    );

    salvarCarrinho();

    renderizarPedidos();

    atualizarBadge();
}


// =====================================================
// BADGE
// =====================================================

function atualizarBadge() {

    const quantidadeTotal =
        pedidosArray.reduce(
            (soma, produto) =>
                soma +
                (
                    Number(
                        produto.quantidade
                    ) || 0
                ),
            0
        );

    document
        .querySelectorAll(
            ".badge-carrinho"
        )
        .forEach(badge => {

            if (quantidadeTotal > 0) {

                badge.textContent =
                    quantidadeTotal;

                badge.classList.add(
                    "show"
                );

            } else {

                badge.textContent = "";

                badge.classList.remove(
                    "show"
                );
            }
        });
}


// =====================================================
// ABRIR CARRINHO
// =====================================================

function abrirPedidos() {

    const pedidos =
        document.getElementById(
            "Pedidos"
        );

    if (pedidos) {

        pedidos.classList.add(
            "ativo"
        );
    }
}


// =====================================================
// FECHAR CARRINHO
// =====================================================

function fecharPedidos() {

    const pedidos =
        document.getElementById(
            "Pedidos"
        );

    if (pedidos) {

        pedidos.classList.remove(
            "ativo"
        );
    }
}


// =====================================================
// PAGAR
// =====================================================

async function pagarPedido() {

    if (
        !pedidosArray ||
        pedidosArray.length === 0
    ) {

        alert(
            "Seu carrinho está vazio."
        );

        return;
    }


    // =============================
    // LOGIN
    // =============================

    if (
        typeof estaLogado === "function"
    ) {

        const logado =
            await estaLogado();

        if (!logado) {

            alert(
                "Você precisa estar logado para fazer um pedido!"
            );

            window.location.href =
                "../TelaLogin/login.html";

            return;
        }
    }


    // =============================
    // SALVAR PARA ENTREGA
    // =============================

    const total =
        calcularTotal();

    localStorage.setItem(
        "totalPedido",
        total.toFixed(2)
    );

    localStorage.setItem(
        "pedidos",
        JSON.stringify(pedidosArray)
    );


    window.location.href =
        "../TelaEntrega/entrega.html";
}


// =====================================================
// CARROSSEL
// =====================================================

const slides =
    document.querySelectorAll(
        ".promocao-slide"
    );

const indicadores =
    document.querySelectorAll(
        ".indicador"
    );

let slideAtual = 0;


function mostrarSlide(numero) {

    if (!slides.length) {
        return;
    }

    slides.forEach(slide => {

        slide.classList.remove(
            "ativo"
        );
    });

    indicadores.forEach(indicador => {

        indicador.classList.remove(
            "ativo"
        );
    });

    if (slides[numero]) {

        slides[numero].classList.add(
            "ativo"
        );
    }

    if (indicadores[numero]) {

        indicadores[numero].classList.add(
            "ativo"
        );
    }

    slideAtual = numero;
}


function proximoSlide() {

    if (!slides.length) {
        return;
    }

    let proximo =
        slideAtual + 1;

    if (proximo >= slides.length) {
        proximo = 0;
    }

    mostrarSlide(proximo);
}


function slideAnterior() {

    if (!slides.length) {
        return;
    }

    let anterior =
        slideAtual - 1;

    if (anterior < 0) {

        anterior =
            slides.length - 1;
    }

    mostrarSlide(anterior);
}


function irParaSlide(numero) {

    if (
        numero < 0 ||
        numero >= slides.length
    ) {

        return;
    }

    mostrarSlide(numero);
}


// =====================================================
// INICIALIZAÇÃO
// =====================================================

carregarCarrinho();

carregarCatalogo();


// =====================================================
// CARROSSEL AUTOMÁTICO
// =====================================================

if (slides.length > 0) {

    setInterval(
        proximoSlide,
        5000
    );
}