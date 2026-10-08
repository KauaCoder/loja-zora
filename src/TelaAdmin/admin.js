// =====================================================
// ZORA - PAINEL ADMINISTRATIVO
// =====================================================

let produtosAdmin = [];


// =====================================================
// CARREGAR DADOS
// =====================================================

async function carregarDadosAdmin() {

    const tabela =
        document.getElementById(
            "tabelaProdutos"
        );

    try {

        const resposta =
            await fetch(
                "../admin_dados.php",
                {
                    method: "GET",
                    cache: "no-store"
                }
            );

        const resultado =
            await resposta.json();

        if (
            !resposta.ok ||
            !resultado.sucesso
        ) {

            throw new Error(
                resultado.mensagem ||
                "Erro ao carregar os produtos."
            );
        }


        produtosAdmin =
            Array.isArray(resultado.produtos)
                ? resultado.produtos
                : [];


        carregarCategorias();

        atualizarResumo();

        aplicarFiltros();


    } catch (erro) {

        console.error(
            "Erro no painel administrativo:",
            erro
        );


        if (tabela) {

            tabela.innerHTML = `
                <tr>
                    <td
                        colspan="8"
                        class="erro-tabela">

                        Não foi possível carregar
                        os produtos.

                    </td>
                </tr>
            `;
        }
    }
}


// =====================================================
// CATEGORIAS
// =====================================================

function carregarCategorias() {

    const select =
        document.getElementById(
            "filtroCategoria"
        );

    if (!select) {
        return;
    }


    const valorAtual =
        select.value;


    select.innerHTML = `
        <option value="">
            Todas as categorias
        </option>
    `;


    const categorias = [
        ...new Set(
            produtosAdmin
                .map(
                    produto =>
                        produto.categoria
                )
                .filter(Boolean)
        )
    ];


    categorias.sort();


    categorias.forEach(
        categoria => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                categoria;

            option.textContent =
                categoria;

            select.appendChild(
                option
            );
        }
    );


    if (
        categorias.includes(
            valorAtual
        )
    ) {

        select.value =
            valorAtual;
    }
}


// =====================================================
// RESUMO
// =====================================================

function atualizarResumo() {

    const totalProdutos =
        produtosAdmin.length;


    const totalUnidades =
        produtosAdmin.reduce(

            (total, produto) =>

                total +
                (
                    Number(
                        produto.qtd_item
                    ) || 0
                ),

            0
        );


    const estoqueBaixo =
        produtosAdmin.filter(
            produto => {

                const quantidade =
                    Number(
                        produto.qtd_item
                    ) || 0;


                const maximo =
                    Number(
                        produto.qtd_max_produto
                    ) || 0;


                if (quantidade <= 0) {
                    return false;
                }


                const limite =
                    maximo > 0
                        ? maximo * 0.2
                        : 10;


                return (
                    quantidade <= limite
                );
            }
        ).length;


    const esgotados =
        produtosAdmin.filter(
            produto =>
                Number(
                    produto.qtd_item
                ) <= 0
        ).length;


    definirTexto(
        "totalProdutos",
        totalProdutos
    );


    definirTexto(
        "totalUnidades",
        totalUnidades
    );


    definirTexto(
        "totalEstoqueBaixo",
        estoqueBaixo
    );


    definirTexto(
        "totalEsgotados",
        esgotados
    );
}


// =====================================================
// DEFINIR TEXTO
// =====================================================

function definirTexto(
    id,
    valor
) {

    const elemento =
        document.getElementById(id);


    if (elemento) {

        elemento.textContent =
            valor;
    }
}


// =====================================================
// FILTROS
// =====================================================

function aplicarFiltros() {

    const pesquisa =
        document.getElementById(
            "pesquisaProduto"
        );


    const categoria =
        document.getElementById(
            "filtroCategoria"
        );


    const texto =
        pesquisa
            ? pesquisa.value
                .trim()
                .toLowerCase()
            : "";


    const categoriaSelecionada =
        categoria
            ? categoria.value
            : "";


    const produtosFiltrados =
        produtosAdmin.filter(
            produto => {

                const nome =
                    String(
                        produto.nome || ""
                    ).toLowerCase();


                const correspondeNome =
                    nome.includes(texto);


                const correspondeCategoria =
                    categoriaSelecionada === "" ||
                    produto.categoria ===
                        categoriaSelecionada;


                return (
                    correspondeNome &&
                    correspondeCategoria
                );
            }
        );


    renderizarProdutos(
        produtosFiltrados
    );
}


// =====================================================
// RENDERIZAR PRODUTOS
// =====================================================

function renderizarProdutos(
    produtos
) {

    const tabela =
        document.getElementById(
            "tabelaProdutos"
        );


    if (!tabela) {
        return;
    }


    tabela.innerHTML = "";


    definirTexto(
        "quantidadeResultados",
        `${produtos.length} ${
            produtos.length === 1
                ? "produto"
                : "produtos"
        }`
    );


    if (produtos.length === 0) {

        tabela.innerHTML = `
            <tr>

                <td
                    colspan="8"
                    class="sem-resultados">

                    Nenhum produto encontrado.

                </td>

            </tr>
        `;

        return;
    }


    produtos.forEach(
        produto => {

            const linha =
                document.createElement(
                    "tr"
                );


            // =====================================
            // PRODUTO
            // =====================================

            const colunaProduto =
                document.createElement(
                    "td"
                );


            const produtoInfo =
                document.createElement(
                    "div"
                );


            produtoInfo.className =
                "produto-info";


            const imagem =
                document.createElement(
                    "img"
                );


            if (produto.imagem) {

                imagem.src =
                    `../img/${produto.imagem}`;

            }


            imagem.alt =
                produto.nome ||
                "Produto";


            const textoProduto =
                document.createElement(
                    "div"
                );


            const nome =
                document.createElement(
                    "strong"
                );


            nome.textContent =
                produto.nome;


            const codigo =
                document.createElement(
                    "small"
                );


            codigo.textContent =
                `Código #${produto.id_produto}`;


            textoProduto.appendChild(
                nome
            );

            textoProduto.appendChild(
                codigo
            );


            produtoInfo.appendChild(
                imagem
            );

            produtoInfo.appendChild(
                textoProduto
            );


            colunaProduto.appendChild(
                produtoInfo
            );


            // =====================================
            // CATEGORIA
            // =====================================

            const colunaCategoria =
                document.createElement(
                    "td"
                );


            colunaCategoria.textContent =
                produto.categoria || "-";


            // =====================================
            // PREÇO
            // =====================================

            const colunaPreco =
                document.createElement(
                    "td"
                );


            colunaPreco.textContent =
                formatarMoeda(
                    produto.preco
                );


            // =====================================
            // ESTOQUE
            // =====================================

            const quantidade =
                Number(
                    produto.qtd_item
                ) || 0;


            const maximo =
                Number(
                    produto.qtd_max_produto
                ) || 0;


            const colunaEstoque =
                document.createElement(
                    "td"
                );


            const estoqueTexto =
                document.createElement(
                    "strong"
                );


            estoqueTexto.textContent =
                maximo > 0
                    ? `${quantidade} / ${maximo}`
                    : quantidade;


            colunaEstoque.appendChild(
                estoqueTexto
            );


            // =====================================
            // FORNECEDOR
            // =====================================

            const colunaFornecedor =
                document.createElement(
                    "td"
                );


            colunaFornecedor.textContent =
                produto.fornecedor ||
                "Não cadastrado";


            // =====================================
            // CONTATO
            // =====================================

            const colunaContato =
                document.createElement(
                    "td"
                );


            colunaContato.textContent =
                produto.contato || "-";


            // =====================================
            // STATUS
            // =====================================

            const colunaStatus =
                document.createElement(
                    "td"
                );


            colunaStatus.appendChild(
                criarStatus(
                    quantidade,
                    maximo
                )
            );


            // =====================================
            // AÇÕES
            // =====================================

            const colunaAcoes =
                document.createElement(
                    "td"
                );


            const botaoRepor =
                document.createElement(
                    "button"
                );


            botaoRepor.type =
                "button";


            botaoRepor.className =
                "botao-repor";


            if (
                maximo > 0 &&
                quantidade >= maximo
            ) {

                botaoRepor.textContent =
                    "Estoque cheio";


                botaoRepor.disabled =
                    true;

            } else {

                botaoRepor.textContent =
                    "Repor";


                botaoRepor.addEventListener(
                    "click",
                    function () {

                        abrirModalReposicao(
                            produto
                        );
                    }
                );
            }


const grupoAcoes =
    document.createElement(
        "div"
    );


grupoAcoes.className =
    "grupo-acoes";


const botaoEditar =
    document.createElement(
        "button"
    );


botaoEditar.type =
    "button";


botaoEditar.className =
    "botao-editar";


botaoEditar.textContent =
    "Editar";


botaoEditar.addEventListener(
    "click",
    function () {

        abrirModalEdicao(
            produto
        );
    }
);


const botaoFornecedor =
    document.createElement(
        "button"
    );


botaoFornecedor.type =
    "button";


botaoFornecedor.className =
    "botao-fornecedor";


botaoFornecedor.textContent =
    "Fornecedor";


if (
    produto.id_fornecedor &&
    produto.id_item_estoque
) {

    botaoFornecedor.addEventListener(
        "click",
        function () {

            abrirModalFornecedor(
                produto
            );
        }
    );

} else {

    botaoFornecedor.disabled =
        true;


    botaoFornecedor.textContent =
        "Sem fornecedor";
}


grupoAcoes.appendChild(
    botaoEditar
);


grupoAcoes.appendChild(
    botaoRepor
);


grupoAcoes.appendChild(
    botaoFornecedor
);


colunaAcoes.appendChild(
    grupoAcoes
);


            // =====================================
            // MONTAR
            // =====================================

            linha.appendChild(
                colunaProduto
            );

            linha.appendChild(
                colunaCategoria
            );

            linha.appendChild(
                colunaPreco
            );

            linha.appendChild(
                colunaEstoque
            );

            linha.appendChild(
                colunaFornecedor
            );

            linha.appendChild(
                colunaContato
            );

            linha.appendChild(
                colunaStatus
            );

            linha.appendChild(
                colunaAcoes
            );


            tabela.appendChild(
                linha
            );
        }
    );
}


// =====================================================
// STATUS
// =====================================================

function criarStatus(
    quantidade,
    maximo
) {

    const status =
        document.createElement(
            "span"
        );


    status.classList.add(
        "status"
    );


    if (quantidade <= 0) {

        status.textContent =
            "Esgotado";


        status.classList.add(
            "status-esgotado"
        );


        return status;
    }


    const limite =
        maximo > 0
            ? maximo * 0.2
            : 10;


    if (quantidade <= limite) {

        status.textContent =
            "Estoque baixo";


        status.classList.add(
            "status-baixo"
        );


        return status;
    }


    status.textContent =
        "Disponível";


    status.classList.add(
        "status-disponivel"
    );


    return status;
}


// =====================================================
// ABRIR MODAL
// =====================================================


// =====================================================
// ABRIR MODAL DO FORNECEDOR
// =====================================================

function abrirModalFornecedor(
    produto
) {

    const modal =
        document.getElementById(
            "modalFornecedor"
        );


    if (!modal) {
        return;
    }


    if (
        !produto.id_fornecedor ||
        !produto.id_item_estoque
    ) {

        return;
    }


    definirTexto(
        "fornecedorCategoria",
        produto.categoria || "-"
    );


    definirTexto(
        "fornecedorEstoque",
        `#${produto.id_item_estoque}`
    );


    const idFornecedor =
        document.getElementById(
            "fornecedorId"
        );


    const idEstoque =
        document.getElementById(
            "fornecedorIdEstoque"
        );


    const nome =
        document.getElementById(
            "fornecedorNome"
        );


    const contato =
        document.getElementById(
            "fornecedorContato"
        );


    const mensagem =
        document.getElementById(
            "mensagemFornecedor"
        );


    idFornecedor.value =
        produto.id_fornecedor;


    idEstoque.value =
        produto.id_item_estoque;


    nome.value =
        produto.fornecedor || "";


    contato.value =
        produto.contato || "";


    mensagem.textContent =
        "";


    mensagem.className =
        "mensagem-modal";


    modal.classList.add(
        "ativo"
    );


    document.body.classList.add(
        "modal-aberto"
    );


    setTimeout(
        function () {

            nome.focus();

        },
        100
    );
}


// =====================================================
// FECHAR MODAL DO FORNECEDOR
// =====================================================

function fecharModalFornecedor() {

    const modal =
        document.getElementById(
            "modalFornecedor"
        );


    if (modal) {

        modal.classList.remove(
            "ativo"
        );
    }


    document.body.classList.remove(
        "modal-aberto"
    );
}


// =====================================================
// SALVAR FORNECEDOR
// =====================================================

async function salvarFornecedor(
    evento
) {

    evento.preventDefault();


    const idFornecedor =
        Number(
            document.getElementById(
                "fornecedorId"
            ).value
        );


    const idItemEstoque =
        Number(
            document.getElementById(
                "fornecedorIdEstoque"
            ).value
        );


    const nome =
        document.getElementById(
            "fornecedorNome"
        ).value.trim();


    const contato =
        document.getElementById(
            "fornecedorContato"
        ).value.trim();


    const botao =
        document.getElementById(
            "botaoSalvarFornecedor"
        );


    if (
        !Number.isInteger(idFornecedor) ||
        idFornecedor <= 0
    ) {

        mostrarMensagemFornecedor(
            "Fornecedor inválido.",
            "erro"
        );

        return;
    }


    if (
        !Number.isInteger(idItemEstoque) ||
        idItemEstoque <= 0
    ) {

        mostrarMensagemFornecedor(
            "Estoque relacionado inválido.",
            "erro"
        );

        return;
    }


    if (nome === "") {

        mostrarMensagemFornecedor(
            "Informe o nome do fornecedor.",
            "erro"
        );

        return;
    }


    if (contato === "") {

        mostrarMensagemFornecedor(
            "Informe o contato do fornecedor.",
            "erro"
        );

        return;
    }


    try {

        botao.disabled =
            true;


        botao.textContent =
            "Salvando...";


        const resposta =
            await fetch(
                "../atualizar_fornecedor.php",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            id_fornecedor:
                                idFornecedor,

                            id_item_estoque:
                                idItemEstoque,

                            nome:
                                nome,

                            contato:
                                contato

                        })
                }
            );


        const resultado =
            await resposta.json();


        if (
            !resposta.ok ||
            !resultado.sucesso
        ) {

            throw new Error(
                resultado.mensagem ||
                "Não foi possível atualizar o fornecedor."
            );
        }


        mostrarMensagemFornecedor(
            resultado.mensagem,
            "sucesso"
        );


        // Atualiza toda a tabela.
        // Isso é importante porque vários produtos
        // podem compartilhar o mesmo fornecedor.

        await carregarDadosAdmin();


        setTimeout(
            function () {

                fecharModalFornecedor();

            },
            900
        );


    } catch (erro) {

        console.error(
            "Erro ao atualizar fornecedor:",
            erro
        );


        mostrarMensagemFornecedor(
            erro.message,
            "erro"
        );


    } finally {

        botao.disabled =
            false;


        botao.textContent =
            "Salvar fornecedor";
    }
}


// =====================================================
// MENSAGEM FORNECEDOR
// =====================================================

function mostrarMensagemFornecedor(
    texto,
    tipo
) {

    const mensagem =
        document.getElementById(
            "mensagemFornecedor"
        );


    if (!mensagem) {
        return;
    }


    mensagem.textContent =
        texto;


    mensagem.className =
        "mensagem-modal";


    if (tipo === "sucesso") {

        mensagem.classList.add(
            "mensagem-sucesso"
        );

    } else {

        mensagem.classList.add(
            "mensagem-erro"
        );
    }
}




function abrirModalReposicao(
    produto
) {

    const modal =
        document.getElementById(
            "modalReposicao"
        );


    if (!modal) {
        return;
    }


    const atual =
        Number(
            produto.qtd_item
        ) || 0;


    const maximo =
        Number(
            produto.qtd_max_produto
        ) || 0;


    const disponivel =
        maximo > 0
            ? Math.max(
                0,
                maximo - atual
            )
            : 0;


    definirTexto(
        "modalNomeProduto",
        produto.nome
    );


    definirTexto(
        "modalEstoqueAtual",
        atual
    );


    definirTexto(
        "modalEstoqueMaximo",
        maximo
    );


    definirTexto(
        "modalDisponivel",
        disponivel
    );


    const idProduto =
        document.getElementById(
            "modalIdProduto"
        );


    const quantidade =
        document.getElementById(
            "quantidadeReposicao"
        );


    const mensagem =
        document.getElementById(
            "mensagemReposicao"
        );


    if (idProduto) {

        idProduto.value =
            produto.id_produto;
    }


    if (quantidade) {

        quantidade.value = "";

        quantidade.min = "1";


        if (maximo > 0) {

            quantidade.max =
                String(disponivel);

        } else {

            quantidade.removeAttribute(
                "max"
            );
        }
    }


    if (mensagem) {

        mensagem.textContent = "";

        mensagem.className =
            "mensagem-modal";
    }


    modal.classList.add(
        "ativo"
    );


    document.body.classList.add(
        "modal-aberto"
    );


    setTimeout(
        function () {

            if (quantidade) {
                quantidade.focus();
            }

        },
        100
    );
}


// =====================================================
// FECHAR MODAL
// =====================================================

function fecharModalReposicao() {

    const modal =
        document.getElementById(
            "modalReposicao"
        );


    if (modal) {

        modal.classList.remove(
            "ativo"
        );
    }


    document.body.classList.remove(
        "modal-aberto"
    );
}


// =====================================================
// ENVIAR REPOSIÇÃO
// =====================================================

async function enviarReposicao(
    evento
) {

    evento.preventDefault();


    const idProduto =
        Number(
            document.getElementById(
                "modalIdProduto"
            ).value
        );


    const campoQuantidade =
        document.getElementById(
            "quantidadeReposicao"
        );


    const quantidade =
        Number(
            campoQuantidade.value
        );


    const mensagem =
        document.getElementById(
            "mensagemReposicao"
        );


    const botao =
        document.getElementById(
            "botaoConfirmarReposicao"
        );


    if (
        !Number.isInteger(quantidade) ||
        quantidade <= 0
    ) {

        mostrarMensagemModal(
            "Informe uma quantidade válida.",
            "erro"
        );

        return;
    }


    try {

        botao.disabled =
            true;


        botao.textContent =
            "Atualizando...";


        const resposta =
            await fetch(
                "../repor_estoque.php",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            id_produto:
                                idProduto,

                            quantidade:
                                quantidade

                        })
                }
            );


        const resultado =
            await resposta.json();


        if (
            !resposta.ok ||
            !resultado.sucesso
        ) {

            throw new Error(
                resultado.mensagem ||
                "Não foi possível atualizar o estoque."
            );
        }


        mostrarMensagemModal(
            resultado.mensagem,
            "sucesso"
        );


        await carregarDadosAdmin();


        setTimeout(
            function () {

                fecharModalReposicao();

            },
            900
        );


    } catch (erro) {

        console.error(
            "Erro ao repor estoque:",
            erro
        );


        mostrarMensagemModal(
            erro.message,
            "erro"
        );


    } finally {

        botao.disabled =
            false;


        botao.textContent =
            "Confirmar reposição";
    }
}


// =====================================================
// MENSAGEM MODAL
// =====================================================

function mostrarMensagemModal(
    texto,
    tipo
) {

    const mensagem =
        document.getElementById(
            "mensagemReposicao"
        );


    if (!mensagem) {
        return;
    }


    mensagem.textContent =
        texto;


    mensagem.className =
        "mensagem-modal";


    if (tipo === "sucesso") {

        mensagem.classList.add(
            "mensagem-sucesso"
        );

    } else {

        mensagem.classList.add(
            "mensagem-erro"
        );
    }
}


// =====================================================
// MOEDA
// =====================================================

function formatarMoeda(
    valor
) {

    return (
        Number(valor) || 0
    ).toLocaleString(
        "pt-BR",
        {

            style:
                "currency",

            currency:
                "BRL"

        }
    );
}


// =====================================================
// EVENTOS
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        carregarDashboard();

        const modalEdicao =
    document.getElementById(
        "modalEditarProduto"
    );


if (modalEdicao) {

    modalEdicao.addEventListener(
        "click",
        function (evento) {

            if (
                evento.target ===
                modalEdicao
            ) {

                fecharModalEdicao();
            }
        }
    );
}

        const pesquisa =
            document.getElementById(
                "pesquisaProduto"
            );


        const categoria =
            document.getElementById(
                "filtroCategoria"
            );


        const formulario =
            document.getElementById(
                "formReposicao"
            );

            


        const modal =
            document.getElementById(
                "modalReposicao"
            );


            const formularioEdicao =
    document.getElementById(
        "formEditarProduto"
    );

    const formularioFornecedor =
    document.getElementById(
        "formFornecedor"
    );


const modalFornecedor =
    document.getElementById(
        "modalFornecedor"
    );

    if (formularioFornecedor) {

    formularioFornecedor.addEventListener(
        "submit",
        salvarFornecedor
    );
}

if (modalFornecedor) {

    modalFornecedor.addEventListener(
        "click",
        function (evento) {

            if (
                evento.target ===
                modalFornecedor
            ) {

                fecharModalFornecedor();
            }
        }
    );
}


        if (pesquisa) {

            pesquisa.addEventListener(
                "input",
                aplicarFiltros
            );
        }


        if (categoria) {

            categoria.addEventListener(
                "change",
                aplicarFiltros
            );
        }


        if (formulario) {

            formulario.addEventListener(
                "submit",
                enviarReposicao
            );
        }

        if (formularioEdicao) {

    formularioEdicao.addEventListener(
        "submit",
        salvarEdicaoProduto
    );
}


        // Clicar fora fecha modal

        if (modal) {

            modal.addEventListener(
                "click",
                function (evento) {

                    if (
                        evento.target === modal
                    ) {

                        fecharModalReposicao();
                    }
                }
            );
        }


        carregarDadosAdmin();

    }

    
);


// =====================================================
// ESC FECHA MODAL
// =====================================================

document.addEventListener(
    "keydown",
    function (evento) {

if (
    evento.key === "Escape"
) {

    fecharModalReposicao();

    fecharModalEdicao();

    fecharModalFornecedor();
}
    }
);


// =====================================================
// ABRIR MODAL DE EDIÇÃO
// =====================================================

function abrirModalEdicao(
    produto
) {

    const modal =
        document.getElementById(
            "modalEditarProduto"
        );


    if (!modal) {
        return;
    }


    const id =
        document.getElementById(
            "editarIdProduto"
        );


    const nome =
        document.getElementById(
            "editarNome"
        );


    const preco =
        document.getElementById(
            "editarPreco"
        );


    const descricao =
        document.getElementById(
            "editarDescricao"
        );


    const mensagem =
        document.getElementById(
            "mensagemEdicao"
        );


    id.value =
        produto.id_produto;


    nome.value =
        produto.nome || "";


    preco.value =
        Number(
            produto.preco
        ).toFixed(2);


    descricao.value =
        produto.descricao || "";


    mensagem.textContent =
        "";


    mensagem.className =
        "mensagem-modal";


    modal.classList.add(
        "ativo"
    );


    document.body.classList.add(
        "modal-aberto"
    );


    setTimeout(
        function () {

            nome.focus();

        },
        100
    );
}


// =====================================================
// FECHAR MODAL DE EDIÇÃO
// =====================================================

function fecharModalEdicao() {

    const modal =
        document.getElementById(
            "modalEditarProduto"
        );


    if (modal) {

        modal.classList.remove(
            "ativo"
        );
    }


    document.body.classList.remove(
        "modal-aberto"
    );
}


// =====================================================
// SALVAR EDIÇÃO
// =====================================================

async function salvarEdicaoProduto(
    evento
) {

    evento.preventDefault();


    const idProduto =
        Number(
            document.getElementById(
                "editarIdProduto"
            ).value
        );


    const nome =
        document.getElementById(
            "editarNome"
        ).value.trim();


    const preco =
        Number(
            document.getElementById(
                "editarPreco"
            ).value
        );


    const descricao =
        document.getElementById(
            "editarDescricao"
        ).value.trim();


    const botao =
        document.getElementById(
            "botaoSalvarProduto"
        );


    if (nome === "") {

        mostrarMensagemEdicao(
            "Informe o nome do produto.",
            "erro"
        );

        return;
    }


    if (
        !Number.isFinite(preco) ||
        preco < 0
    ) {

        mostrarMensagemEdicao(
            "Informe um preço válido.",
            "erro"
        );

        return;
    }


    try {

        botao.disabled =
            true;


        botao.textContent =
            "Salvando...";


        const resposta =
            await fetch(
                "../editar_produto.php",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            id_produto:
                                idProduto,

                            nome:
                                nome,

                            preco:
                                preco,

                            descricao:
                                descricao

                        })
                }
            );


        const resultado =
            await resposta.json();


        if (
            !resposta.ok ||
            !resultado.sucesso
        ) {

            throw new Error(
                resultado.mensagem ||
                "Não foi possível atualizar o produto."
            );
        }


        mostrarMensagemEdicao(
            resultado.mensagem,
            "sucesso"
        );


        // Atualiza os dados da tabela
        // sem precisar recarregar a página.

        await carregarDadosAdmin();


        setTimeout(
            function () {

                fecharModalEdicao();

            },
            900
        );


    } catch (erro) {

        console.error(
            "Erro ao editar produto:",
            erro
        );


        mostrarMensagemEdicao(
            erro.message,
            "erro"
        );


    } finally {

        botao.disabled =
            false;


        botao.textContent =
            "Salvar alterações";
    }
}


// =====================================================
// MENSAGEM DO MODAL DE EDIÇÃO
// =====================================================

function mostrarMensagemEdicao(
    texto,
    tipo
) {

    const mensagem =
        document.getElementById(
            "mensagemEdicao"
        );


    if (!mensagem) {
        return;
    }


    mensagem.textContent =
        texto;


    mensagem.className =
        "mensagem-modal";


    if (tipo === "sucesso") {

        mensagem.classList.add(
            "mensagem-sucesso"
        );

    } else {

        mensagem.classList.add(
            "mensagem-erro"
        );
    }
}


// =====================================================
// DASHBOARD
// =====================================================

async function carregarDashboard() {

    const tabela =
        document.getElementById(
            "dashboardListaPedidos"
        );

    try {

        const resposta =
            await fetch(
                "../dashboard_admin.php"
            );


        const resultado =
            await resposta.json();


        if (
            !resposta.ok ||
            !resultado.sucesso
        ) {

            throw new Error(
                resultado.mensagem ||
                "Erro ao carregar dashboard."
            );
        }


        const resumo =
            resultado.resumo;


        definirTexto(
            "dashboardFaturamento",
            formatarDinheiro(
                resumo.faturamento
            )
        );


        definirTexto(
            "dashboardPedidos",
            resumo.total_pedidos
        );


        definirTexto(
            "dashboardVendidos",
            resumo.produtos_vendidos
        );


        definirTexto(
            "dashboardTicket",
            formatarDinheiro(
                resumo.ticket_medio
            )
        );


        // ==========================================
        // MAIS VENDIDO
        // ==========================================

        if (resultado.mais_vendido) {

            definirTexto(
                "dashboardMaisVendido",

                `${resultado.mais_vendido.nome} — ${resultado.mais_vendido.quantidade} unidade(s)`
            );

        } else {

            definirTexto(
                "dashboardMaisVendido",
                "Nenhuma venda registrada"
            );
        }


        // ==========================================
        // PEDIDOS
        // ==========================================

        renderizarPedidosDashboard(
            resultado.pedidos
        );


    } catch (erro) {

        console.error(
            "Erro no dashboard:",
            erro
        );


        if (tabela) {

            tabela.innerHTML = `
                <tr>
                    <td colspan="6">
                        Não foi possível carregar os pedidos.
                    </td>
                </tr>
            `;
        }
    }
}


// =====================================================
// RENDERIZAR PEDIDOS
// =====================================================

function renderizarPedidosDashboard(
    pedidos
) {

    const tabela =
        document.getElementById(
            "dashboardListaPedidos"
        );


    if (!tabela) {
        return;
    }


    tabela.innerHTML =
        "";


    if (
        !Array.isArray(pedidos) ||
        pedidos.length === 0
    ) {

        tabela.innerHTML = `
            <tr>
                <td colspan="6">
                    Nenhum pedido registrado.
                </td>
            </tr>
        `;

        return;
    }


    pedidos.forEach(
        function (pedido) {

            const linha =
                document.createElement(
                    "tr"
                );


            adicionarCelula(
                linha,
                `#${pedido.id_pedido}`
            );


            adicionarCelula(
                linha,
                pedido.cliente
            );


            adicionarCelula(
                linha,
                formatarDataPedido(
                    pedido.data_pedido
                )
            );


            adicionarCelula(
                linha,
                pedido.quantidade_itens
            );


            adicionarCelula(
                linha,
                formatarDinheiro(
                    pedido.valor_total
                )
            );


            // STATUS

            const colunaStatus =
                document.createElement(
                    "td"
                );


            const status =
                document.createElement(
                    "span"
                );


            status.className =
                "status-pedido";


            status.textContent =
                pedido.status || "Pendente";


            colunaStatus.appendChild(
                status
            );


            linha.appendChild(
                colunaStatus
            );


            tabela.appendChild(
                linha
            );
        }
    );
}


// =====================================================
// ADICIONAR CÉLULA
// =====================================================

function adicionarCelula(
    linha,
    texto
) {

    const coluna =
        document.createElement(
            "td"
        );


    coluna.textContent =
        texto;


    linha.appendChild(
        coluna
    );
}


// =====================================================
// FORMATAR DINHEIRO
// =====================================================

function formatarDinheiro(
    valor
) {

    return Number(
        valor || 0
    ).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );
}


// =====================================================
// FORMATAR DATA
// =====================================================

function formatarDataPedido(
    data
) {

    if (!data) {
        return "-";
    }


    // PostgreSQL normalmente retorna:
    // 2026-10-06 20:30:00

    const dataConvertida =
        new Date(
            data.replace(
                " ",
                "T"
            )
        );


    if (
        Number.isNaN(
            dataConvertida.getTime()
        )
    ) {

        return data;
    }


    return dataConvertida.toLocaleString(
        "pt-BR",
        {
            dateStyle:
                "short",

            timeStyle:
                "short"
        }
    );
}