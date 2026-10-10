// =====================================================
// ZORA - TELA DE ENTREGA
// PostgreSQL + Sessão PHP
// =====================================================


// =====================================================
// MENU
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
// VERIFICAR LOGIN
// =====================================================

async function verificarLogin() {

    try {

        const resposta = await fetch(
            "/usuario_logado.php",
            {
                method: "GET",
                credentials: "include"
            }
        );

        const resultado = await resposta.json();

        const logado =
            resultado.sucesso === true &&
            resultado.logado === true;


        const menuUsuario =
            document.getElementById("menuUsuario");

        const menuUsuarioMobile =
            document.getElementById("menuUsuarioMobile");


        const texto =
            logado ? "Perfil" : "Login";


        if (menuUsuario) {
            menuUsuario.textContent = texto;
        }


        if (menuUsuarioMobile) {
            menuUsuarioMobile.textContent = texto;
        }


        return logado;

    } catch (erro) {

        console.error(
            "Erro ao verificar login:",
            erro
        );

        return false;
    }

}


// =====================================================
// ABRIR PERFIL
// =====================================================

async function abrirPerfil() {

    const logado =
        await verificarLogin();


    if (logado) {

        window.location.href =
            "/TelaCliente/cliente.html";

    } else {

        window.location.href =
            "/TelaLogin/login.html";

    }

}


// Verifica o login ao carregar o script
verificarLogin();


// =====================================================
// CARREGAR PEDIDO
// =====================================================

const totalPedido =
    localStorage.getItem("totalPedido");

const pedidosSalvos =
    localStorage.getItem("pedidos");


let itensPedido = [];


if (pedidosSalvos) {

    try {

        itensPedido =
            JSON.parse(pedidosSalvos);

    } catch (erro) {

        console.error(
            "Erro ao carregar pedido:",
            erro
        );

        itensPedido = [];

    }

}


// =====================================================
// VERIFICAR PEDIDO
// =====================================================

if (
    !totalPedido ||
    !itensPedido ||
    itensPedido.length === 0
) {

    window.location.href =
        "/Telainicial/index.html";

} else {

    renderizarResumo();

}


// =====================================================
// RENDERIZAR RESUMO
// =====================================================

function renderizarResumo() {

    const valorTotalEl =
        document.getElementById("valorTotal");


    if (valorTotalEl) {

        valorTotalEl.textContent =
            "R$ " +
            Number(totalPedido)
                .toFixed(2)
                .replace(".", ",");

    }


    const lista =
        document.getElementById("listaResumo");


    if (!lista) {
        return;
    }


    lista.innerHTML = "";


    itensPedido.forEach(produto => {

        const quantidade =
            Number(produto.quantidade) || 1;

        const preco =
            Number(produto.preco) || 0;


        const item =
            document.createElement("li");


        item.innerHTML = `
            <span>
                ${quantidade}x ${produto.nome}
            </span>

            <span>
                R$ ${(preco * quantidade)
                    .toFixed(2)
                    .replace(".", ",")}
            </span>
        `;


        lista.appendChild(item);

    });

}


// =====================================================
// MÁSCARA CPF
// =====================================================

const cpf =
    document.getElementById("cpf");


if (cpf) {

    cpf.addEventListener(
        "input",
        () => {

            let valor =
                cpf.value.replace(/\D/g, "");


            valor =
                valor.substring(0, 11);


            valor =
                valor.replace(
                    /(\d{3})(\d)/,
                    "$1.$2"
                );


            valor =
                valor.replace(
                    /(\d{3})(\d)/,
                    "$1.$2"
                );


            valor =
                valor.replace(
                    /(\d{3})(\d{1,2})$/,
                    "$1-$2"
                );


            cpf.value =
                valor;

        }
    );

}


// =====================================================
// CEP
// =====================================================

const cepInput =
    document.getElementById("cep");

const statusCep =
    document.getElementById("statusCep");


if (cepInput) {

    cepInput.addEventListener(
        "input",
        () => {

            let valor =
                cepInput.value.replace(
                    /\D/g,
                    ""
                );


            valor =
                valor.substring(0, 8);


            if (valor.length > 5) {

                valor =
                    valor.replace(
                        /^(\d{5})(\d)/,
                        "$1-$2"
                    );

            }


            cepInput.value =
                valor;


            if (statusCep) {

                statusCep.textContent =
                    "";

                statusCep.className =
                    "status-cep";

            }

        }
    );


    cepInput.addEventListener(
        "blur",
        buscarCEP
    );

}


// =====================================================
// BUSCAR CEP
// =====================================================

async function buscarCEP() {

    if (!cepInput) {
        return;
    }


    const valor =
        cepInput.value.replace(
            /\D/g,
            ""
        );


    if (valor.length !== 8) {

        limparEndereco();


        if (
            valor.length > 0 &&
            statusCep
        ) {

            statusCep.textContent =
                "CEP incompleto.";

            statusCep.className =
                "status-cep erro";

        }


        return;
    }


    if (statusCep) {

        statusCep.textContent =
            "Buscando endereço...";

        statusCep.className =
            "status-cep buscando";

    }


    try {

        const resposta = await fetch(
            `https://viacep.com.br/ws/${valor}/json/`
        );


        if (!resposta.ok) {

            throw new Error(
                "Falha na consulta do CEP."
            );

        }


        const dados =
            await resposta.json();


        if (dados.erro) {

            if (statusCep) {

                statusCep.textContent =
                    "CEP não encontrado.";

                statusCep.className =
                    "status-cep erro";

            }


            limparEndereco();

            return;
        }


        const rua =
            document.getElementById("rua");

        const bairro =
            document.getElementById("bairro");

        const cidade =
            document.getElementById("cidade");

        const estado =
            document.getElementById("estado");

        const complemento =
            document.getElementById("complemento");

        const numero =
            document.getElementById("numero");


        if (rua) {
            rua.value =
                dados.logradouro || "";
        }


        if (bairro) {
            bairro.value =
                dados.bairro || "";
        }


        if (cidade) {
            cidade.value =
                dados.localidade || "";
        }


        if (estado) {
            estado.value =
                dados.uf || "";
        }


        if (
            complemento &&
            dados.complemento
        ) {

            complemento.value =
                dados.complemento;

        }


        if (statusCep) {

            statusCep.textContent =
                "✓ Endereço encontrado.";

            statusCep.className =
                "status-cep encontrado";

        }


        if (numero) {
            numero.focus();
        }


    } catch (erro) {

        console.error(
            "Erro no ViaCEP:",
            erro
        );


        if (statusCep) {

            statusCep.textContent =
                "Não foi possível consultar o CEP.";

            statusCep.className =
                "status-cep erro";

        }


        limparEndereco();

    }

}


// =====================================================
// LIMPAR ENDEREÇO
// =====================================================

function limparEndereco() {

    const rua =
        document.getElementById("rua");

    const bairro =
        document.getElementById("bairro");

    const cidade =
        document.getElementById("cidade");

    const estado =
        document.getElementById("estado");


    if (rua) {
        rua.value = "";
    }


    if (bairro) {
        bairro.value = "";
    }


    if (cidade) {
        cidade.value = "";
    }


    if (estado) {
        estado.value = "";
    }

}


// =====================================================
// FINALIZAR PEDIDO
// =====================================================

const formEntrega =
    document.getElementById("formEntrega");


if (formEntrega) {

    formEntrega.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            // =========================================
            // VERIFICAR SESSÃO
            // =========================================

            const logado =
                await verificarLogin();


            if (!logado) {

                alert(
                    "Sua sessão expirou. Faça login novamente."
                );


                window.location.href =
                    "/TelaLogin/login.html";


                return;
            }


            // =========================================
            // PEGAR DADOS
            // =========================================

            const nome =
                document
                    .getElementById("nome")
                    .value
                    .trim();


            const cpfValor =
                document
                    .getElementById("cpf")
                    .value
                    .trim();


            const cepValor =
                document
                    .getElementById("cep")
                    .value
                    .trim();


            const rua =
                document
                    .getElementById("rua")
                    .value
                    .trim();


            const numero =
                document
                    .getElementById("numero")
                    .value
                    .trim();


            const bairro =
                document
                    .getElementById("bairro")
                    .value
                    .trim();


            const cidade =
                document
                    .getElementById("cidade")
                    .value
                    .trim();


            const estado =
                document
                    .getElementById("estado")
                    .value
                    .trim();


            const complemento =
                document
                    .getElementById("complemento")
                    .value
                    .trim();


            // =========================================
            // VALIDAÇÕES
            // =========================================

            if (!nome) {

                alert(
                    "Informe seu nome completo."
                );


                document
                    .getElementById("nome")
                    .focus();


                return;
            }


            if (
                cpfValor
                    .replace(/\D/g, "")
                    .length !== 11
            ) {

                alert(
                    "Informe um CPF válido."
                );


                document
                    .getElementById("cpf")
                    .focus();


                return;
            }


            if (
                cepValor
                    .replace(/\D/g, "")
                    .length !== 8 ||
                !rua ||
                !bairro ||
                !cidade ||
                !estado
            ) {

                alert(
                    "Informe um endereço válido."
                );


                document
                    .getElementById("cep")
                    .focus();


                return;
            }


            if (!numero) {

                alert(
                    "Informe o número do endereço."
                );


                document
                    .getElementById("numero")
                    .focus();


                return;
            }


            if (
                !itensPedido ||
                itensPedido.length === 0
            ) {

                alert(
                    "Seu pedido está vazio."
                );


                window.location.href =
                    "/Telainicial/index.html";


                return;
            }


            // =========================================
            // VERIFICAR PRODUTOS
            // =========================================

            for (
                const produto of itensPedido
            ) {

                if (
                    !produto.id_produto ||
                    Number(
                        produto.id_produto
                    ) <= 0
                ) {

                    alert(
                        'O produto "' +
                        produto.nome +
                        '" não possui um ID do banco de dados.'
                    );


                    console.error(
                        "Produto sem id_produto:",
                        produto
                    );


                    return;
                }

            }


            // =========================================
            // BOTÃO
            // =========================================

            const btn =
                document.getElementById(
                    "btnContinuar"
                );


            if (btn) {

                btn.disabled = true;

                btn.textContent =
                    "Finalizando pedido...";

            }


            try {

                // =====================================
                // PREPARAR ITENS
                // =====================================

                const itens =
                    itensPedido.map(
                        produto => {

                            return {

                                id_produto:
                                    Number(
                                        produto.id_produto
                                    ),

                                quantidade:
                                    Number(
                                        produto.quantidade
                                    ) || 1,

                                preco:
                                    Number(
                                        produto.preco
                                    )

                            };

                        }
                    );


                // =====================================
                // ENVIAR PARA PHP
                // =====================================

                const resposta =
                    await fetch(
                        "/finalizar_pedido.php",
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            credentials:
                                "include",

                            body:
                                JSON.stringify({

                                    cpf:
                                        cpfValor,

                                    nome:
                                        nome,

                                    endereco: {

                                        cep:
                                            cepValor,

                                        rua:
                                            rua,

                                        numero:
                                            numero,

                                        complemento:
                                            complemento,

                                        bairro:
                                            bairro,

                                        cidade:
                                            cidade,

                                        estado:
                                            estado

                                    },

                                    itens:
                                        itens

                                })

                        }
                    );


                // =====================================
                // LER RESPOSTA
                // =====================================

                const texto =
                    await resposta.text();


                console.log(
                    "Resposta do servidor:",
                    texto
                );


                let resultado;


                try {

                    resultado =
                        JSON.parse(texto);

                } catch (erroJSON) {

                    console.error(
                        "Resposta não é JSON:",
                        texto
                    );


                    throw new Error(
                        "O servidor retornou uma resposta inválida."
                    );

                }


                // =====================================
                // VERIFICAR RESULTADO
                // =====================================

                if (
                    !resposta.ok ||
                    !resultado.sucesso
                ) {

                    // Sessão expirada
                    if (
                        resposta.status === 401
                    ) {

                        alert(
                            "Sua sessão expirou. Faça login novamente."
                        );


                        window.location.href =
                            "/TelaLogin/login.html";


                        return;
                    }


                    throw new Error(
                        resultado.mensagem ||
                        "Não foi possível finalizar o pedido."
                    );

                }


                // =====================================
                // PEDIDO REALIZADO
                // =====================================

                const numeroPedido =
                    String(
                        resultado.id_pedido
                    ).padStart(
                        4,
                        "0"
                    );


                const valorFinal =
                    Number(
                        resultado.valor_total
                    )
                        .toFixed(2)
                        .replace(".", ",");


                // =====================================
                // LIMPAR CARRINHO
                // =====================================

                localStorage.removeItem(
                    "totalPedido"
                );


                localStorage.removeItem(
                    "pedidos"
                );


                localStorage.removeItem(
                    "carrinho"
                );


                // =====================================
                // SUCESSO
                // =====================================

                alert(
                    "✓ Pedido realizado com sucesso!\n\n" +
                    "Pedido #" +
                    numeroPedido +
                    "\n" +
                    "Valor: R$ " +
                    valorFinal +
                    "\n\n" +
                    "Obrigado pela compra!"
                );


                // =====================================
                // VOLTAR
                // =====================================

                window.location.href =
                    "/Telainicial/index.html";


            } catch (erro) {

                console.error(
                    "Erro ao finalizar pedido:",
                    erro
                );


                alert(
                    erro.message ||
                    "Não foi possível finalizar o pedido."
                );


                if (btn) {

                    btn.disabled = false;

                    btn.textContent =
                        "Continuar para Pagamento";

                }

            }

        }
    );

}
