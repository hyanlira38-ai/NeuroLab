
const API_URL = "https://script.google.com/macros/s/AKfycbzbpZyAdb5_YfuU_EYb0YzU7La1__K1aBi8lZfbth7UY2vpdXNqldbGEIJLs9WY6gB9pg/exec";

const elementos = {
  total: document.getElementById("total-participantes"),
  releitura: document.getElementById("media-releitura"),
  recuperacao: document.getElementById("media-recuperacao"),
  melhor: document.getElementById("melhor-desempenho"),
  status: document.querySelector(".header .status"),
  formulario: document.getElementById("participant-form"),
  codigo: document.getElementById("participant-code"),
  mensagem: document.getElementById("form-message")
};

let contadorCallback = 0;
let carregamentoPainel = false;

function atualizarStatus(conectado) {
  if (!elementos.status) return;

  elementos.status.innerHTML = conectado
    ? '<span class="status-dot"></span> Planilha conectada'
    : '<span class="status-dot"></span> Sem conexão';

  const ponto = elementos.status.querySelector(".status-dot");

  if (ponto) {
    ponto.style.background = conectado ? "#65e6a5" : "#ff7373";

    ponto.style.boxShadow = conectado
      ? "0 0 12px #65e6a5"
      : "0 0 12px #ff7373";
  }
}

function formatarMedia(valor) {
  if (valor === "" || valor === null || valor === undefined) {
    return "—";
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero)) return "—";

  return numero.toLocaleString("pt-BR", {
    maximumFractionDigits: 1
  }) + "/10";
}

function jsonp(parametros) {
  return new Promise((resolve, reject) => {
    const callback = "neuroLabCallback" + (++contadorCallback);
    const script = document.createElement("script");

    let finalizado = false;

    function limpar() {
      delete window[callback];
      script.remove();
      clearTimeout(temporizador);
    }

    function concluir(callbackFn, valor) {
      if (finalizado) return;

      finalizado = true;
      limpar();
      callbackFn(valor);
    }

    window[callback] = function(dados) {
      concluir(resolve, dados);
    };

    const query = new URLSearchParams({
      ...parametros,
      callback,
      _: Date.now()
    });

    script.src = API_URL + "?" + query.toString();

    script.onerror = function() {
      concluir(reject, new Error("Falha na comunicação com a API."));
    };

    const temporizador = setTimeout(() => {
      concluir(reject, new Error("Tempo limite de conexão excedido."));
    }, 15000);

    document.head.appendChild(script);
  });
}

async function carregarPainel() {
  if (carregamentoPainel) return;

  carregamentoPainel = true;

  try {
    const dados = await jsonp({
      acao: "painel"
    });

    if (!dados || !dados.ok || !dados.painel) {
      throw new Error("Resposta inválida da API.");
    }

    const painel = dados.painel;

    if (elementos.total) {
      elementos.total.textContent =
        painel.total_participantes ?? "0";
    }

    if (elementos.releitura) {
      elementos.releitura.textContent =
        formatarMedia(painel.media_releitura);
    }

    if (elementos.recuperacao) {
      elementos.recuperacao.textContent =
        formatarMedia(painel.media_recuperacao);
    }

    if (elementos.melhor) {
      elementos.melhor.textContent =
        painel.melhor_desempenho || "Aguardando";
    }

    atualizarStatus(true);

  } catch (erro) {
    console.error("Erro ao carregar painel:", erro);
    atualizarStatus(false);

  } finally {
    carregamentoPainel = false;
  }
}

async function cadastrarParticipante(codigo) {
  return await jsonp({
    acao: "cadastrar",
    codigo: codigo
  });
}

if (elementos.formulario) {
  elementos.formulario.addEventListener("submit", async function(event) {
    event.preventDefault();

    const codigo = elementos.codigo.value
      .trim()
      .toUpperCase();

    const botao = elementos.formulario.querySelector(
      'button[type="submit"]'
    );

    if (!codigo) {
      elementos.mensagem.textContent =
        "Informe seu código de participante.";
      return;
    }

    if (botao) {
      botao.disabled = true;
      botao.textContent = "Verificando...";
    }

    elementos.mensagem.textContent =
      "Verificando seu código...";

    try {
      const resultado = await cadastrarParticipante(codigo);

      if (!resultado || !resultado.ok) {
        throw new Error(
          resultado?.mensagem || "Não foi possível realizar o cadastro."
        );
      }

      elementos.mensagem.textContent =
        resultado.mensagem;

      elementos.mensagem.style.color = "#65e6a5";

      elementos.codigo.value = "";

      await carregarPainel();

    } catch (erro) {
      elementos.mensagem.textContent =
        erro.message || "Erro ao cadastrar participante.";

      elementos.mensagem.style.color = "#ff7373";

      console.error("Erro no cadastro:", erro);

    } finally {
      if (botao) {
        botao.disabled = false;
        botao.textContent = "Continuar →";
      }
    }
  });
}

atualizarStatus(false);

carregarPainel();

setInterval(carregarPainel, 10000);
