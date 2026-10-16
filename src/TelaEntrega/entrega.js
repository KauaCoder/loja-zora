// =====================================================
// ZORA - TELA DE ENTREGA E PAGAMENTO UNIFICADAS
// PostgreSQL + Sessão PHP + Bypass Render
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
// VERIFICAR LOGIN (Blindado com localStorage + URL)
// =====================================================

async function verificarLogin() {
    try {
        let idClienteParam = "";
        const dadosLocais = localStorage.getItem("usuarioLogado");
        if (dadosLocais) {
            try {
                const usuario = JSON.parse(dadosLocais);
                if (usuario && usuario.id_cliente) {
                    idClienteParam = `?id_cliente=${usuario.id_cliente}`;
                }
            } catch (e) {
                console.error("Erro ao ler localStorage:", e);
            }
        }

        const resposta = await fetch(
            `/usuario_logado.php${idClienteParam}`,
            {
                method: "GET",
                credentials: "include"
            }
        );

        const texto = await resposta.text();
        let resultado;
        try {
            resultado = JSON.parse(texto);
        } catch (e) {
            if (dadosLocais) return true;
            return false;
        }

        const logado = (resultado.sucesso === true && resultado.logado === true) || Boolean(dadosLocais);

        const menuUsuario = document.getElementById("menuUsuario");
        const menuUsuarioMobile = document.getElementById("menuUsuarioMobile");

        let nomeTexto = "Perfil";
        if (dadosLocais) {
            try {
                const usuario = JSON.parse(dadosLocais);
                if (usuario && usuario.nome) {
                    nomeTexto = `Olá, ${usuario.nome.split(" ")[0]}`;
                }
            } catch (err) {}
        }

        const texto = logado ? nomeTexto : "Login";

        if (menuUsuario) menuUsuario.textContent = texto;
        if (menuUsuarioMobile) menuUsuarioMobile.textContent = texto;

        return logado;

    } catch (erro) {
        console.error("Erro ao verificar login:", erro);
        if (localStorage.getItem("usuarioLogado")) return true;
        return false;
    }
}


// =====================================================
// ABRIR PERFIL
// =====================================================

async function abrirPerfil() {
    const logado = await verificarLogin();

    if (logado) {
        window.location.href = "/TelaCliente/cliente.html";
    } else {
        window.location.href = "/TelaLogin/login.html";
    }
}

verificarLogin();


// =====================================================
// CARREGAR PEDIDO
// =====================================================

const totalPedido = localStorage.getItem("totalPedido");
const pedidosSalvos = localStorage.getItem("pedidos") || localStorage.getItem("carrinho");

let itensPedido = [];

if (pedidosSalvos) {
    try {
        itensPedido = JSON.parse(pedidosSalvos);
    } catch (erro) {
        console.error("Erro ao carregar pedido:", erro);
        itensPedido = [];
    }
}


// =====================================================
// VERIFICAR PEDIDO
// =====================================================

if (!totalPedido || !itensPedido || itensPedido.length === 0) {
    window.location.href = "/Telainicial/index.html";
} else {
    renderizarResumo();
}


// =====================================================
// RENDERIZAR RESUMO
// =====================================================

function renderizarResumo() {
    const valorTotalEl = document.getElementById("valorTotal");
    const valorTotalPagamentoEl = document.getElementById("valorTotalPagamento");

    const formatado = "R$ " + Number(totalPedido).toFixed(2).replace(".", ",");

    if (valorTotalEl) valorTotalEl.textContent = formatado;
    if (valorTotalPagamentoEl) valorTotalPagamentoEl.textContent = formatado;

    const lista = document.getElementById("listaResumo");

    if (!lista) return;

    lista.innerHTML = "";

    itensPedido.forEach(produto => {
        const quantidade = Number(produto.quantidade) || 1;
        const preco = Number(produto.preco) || 0;

        const item = document.createElement("li");

        item.innerHTML = `
            <span>${quantidade}x ${produto.nome}</span>
            <span>R$ ${(preco * quantidade).toFixed(2).replace(".", ",")}</span>
        `;

        lista.appendChild(item);
    });
}


// =====================================================
// MÁSCARA CPF E CEP
// =====================================================

const cpf = document.getElementById("cpf");

if (cpf) {
    cpf.addEventListener("input", () => {
        let valor = cpf.value.replace(/\D/g, "").substring(0, 11);
        valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
        valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
        valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        cpf.value = valor;
    });
}

const cepInput = document.getElementById("cep");
const statusCep = document.getElementById("statusCep");

if (cepInput) {
    cepInput.addEventListener("input", () => {
        let valor = cepInput.value.replace(/\D/g, "").substring(0, 8);
        if (valor.length > 5) {
            valor = valor.replace(/^(\d{5})(\d)/, "$1-$2");
        }
        cepInput.value = valor;

        if (statusCep) {
            statusCep.textContent = "";
            statusCep.className = "status-cep";
        }
    });

    cepInput.addEventListener("blur", buscarCEP);
}


// =====================================================
// BUSCAR CEP
// =====================================================

async function buscarCEP() {
    if (!cepInput) return;

    const valor = cepInput.value.replace(/\D/g, "");

    if (valor.length !== 8) {
        limparEndereco();
        if (valor.length > 0 && statusCep) {
            statusCep.textContent = "CEP incompleto.";
            statusCep.className = "status-cep erro";
        }
        return;
    }

    if (statusCep) {
        statusCep.textContent = "Buscando endereço...";
        statusCep.className = "status-cep buscando";
    }

    try {
        const resposta = await fetch(`https://viacep.com.br/ws/${valor}/json/`);
        if (!resposta.ok) throw new Error("Falha na consulta do CEP.");

        const dados = await resposta.json();

        if (dados.erro) {
            if (statusCep) {
                statusCep.textContent = "CEP não encontrado.";
                statusCep.className = "status-cep erro";
            }
            limparEndereco();
            return;
        }

        const rua = document.getElementById("rua");
        const bairro = document.getElementById("bairro");
        const cidade = document.getElementById("cidade");
        const estado = document.getElementById("estado");
        const complemento = document.getElementById("complemento");
        const numero = document.getElementById("numero");

        if (rua) rua.value = dados.logradouro || "";
        if (bairro) bairro.value = dados.bairro || "";
        if (cidade) cidade.value = dados.localidade || "";
        if (estado) estado.value = dados.uf || "";
        if (complemento && dados.complemento) complemento.value = dados.complemento;

        if (statusCep) {
            statusCep.textContent = "✓ Endereço encontrado.";
            statusCep.className = "status-cep encontrado";
        }

        if (numero) numero.focus();

    } catch (erro) {
        console.error("Erro no ViaCEP:", erro);
        if (statusCep) {
            statusCep.textContent = "Não foi possível consultar o CEP.";
            statusCep.className = "status-cep erro";
        }
        limparEndereco();
    }
}


// =====================================================
// LIMPAR ENDEREÇO
// =====================================================

function limparEndereco() {
    ["rua", "bairro", "cidade", "estado"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}


// =====================================================
// CONTROLE DE ETAPAS (AVANÇAR PARA PAGAMENTO)
// =====================================================

const btnIrParaPagamento = document.getElementById("btnIrParaPagamento");
const btnVoltarEtapa = document.getElementById("btnVoltarEtapa");
const blocoEtapa1 = document.getElementById("blocoEtapa1");
const blocoEtapa2 = document.getElementById("blocoEtapa2");
const indicadorPasso1 = document.getElementById("indicadorPasso1");
const indicadorPasso2 = document.getElementById("indicadorPasso2");
const linhaPasso = document.getElementById("linhaPasso");

if (btnIrParaPagamento) {
    btnIrParaPagamento.addEventListener("click", () => {
        const nome = document.getElementById("nome").value.trim();
        const cpfValor = document.getElementById("cpf").value.trim();
        const cepValor = document.getElementById("cep").value.trim();
        const rua = document.getElementById("rua").value.trim();
        const numero = document.getElementById("numero").value.trim();
        const bairro = document.getElementById("bairro").value.trim();
        const cidade = document.getElementById("cidade").value.trim();
        const estado = document.getElementById("estado").value.trim();

        if (!nome) { alert("Informe seu nome completo."); document.getElementById("nome").focus(); return; }
        if (cpfValor.replace(/\D/g, "").length !== 11) { alert("Informe um CPF válido."); document.getElementById("cpf").focus(); return; }
        if (cepValor.replace(/\D/g, "").length !== 8 || !rua || !bairro || !cidade || !estado) { alert("Informe um endereço válido."); document.getElementById("cep").focus(); return; }
        if (!numero) { alert("Informe o número do endereço."); document.getElementById("numero").focus(); return; }

        // Armazena e exibe os dados fornecidos na tela de pagamento (Etapa 2)
        const resumoClienteEl = document.getElementById("resumoClienteExibicao");
        const resumoEnderecoEl = document.getElementById("resumoEnderecoExibicao");
        const complementoVal = document.getElementById("complemento").value.trim();
        const compTexto = complementoVal ? `, ${complementoVal}` : "";

        if (resumoClienteEl) {
            resumoClienteEl.innerHTML = `<strong>Nome:</strong> ${nome} <br><strong>CPF:</strong> ${cpfValor}`;
        }
        if (resumoEnderecoEl) {
            resumoEnderecoEl.innerHTML = `<strong>Endereço:</strong> ${rua}, ${numero}${compTexto} - ${bairro}, ${cidade}/${estado} (CEP: ${cepValor})`;
        }

        // Alterna os blocos na mesma página
        if (blocoEtapa1) blocoEtapa1.classList.remove("ativa");
        if (blocoEtapa2) blocoEtapa2.classList.add("ativa");

        if (indicadorPasso1) {
            indicadorPasso1.classList.remove("ativo");
            indicadorPasso1.classList.add("concluido");
            const num1 = indicadorPasso1.querySelector(".passo-numero");
            if (num1) num1.textContent = "✓";
        }

        if (linhaPasso) linhaPasso.classList.add("ativo");
        if (indicadorPasso2) indicadorPasso2.classList.add("ativo");

        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

if (btnVoltarEtapa) {
    btnVoltarEtapa.addEventListener("click", () => {
        if (blocoEtapa2) blocoEtapa2.classList.remove("ativa");
        if (blocoEtapa1) blocoEtapa1.classList.add("ativa");

        if (indicadorPasso2) indicadorPasso2.classList.remove("ativo");
        if (linhaPasso) linhaPasso.classList.remove("ativo");
        if (indicadorPasso1) {
            indicadorPasso1.classList.remove("concluido");
            indicadorPasso1.classList.add("ativo");
            const num1 = indicadorPasso1.querySelector(".passo-numero");
            if (num1) num1.textContent = "1";
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}


// =====================================================
// FINALIZAR PEDIDO (SUBMIT FINAL NA MESMA TELA)
// =====================================================

const formEntrega = document.getElementById("formEntrega");

if (formEntrega) {
    formEntrega.addEventListener("submit", async function (event) {
        event.preventDefault();

        const logado = await verificarLogin();

        if (!logado) {
            alert("Sua sessão expirou. Faça login novamente.");
            window.location.href = "/TelaLogin/login.html";
            return;
        }

        const nome = document.getElementById("nome").value.trim();
        const cpfValor = document.getElementById("cpf").value.trim();
        const cepValor = document.getElementById("cep").value.trim();
        const rua = document.getElementById("rua").value.trim();
        const numero = document.getElementById("numero").value.trim();
        const bairro = document.getElementById("bairro").value.trim();
        const cidade = document.getElementById("cidade").value.trim();
        const estado = document.getElementById("estado").value.trim();
        const complemento = document.getElementById("complemento").value.trim();

        if (!itensPedido || itensPedido.length === 0) {
            alert("Seu pedido está vazio.");
            window.location.href = "/Telainicial/index.html";
            return;
        }

        const btn = document.getElementById("btnContinuar");

        if (btn) {
            btn.disabled = true;
            btn.textContent = "Finalizando pedido...";
        }

        try {
            let idClienteExtra = null;
            const dadosLocais = localStorage.getItem("usuarioLogado");
            if (dadosLocais) {
                try {
                    const usuario = JSON.parse(dadosLocais);
                    if (usuario && usuario.id_cliente) {
                        idClienteExtra = Number(usuario.id_cliente);
                    }
                } catch (e) {}
            }

            const itens = itensPedido.map(produto => {
                return {
                    id_produto: Number(produto.id_produto),
                    quantidade: Number(produto.quantidade) || 1,
                    preco: Number(produto.preco)
                };
            });

            const resposta = await fetch(
                "/finalizar_pedido.php",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        id_cliente: idClienteExtra,
                        cpf: cpfValor,
                        nome: nome,
                        endereco: {
                            cep: cepValor,
                            rua: rua,
                            numero: numero,
                            complemento: complemento,
                            bairro: bairro,
                            cidade: cidade,
                            estado: estado
                        },
                        itens: itens
                    })
                }
            );

            const texto = await resposta.text();
            let resultado;
            try {
                resultado = JSON.parse(texto);
            } catch (erroJSON) {
                throw new Error("O servidor retornou uma resposta inválida.");
            }

            if (!resposta.ok || !resultado.sucesso) {
                if (resposta.status === 401 || (resultado.mensagem && resultado.mensagem.toLowerCase().includes("sessão"))) {
                    alert("Sua sessão expirou. Faça login novamente.");
                    window.location.href = "/TelaLogin/login.html";
                    return;
                }
                throw new Error(resultado.mensagem || "Não foi possível finalizar o pedido.");
            }

            // Sucesso total: Limpa carrinho e dados temporários
            localStorage.removeItem("carrinho");
            localStorage.removeItem("pedidos");
            localStorage.removeItem("totalPedido");

            alert("Pedido e pagamento realizados com sucesso!");
            window.location.href = "/Telainicial/index.html";

        } catch (erro) {
            console.error("Erro ao finalizar pedido:", erro);
            alert(erro.message || "Erro ao conectar ao servidor.");

            if (btn) {
                btn.disabled = false;
                btn.textContent = "Finalizar Compra";
            }
        }
    });
}
