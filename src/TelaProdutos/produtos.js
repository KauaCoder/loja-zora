/* =========================================================
   ZORA - PRODUTOS
   PostgreSQL + PHP + Carrinho
========================================================= */


/* =========================================================
   1. DETALHES LOCAIS DOS PRODUTOS

   Nome, preço, estoque, categoria, imagem e descrição
   vêm do PostgreSQL.

   Aqui ficam somente informações que ainda não existem
   na tabela produto.
========================================================= */

const detalhesProdutos = {

    1: {
        tamanhos: ["PP", "P", "M", "G", "GG"],
        tecido: "Malha",
        composicao: "96% Algodão 4% Elastano",
        marca: "ZORA",
        colecao: "Coleção ZORA"
    },

    2: {
        tamanhos: ["34", "36", "38", "40", "42", "44"],
        tecido: "Jeans",
        composicao: "100% Algodão",
        marca: "ZORA",
        colecao: "Coleção ZORA"
    },

    3: {
        tamanhos: ["PP", "P", "M", "G", "GG"],
        tecido: "Microfibra",
        composicao: "68% Poliamida 25% Poliéster 7% Elastano",
        marca: "ZORA",
        colecao: "Coleção ZORA"
    },

    4: {
        tamanhos: ["PP", "P", "M", "G", "GG"],
        tecido: "Poliéster",
        composicao: "97% Poliéster 3% Elastano",
        marca: "ZORA",
        colecao: "Coleção ZORA"
    },

    5: {
        tamanhos: ["PP", "P", "M", "G", "GG"],
        tecido: "Poliamida",
        composicao: "Poliamida",
        marca: "ZORA",
        colecao: "Coleção ZORA"
    },

    6: {
        tamanhos: ["PP", "P", "M", "G", "GG"],
        tecido: "Chiffon",
        composicao: "100% Poliéster",
        marca: "ZORA",
        colecao: "Coleção ZORA"
    },

    7: {
        tamanhos: ["36", "38", "40", "42", "44", "46"],
        tecido: "Jeans",
        composicao: "100% Algodão",
        marca: "ZORA",
        colecao: "Coleção ZORA"
    },

    8: {
        tamanhos: ["PP", "P", "M", "G", "GG"],
        tecido: "Jeans e malha",
        composicao: "Composição conforme material da peça",
        marca: "ZORA",
        colecao: "Coleção ZORA"
    },

    9: {
        tamanhos: ["PP", "P", "M", "G", "GG"],
        tecido: "Malha",
        composicao: "Poliéster e Elastano",
        marca: "ZORA",
        colecao: "Coleção ZORA"
    },

    10: {
        tamanhos: ["P", "M", "G", "GG"],
        tecido: "Fleece",
        composicao: "Poliéster",
        marca: "ZORA",
        colecao: "Coleção ZORA"
    }

};


/* =========================================================
   2. PEGAR ID DO PRODUTO PELA URL
========================================================= */

const parametros =
    new URLSearchParams(
        window.location.search
    );

const idProduto =
    parametros.get("id");


/* =========================================================
   3. PRODUTO ATUAL
========================================================= */

let produto = null;


/* =========================================================
   4. DETALHES LOCAIS
========================================================= */

const detalhes =
    detalhesProdutos[idProduto] || {

        tamanhos: [],

        tecido: "-",

        composicao: "-",

        marca: "ZORA",

        colecao: "Coleção ZORA"

    };


let tamanhoSelecionado = null;


/* =========================================================
   5. CARREGAR PRODUTO DO POSTGRESQL
========================================================= */

async function carregarProduto() {

    if (!idProduto) {

        mostrarProdutoNaoEncontrado();

        return;
    }


    try {

        const resposta = await fetch(
            `/produto.php?id=${encodeURIComponent(idProduto)}`
        );


        const resultado =
            await resposta.json();


        if (
            !resposta.ok ||
            !resultado.sucesso
        ) {

            throw new Error(
                resultado.mensagem ||
                "Produto não encontrado."
            );
        }


        produto =
            resultado.produto;


        /* =========================
           NOME
        ========================= */

        const elNome = document.getElementById("nomeProduto");
        if (elNome) {
            elNome.textContent = produto.nome;
        }


        /* =========================
           PREÇO
        ========================= */

        const elPreco = document.getElementById("precoProduto");
        if (elPreco) {
            elPreco.textContent =
                `R$ ${Number(produto.preco)
                    .toFixed(2)
                    .replace(".", ",")}`;
        }


        /* =========================
           IMAGEM
        ========================= */

        const imagem =
            document.getElementById(
                "imagemProduto"
            );


        if (imagem) {

            if (produto.imagem) {

                imagem.src =
                    `/img/${produto.imagem}`;

            } else {

                imagem.removeAttribute(
                    "src"
                );

            }

            imagem.alt =
                produto.nome;
        }


        /* =========================
           DESCRIÇÃO
        ========================= */

        const elDescricao = document.getElementById("descricaoProduto");
        if (elDescricao) {
            elDescricao.textContent =
                produto.descricao || "-";
        }


        /* =========================
           TECIDO
        ========================= */

        const elTecido = document.getElementById("tecidoProduto");
        if (elTecido) {
            elTecido.textContent =
                detalhes.tecido;
        }


        /* =========================
           COMPOSIÇÃO
        ========================= */

        const elComposicao = document.getElementById("composicaoProduto");
        if (elComposicao) {
            elComposicao.textContent =
                detalhes.composicao;
        }


        /* =========================
           MARCA
        ========================= */

        const elMarca = document.getElementById("marcaProduto");
        if (elMarca) {
            elMarca.textContent =
                detalhes.marca;
        }


        /* =========================
           COLEÇÃO
        ========================= */

        const elColecao = document.getElementById("colecaoProduto");
        if (elColecao) {
            elColecao.textContent =
                detalhes.colecao;
        }


        /* =========================
           TÍTULO DA PÁGINA
        ========================= */

        document.title =
            `ZORA - ${produto.nome}`;


        /* =========================
           TAMANHOS
        ========================= */

        carregarTamanhos();


        /* =========================
           ESTOQUE
        ========================= */

        atualizarBotaoEstoque();

    } catch (erro) {

        console.error(
            "Erro ao carregar produto:",
            erro
        );


        mostrarProdutoNaoEncontrado();
    }

}


/* =========================================================
   6. PRODUTO NÃO ENCONTRADO
========================================================= */

function mostrarProdutoNaoEncontrado() {

    produto = null;


    const nome =
        document.getElementById(
            "nomeProduto"
        );


    const preco =
        document.getElementById(
            "precoProduto"
        );


    const descricao =
        document.getElementById(
            "descricaoProduto"
        );


    const botao =
        document.getElementById(
            "botaoComprar"
        );


    if (nome) {

        nome.textContent =
            "Produto não encontrado";
    }


    if (preco) {

        preco.textContent = "";
    }


    if (descricao) {

        descricao.textContent =
            "Não foi possível carregar este produto.";
    }


    if (botao) {

        botao.disabled = true;

        botao.textContent =
            "Produto indisponível";
    }

}


/* =========================================================
   7. CONTROLE DE ESTOQUE NA TELA
========================================================= */

function atualizarBotaoEstoque() {

    const botao =
        document.getElementById(
            "botaoComprar"
        );


    if (!botao || !produto) {

        return;
    }


    const estoque =
        Number(produto.estoque) || 0;


    if (estoque <= 0) {

        botao.disabled = true;

        botao.textContent =
            "Produto esgotado";

        return;
    }


    botao.disabled = false;

    botao.textContent =
        "Adicionar ao carrinho";
}


/* =========================================================
   8. CARREGAR TAMANHOS
========================================================= */

function carregarTamanhos() {

    const container =
        document.getElementById(
            "tamanhosProduto"
        );


    if (!container) {

        return;
    }


    container.innerHTML = "";


    if (
        !detalhes.tamanhos ||
        detalhes.tamanhos.length === 0
    ) {

        container.textContent =
            "Tamanho não informado.";

        return;
    }


    detalhes.tamanhos.forEach(
        tamanho => {

            const botao =
                document.createElement(
                    "button"
                );


            botao.type =
                "button";


            botao.textContent =
                tamanho;


            botao.addEventListener(
                "click",
                function() {

                    document
                        .querySelectorAll(
                            "#tamanhosProduto button"
                        )
                        .forEach(
                            item => {

                                item.classList.remove(
                                    "selecionado"
                                );

                            }
                        );


                    botao.classList.add(
                        "selecionado"
                    );


                    tamanhoSelecionado =
                        tamanho;
                }
            );


            container.appendChild(
                botao
            );
        }
    );
}


/* =========================================================
   9. BOTÃO COMPRAR
========================================================= */

const botaoComprar =
    document.getElementById(
        "botaoComprar"
    );


if (botaoComprar) {

    botaoComprar.addEventListener(
        "click",
        function() {

            if (!produto) {

                alert(
                    "Produto não encontrado."
                );

                return;
            }


            if (
                Number(produto.estoque) <= 0
            ) {

                alert(
                    "Este produto está esgotado."
                );

                return;
            }


            if (!tamanhoSelecionado) {

                alert(
                    "Escolha um tamanho antes de comprar."
                );

                return;
            }


            const quantidadeNoCarrinho =
                obterQuantidadeProdutoCarrinho(
                    produto.id_produto
                );


            if (
                quantidadeNoCarrinho >=
                Number(produto.estoque)
            ) {

                alert(
                    "Você já adicionou ao carrinho toda a quantidade disponível deste produto."
                );

                return;
            }


            adicionarPedidos(
                produto.id_produto,
                produto.nome,
                produto.preco,
                tamanhoSelecionado,
                produto.estoque
            );


            localStorage.setItem(
                "ultimoProduto",
                JSON.stringify({

                    id:
                        produto.id_produto,

                    nome:
                        produto.nome,

                    preco:
                        produto.preco,

                    tamanho:
                        tamanhoSelecionado,

                    imagem:
                        produto.imagem
                            ? `/img/${produto.imagem}`
                            : ""

                })
            );
        }
    );
}


/* =========================================================
   10. AVALIAÇÕES
========================================================= */

let notaSelecionada = 0;


const botoesEstrelas =
    document.querySelectorAll(
        "#estrelasEscolha button"
    );


botoesEstrelas.forEach(
    botao => {

        botao.addEventListener(
            "click",
            function() {

                notaSelecionada =
                    Number(
                        botao.dataset.nota
                    );


                atualizarEstrelas();
            }
        );
    }
);


function atualizarEstrelas() {

    botoesEstrelas.forEach(
        botao => {

            const nota =
                Number(
                    botao.dataset.nota
                );


            botao.textContent =
                nota <= notaSelecionada
                    ? "★"
                    : "☆";
        }
    );
}


/* =========================================================
   11. CHAVE DAS AVALIAÇÕES
========================================================= */

function obterChaveAvaliacoes() {

    return `avaliacoes_produto_${idProduto}`;
}


/* =========================================================
   12. ENVIAR AVALIAÇÃO
========================================================= */

function enviarAvaliacao() {

    const campo =
        document.getElementById(
            "comentario"
        );


    if (!campo) {

        return;
    }


    const comentario =
        campo.value.trim();


    if (notaSelecionada === 0) {

        alert(
            "Escolha uma nota de 1 a 5 estrelas."
        );

        return;
    }


    if (comentario === "") {

        alert(
            "Escreva um comentário antes de publicar."
        );

        campo.focus();

        return;
    }


    const chave =
        obterChaveAvaliacoes();


    let avaliacoes = [];


    try {

        avaliacoes =
            JSON.parse(
                localStorage.getItem(
                    chave
                )
            ) || [];

    } catch (erro) {

        avaliacoes = [];
    }


    avaliacoes.push({

        nota:
            notaSelecionada,

        comentario:
            comentario,

        data:
            new Date()
                .toLocaleDateString(
                    "pt-BR"
                )

    });


    localStorage.setItem(
        chave,
        JSON.stringify(
            avaliacoes
        )
    );


    campo.value = "";

    notaSelecionada = 0;


    atualizarEstrelas();

    carregarAvaliacoes();


    alert(
        "Avaliação publicada com sucesso!"
    );
}


/* =========================================================
   13. CARREGAR AVALIAÇÕES
========================================================= */

function carregarAvaliacoes() {

    const container =
        document.getElementById(
            "comentarios"
        );


    if (!container) {

        return;
    }


    const chave =
        obterChaveAvaliacoes();


    let avaliacoes = [];


    try {

        avaliacoes =
            JSON.parse(
                localStorage.getItem(
                    chave
                )
            ) || [];

    } catch (erro) {

        avaliacoes = [];
    }


    const quantidade =
        document.getElementById(
            "quantidadeAvaliacoes"
        );


    const mediaNota =
        document.getElementById(
            "mediaNota"
        );


    const estrelasMedia =
        document.getElementById(
            "estrelasMedia"
        );


    if (quantidade) {

        quantidade.textContent =
            `${avaliacoes.length} ${
                avaliacoes.length === 1
                    ? "avaliação"
                    : "avaliações"
            }`;
    }


    if (avaliacoes.length === 0) {

        if (mediaNota) {

            mediaNota.textContent =
                "0,0";
        }


        if (estrelasMedia) {

            estrelasMedia.textContent =
                "☆☆☆☆☆";
        }


        container.innerHTML = `
            <p class="sem-avaliacoes">
                Ainda não existem avaliações.
            </p>
        `;


        return;
    }


    const soma =
        avaliacoes.reduce(
            (total, avaliacao) =>
                total +
                Number(avaliacao.nota),
            0
        );


    const media =
        soma / avaliacoes.length;


    if (mediaNota) {

        mediaNota.textContent =
            media
                .toFixed(1)
                .replace(".", ",");
    }


    const estrelas =
        Math.round(media);


    if (estrelasMedia) {

        estrelasMedia.textContent =
            "★".repeat(estrelas) +
            "☆".repeat(5 - estrelas);
    }


    container.innerHTML = "";


    avaliacoes
        .slice()
        .reverse()
        .forEach(
            avaliacao => {

                const elemento =
                    document.createElement(
                        "div"
                    );


                elemento.className =
                    "avaliacao";


                const topo =
                    document.createElement(
                        "div"
                    );


                topo.className =
                    "avaliacao-topo";


                const nome =
                    document.createElement(
                        "span"
                    );


                nome.className =
                    "avaliacao-nome";


                nome.textContent =
                    "Cliente";


                const data =
                    document.createElement(
                        "span"
                    );


                data.className =
                    "avaliacao-data";


                data.textContent =
                    avaliacao.data;


                topo.appendChild(
                    nome
                );


                topo.appendChild(
                    data
                );


                const estrelasElemento =
                    document.createElement(
                        "div"
                    );


                estrelasElemento.className =
                    "avaliacao-estrelas";


                estrelasElemento.textContent =
                    "★".repeat(
                        avaliacao.nota
                    ) +
                    "☆".repeat(
                        5 - avaliacao.nota
                    );


                const texto =
                    document.createElement(
                        "p"
                    );


                texto.className =
                    "avaliacao-texto";


                texto.textContent =
                    avaliacao.comentario;


                elemento.appendChild(
                    topo
                );


                elemento.appendChild(
                    estrelasElemento
                );


                elemento.appendChild(
                    texto
                );


                container.appendChild(
                    elemento
                );
            }
        );
}


/* =========================================================
   14. CARRINHO
========================================================= */

let pedidosArray = [];


/* =========================================================
   CARREGAR CARRINHO
========================================================= */

function carregarCarrinho() {

    const carrinhoSalvo =
        localStorage.getItem(
            "carrinho"
        );


    if (!carrinhoSalvo) {

        pedidosArray = [];

        return;
    }


    try {

        pedidosArray =
            JSON.parse(
                carrinhoSalvo
            );


        if (
            !Array.isArray(
                pedidosArray
            )
        ) {

            pedidosArray = [];
        }

    } catch (erro) {

        console.error(
            "Erro ao carregar carrinho:",
            erro
        );


        pedidosArray = [];
    }
}


/* =========================================================
   SALVAR CARRINHO
========================================================= */

function salvarCarrinho() {

    localStorage.setItem(
        "carrinho",
        JSON.stringify(
            pedidosArray
        )
    );
}


/* =========================================================
   QUANTIDADE DO PRODUTO NO CARRINHO
========================================================= */

function obterQuantidadeProdutoCarrinho(
    id
) {

    const item =
        pedidosArray.find(
            produto =>
                Number(
                    produto.id_produto
                ) === Number(id)
        );


    if (!item) {

        return 0;
    }


    return (
        Number(
            item.quantidade
        ) || 0
    );
}


/* =========================================================
   CALCULAR TOTAL
========================================================= */

function calcularTotal() {

    let total = 0;


    pedidosArray.forEach(
        produtoCarrinho => {

            const preco =
                Number(
                    produtoCarrinho.preco
                ) || 0;


            const quantidade =
                Number(
                    produtoCarrinho.quantidade
                ) || 1;


            total +=
                preco * quantidade;
        }
    );


    return total;
}


/* =========================================================
   RENDERIZAR CARRINHO
========================================================= */

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
        (produtoCarrinho, indice) => {

            const preco =
                Number(
                    produtoCarrinho.preco
                ) || 0;


            const quantidade =
                Number(
                    produtoCarrinho.quantidade
                ) || 1;


            const item =
                document.createElement(
                    "li"
                );


            const tamanhoTexto =
                produtoCarrinho.tamanho
                    ? ` - Tam. ${produtoCarrinho.tamanho}`
                    : "";


            item.innerHTML = `

                <span>

                    ${quantidade}x
                    ${produtoCarrinho.nome}
                    ${tamanhoTexto}

                    <br>

                    R$ ${(preco * quantidade)
                        .toFixed(2)
                        .replace(".", ",")}

                </span>

                <button
                    type="button"
                    onclick="removerPedido(${indice})">

                    🗑

                </button>
            `;


            lista.appendChild(
                item
            );
        }
    );


    atualizarTotal();
}


/* =========================================================
   ADICIONAR AO CARRINHO
========================================================= */

function adicionarPedidos(
    idProdutoRecebido,
    nome,
    preco,
    tamanho,
    estoque
) {

    const id =
        Number(
            idProdutoRecebido
        );


    const valor =
        Number(preco);


    const estoqueDisponivel =
        Number(estoque);


    if (
        !id ||
        id <= 0
    ) {

        alert(
            "Não foi possível adicionar este produto."
        );

        return;
    }


    /*
     * Consideramos produto + tamanho para o carrinho.
     */

    const produtoExistente =
        pedidosArray.find(
            item =>
                Number(
                    item.id_produto
                ) === id &&
                item.tamanho === tamanho
        );


    /*
     * Soma todas as unidades desse produto,
     * independentemente do tamanho.
     */

    const quantidadeAtual =
        pedidosArray
            .filter(
                item =>
                    Number(
                        item.id_produto
                    ) === id
            )
            .reduce(
                (total, item) =>
                    total +
                    (
                        Number(
                            item.quantidade
                        ) || 0
                    ),
                0
            );


    if (
        estoqueDisponivel > 0 &&
        quantidadeAtual >=
            estoqueDisponivel
    ) {

        alert(
            "Quantidade máxima disponível em estoque atingida."
        );

        return;
    }


    if (produtoExistente) {

        produtoExistente.quantidade =
            (
                Number(
                    produtoExistente.quantidade
                ) || 1
            ) + 1;

    } else {

        pedidosArray.push({

            id_produto:
                id,

            nome:
                nome,

            preco:
                valor,

            quantidade:
                1,

            tamanho:
                tamanho

        });
    }


    salvarCarrinho();

    renderizarPedidos();

    abrirPedidos();
}


/* =========================================================
   TOTAL
========================================================= */

function atualizarTotal() {

    const total =
        calcularTotal();


    const elemento =
        document.getElementById(
            "total"
        );


    if (elemento) {

        elemento.textContent =
            total
                .toFixed(2)
                .replace(".", ",");
    }
}


/* =========================================================
   REMOVER ITEM
========================================================= */

function removerPedido(indice) {

    pedidosArray.splice(
        indice,
        1
    );


    salvarCarrinho();

    renderizarPedidos();
}


/* =========================================================
   ABRIR CARRINHO
========================================================= */

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


/* =========================================================
   FECHAR CARRINHO
========================================================= */

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


/* =========================================================
   PAGAR
========================================================= */

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


    /*
     * auth.js já está carregado no HTML.
     * Verificamos a sessão PHP antes de ir
     * para a tela de entrega.
     */

    if (
        typeof estaLogado ===
        "function"
    ) {

        const logado =
            await estaLogado();


        if (!logado) {

            alert(
                "Você precisa estar logado para fazer um pedido!"
            );


            window.location.href =
                "/TelaLogin/login.html";


            return;
        }
    }


    const total =
        calcularTotal();


    localStorage.setItem(
        "totalPedido",
        total.toFixed(2)
    );


    localStorage.setItem(
        "pedidos",
        JSON.stringify(
            pedidosArray
        )
    );


    window.location.href =
        "/TelaEntrega/entrega.html";
}


/* =========================================================
   MENU
========================================================= */

const sidebar =
    document.querySelector(
        ".sidebar"
    );


function showSidebar() {

    if (sidebar) {

        sidebar.classList.add(
            "active"
        );
    }
}


function hideSidebar() {

    if (sidebar) {

        sidebar.classList.remove(
            "active"
        );
    }
}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        carregarCarrinho();

        renderizarPedidos();

        carregarAvaliacoes();


        await carregarProduto();


        /*
         * Função existente no auth.js.
         * Atualiza Login → Perfil quando
         * existe uma sessão.
         */

        if (
            typeof atualizarMenuUsuario ===
            "function"
        ) {

            await atualizarMenuUsuario();
        }

    }
);
