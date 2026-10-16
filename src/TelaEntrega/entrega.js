// =====================================================
// ZORA - TELA DE ENTREGA E PAGAMENTO UNIFICADAS
// PostgreSQL + Sessão PHP + Bypass Render
// =====================================================

// =====================================================
// MENU
// =====================================================

const sidebar = document.querySelector(".sidebar");

function showSidebar() {
    if (sidebar) sidebar.classList.add("active");
}

function hideSidebar() {
    if (sidebar) sidebar.classList.remove("active");
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

        const textoMenu = logado ? nomeTexto : "Login";

        if (menuUsuario) menuUsuario.textContent = textoMenu;
        if (menuUsuarioMobile) menuUsuarioMobile.textContent = textoMenu;

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
// CARREGAR PEDIDO E CARRINHO (Universal e Blindado)
// =====================================================

const totalPedidoStorage = localStorage.getItem("totalPedido");
let brutoStorage = localStorage.getItem("pedidos") || localStorage.getItem("carrinho");

if (!brutoStorage) {
    for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        if (chave && (chave.toLowerCase().includes("carrinho") || chave.toLowerCase().includes("pedido") || chave.toLowerCase().includes("item"))) {
            const valor = localStorage.getItem(chave);
            if (valor && (valor.startsWith("[") || valor.startsWith("{"))) {
                brutoStorage = valor;
                break;
            }
        }
    }
}

let itensPedido = [];

if (brutoStorage) {
    try {
        const parsed = JSON.parse(brutoStorage);
        if (Array.isArray(parsed)) {
            itensPedido = parsed;
        } else if (parsed && typeof parsed === "object") {
            itensPedido = parsed.itens || parsed.produtos || parsed.carrinho || [];
        }
    } catch (erro) {
        console.error("Erro ao analisar carrinho:", erro);
        itensPedido = [];
    }
}

let totalPedido = Number(totalPedidoStorage) || 0;
if (totalPedido <= 0 && itensPedido.length > 0) {
    totalPedido = itensPedido.reduce((soma, item) => {
        const preco = Number(item.preco || item.valor_unitario) || 0;
        const qtd = Number(item.quantidade || item.qtd) || 1;
        return soma + (preco * qtd);
    }, 0);
    localStorage.setItem("totalPedido", totalPedido);
}


// =====================================================
// VERIFICAR PEDIDO
// =====================================================

if (!totalPedido || !itensPedido || itensPedido.length === 0) {
    alert("Seu carrinho está vazio.");
    window.location.href = "/Telainicial/index.html";
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

    // Busca o elemento da lista por ID ou pela classe do resumo
    const lista = document.getElementById("listaResumo") || document.querySelector(".resumo-itens") || document.querySelector(".Resumo-do-Pedido");

    if (!lista) return;

    lista.innerHTML = "";

    itensPedido.forEach(produto => {
        const quantidade = Number(produto.quantidade || produto.qtd) || 1;
        const preco = Number(produto.preco || produto.valor_unitario) || 0;
        const nomeProd = produto.nome || produto.nm_produto || "Produto ZORA";
        const tamanhoTexto = produto.tamanho ? ` (${produto.tamanho})` : "";

        const item = document.createElement("li");
        item.style.display = "flex";
        item.style.justifyContent = "space-between";
        item.style.marginBottom = "8px";

        item.innerHTML = `
            <span>${quantidade}x ${nomeProd}${tamanhoTexto}</span>
            <strong>R$ ${(preco * quantidade).toFixed(2).replace(".", ",")}</strong>
        `;

        lista.appendChild(item);
    });
}


// =====================================================
// AUTOPREENCHIMENTO DE DADOS E ENDEREÇO DO CLIENTE
// =====================================================

async function carregarDadosClienteAutomatico() {
    try {
        let idClienteParam = "";
        const dadosLocais = localStorage.getItem("usuarioLogado");
        if (dadosLocais) {
            try {
                const usuario = JSON.parse(dadosLocais);
                if (usuario && usuario.id_cliente) {
                    idClienteParam = `?id_cliente=${usuario.id_cliente}`;
                }
            } catch (e) {}
        }

        const resposta = await fetch(`/cliente.php${idClienteParam}`, {
            method: "GET",
            credentials: "include"
        });

        if (!resposta.ok) return;

        const resultado = await resposta.json();
        if (!resultado.sucesso) return;

        const cliente = resultado.cliente;
        const endereco = resultado.endereco;

        const inputNome = document.getElementById("nome");
        if (inputNome && !inputNome.value && cliente && cliente.nome) {
            inputNome.value = cliente.nome;
        }

        if (endereco && endereco.cep && endereco.cep !== "-") {
            const inputCep = document.getElementById("cep");
            const inputRua = document.getElementById("rua");
            const inputNumero = document.getElementById("numero");
            const inputComplemento = document.getElementById("complemento");
            const inputBairro = document.getElementById("bairro");
            const inputCidade = document.getElementById("cidade");
            const inputEstado = document.getElementById("estado");

            if (inputCep && !inputCep.value) inputCep.value = endereco.cep;
            if (inputRua) { inputRua.value = endereco.rua || ""; inputRua.removeAttribute("readonly"); }
            if (inputNumero && !inputNumero.value) inputNumero.value = endereco.numero !== "-" ? endereco.numero : "";
            if (inputComplemento && !inputComplemento.value) inputComplemento.value = endereco.complemento !== "-" ? endereco.complemento : "";
            if (inputBairro) { inputBairro.value = endereco.bairro || ""; inputBairro.removeAttribute("readonly"); }
            if (inputCidade) { inputCidade.value = endereco.cidade || ""; inputCidade.removeAttribute("readonly"); }
            if (inputEstado) { inputEstado.value = endereco.estado || ""; inputEstado.removeAttribute("readonly"); }

            const statusCep = document.getElementById("statusCep");
            if (statusCep) {
                statusCep.textContent = "✓ Endereço carregado do perfil.";
                statusCep.className = "status-cep encontrado";
            }
        }

    } catch (erro) {
        console.error("Erro ao autocompreencher dados do cliente:", erro);
    }
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
                statusCep.textContent = "CEP não encontrado. Preencha manualmente.";
                statusCep.className = "status-cep erro";
            }
            liberarCamposManual();
            return;
        }

        const rua = document.getElementById("rua");
        const bairro = document.getElementById("bairro");
        const cidade = document.getElementById("cidade");
        const estado = document.getElementById("estado");
        const complemento = document.getElementById("complemento");
        const numero = document.getElementById("numero");

        if (rua) { rua.value = dados.logradouro || ""; rua.removeAttribute("readonly"); }
        if (bairro) { bairro.value = dados.bairro || ""; bairro.removeAttribute("readonly"); }
        if (cidade) { cidade.value = dados.localidade || ""; cidade.removeAttribute("readonly"); }
        if (estado) { estado.value = dados.uf || ""; estado.removeAttribute("readonly"); }
        if (complemento && dados.complemento) complemento.value = dados.complemento;

        if (statusCep) {
            statusCep.textContent = "✓ Endereço preenchido.";
            statusCep.className = "status-cep encontrado";
        }

        if (numero) numero.focus();

    } catch (erro) {
        console.error("Erro no ViaCEP:", erro);
        if (statusCep) {
            statusCep.textContent = "Consulta offline. Preencha manualmente.";
            statusCep.className = "status-cep erro";
        }
        liberarCamposManual();
    }
}

function liberarCamposManual() {
    ["rua", "bairro", "cidade", "estado"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.removeAttribute("readonly");
            el.style.backgroundColor = "#fff";
        }
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
        const nome = document.getElementById("nome") ? document.getElementById("nome").value.trim() : "";
        const cpfValor = document.getElementById("cpf") ? document.getElementById("cpf").value.trim() : "";
        const cepValor = document.getElementById("cep") ? document.getElementById("cep").value.trim() : "";
        const rua = document.getElementById("rua") ? document.getElementById("rua").value.trim() : "";
        const numero = document.getElementById("numero") ? document.getElementById("numero").value.trim() : "";
        const bairro = document.getElementById("bairro") ? document.getElementById("bairro").value.trim() : "";
        const cidade = document.getElementById("cidade") ? document.getElementById("cidade").value.trim() : "";
        const estado = document.getElementById("estado") ? document.getElementById("estado").value.trim() : "";

        if (!nome) { alert("Informe seu nome completo."); if (document.getElementById("nome")) document.getElementById("nome").focus(); return; }
        if (cpfValor.replace(/\D/g, "").length !== 11) { alert("Informe um CPF válido."); if (document.getElementById("cpf")) document.getElementById("cpf").focus(); return; }
        if (cepValor.replace(/\D/g, "").length !== 8) { alert("Informe um CEP válido."); if (document.getElementById("cep")) document.getElementById("cep").focus(); return; }
        if (!rua || !bairro || !cidade || !estado) { 
            alert("Preencha os dados do endereço (rua, bairro, cidade e estado)."); 
            liberarCamposManual();
            if (document.getElementById("rua")) document.getElementById("rua").focus(); 
            return; 
        }
        if (!numero) { alert("Informe o número do endereço."); if (document.getElementById("numero")) document.getElementById("numero").focus(); return; }

        // Exibe os dados recolhidos na Etapa 2
        const resumoClienteEl = document.getElementById("resumoClienteExibicao");
        const resumoEnderecoEl = document.getElementById("resumoEnderecoExibicao");
        const complementoVal = document.getElementById("complemento") ? document.getElementById("complemento").value.trim() : "";
        const compTexto = complementoVal ? `, ${complementoVal}` : "";

        if (resumoClienteEl) {
            resumoClienteEl.innerHTML = `<strong>Nome:</strong> ${nome} | <strong>CPF:</strong> ${cpfValor}`;
        }
        if (resumoEnderecoEl) {
            resumoEnderecoEl.innerHTML = `<strong>Endereço:</strong> ${rua}, ${numero}${compTexto} - ${bairro}, ${cidade}/${estado} (CEP: ${cepValor})`;
        }

        // Alterna para a Etapa 2
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

        const nome = document.getElementById("nome") ? document.getElementById("nome").value.trim() : "";
        const cpfValor = document.getElementById("cpf") ? document.getElementById("cpf").value.trim() : "";
        const cepValor = document.getElementById("cep") ? document.getElementById("cep").value.trim() : "";
        const rua = document.getElementById("rua") ? document.getElementById("rua").value.trim() : "";
        const numero = document.getElementById("numero") ? document.getElementById("numero").value.trim() : "";
        const bairro = document.getElementById("bairro") ? document.getElementById("bairro").value.trim() : "";
        const cidade = document.getElementById("cidade") ? document.getElementById("cidade").value.trim() : "";
        const estado = document.getElementById("estado") ? document.getElementById("estado").value.trim() : "";
        const complemento = document.getElementById("complemento") ? document.getElementById("complemento").value.trim() : "";

        const formaPagamentoEl = document.querySelector('input[name="formaPagamento"]:checked');
        const formaPagamento = formaPagamentoEl ? formaPagamentoEl.value : "pix";

        if (!itensPedido || itensPedido.length === 0) {
            alert("Seu pedido está vazio.");
            window.location.href = "/Telainicial/index.html";
            return;
        }

        const btn = document.getElementById("btnContinuar") || document.getElementById("btnFinalizarPedido");

        if (btn) {
            btn.disabled = true;
            btn.textContent = "Processando pagamento...";
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
                    id_produto: Number(produto.id_produto || produto.id),
                    quantidade: Number(produto.quantidade || produto.qtd) || 1,
                    preco: Number(produto.preco || produto.valor_unitario)
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
                        forma_pagamento: formaPagamento,
                        endereco: {
                            cep: cepValor,
                            rua: rua,
                            numero: numero,
                            complemento: complemento,
                            bairro: bairro,
                            cidade: cidade,
                            estado: estado
                        },
                        itens: itens,
                        valor_total: totalPedido
                    })
                }
            );

            const resultado = await resposta.json();

            if (resposta.ok && resultado.sucesso) {
                // Limpa o carrinho local
                localStorage.removeItem("carrinho");
                localStorage.removeItem("pedidos");
                localStorage.removeItem("totalPedido");

                alert("Pedido realizado com sucesso!");
                window.location.href = "/TelaCliente/cliente.html";
            } else {
                alert(resultado.mensagem || "Não foi possível finalizar o pedido. Tente novamente.");
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = "Finalizar Pedido";
                }
            }

        } catch (erro) {
            console.error("Erro ao finalizar pedido:", erro);
            alert("Ocorreu um erro ao processar seu pedido. Verifique sua conexão.");
            if (btn) {
                btn.disabled = false;
                btn.textContent = "Finalizar Pedido";
            }
        }
    });
}


// =====================================================
// INICIALIZAÇÃO DA TELA
// =====================================================

document.addEventListener("DOMContentLoaded", function () {
    renderizarResumo();
    carregarDadosClienteAutomatico();
});
