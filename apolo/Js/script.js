// ==========================================
// SISTEMA ADMINISTRATIVO DA LOJA
// ==========================================


// ==========================================
// SISTEMA DE MODAIS
// ==========================================

function criarEstruturaModal() {

    if (document.querySelector("#modalOverlay")) {
        return;
    }

    const overlay = document.createElement("div");

    overlay.id = "modalOverlay";
    overlay.className = "modal-overlay";

    overlay.innerHTML = `
        <div class="modal-box" role="dialog" aria-modal="true">

            <p
                class="modal-mensagem"
                id="modalMensagem"
            ></p>

            <input
                type="text"
                class="modal-input"
                id="modalInput"
                style="display: none;"
            >

            <div
                class="modal-botoes"
                id="modalBotoes"
            ></div>

        </div>
    `;

    document.body.appendChild(overlay);


    overlay.addEventListener("click", function(event) {

        if (event.target === overlay) {

            const botaoCancelar =
                document.querySelector("#modalBtnCancelar");

            if (botaoCancelar) {
                botaoCancelar.click();
            }
        }

    });


    document.addEventListener("keydown", function(event) {

        if (
            event.key === "Escape" &&
            overlay.classList.contains("aberto")
        ) {

            const botaoCancelar =
                document.querySelector("#modalBtnCancelar");

            if (botaoCancelar) {

                botaoCancelar.click();

            } else {

                const botaoOk =
                    document.querySelector("#modalBtnOk");

                if (botaoOk) {
                    botaoOk.click();
                }

            }

        }

    });

}


function abrirModal() {

    const modal =
        document.querySelector("#modalOverlay");

    if (modal) {
        modal.classList.add("aberto");
    }

}


function fecharModal() {

    const modal =
        document.querySelector("#modalOverlay");

    if (modal) {
        modal.classList.remove("aberto");
    }

}


// ==========================================
// MODAL ALERT
// ==========================================

function modalAlert(mensagem) {

    criarEstruturaModal();

    return new Promise(function(resolve) {

        document.querySelector("#modalMensagem").textContent =
            mensagem;

        document.querySelector("#modalInput").style.display =
            "none";


        const botoes =
            document.querySelector("#modalBotoes");


        botoes.innerHTML = `
            <button
                type="button"
                class="modal-btn-principal"
                id="modalBtnOk"
            >
                OK
            </button>
        `;


        abrirModal();


        document
            .querySelector("#modalBtnOk")
            .addEventListener("click", function() {

                fecharModal();

                resolve();

            });


        document
            .querySelector("#modalBtnOk")
            .focus();

    });

}


// ==========================================
// MODAL CONFIRM
// ==========================================

function modalConfirm(mensagem) {

    criarEstruturaModal();

    return new Promise(function(resolve) {

        document.querySelector("#modalMensagem").textContent =
            mensagem;

        document.querySelector("#modalInput").style.display =
            "none";


        const botoes =
            document.querySelector("#modalBotoes");


        botoes.innerHTML = `
            <button
                type="button"
                class="modal-btn-secundario"
                id="modalBtnCancelar"
            >
                Cancelar
            </button>

            <button
                type="button"
                class="modal-btn-perigo"
                id="modalBtnConfirmar"
            >
                Confirmar
            </button>
        `;


        abrirModal();


        document
            .querySelector("#modalBtnConfirmar")
            .addEventListener("click", function() {

                fecharModal();

                resolve(true);

            });


        document
            .querySelector("#modalBtnCancelar")
            .addEventListener("click", function() {

                fecharModal();

                resolve(false);

            });


        document
            .querySelector("#modalBtnConfirmar")
            .focus();

    });

}


// ==========================================
// MODAL PROMPT
// ==========================================

function modalPrompt(mensagem, valorAtual) {

    criarEstruturaModal();

    return new Promise(function(resolve) {

        document.querySelector("#modalMensagem").textContent =
            mensagem;


        const input =
            document.querySelector("#modalInput");


        input.style.display = "block";

        input.value = valorAtual || "";


        const botoes =
            document.querySelector("#modalBotoes");


        botoes.innerHTML = `
            <button
                type="button"
                class="modal-btn-secundario"
                id="modalBtnCancelar"
            >
                Cancelar
            </button>

            <button
                type="button"
                class="modal-btn-principal"
                id="modalBtnOk"
            >
                Salvar
            </button>
        `;


        abrirModal();


        input.focus();
        input.select();


        function confirmar() {

            fecharModal();

            resolve(input.value);

        }


        document
            .querySelector("#modalBtnOk")
            .addEventListener(
                "click",
                confirmar
            );


        input.onkeydown = function(event) {

            if (event.key === "Enter") {
                confirmar();
            }

        };


        document
            .querySelector("#modalBtnCancelar")
            .addEventListener("click", function() {

                fecharModal();

                resolve(null);

            });

    });

}


// ==========================================
// LOGIN
// ==========================================

const formularioLogin =
    document.querySelector("#usuario");


if (formularioLogin) {

    const formulario =
        document.querySelector("form");


    formulario.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const usuario =
                document.querySelector("#usuario").value;


            const senha =
                document.querySelector("#senha").value;


            if (
                usuario === "admin" &&
                senha === "1234"
            ) {

                await modalAlert(
                    "Login realizado com sucesso!"
                );


                window.location.href =
                    "dashboard.html";

            } else {

                await modalAlert(
                    "Usuário ou senha incorretos!"
                );

            }

        }
    );

}


// ==========================================
// PRODUTOS
// ==========================================

function carregarProdutos() {

    const dados =
        localStorage.getItem("produtos");


    return dados
        ? JSON.parse(dados)
        : [];

}


function salvarProdutos(produtos) {

    localStorage.setItem(
        "produtos",
        JSON.stringify(produtos)
    );

}


let produtos =
    carregarProdutos();


// ==========================================
// BOTÃO ADICIONAR PRODUTO
// ==========================================

const botaoAdicionar =
    document.querySelector("#btnAdicionar");


if (botaoAdicionar) {

    botaoAdicionar.addEventListener(
        "click",
        function() {

            const formulario =
                document.querySelector("#formProduto");


            if (formulario) {
                formulario.style.display = "block";
            }

        }
    );

}


// ==========================================
// BUSCA DE PRODUTOS
// ==========================================

function atualizarOpcoesBuscaProduto() {

    const select =
        document.querySelector("#buscaProduto");


    if (!select) {
        return;
    }


    const valorSelecionado =
        select.value;


    const nomesUnicos =
        [
            ...new Set(
                produtos.map(function(produto) {
                    return produto.nome;
                })
            )
        ].sort();


    select.innerHTML = `
        <option value="">
            Todos os produtos
        </option>
    `;


    nomesUnicos.forEach(function(nome) {

        const option =
            document.createElement("option");


        option.value = nome;

        option.textContent = nome;


        select.appendChild(option);

    });


    if (
        nomesUnicos.includes(valorSelecionado)
    ) {

        select.value =
            valorSelecionado;

    }

}


// ==========================================
// ALERTA DE ESTOQUE
// ==========================================

function atualizarResumoEstoque() {

    const resumo =
        document.querySelector("#resumoEstoque");


    if (!resumo) {
        return;
    }


    const baixos =
        produtos.filter(function(produto) {

            return Number(produto.quantidade) <= 5;

        });


    if (baixos.length === 0) {

        resumo.classList.remove("visivel");

        return;

    }


    const plural =
        baixos.length === 1
            ? "produto está"
            : "produtos estão";


    resumo.textContent =
        `⚠ ${baixos.length} ${plural} com estoque baixo.`;


    resumo.classList.add("visivel");

}


// ==========================================
// RENDERIZAR PRODUTOS
// ==========================================

function renderizarProdutos() {

    const tabela =
        document.querySelector("#tabelaEstoque");


    if (!tabela) {
        return;
    }


    atualizarOpcoesBuscaProduto();


    tabela.innerHTML = "";


    const select =
        document.querySelector("#buscaProduto");


    const nomeEscolhido =
        select
            ? select.value
            : "";


    const produtosFiltrados =
        produtos.filter(function(produto) {

            return (
                nomeEscolhido === "" ||
                produto.nome === nomeEscolhido
            );

        });


    if (
        produtosFiltrados.length === 0 &&
        nomeEscolhido !== ""
    ) {

        tabela.innerHTML = `
            <tr>

                <td
                    colspan="5"
                    style="
                        text-align: center;
                        color: var(--ink-soft);
                    "
                >
                    Nenhum produto encontrado.
                </td>

            </tr>
        `;

        atualizarResumoEstoque();

        return;

    }


    produtosFiltrados.forEach(
        function(produto) {

            const index =
                produtos.indexOf(produto);


            const quantidade =
                Number(produto.quantidade);


            const linha =
                document.createElement("tr");


            let selo = "";


            if (quantidade <= 5) {

                linha.classList.add(
                    "linha-estoque-baixo"
                );


                selo = `
                    <span
                        class="selo-estoque selo-baixo"
                    >
                        Baixo
                    </span>
                `;

            } else if (quantidade <= 15) {

                linha.classList.add(
                    "linha-estoque-atencao"
                );


                selo = `
                    <span
                        class="selo-estoque selo-atencao"
                    >
                        Atenção
                    </span>
                `;

            }


            linha.innerHTML = `

                <td class="produto-nome">
                    ${produto.nome}
                </td>

                <td>
                    ${produto.categoria}
                </td>

                <td>
                    ${produto.quantidade}
                    ${selo}
                </td>

                <td>
                    R$ ${Number(produto.preco).toFixed(2)}
                </td>

                <td>

                    <button
                        type="button"
                        class="btnEditar"
                        data-index="${index}"
                    >
                        Editar
                    </button>

                    <button
                        type="button"
                        class="btnExcluir"
                        data-index="${index}"
                    >
                        Excluir
                    </button>

                </td>

            `;


            tabela.appendChild(linha);

        }
    );


    atualizarResumoEstoque();

}


// ==========================================
// CADASTRAR PRODUTO
// ==========================================

const formularioProduto =
    document.querySelector("#produtoForm");


if (formularioProduto) {

    formularioProduto.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const nome =
                document.querySelector(
                    "#nomeProduto"
                ).value.trim();


            const categoria =
                document.querySelector(
                    "#categoriaProduto"
                ).value.trim();


            const quantidade =
                document.querySelector(
                    "#quantidadeProduto"
                ).value;


            const preco =
                document.querySelector(
                    "#precoProduto"
                ).value;


            if (
                nome === "" ||
                categoria === "" ||
                quantidade === "" ||
                preco === ""
            ) {

                await modalAlert(
                    "Preencha todos os campos!"
                );

                return;

            }


            if (
                Number(quantidade) < 0 ||
                Number(preco) < 0
            ) {

                await modalAlert(
                    "Quantidade e preço não podem ser negativos."
                );

                return;

            }


            produtos.push({

                nome: nome,

                categoria: categoria,

                quantidade: Number(quantidade),

                preco: Number(preco)

            });


            salvarProdutos(produtos);


            renderizarProdutos();


            formularioProduto.reset();


            document.querySelector(
                "#formProduto"
            ).style.display = "none";


            await modalAlert(
                "Produto cadastrado com sucesso!"
            );

        }
    );

}


// ==========================================
// EDITAR / EXCLUIR PRODUTO
// ==========================================

const tabelaProdutos =
    document.querySelector("#tabelaEstoque");


if (tabelaProdutos) {

    tabelaProdutos.addEventListener(
        "click",
        async function(event) {

            const index =
                Number(event.target.dataset.index);


            // EDITAR

            if (
                event.target.classList.contains(
                    "btnEditar"
                )
            ) {

                const produto =
                    produtos[index];


                if (!produto) {
                    return;
                }


                const novoNome =
                    await modalPrompt(
                        "Digite o novo nome do produto:",
                        produto.nome
                    );


                if (novoNome === null) {
                    return;
                }


                if (
                    novoNome.trim() === ""
                ) {

                    await modalAlert(
                        "O nome não pode ficar vazio!"
                    );

                    return;

                }


                produto.nome =
                    novoNome.trim();


                salvarProdutos(produtos);


                renderizarProdutos();

                return;

            }


            // EXCLUIR

            if (
                event.target.classList.contains(
                    "btnExcluir"
                )
            ) {

                const confirmou =
                    await modalConfirm(
                        "Tem certeza que deseja excluir este produto?"
                    );


                if (!confirmou) {
                    return;
                }


                produtos.splice(index, 1);


                salvarProdutos(produtos);


                renderizarProdutos();

            }

        }
    );

}


renderizarProdutos();


const campoBuscaProduto =
    document.querySelector("#buscaProduto");


if (campoBuscaProduto) {

    campoBuscaProduto.addEventListener(
        "change",
        function() {

            renderizarProdutos();

        }
    );

}


// ==========================================
// FORNECEDORES
// ==========================================

function carregarFornecedores() {

    const dados =
        localStorage.getItem("fornecedores");


    return dados
        ? JSON.parse(dados)
        : [];

}


function salvarFornecedores(fornecedores) {

    localStorage.setItem(
        "fornecedores",
        JSON.stringify(fornecedores)
    );

}


let fornecedores =
    carregarFornecedores();


// ==========================================
// BOTÃO ADICIONAR FORNECEDOR
// ==========================================

const botaoAdicionarFornecedor =
    document.querySelector(
        "#btnAdicionarFornecedor"
    );


if (botaoAdicionarFornecedor) {

    botaoAdicionarFornecedor.addEventListener(
        "click",
        function() {

            const formulario =
                document.querySelector(
                    "#formFornecedor"
                );


            if (formulario) {
                formulario.style.display =
                    "block";
            }

        }
    );

}


// ==========================================
// BUSCA DE FORNECEDORES
// ==========================================

function atualizarOpcoesBuscaFornecedor() {

    const select =
        document.querySelector(
            "#buscaFornecedor"
        );


    if (!select) {
        return;
    }


    const valorSelecionado =
        select.value;


    const nomesUnicos =
        [
            ...new Set(
                fornecedores.map(
                    function(fornecedor) {
                        return fornecedor.nome;
                    }
                )
            )
        ].sort();


    select.innerHTML = `
        <option value="">
            Todos os fornecedores
        </option>
    `;


    nomesUnicos.forEach(function(nome) {

        const option =
            document.createElement("option");


        option.value = nome;

        option.textContent = nome;


        select.appendChild(option);

    });


    if (
        nomesUnicos.includes(
            valorSelecionado
        )
    ) {

        select.value =
            valorSelecionado;

    }

}


// ==========================================
// RENDERIZAR FORNECEDORES
// ==========================================

function renderizarFornecedores() {

    const tabela =
        document.querySelector(
            "#tabelaFornecedores"
        );


    if (!tabela) {
        return;
    }


    atualizarOpcoesBuscaFornecedor();


    tabela.innerHTML = "";


    const select =
        document.querySelector(
            "#buscaFornecedor"
        );


    const nomeEscolhido =
        select
            ? select.value
            : "";


    const fornecedoresFiltrados =
        fornecedores.filter(
            function(fornecedor) {

                return (
                    nomeEscolhido === "" ||
                    fornecedor.nome === nomeEscolhido
                );

            }
        );


    if (
        fornecedoresFiltrados.length === 0 &&
        nomeEscolhido !== ""
    ) {

        tabela.innerHTML = `
            <tr>

                <td
                    colspan="5"
                    style="
                        text-align: center;
                        color: var(--ink-soft);
                    "
                >
                    Nenhum fornecedor encontrado.
                </td>

            </tr>
        `;

        return;

    }


    fornecedoresFiltrados.forEach(
        function(fornecedor) {

            const index =
                fornecedores.indexOf(
                    fornecedor
                );


            const linha =
                document.createElement("tr");


            linha.innerHTML = `

                <td>
                    ${fornecedor.nome}
                </td>

                <td>
                    ${fornecedor.contato}
                </td>

                <td>
                    ${fornecedor.telefone}
                </td>

                <td>
                    ${fornecedor.email}
                </td>

                <td>

                    <button
                        type="button"
                        class="btnEditarFornecedor"
                        data-index="${index}"
                    >
                        Editar
                    </button>

                    <button
                        type="button"
                        class="btnExcluirFornecedor"
                        data-index="${index}"
                    >
                        Excluir
                    </button>

                </td>

            `;


            tabela.appendChild(linha);

        }
    );

}


// ==========================================
// CADASTRAR FORNECEDOR
// ==========================================

const formularioFornecedor =
    document.querySelector(
        "#fornecedorForm"
    );


if (formularioFornecedor) {

    formularioFornecedor.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const nome =
                document.querySelector(
                    "#nomeFornecedor"
                ).value.trim();


            const contato =
                document.querySelector(
                    "#contatoFornecedor"
                ).value.trim();


            const telefone =
                document.querySelector(
                    "#telefoneFornecedor"
                ).value.trim();


            const email =
                document.querySelector(
                    "#emailFornecedor"
                ).value.trim();


            if (
                nome === "" ||
                contato === "" ||
                telefone === "" ||
                email === ""
            ) {

                await modalAlert(
                    "Preencha todos os campos!"
                );

                return;

            }


            fornecedores.push({

                nome: nome,

                contato: contato,

                telefone: telefone,

                email: email

            });


            salvarFornecedores(
                fornecedores
            );


            renderizarFornecedores();


            formularioFornecedor.reset();


            document.querySelector(
                "#formFornecedor"
            ).style.display = "none";


            await modalAlert(
                "Fornecedor cadastrado com sucesso!"
            );

        }
    );

}


// ==========================================
// EDITAR / EXCLUIR FORNECEDOR
// ==========================================

const tabelaFornecedores =
    document.querySelector(
        "#tabelaFornecedores"
    );


if (tabelaFornecedores) {

    tabelaFornecedores.addEventListener(
        "click",
        async function(event) {

            const index =
                Number(
                    event.target.dataset.index
                );


            // EDITAR

            if (
                event.target.classList.contains(
                    "btnEditarFornecedor"
                )
            ) {

                const fornecedor =
                    fornecedores[index];


                if (!fornecedor) {
                    return;
                }


                const novoNome =
                    await modalPrompt(
                        "Digite o novo nome do fornecedor:",
                        fornecedor.nome
                    );


                if (novoNome === null) {
                    return;
                }


                if (
                    novoNome.trim() === ""
                ) {

                    await modalAlert(
                        "O nome não pode ficar vazio!"
                    );

                    return;

                }


                fornecedor.nome =
                    novoNome.trim();


                salvarFornecedores(
                    fornecedores
                );


                renderizarFornecedores();

                return;

            }


            // EXCLUIR

            if (
                event.target.classList.contains(
                    "btnExcluirFornecedor"
                )
            ) {

                const confirmou =
                    await modalConfirm(
                        "Tem certeza que deseja excluir este fornecedor?"
                    );


                if (!confirmou) {
                    return;
                }


                fornecedores.splice(
                    index,
                    1
                );


                salvarFornecedores(
                    fornecedores
                );


                renderizarFornecedores();

            }

        }
    );

}


renderizarFornecedores();


const campoBuscaFornecedor =
    document.querySelector(
        "#buscaFornecedor"
    );


if (campoBuscaFornecedor) {

    campoBuscaFornecedor.addEventListener(
        "change",
        function() {

            renderizarFornecedores();

        }
    );

}


// ==========================================
// PAINEL DE VENDAS
// ==========================================


// ==========================================
// CARRINHO
// ==========================================

let carrinho = [];


// ==========================================
// CARREGAR PRODUTOS NO SELECT
// ==========================================

function carregarProdutosVenda() {

    const select =
        document.querySelector(
            "#produtoVenda"
        );


    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            Selecione um produto
        </option>
    `;


    produtos.forEach(
        function(produto, index) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                index;


            option.textContent =
                `${produto.nome} — Estoque: ${produto.quantidade}`;


            select.appendChild(option);

        }
    );

}


// ==========================================
// RENDERIZAR CARRINHO
// ==========================================

function renderizarCarrinho() {

    const tabela =
        document.querySelector(
            "#tabelaCarrinho"
        );


    if (!tabela) {
        return;
    }


    tabela.innerHTML = "";


    let total = 0;


    carrinho.forEach(
        function(item, index) {

            const subtotal =
                Number(item.preco) *
                Number(item.quantidade);


            total += subtotal;


            const linha =
                document.createElement("tr");


            linha.innerHTML = `

                <td>
                    ${item.nome}
                </td>

                <td>
                    ${item.quantidade}
                </td>

                <td>
                    R$ ${Number(item.preco).toFixed(2)}
                </td>

                <td>
                    R$ ${subtotal.toFixed(2)}
                </td>

                <td>

                    <button
                        type="button"
                        class="btn-remover-item"
                        data-index="${index}"
                    >
                        Remover
                    </button>

                </td>

            `;


            tabela.appendChild(linha);

        }
    );


    const totalVenda =
        document.querySelector(
            "#totalVenda"
        );


    if (totalVenda) {

        totalVenda.textContent =
            `R$ ${total.toFixed(2)}`;

    }

}


// ==========================================
// FORMULÁRIO DE VENDA
// ==========================================

const formularioVenda =
    document.querySelector(
        "#vendaForm"
    );


if (formularioVenda) {

    carregarProdutosVenda();

    renderizarCarrinho();


    formularioVenda.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const select =
                document.querySelector(
                    "#produtoVenda"
                );


            const quantidadeInput =
                document.querySelector(
                    "#quantidadeVenda"
                );


            // ==================================
            // VERIFICAR PRODUTO
            // ==================================

            if (select.value === "") {

                await modalAlert(
                    "Selecione um produto."
                );

                return;

            }


            const index =
                Number(select.value);


            const quantidade =
                Number(
                    quantidadeInput.value
                );


            // ==================================
            // VERIFICAR QUANTIDADE
            // ==================================

            if (
                !Number.isInteger(quantidade) ||
                quantidade <= 0
            ) {

                await modalAlert(
                    "Digite uma quantidade inteira maior que zero."
                );

                return;

            }


            // ==================================
            // ENCONTRAR PRODUTO
            // ==================================

            const produto =
                produtos[index];


            if (!produto) {

                await modalAlert(
                    "Produto não encontrado."
                );

                return;

            }


            // ==================================
            // VERIFICAR ESTOQUE
            // ==================================

            if (
                quantidade >
                Number(produto.quantidade)
            ) {

                await modalAlert(
                    `Estoque insuficiente. Existem apenas ${produto.quantidade} unidades disponíveis.`
                );

                return;

            }


            // ==================================
            // VERIFICAR CARRINHO
            // ==================================

            const itemExistente =
                carrinho.find(
                    function(item) {

                        return (
                            item.produtoIndex ===
                            index
                        );

                    }
                );


            if (itemExistente) {

                const novaQuantidade =
                    Number(
                        itemExistente.quantidade
                    ) +
                    quantidade;


                if (
                    novaQuantidade >
                    Number(produto.quantidade)
                ) {

                    await modalAlert(
                        `Você só possui ${produto.quantidade} unidades desse produto no estoque.`
                    );

                    return;

                }


                itemExistente.quantidade =
                    novaQuantidade;


            } else {

                carrinho.push({

                    produtoIndex:
                        index,

                    nome:
                        produto.nome,

                    preco:
                        Number(produto.preco),

                    quantidade:
                        quantidade

                });

            }


            renderizarCarrinho();


            formularioVenda.reset();


            document.querySelector(
                "#quantidadeVenda"
            ).value = 1;

        }
    );

}


// ==========================================
// REMOVER ITEM DO CARRINHO
// ==========================================

const tabelaCarrinho =
    document.querySelector(
        "#tabelaCarrinho"
    );


if (tabelaCarrinho) {

    tabelaCarrinho.addEventListener(
        "click",
        function(event) {

            if (
                event.target.classList.contains(
                    "btn-remover-item"
                )
            ) {

                const index =
                    Number(
                        event.target.dataset.index
                    );


                carrinho.splice(
                    index,
                    1
                );


                renderizarCarrinho();

            }

        }
    );

}


// ==========================================
// FINALIZAR VENDA
// ==========================================

const botaoFinalizarVenda =
    document.querySelector(
        "#btnFinalizarVenda"
    );


if (botaoFinalizarVenda) {

    botaoFinalizarVenda.addEventListener(
        "click",
        async function() {


            // ==================================
            // VERIFICAR CARRINHO
            // ==================================

            if (
                carrinho.length === 0
            ) {

                await modalAlert(
                    "Adicione pelo menos um produto ao carrinho."
                );

                return;

            }


            // ==================================
            // FORMA DE PAGAMENTO
            // ==================================

            const formaPagamento =
                document.querySelector(
                    "#formaPagamento"
                ).value;


            if (
                formaPagamento === ""
            ) {

                await modalAlert(
                    "Selecione a forma de pagamento."
                );

                return;

            }


            // ==================================
            // CALCULAR TOTAL
            // ==================================

            let total = 0;


            carrinho.forEach(
                function(item) {

                    total +=
                        Number(item.preco) *
                        Number(item.quantidade);

                }
            );


            // ==================================
            // CONFIRMAR
            // ==================================

            const confirmou =
                await modalConfirm(
                    `Confirmar venda no valor de R$ ${total.toFixed(2)}?`
                );


            if (!confirmou) {
                return;
            }


            // ==================================
            // VERIFICAR ESTOQUE NOVAMENTE
            // ==================================

            for (
                const item of carrinho
            ) {

                const produto =
                    produtos[
                        item.produtoIndex
                    ];


                if (!produto) {

                    await modalAlert(
                        `O produto "${item.nome}" não foi encontrado no estoque.`
                    );

                    return;

                }


                if (
                    Number(item.quantidade) >
                    Number(produto.quantidade)
                ) {

                    await modalAlert(
                        `O estoque do produto "${produto.nome}" não é suficiente para concluir a venda.`
                    );

                    return;

                }

            }


            // ==================================
            // ATUALIZAR ESTOQUE
            // ==================================

            carrinho.forEach(
                function(item) {

                    const produto =
                        produtos[
                            item.produtoIndex
                        ];


                    produto.quantidade =
                        Number(
                            produto.quantidade
                        ) -
                        Number(
                            item.quantidade
                        );

                }
            );


            // ==================================
            // SALVAR ESTOQUE
            // ==================================

            salvarProdutos(
                produtos
            );


            // ==================================
            // CARREGAR VENDAS
            // ==================================

            const vendasSalvas =
                localStorage.getItem(
                    "vendas"
                );


            let vendas = [];


            if (vendasSalvas) {

                try {

                    vendas =
                        JSON.parse(
                            vendasSalvas
                        );


                    if (
                        !Array.isArray(vendas)
                    ) {

                        vendas = [];

                    }

                } catch (erro) {

                    vendas = [];

                }

            }


            // ==================================
            // CRIAR REGISTRO DA VENDA
            // ==================================

            const itensDaVenda =
                carrinho.map(
                    function(item) {

                        return {

                            produtoIndex:
                                item.produtoIndex,

                            nome:
                                item.nome,

                            preco:
                                Number(
                                    item.preco
                                ),

                            quantidade:
                                Number(
                                    item.quantidade
                                )

                        };

                    }
                );


            vendas.push({

                id:
                    Date.now(),

                data:
                    new Date().toISOString(),

                itens:
                    itensDaVenda,

                total:
                    total,

                formaPagamento:
                    formaPagamento

            });


            // ==================================
            // SALVAR VENDA
            // ==================================

            localStorage.setItem(
                "vendas",
                JSON.stringify(vendas)
            );


            // ==================================
            // LIMPAR CARRINHO
            // ==================================

            carrinho = [];


            renderizarCarrinho();


            carregarProdutosVenda();


            document.querySelector(
                "#formaPagamento"
            ).value = "";


            document.querySelector(
                "#quantidadeVenda"
            ).value = 1;


            // ==================================
            // MENSAGEM
            // ==================================

            await modalAlert(
                "Venda finalizada com sucesso!"
            );

        }
    );

}