/* =========================================================
   CADASTRO
   ========================================================= */

const formCadastro = document.getElementById("formCadastro");
if (formCadastro) {
    formCadastro.addEventListener("submit", async function (event) {
        event.preventDefault();

        try {
            const nome = document.getElementById("nomeCadastro").value.trim();
            const email = normalizarEmail(document.getElementById("emailCadastro").value);
            const telefone = document.getElementById("telefoneCadastro").value.trim();
            const senha = document.getElementById("senhaCadastro").value;
            const confirmarSenha = document.getElementById("confirmarSenhaCadastro").value;

            if (!nome || !email) {
                alert("Digite seu nome e e-mail.");
                return;
            }

            if (senha.length < 6) {
                alert("A senha deve ter no mínimo 6 caracteres!");
                return;
            }

            if (senha !== confirmarSenha) {
                alert("As senhas não conferem!");
                return;
            }

            const endereco = {
                cep: document.getElementById("cepCadastro").value.trim(),
                rua: document.getElementById("ruaCadastro").value.trim(),
                numero: document.getElementById("numeroCadastro").value.trim(),
                complemento: document.getElementById("complementoCadastro").value.trim(),
                bairro: document.getElementById("bairroCadastro").value.trim(),
                cidade: document.getElementById("cidadeCadastro").value.trim(),
                estado: document.getElementById("estadoCadastro").value.trim()
            };

            // ROTA ABSOLUTA PARA O ARQUIVO PHP NA RAIZ
            const resposta = await fetch("/cadastrar_cliente.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ nome, email, telefone, senha, endereco })
            });

            const textoBruto = await resposta.text();
            let resultado;

            try {
                resultado = JSON.parse(textoBruto);
            } catch (e) {
                console.error("Resposta do servidor não é JSON:", textoBruto);
                alert("Erro retornado pelo servidor:\n" + textoBruto.substring(0, 200));
                return;
            }

            if (!resultado.sucesso) {
                alert(resultado.mensagem || "Não foi possível realizar o cadastro.");
                return;
            }

            alert("Cadastro realizado com sucesso! Agora faça login.");
            mudarAba("login");

            formCadastro.reset();
            limparEnderecos();

        } catch (erro) {
            console.error("Erro no cadastro:", erro);
            alert("Não foi possível conectar ao servidor: " + erro.message);
        }
    });
}
