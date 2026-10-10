// =====================================================
// ZORA - PERFIL DO CLIENTE
// PostgreSQL + Sessão PHP
// =====================================================


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

        const resultado =
            await resposta.json();

        if (
            !resultado.sucesso ||
            !resultado.logado
        ) {

            window.location.replace(
                "/TelaLogin/login.html"
            );

            return false;
        }

        return true;

    } catch (erro) {

        console.error(
            "Erro ao verificar sessão:",
            erro
        );

        window.location.replace(
            "/TelaLogin/login.html"
        );

        return false;
    }
}


// =====================================================
// CARREGAR DADOS DO PERFIL
// =====================================================

async function carregarDadosPerfil() {

    const logado =
        await verificarLogin();

    if (!logado) {
        return;
    }


    try {

        const resposta = await fetch(
            "/cliente.php",
            {
                method: "GET",
                credentials: "include"
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
                "Não foi possível carregar os dados."
            );
        }


        // =================================================
        // CLIENTE
        // =================================================

        const cliente =
            resultado.cliente;


        document.getElementById(
            "nomeUsuario"
        ).textContent =
            cliente.nome || "Usuário";


        document.getElementById(
            "emailUsuario"
        ).textContent =
            cliente.email || "-";


        document.getElementById(
            "nomePerfil"
        ).textContent =
            cliente.nome || "-";


        document.getElementById(
            "emailPerfil"
        ).textContent =
            cliente.email || "-";


        document.getElementById(
            "telefonePerfil"
        ).textContent =
            cliente.telefone || "-";


        // =================================================
        // ENDEREÇO
        // =================================================

        carregarEndereco(
            resultado.endereco
        );


    } catch (erro) {

        console.error(
            "Erro ao carregar perfil:",
            erro
        );

        alert(
            "Não foi possível carregar os dados do perfil."
        );
    }
}


// =====================================================
// CARREGAR ENDEREÇO
// =====================================================

function carregarEndereco(endereco) {

    if (!endereco || !endereco.id_endereco) {

        document.getElementById(
            "cepPerfil"
        ).textContent = "-";

        document.getElementById(
            "ruaPerfil"
        ).textContent = "-";

        document.getElementById(
            "numeroPerfil"
        ).textContent = "-";

        document.getElementById(
            "complementoPerfil"
        ).textContent = "-";

        document.getElementById(
            "bairroPerfil"
        ).textContent = "-";

        document.getElementById(
            "cidadePerfil"
        ).textContent = "-";

        document.getElementById(
            "estadoPerfil"
        ).textContent = "-";

        return;
    }


    document.getElementById(
        "cepPerfil"
    ).textContent =
        endereco.cep || "-";


    document.getElementById(
        "ruaPerfil"
    ).textContent =
        endereco.rua || "-";


    document.getElementById(
        "numeroPerfil"
    ).textContent =
        endereco.numero || "-";


    document.getElementById(
        "complementoPerfil"
    ).textContent =
        endereco.complemento || "-";


    document.getElementById(
        "bairroPerfil"
    ).textContent =
        endereco.bairro || "-";


    document.getElementById(
        "cidadePerfil"
    ).textContent =
        endereco.cidade || "-";


    document.getElementById(
        "estadoPerfil"
    ).textContent =
        endereco.estado || "-";
}


// =====================================================
// EDITAR ENDEREÇO
// =====================================================

async function mostrarEdicaoEndereco() {

    const logado =
        await verificarLogin();

    if (!logado) {
        return;
    }


    try {

        const resposta = await fetch(
            "/cliente.php",
            {
                method: "GET",
                credentials: "include"
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
                "Não foi possível carregar o endereço."
            );
        }


        const endereco =
            resultado.endereco;


        document.getElementById(
            "endereco-existente"
        ).style.display = "none";


        document.getElementById(
            "endereco-edicao"
        ).style.display = "block";


        document.getElementById(
            "cepEdicao"
        ).value =
            endereco.cep || "";


        document.getElementById(
            "ruaEdicao"
        ).value =
            endereco.rua || "";


        document.getElementById(
            "numeroEdicao"
        ).value =
            endereco.numero || "";


        document.getElementById(
            "complementoEdicao"
        ).value =
            endereco.complemento || "";


        document.getElementById(
            "bairroEdicao"
        ).value =
            endereco.bairro || "";


        document.getElementById(
            "cidadeEdicao"
        ).value =
            endereco.cidade || "";


        document.getElementById(
            "estadoEdicao"
        ).value =
            endereco.estado || "";


    } catch (erro) {

        console.error(
            "Erro ao carregar endereço:",
            erro
        );

        alert(
            "Não foi possível carregar o endereço."
        );
    }
}


// =====================================================
// CANCELAR EDIÇÃO
// =====================================================

function cancelarEdicao() {

    document.getElementById(
        "endereco-edicao"
    ).style.display = "none";


    document.getElementById(
        "endereco-existente"
    ).style.display = "block";

}


// =====================================================
// SALVAR ENDEREÇO
// =====================================================

async function salvarEndereco() {

    const logado =
        await verificarLogin();

    if (!logado) {
        return;
    }


    const cep =
        document.getElementById(
            "cepEdicao"
        ).value.trim();


    const rua =
        document.getElementById(
            "ruaEdicao"
        ).value.trim();


    const numero =
        document.getElementById(
            "numeroEdicao"
        ).value.trim();


    const complemento =
        document.getElementById(
            "complementoEdicao"
        ).value.trim();


    const bairro =
        document.getElementById(
            "bairroEdicao"
        ).value.trim();


    const cidade =
        document.getElementById(
            "cidadeEdicao"
        ).value.trim();


    const estado =
        document.getElementById(
            "estadoEdicao"
        ).value.trim();


    if (
        !cep ||
        !rua ||
        !numero ||
        !bairro ||
        !cidade ||
        !estado
    ) {

        alert(
            "Preencha todos os campos obrigatórios."
        );

        return;
    }


    try {

        const resposta = await fetch(
            "/atualizar_endereco.php",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                credentials: "include",

                body: JSON.stringify({

                    cep: cep,
                    rua: rua,
                    numero: numero,
                    complemento: complemento,
                    bairro: bairro,
                    cidade: cidade,
                    estado: estado

                })
            }
        );


        const resultado =
            await resposta.json();


        if (
            !resposta.ok ||
            !resultado.sucesso
        ) {

            alert(
                resultado.mensagem ||
                "Não foi possível atualizar o endereço."
            );

            return;
        }


        alert(
            "Endereço atualizado com sucesso!"
        );


        cancelarEdicao();


        await carregarDadosPerfil();


    } catch (erro) {

        console.error(
            "Erro ao atualizar endereço:",
            erro
        );

        alert(
            "Não foi possível conectar ao servidor."
        );
    }
}


// =====================================================
// MÁSCARA CEP - EDIÇÃO
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        const cepEdicao =
            document.getElementById(
                "cepEdicao"
            );


        if (cepEdicao) {

            cepEdicao.addEventListener(
                "input",
                () => {

                    let valor =
                        cepEdicao.value
                            .replace(/\D/g, "")
                            .substring(0, 8);


                    if (valor.length > 5) {

                        valor =
                            valor.replace(
                                /^(\d{5})(\d)/,
                                "$1-$2"
                            );

                    }


                    cepEdicao.value =
                        valor;

                }
            );


            cepEdicao.addEventListener(
                "blur",
                buscarCEPEdicao
            );

        }

    }
);


// =====================================================
// VIA CEP - EDIÇÃO
// =====================================================

async function buscarCEPEdicao() {

    const cep =
        document.getElementById(
            "cepEdicao"
        );


    if (!cep) {
        return;
    }


    const valor =
        cep.value.replace(/\D/g, "");


    if (valor.length !== 8) {

        alert(
            "CEP inválido."
        );

        return;
    }


    try {

        const resposta = await fetch(
            `https://viacep.com.br/ws/${valor}/json/`
        );


        const dados =
            await resposta.json();


        if (dados.erro) {

            alert(
                "CEP não encontrado."
            );

            return;
        }


        document.getElementById(
            "ruaEdicao"
        ).value =
            dados.logradouro || "";


        document.getElementById(
            "bairroEdicao"
        ).value =
            dados.bairro || "";


        document.getElementById(
            "cidadeEdicao"
        ).value =
            dados.localidade || "";


        document.getElementById(
            "estadoEdicao"
        ).value =
            dados.uf || "";


        document.getElementById(
            "complementoEdicao"
        ).value =
            dados.complemento || "";


        document.getElementById(
            "numeroEdicao"
        ).focus();


    } catch (erro) {

        console.error(
            "Erro ao consultar CEP:",
            erro
        );

        alert(
            "Erro ao consultar o CEP."
        );
    }
}


// =====================================================
// CARREGAR COMPRAS
// =====================================================

async function carregarCompras() {

    const comprasVazio =
        document.getElementById(
            "compras-vazio"
        );

    const comprasLista =
        document.getElementById(
            "compras-lista"
        );


    if (
        !comprasVazio ||
        !comprasLista
    ) {

        return;
    }


    try {

        const resposta = await fetch(
            "/historico_pedidos.php",
            {
                method: "GET",
                credentials: "include"
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
                "Não foi possível carregar as compras."
            );

        }


        const compras =
            resultado.pedidos || [];


        // =========================
        // SEM COMPRAS
        // =========================

        if (compras.length === 0) {

            comprasVazio.style.display =
                "block";

            comprasLista.style.display =
                "none";

            return;
        }


        // =========================
        // MOSTRAR COMPRAS
        // =========================

        comprasVazio.style.display =
            "none";

        comprasLista.style.display =
            "block";

        comprasLista.innerHTML =
            "";


        compras.forEach(
            compra => {

                const compraCard =
                    document.createElement(
                        "div"
                    );


                compraCard.className =
                    "compra-card";


                // =========================
                // DATA
                // =========================

                const data =
                    new Date(
                        compra.data
                    );


                const dataFormatada =
                    data.toLocaleDateString(
                        "pt-BR"
                    );


                // =========================
                // PRODUTOS
                // =========================

                const produtosHTML =
                    compra.produtos
                        .map(
                            produto => {

                                const preco =
                                    Number(
                                        produto.preco
                                    )
                                    .toFixed(2)
                                    .replace(
                                        ".",
                                        ","
                                    );


                                const subtotal =
                                    Number(
                                        produto.subtotal
                                    )
                                    .toFixed(2)
                                    .replace(
                                        ".",
                                        ","
                                    );


                                return `
                                    <p>
                                        ${produto.quantidade}x
                                        ${produto.nome}
                                        -
                                        R$ ${preco}
                                        =
                                        R$ ${subtotal}
                                    </p>
                                `;

                            }
                        )
                        .join("");


                // =========================
                // TOTAL
                // =========================

                const total =
                    Number(
                        compra.total
                    )
                    .toFixed(2)
                    .replace(
                        ".",
                        ","
                    );


                // =========================
                // HTML
                // =========================

                compraCard.innerHTML = `

                    <div class="compra-header">

                        <div class="compra-info">

                            <h4>
                                Pedido #${String(
                                    compra.id_pedido
                                ).padStart(
                                    4,
                                    "0"
                                )}
                            </h4>

                            <p class="data">
                                ${dataFormatada}
                            </p>

                        </div>


                        <div class="compra-total">

                            <p class="label">
                                Total
                            </p>

                            <p class="preco">
                                R$ ${total}
                            </p>

                        </div>

                    </div>


                    <div class="compra-produtos">

                        <h5>
                            Produtos:
                        </h5>

                        ${produtosHTML}

                    </div>


                    <div class="compra-footer">

                        <p>
                            <strong>Status:</strong>
                            ${compra.status}
                        </p>

                    </div>

                `;


                comprasLista.appendChild(
                    compraCard
                );

            }
        );


    } catch (erro) {

        console.error(
            "Erro ao carregar compras:",
            erro
        );


        comprasVazio.style.display =
            "block";

        comprasLista.style.display =
            "none";

    }

}

// =====================================================
// LOGOUT
// =====================================================

async function sairDoPerfil() {

    if (
        !confirm(
            "Você tem certeza que deseja sair?"
        )
    ) {

        return;
    }


    try {

        await fetch(
            "/logout.php",
            {
                method: "POST",
                credentials
