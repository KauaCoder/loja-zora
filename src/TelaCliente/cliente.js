// =====================================================
// ZORA - PERFIL DO CLIENTE (Versão Corrigida & Direta)
// =====================================================

document.addEventListener("DOMContentLoaded", function () {
    carregarDadosPerfil();
    carregarCompras();

    const cepEdicao = document.getElementById("cepEdicao");
    if (cepEdicao) {
        cepEdicao.addEventListener("input", () => {
            let valor = cepEdicao.value.replace(/\D/g, "").substring(0, 8);
            if (valor.length > 5) {
                valor = valor.replace(/^(\d{5})(\d)/, "$1-$2");
            }
            cepEdicao.value = valor;
        });

        cepEdicao.addEventListener("blur", buscarCEPEdicao);
    }
});

// FUNÇÃO RESILIENTE CORRIGIDA: Rotas diretas e limpas para evitar erros 404
async function fazerFetchResiliente(nomeArquivo, opcoes = {}) {
    let idClienteParam = "";
    const dadosLocais = localStorage.getItem("usuarioLogado");
    if (dadosLocais) {
        try {
            const usuario = JSON.parse(dadosLocais);
            if (usuario && usuario.id_cliente) {
                idClienteParam = `id_cliente=${usuario.id_cliente}`;
            }
        } catch (e) {
            console.error("Erro ao ler localStorage:", e);
        }
    }

    // Ordem otimizada: tenta na raiz absoluta, depois pasta atual e pasta pai
    const rotasPossiveis = [
        `/${nomeArquivo}`,
        `./${nomeArquivo}`,
        `../${nomeArquivo}`,
        `/TelaCliente/${nomeArquivo}`
    ];

    let ultimoErro = null;

    for (const rota of rotasPossiveis) {
        try {
            let urlFinal = rota;
            if (idClienteParam) {
                urlFinal += (rota.includes("?") ? "&" : "?") + idClienteParam;
            }

            const resposta = await fetch(urlFinal, {
                credentials: "include",
                ...opcoes
            });

            if (resposta.status === 404) {
                continue;
            }

            return resposta;
        } catch (erro) {
            ultimoErro = erro;
        }
    }

    throw ultimoErro || new Error(`Não foi possível conectar ao endpoint ${nomeArquivo}`);
}

async function verificarLogin() {
    try {
        const resposta = await fazerFetchResiliente("usuario_logado.php", { method: "GET" });
        const texto = await resposta.text();
        
        let resultado;
        try {
            resultado = JSON.parse(texto);
        } catch (e) {
            console.error("Resposta inválida do servidor:", texto);
            if (localStorage.getItem("usuarioLogado")) return true;
            window.location.replace("/TelaLogin/login.html");
            return false;
        }

        if (!resultado.sucesso || !resultado.logado) {
            if (localStorage.getItem("usuarioLogado")) return true;
            window.location.replace("/TelaLogin/login.html");
            return false;
        }

        return true;
    } catch (erro) {
        console.error("Erro ao verificar sessão:", erro);
        if (localStorage.getItem("usuarioLogado")) return true;
        window.location.replace("/TelaLogin/login.html");
        return false;
    }
}

async function carregarDadosPerfil() {
    const logado = await verificarLogin();
    if (!logado) return;

    try {
        const resposta = await fazerFetchResiliente("cliente.php", { method: "GET" });
        const texto = await resposta.text();

        let resultado;
        try {
            resultado = JSON.parse(texto);
        } catch (e) {
            throw new Error(`Resposta inválida do cliente.php: ${texto.substring(0, 100)}`);
        }

        if (!resposta.ok || !resultado.sucesso) {
            throw new Error(resultado.mensagem || "Não foi possível carregar os dados.");
        }

        const cliente = resultado.cliente;

        // Preenche os campos do perfil com segurança
        if (document.getElementById("nomeUsuario")) document.getElementById("nomeUsuario").textContent = cliente.nome || "Usuário";
        if (document.getElementById("emailUsuario")) document.getElementById("emailUsuario").textContent = cliente.email || "-";
        if (document.getElementById("nomePerfil")) document.getElementById("nomePerfil").textContent = cliente.nome || "-";
        if (document.getElementById("emailPerfil")) document.getElementById("emailPerfil").textContent = cliente.email || "-";
        if (document.getElementById("telefonePerfil")) document.getElementById("telefonePerfil").textContent = cliente.telefone || "-";

        carregarEndereco(resultado.endereco);

    } catch (erro) {
        console.error("Erro ao carregar perfil:", erro);
        
        // Fallback de emergência caso a API falhe mas o usuário esteja no localStorage:
        // Preenche pelo menos com o que está guardado no navegador para a tela não ficar vazia!
        const dadosLocais = localStorage.getItem("usuarioLogado");
        if (dadosLocais) {
            try {
                const usuario = JSON.parse(dadosLocais);
                if (document.getElementById("nomeUsuario")) document.getElementById("nomeUsuario").textContent = usuario.nome || "Usuário";
                if (document.getElementById("emailUsuario")) document.getElementById("emailUsuario").textContent = usuario.email || "-";
                if (document.getElementById("nomePerfil")) document.getElementById("nomePerfil").textContent = usuario.nome || "-";
                if (document.getElementById("emailPerfil")) document.getElementById("emailPerfil").textContent = usuario.email || "-";
            } catch (err) {}
        }
    }
}

function mostrarEdicaoNome() {
    const displayGroup = document.getElementById("nomeDisplayGroup");
    const edicaoGroup = document.getElementById("nomeEdicaoGroup");

    if (displayGroup && edicaoGroup) {
        displayGroup.style.display = "none";
        edicaoGroup.style.display = "block";
        const nomePerfil = document.getElementById("nomePerfil");
        if (nomePerfil) {
            document.getElementById("novoNomeInput").value = nomePerfil.textContent;
        }
    }
}

function cancelarEdicaoNome() {
    const displayGroup = document.getElementById("nomeDisplayGroup");
    const edicaoGroup = document.getElementById("nomeEdicaoGroup");

    if (displayGroup && edicaoGroup) {
        edicaoGroup.style.display = "none";
        displayGroup.style.display = "block";
    }
}

async function salvarNovoNome() {
    const logado = await verificarLogin();
    if (!logado) return;

    const novoNome = document.getElementById("novoNomeInput").value.trim();

    if (!novoNome) {
        alert("Informe um nome válido.");
        return;
    }

    try {
        const resposta = await fazerFetchResiliente("atualizar_perfil.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome: novoNome })
        });

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            alert(resultado.mensagem || "Não foi possível atualizar o nome.");
            return;
        }

        alert("Nome atualizado com sucesso!");
        cancelarEdicaoNome();
        await carregarDadosPerfil();

    } catch (erro) {
        console.error("Erro ao atualizar nome:", erro);
        alert("Erro ao conectar ao servidor.");
    }
}

function carregarEndereco(endereco) {
    if (!endereco || !endereco.id_endereco) {
        ["cepPerfil", "ruaPerfil", "numeroPerfil", "complementoPerfil", "bairroPerfil", "cidadePerfil", "estadoPerfil"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = "-";
        });
        return;
    }

    if (document.getElementById("cepPerfil")) document.getElementById("cepPerfil").textContent = endereco.cep || "-";
    if (document.getElementById("ruaPerfil")) document.getElementById("ruaPerfil").textContent = endereco.rua || "-";
    if (document.getElementById("numeroPerfil")) document.getElementById("numeroPerfil").textContent = endereco.numero || "-";
    if (document.getElementById("complementoPerfil")) document.getElementById("complementoPerfil").textContent = endereco.complemento || "-";
    if (document.getElementById("bairroPerfil")) document.getElementById("bairroPerfil").textContent = endereco.bairro || "-";
    if (document.getElementById("cidadePerfil")) document.getElementById("cidadePerfil").textContent = endereco.cidade || "-";
    if (document.getElementById("estadoPerfil")) document.getElementById("estadoPerfil").textContent = endereco.estado || "-";
}

async function mostrarEdicaoEndereco() {
    const logado = await verificarLogin();
    if (!logado) return;

    try {
        const resposta = await fazerFetchResiliente("cliente.php", { method: "GET" });
        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            throw new Error(resultado.mensagem || "Não foi possível carregar o endereço.");
        }

        const endereco = resultado.endereco || {};

        const existente = document.getElementById("endereco-existente");
        const edicao = document.getElementById("endereco-edicao");

        if (existente) existente.style.display = "none";
        if (edicao) edicao.style.display = "block";

        if (document.getElementById("cepEdicao")) document.getElementById("cepEdicao").value = endereco.cep || "";
        if (document.getElementById("ruaEdicao")) document.getElementById("ruaEdicao").value = endereco.rua || "";
        if (document.getElementById("numeroEdicao")) document.getElementById("numeroEdicao").value = endereco.numero || "";
        if (document.getElementById("complementoEdicao")) document.getElementById("complementoEdicao").value = endereco.complemento || "";
        if (document.getElementById("bairroEdicao")) document.getElementById("bairroEdicao").value = endereco.bairro || "";
        if (document.getElementById("cidadeEdicao")) document.getElementById("cidadeEdicao").value = endereco.cidade || "";
        if (document.getElementById("estadoEdicao")) document.getElementById("estadoEdicao").value = endereco.estado || "";

    } catch (erro) {
        console.error("Erro ao carregar endereço:", erro);
        alert("Não foi possível carregar o endereço.");
    }
}

function cancelarEdicao() {
    const existente = document.getElementById("endereco-existente");
    const edicao = document.getElementById("endereco-edicao");

    if (edicao) edicao.style.display = "none";
    if (existente) existente.style.display = "block";
}

async function salvarEndereco() {
    const logado = await verificarLogin();
    if (!logado) return;

    const cep = document.getElementById("cepEdicao").value.trim();
    const rua = document.getElementById("ruaEdicao").value.trim();
    const numero = document.getElementById("numeroEdicao").value.trim();
    const complemento = document.getElementById("complementoEdicao").value.trim();
    const bairro = document.getElementById("bairroEdicao").value.trim();
    const cidade = document.getElementById("cidadeEdicao").value.trim();
    const estado = document.getElementById("estadoEdicao").value.trim();

    if (!cep || !rua || !numero || !bairro || !cidade || !estado) {
        alert("Preencha todos os campos obrigatórios.");
        return;
    }

    try {
        const resposta = await fazerFetchResiliente("atualizar_endereco.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                cep, rua, numero, complemento, bairro, cidade, estado
            })
        });

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            alert(resultado.mensagem || "Não foi possível atualizar o endereço.");
            return;
        }

        alert("Endereço atualizado com sucesso!");
        cancelarEdicao();
        await carregarDadosPerfil();

    } catch (erro) {
        console.error("Erro ao atualizar endereço:", erro);
        alert("Não foi possível conectar ao servidor.");
    }
}

async function buscarCEPEdicao() {
    const cep = document.getElementById("cepEdicao");
    if (!cep) return;

    const valor = cep.value.replace(/\D/g, "");

    if (valor.length !== 8) {
        alert("CEP inválido.");
        return;
    }

    try {
        const resposta = await fetch(`https://viacep.com.br/ws/${valor}/json/`);
        const dados = await resposta.json();

        if (dados.erro) {
            alert("CEP não encontrado.");
            return;
        }

        if (document.getElementById("ruaEdicao")) document.getElementById("ruaEdicao").value = dados.logradouro || "";
        if (document.getElementById("bairroEdicao")) document.getElementById("bairroEdicao").value = dados.bairro || "";
        if (document.getElementById("cidadeEdicao")) document.getElementById("cidadeEdicao").value = dados.localidade || "";
        if (document.getElementById("estadoEdicao")) document.getElementById("estadoEdicao").value = dados.uf || "";
        if (document.getElementById("complementoEdicao")) document.getElementById("complementoEdicao").value = dados.complemento || "";

        const numInput = document.getElementById("numeroEdicao");
        if (numInput) numInput.focus();

    } catch (erro) {
        console.error("Erro ao consultar CEP:", erro);
        alert("Erro ao consultar o CEP.");
    }
}

async function carregarCompras() {
    const comprasVazio = document.getElementById("compras-vazio");
    const comprasLista = document.getElementById("compras-lista");

    if (!comprasVazio || !comprasLista) return;

    try {
        const resposta = await fazerFetchResiliente("historico_pedidos.php", { method: "GET" });
        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            throw new Error(resultado.mensagem || "Não foi possível carregar as compras.");
        }

        const compras = resultado.pedidos || [];

        if (compras.length === 0) {
            comprasVazio.style.display = "block";
            comprasLista.style.display = "none";
            return;
        }

        comprasVazio.style.display = "none";
        comprasLista.style.display = "block";
        comprasLista.innerHTML = "";

        compras.forEach(compra => {
            const compraCard = document.createElement("div");
            compraCard.className = "compra-card";

            const data = new Date(compra.data || compra.data_pedido);
            const dataFormatada = data.toLocaleDateString("pt-BR");

            const produtosHTML = (compra.produtos || compra.itens || []).map(produto => {
                const preco = Number(produto.preco || produto.preco_unitario).toFixed(2).replace(".", ",");
                const subtotal = Number(produto.subtotal || (produto.quantidade * produto.preco)).toFixed(2).replace(".", ",");
                const podeDevolver = (compra.status !== "Devolvido" && produto.status !== "Devolvido");

                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #eee;">
                        <div>
                            <p style="margin:0;"><strong>${produto.quantidade}x ${produto.nome}</strong></p>
                            <small>R$ ${preco} unit. | Subtotal: R$ ${subtotal}</small>
                        </div>
                        <div>
                            ${podeDevolver ? 
                                `<button type="button" onclick="abrirModalDevolucao(${compra.id_pedido}, ${produto.id_produto}, '${produto.nome}')" style="background:#dc3545; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px;">
                                    Solicitar Devolução
                                 </button>` : 
                                `<span style="color:#888; font-size:12px;">Devolução Solicitada</span>`
                            }
                        </div>
                    </div>
                `;
            }).join("");

            const total = Number(compra.total || compra.valor_total).toFixed(2).replace(".", ",");

            compraCard.innerHTML = `
                <div class="compra-header">
                    <div class="compra-info">
                        <h4>Pedido #${String(compra.id_pedido).padStart(4, "0")}</h4>
                        <p class="data">${dataFormatada}</p>
                    </div>
                    <div class="compra-total">
                        <p class="label">Total</p>
                        <p class="preco">R$ ${total}</p>
                    </div>
                </div>

                <div class="compra-produtos" style="margin-top:10px;">
                    <h5>Produtos:</h5>
                    ${produtosHTML}
                </div>

                <div class="compra-footer" style="margin-top:10px;">
                    <p><strong>Status:</strong> ${compra.status}</p>
                </div>
            `;

            comprasLista.appendChild(compraCard);
        });

    } catch (erro) {
        console.error("Erro ao carregar compras:", erro);
        comprasVazio.style.display = "block";
        comprasLista.style.display = "none";
    }
}

function abrirModalDevolucao(idPedido, idProduto, nomeProduto) {
    const elPedido = document.getElementById("devolucaoIdPedido");
    const elProduto = document.getElementById("devolucaoIdProduto");
    const elNome = document.getElementById("devolucaoNomeProduto");
    const modal = document.getElementById("modalDevolucao");

    if (elPedido && elProduto && elNome && modal) {
        elPedido.value = idPedido;
        elProduto.value = idProduto;
        elNome.textContent = nomeProduto;
        modal.style.display = "flex";
    }
}

function fecharModalDevolucao() {
    const modal = document.getElementById("modalDevolucao");
    if (modal) {
        modal.style.display = "none";
    }
}

async function confirmarDevolucao(evento) {
    evento.preventDefault();

    const idPedido = document.getElementById("devolucaoIdPedido").value;
    const idProduto = document.getElementById("devolucaoIdProduto").value;
    const motivo = document.getElementById("motivoDevolucao").value;

    if (!motivo) {
        alert("Selecione o motivo da devolução.");
        return;
    }

    try {
        const resposta = await fazerFetchResiliente("solicitar_devolucao.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id_pedido: Number(idPedido),
                id_produto: Number(idProduto),
                motivo: motivo
            })
        });

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            alert(resultado.mensagem || "Não foi possível solicitar a devolução.");
            return;
        }

        alert("Solicitação de devolução registrada com sucesso!");
        fecharModalDevolucao();
        await carregarCompras();

    } catch (erro) {
        console.error("Erro na devolução:", erro);
        alert("Erro ao conectar ao servidor.");
    }
}

async function sairDoPerfil() {
    if (!confirm("Você tem certeza que deseja sair?")) {
        return;
    }

    try {
        await fazerFetchResiliente("logout.php", { method: "POST" });
        localStorage.removeItem("usuarioLogado");
        window.location.replace("/TelaLogin/login.html");
    } catch (erro) {
        console.error("Erro ao realizar logout:", erro);
        localStorage.removeItem("usuarioLogado");
        window.location.replace("/TelaLogin/login.html");
    }
}
