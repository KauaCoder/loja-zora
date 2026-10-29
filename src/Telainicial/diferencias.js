// =====================================================
// ZORA - DIFERENCIAIS DA LOJA
// Complementa o script.js (não substitui nada dele):
//   1. Barra de frete grátis dentro do carrinho
//   2. Coração de favoritos nos cards (mesma lista da página de produto)
//   3. Provador de Estilo: 3 perguntas e a loja sugere peças
// =====================================================

(function () {
    "use strict";

    // Valor mínimo para frete grátis (exemplo: ajuste para a regra real da loja)
    const FRETE_GRATIS = 299;

    function normalizar(texto) {
        return String(texto || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }

    function moeda(valor) {
        const n = Number(valor);
        return (Number.isFinite(n) ? n : 0).toFixed(2).replace(".", ",");
    }


    // =================================================
    // 1. FRETE GRÁTIS NO CARRINHO
    // =================================================

    function iniciarFrete() {
        const caixa = document.getElementById("Pedidos");
        const lista = document.getElementById("listaPedidos");
        const total = document.getElementById("total");

        if (!caixa || !lista || !total) return;

        const barra = document.createElement("div");
        barra.className = "frete-barra";

        const texto = document.createElement("p");
        texto.className = "frete-texto";

        const trilho = document.createElement("div");
        trilho.className = "frete-trilho";

        const preenchimento = document.createElement("div");
        preenchimento.className = "frete-preenchimento";

        trilho.appendChild(preenchimento);
        barra.append(texto, trilho);
        caixa.insertBefore(barra, lista);

        function atualizar() {
            // O script.js escreve o total no formato "123,45"
            const valor = parseFloat(String(total.textContent).replace(",", ".")) || 0;
            const progresso = Math.min(100, (valor / FRETE_GRATIS) * 100);

            preenchimento.style.width = progresso + "%";
            barra.classList.toggle("completo", valor >= FRETE_GRATIS);

            texto.textContent = "";

            if (valor <= 0) {
                texto.textContent = `Frete grátis em compras acima de R$ ${moeda(FRETE_GRATIS)}`;
            } else if (valor >= FRETE_GRATIS) {
                const forte = document.createElement("strong");
                forte.textContent = "Você ganhou frete grátis!";
                texto.appendChild(forte);
            } else {
                texto.append("Faltam ");
                const forte = document.createElement("strong");
                forte.textContent = `R$ ${moeda(FRETE_GRATIS - valor)}`;
                texto.append(forte, " para o frete grátis");
            }
        }

        new MutationObserver(atualizar).observe(total, {
            childList: true,
            characterData: true,
            subtree: true
        });

        atualizar();
    }


    // =================================================
    // 2. FAVORITOS NOS CARDS
    // =================================================

    function lerFavoritos() {
        try {
            const dados = JSON.parse(localStorage.getItem("favoritos") || "[]");
            return Array.isArray(dados) ? dados.map(Number) : [];
        } catch (erro) {
            return [];
        }
    }

    function salvarFavoritos(lista) {
        try {
            localStorage.setItem("favoritos", JSON.stringify(lista));
        } catch (erro) {
            console.error("ZORA: não foi possível salvar os favoritos.", erro);
        }
    }

    function idDoCard(card) {
        const link = card.querySelector("a");
        if (!link) return null;

        const achado = (link.getAttribute("href") || "").match(/id=(\d+)/);
        return achado ? Number(achado[1]) : null;
    }

    function criarCoracao(id) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "fav-btn";

        btn.innerHTML =
            '<svg viewBox="0 0 24 24" aria-hidden="true">' +
            '<path d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.8 3.6 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.4 0 5.4 3.3 4.2 6.7-1.7 4.7-9.2 9.3-9.2 9.3z"/>' +
            "</svg>";

        function pintar() {
            const favorito = lerFavoritos().includes(id);
            btn.setAttribute("aria-pressed", favorito ? "true" : "false");
            btn.setAttribute("aria-label", favorito ? "Remover dos favoritos" : "Favoritar");
        }

        btn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();

            let favoritos = lerFavoritos();

            favoritos = favoritos.includes(id)
                ? favoritos.filter(f => f !== id)
                : favoritos.concat(id);

            salvarFavoritos(favoritos);
            pintar();
        });

        pintar();
        return btn;
    }

    function decorarCards() {
        const catalogo = document.getElementById("catalogoProdutos");
        if (!catalogo) return;

        catalogo.querySelectorAll(".produto").forEach(card => {
            if (card.querySelector(".fav-btn")) return;

            const id = idDoCard(card);
            if (!id) return;

            card.appendChild(criarCoracao(id));
        });
    }

    function iniciarFavoritos() {
        const catalogo = document.getElementById("catalogoProdutos");
        if (!catalogo) return;

        // Só observa os filhos diretos: o catálogo é refeito a cada carregamento
        new MutationObserver(decorarCards).observe(catalogo, { childList: true });
        decorarCards();
    }


    // =================================================
    // 3. PROVADOR DE ESTILO
    // =================================================

    // Palavras-chave comparadas com nome, descrição e categoria dos produtos.
    // Ajuste à vontade conforme as peças reais da ZORA.
    const PERGUNTAS = [
        {
            titulo: "Para qual ocasião você procura uma peça?",
            opcoes: [
                { rotulo: "Dia a dia",       chaves: ["camiseta", "blusa", "jeans", "short", "moletom", "moletinho", "cropped", "malha", "algodao", "regata", "calca"] },
                { rotulo: "Trabalho",        chaves: ["alfaiataria", "camisa", "blazer", "social", "calca", "saia", "linho", "viscose"] },
                { rotulo: "Noite e festa",   chaves: ["vestido", "body", "saia", "cetim", "tule", "preto", "decote", "longo", "festa", "chiffon"] },
                { rotulo: "Praia e verão",   chaves: ["biquini", "maio", "saida", "short", "linho", "estampado", "tropical", "regata", "vestido"] }
            ]
        },
        {
            titulo: "Como você descreve o seu estilo?",
            opcoes: [
                { rotulo: "Básico e confortável", chaves: ["basico", "liso", "algodao", "malha", "confort", "moletom", "moletinho", "canelada"] },
                { rotulo: "Elegante",             chaves: ["alfaiataria", "linho", "cetim", "social", "blazer", "viscose", "fluido", "chiffon"] },
                { rotulo: "Marcante",             chaves: ["estampado", "decote", "tule", "cropped", "body", "fenda", "animal", "tropical"] }
            ]
        },
        {
            titulo: "Quanto você quer investir em uma peça?",
            opcoes: [
                { rotulo: "Até R$ 100",       faixa: [0, 100] },
                { rotulo: "De R$ 100 a 200",  faixa: [100, 200] },
                { rotulo: "Acima de R$ 200",  faixa: [200, Infinity] },
                { rotulo: "Tanto faz",        faixa: [0, Infinity] }
            ]
        }
    ];

    let passoAtual = 0;
    let respostas = [];

    function pegarProdutos() {
        // produtosGlobais é preenchido pelo script.js quando o catálogo carrega
        return (typeof produtosGlobais !== "undefined" && Array.isArray(produtosGlobais))
            ? produtosGlobais
            : [];
    }

    function estoqueDe(produto) {
        const valor = produto.qtd_item !== undefined ? produto.qtd_item : produto.estoque;
        const n = Number(valor);
        return Number.isFinite(n) ? n : 1;
    }

    function nomeDe(produto) {
        return String(produto.nm_produto || produto.nome || "Produto ZORA");
    }

    function pontuar(produto, chaves) {
        const texto = normalizar(
            nomeDe(produto) + " " + (produto.descricao || "") + " " + (produto.categoria || "")
        );

        return chaves.reduce((soma, chave) => soma + (texto.includes(chave) ? 1 : 0), 0);
    }

    function calcularSugestoes() {
        const produtos = pegarProdutos().filter(p => estoqueDe(p) > 0);

        const chaves = []
            .concat(respostas[0] ? respostas[0].chaves : [])
            .concat(respostas[1] ? respostas[1].chaves : []);

        const faixa = respostas[2] && respostas[2].faixa ? respostas[2].faixa : [0, Infinity];

        const pontuados = produtos
            .map(p => ({ produto: p, pontos: pontuar(p, chaves), preco: Number(p.preco) || 0 }))
            .sort((a, b) => b.pontos - a.pontos);

        const dentroDaFaixa = pontuados.filter(item => item.preco >= faixa[0] && item.preco <= faixa[1]);

        // Primeiro quem combina com o estilo e cabe no preço; depois completa com o resto da faixa
        let escolhidos = dentroDaFaixa.filter(item => item.pontos > 0).slice(0, 4);

        if (escolhidos.length < 4) {
            const ids = new Set(escolhidos.map(i => i.produto.id_produto));
            escolhidos = escolhidos.concat(
                dentroDaFaixa.filter(i => !ids.has(i.produto.id_produto)).slice(0, 4 - escolhidos.length)
            );
        }

        return {
            itens: escolhidos,
            semFaixa: dentroDaFaixa.length === 0
        };
    }

    function esconderResultado() {
        const resultado = document.getElementById("estiloResultado");
        if (resultado) {
            resultado.hidden = true;
            resultado.replaceChildren();
        }
    }

    function reiniciarQuiz() {
        passoAtual = 0;
        respostas = [];
        esconderResultado();
        desenharPergunta();
    }

    function desenharPergunta() {
        const quiz = document.getElementById("estiloQuiz");
        if (!quiz) return;

        const pergunta = PERGUNTAS[passoAtual];

        quiz.replaceChildren();

        const passo = document.createElement("p");
        passo.className = "estilo-passo";
        passo.textContent = `Pergunta ${passoAtual + 1} de ${PERGUNTAS.length}`;

        const titulo = document.createElement("h3");
        titulo.className = "estilo-pergunta";
        titulo.textContent = pergunta.titulo;

        const opcoes = document.createElement("div");
        opcoes.className = "estilo-opcoes";

        pergunta.opcoes.forEach(opcao => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = opcao.rotulo;

            if (respostas[passoAtual] === opcao) btn.classList.add("escolhido");

            btn.addEventListener("click", function () {
                respostas[passoAtual] = opcao;
                opcoes.querySelectorAll("button").forEach(b => b.classList.remove("escolhido"));
                btn.classList.add("escolhido");

                // pequena pausa para a pessoa ver a escolha antes de avançar
                setTimeout(function () {
                    if (passoAtual < PERGUNTAS.length - 1) {
                        passoAtual += 1;
                        desenharPergunta();
                    } else {
                        mostrarResultado();
                    }
                }, 220);
            });

            opcoes.appendChild(btn);
        });

        quiz.append(passo, titulo, opcoes);

        if (passoAtual > 0) {
            const voltar = document.createElement("button");
            voltar.type = "button";
            voltar.className = "estilo-voltar";
            voltar.textContent = "Voltar";
            voltar.addEventListener("click", function () {
                passoAtual -= 1;
                desenharPergunta();
            });
            quiz.appendChild(voltar);
        }
    }

    function mostrarResultado() {
        const quiz = document.getElementById("estiloQuiz");
        const resultado = document.getElementById("estiloResultado");
        if (!quiz || !resultado) return;

        const { itens, semFaixa } = calcularSugestoes();

        resultado.replaceChildren();

        // Resumo no painel do quiz
        quiz.replaceChildren();

        const resumo = document.createElement("p");
        resumo.className = "estilo-pergunta";
        resumo.textContent = "Pronto! Veja as peças que separamos para você.";

        const refazer = document.createElement("button");
        refazer.type = "button";
        refazer.className = "estilo-voltar";
        refazer.textContent = "Refazer o provador";
        refazer.addEventListener("click", reiniciarQuiz);

        quiz.append(resumo, refazer);

        // Resultado completo
        const topo = document.createElement("div");
        topo.className = "resultado-topo";

        const titulo = document.createElement("h3");
        titulo.textContent = "Peças para o seu estilo";
        topo.appendChild(titulo);

        resultado.appendChild(topo);

        if (itens.length === 0) {
            const vazio = document.createElement("p");
            vazio.className = "resultado-nota";
            vazio.textContent = pegarProdutos().length === 0
                ? "Os produtos ainda estão carregando. Tente de novo em instantes."
                : "Não encontramos peças disponíveis agora. Veja o catálogo completo.";
            resultado.appendChild(vazio);
        } else {
            if (semFaixa) {
                // não deve acontecer, mas evita uma tela vazia
                console.warn("ZORA: nenhum produto na faixa de preço escolhida.");
            }

            const nota = document.createElement("p");
            nota.className = "resultado-nota";
            nota.textContent = "Toque em uma peça para ver detalhes e escolher o tamanho.";
            resultado.appendChild(nota);

            const grade = document.createElement("div");
            grade.className = "resultado-grade";

            itens.forEach(({ produto }) => {
                const id = Number(produto.id_produto);
                const nome = nomeDe(produto);
                const preco = Number(produto.preco) || 0;

                const card = document.createElement("a");
                card.className = "resultado-card";
                card.href = "/TelaProdutos/produtos.html?id=" + encodeURIComponent(id);

                const foto = document.createElement("div");
                foto.className = "foto";

                const img = document.createElement("img");
                img.src = typeof obterImagemProduto === "function"
                    ? obterImagemProduto(produto.imagem)
                    : "/img/Logo 1.png";
                img.alt = nome;
                img.loading = "lazy";
                img.onerror = function () {
                    if (typeof window.gerenciarFalhaImagem === "function") {
                        window.gerenciarFalhaImagem(this, id);
                    }
                };

                foto.appendChild(img);

                const nomeEl = document.createElement("span");
                nomeEl.className = "nome";
                nomeEl.textContent = nome;

                const precoEl = document.createElement("span");
                precoEl.className = "preco";
                precoEl.textContent = `R$ ${moeda(preco)}`;

                card.append(foto, nomeEl, precoEl);
                grade.appendChild(card);
            });

            resultado.appendChild(grade);
        }

        resultado.hidden = false;
        resultado.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function iniciarQuiz() {
        if (!document.getElementById("estiloQuiz")) return;
        desenharPergunta();
    }


    // =================================================
    // INICIALIZAÇÃO
    // =================================================

    document.addEventListener("DOMContentLoaded", function () {
        iniciarFrete();
        iniciarFavoritos();
        iniciarQuiz();
    });

})();
