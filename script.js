// ============================================================
// DADOS FICTÍCIOS DAS DISCIPLINAS (9º ANO)
// ============================================================
// Array de objetos: cada objeto é uma disciplina com suas notas e faltas.
const disciplinas = [
  { disciplina: "Língua Portuguesa", tri1: 78, tri2: "8,2", tri3: 8.6, faltas: [2, 2, 1] },
  { disciplina: "Matemática", tri1: 55, tri2: "5,4", tri3: null, faltas: [3, 2, 2] },
  { disciplina: "Ciências", tri1: 84, tri2: 7.9, tri3: "8,3", faltas: [1, 1, 1] },
  { disciplina: "História", tri1: "7,1", tri2: 82, tri3: null, faltas: [1, 2, 1] },
  { disciplina: "Geografia", tri1: 69, tri2: "7,5", tri3: 7.8, faltas: [0, 1, 1] },
  { disciplina: "Língua Inglesa", tri1: 88, tri2: 8.4, tri3: null, faltas: [1, 0, 1] },
  { disciplina: "Arte", tri1: "9,2", tri2: 87, tri3: 9.0, faltas: [1, 1, 0] },
  { disciplina: "Educação Física", tri1: 96, tri2: "9,3", tri3: null, faltas: [0, 1, 0] },
  { disciplina: "Educação Digital", tri1: 91, tri2: 8.9, tri3: "9,4", faltas: [1, 1, 0] },
  { disciplina: "Educação Financeira", tri1: 76, tri2: "7,2", tri3: null, faltas: [1, 1, 1] },
  { disciplina: "Rec. Aprend. Matemática", tri1: 58, tri2: "5,9", tri3: 6.2, faltas: [2, 2, 1] },
  { disciplina: "Leitura Rec. Aprend. Lingua Portuguesa", tri1: 72, tri2: "7,6", tri3: null, faltas: [2, 1, 1] },
  { disciplina: "Pensamento Lógico", tri1: 49, tri2: 5.5, tri3: "5,8", faltas: [2, 2, 2] },
  { disciplina: "Literatura Arte e Movimento", tri1: "8,0", tri2: 84, tri3: null, faltas: [1, 1, 0] },
  { disciplina: "Práticas Experimentais", tri1: 64, tri2: "6,6", tri3: 7.0, faltas: [1, 1, 1] }
];

// Configuração fixa desta cópia: o PIN é informado pelo estudante, nunca gerado aqui.
const CONFIG_ALUNO = Object.freeze({
  turma: "9C",
  numeroChamada: 21,
  apiUrl: "https://boletim-api.profbt.com.br"
});
let disciplinasAtivas = [];
let pinAtivo = null; // Apenas em memória enquanto este boletim estiver aberto.
let ocupado = false;

function copiaInicial() {
  return {
    disciplinas: disciplinas.map(function (item) {
      return {
        disciplina: item.disciplina,
        tri1: normalizarNota(item.tri1),
        tri2: normalizarNota(item.tri2),
        tri3: normalizarNota(item.tri3),
        faltas: item.faltas.slice()
      };
    })
  };
}

function validarDados(dados) {
  if (!dados || !Array.isArray(dados.disciplinas)) {
    throw new Error("dados-invalidos");
  }
  return dados.disciplinas.map(function (item) {
    if (!item || typeof item.disciplina !== "string" ||
        !["tri1", "tri2", "tri3"].every(function (campo) {
          const valor = item[campo];
          return valor === null || (typeof valor === "number" && Number.isFinite(valor) && valor >= 0 && valor <= 100) ||
            (typeof valor === "string" && /^\d+(?:[,.]\d+)?$/.test(valor.trim()) && normalizarNota(valor) !== null);
        }) || !Array.isArray(item.faltas) || item.faltas.length !== 3 ||
        !item.faltas.every(function (falta) { return Number.isSafeInteger(falta) && falta >= 0; })) {
      throw new Error("dados-invalidos");
    }
    return {
      disciplina: item.disciplina,
      tri1: normalizarNota(item.tri1),
      tri2: normalizarNota(item.tri2),
      tri3: normalizarNota(item.tri3),
      faltas: item.faltas.slice()
    };
  });
}

function mensagemErro(erro) {
  if (erro.message === "401") return "PIN ou acesso inválido. Confira o PIN e tente novamente.";
  if (erro.message === "429") return "Muitas tentativas. Aguarde um pouco antes de tentar novamente.";
  if (erro.message === "dados-invalidos") return "A API retornou dados inválidos. Tente novamente mais tarde.";
  return "Não foi possível conectar à API. Confira sua conexão e tente novamente.";
}

async function requisitarBoletim(caminho, metodo, pin, dados) {
  const corpo = {
    turma: CONFIG_ALUNO.turma,
    numero_chamada: CONFIG_ALUNO.numeroChamada,
    pin: pin
  };
  if (dados !== undefined) corpo.dados = dados;
  const resposta = await fetch(CONFIG_ALUNO.apiUrl + "/api/v1/boletins/" + caminho, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo)
  });
  if (!resposta.ok) throw new Error(String(resposta.status));
  return resposta.json();
}

// ============================================================
// FUNÇÃO: normalizarNota
// ============================================================
// Converte qualquer formato de nota para a escala 0–10.
// Regras:
//  - vazio / null / undefined → null (nota ainda não lançada)
//  - 0 a 10 → mantém
//  - >10 e <=100 → divide por 10 (ex: 82 vira 8,2)
//  - aceita ponto ou vírgula decimal ("8,5" vira 8.5)
//  - valores fora das regras → null (inválido)
function normalizarNota(valor) {
  // Se for vazio, null ou undefined, não há nota
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  // Se for string, troca vírgula por ponto para o JavaScript entender
  if (typeof valor === "string") {
    valor = valor.replace(",", ".");
    valor = parseFloat(valor); // converte texto em número
  }

  // Se não for um número válido, retorna null
  if (typeof valor !== "number" || isNaN(valor)) {
    return null;
  }

  // Regra: entre 0 e 10 mantém
  if (valor >= 0 && valor <= 10) {
    return valor;
  }

  // Regra: maior que 10 e até 100 divide por 10
  if (valor > 10 && valor <= 100) {
    return valor / 10;
  }

  // Fora das regras → inválido
  return null;
}

// ============================================================
// FUNÇÃO: calcularMedia
// ============================================================
// Recebe uma lista de notas já normalizadas (ou null) e calcula a média.
// Ignora as notas null (ausentes). Se não houver nenhuma válida, retorna null.
function calcularMedia(notas) {
  const validas = notas.filter(function (n) {
    return n !== null;
  });

  if (validas.length === 0) {
    return null; // nenhuma nota válida
  }

  const soma = validas.reduce(function (acc, n) {
    return acc + n;
  }, 0);

  return soma / validas.length;
}

// ============================================================
// FUNÇÃO: somarFaltas
// ============================================================
// Soma os valores de um array de faltas (números inteiros).
function somarFaltas(faltas) {
  return faltas.reduce(function (acc, f) {
    return acc + f;
  }, 0);
}

// ============================================================
// FUNÇÃO: definirSituacao
// ============================================================
// Decide a situação da disciplina conforme a média.
function definirSituacao(media) {
  if (media === null) {
    return "Nota ainda não disponível";
  }
  if (media >= 6.0) {
    return "Bom desempenho";
  }
  return "Atenção";
}

// ============================================================
// FUNÇÃO: formatarNota
// ============================================================
// Mostra a nota com uma casa decimal ou "—" se for null.
function formatarNota(nota) {
  if (nota === null) {
    return "—";
  }
  return nota.toFixed(1).replace(".", ",");
}

// ============================================================
// FUNÇÃO: criarLinhaTabela
// ============================================================
// Cria uma linha <tr> da tabela para uma disciplina.
function criarLinhaTabela(item) {
  // Normaliza as três notas
  const n1 = normalizarNota(item.tri1);
  const n2 = normalizarNota(item.tri2);
  const n3 = normalizarNota(item.tri3);

  // Calcula a média somente com as notas disponíveis
  const media = calcularMedia([n1, n2, n3]);

  // Soma as faltas
  const totalFaltas = somarFaltas(item.faltas);

  // Define a situação
  const situacao = definirSituacao(media);

  // Define a classe CSS conforme a situação
  let classeSituacao = "situacao-indisponivel";
  if (situacao === "Bom desempenho") classeSituacao = "situacao-bom";
  if (situacao === "Atenção") classeSituacao = "situacao-atencao";

  // Cria o elemento <tr>
  const tr = document.createElement("tr");

  [item.disciplina, formatarNota(n1), formatarNota(n2), formatarNota(n3),
    media === null ? "Ainda não lançada" : formatarNota(media),
    String(totalFaltas), situacao].forEach(function (texto, indice) {
    const td = document.createElement("td");
    td.textContent = texto;
    if (indice === 6) td.className = classeSituacao;
    tr.appendChild(td);
  });

  return tr;
}

// ============================================================
// FUNÇÃO: preencherTabela
// ============================================================
// Percorre todas as disciplinas e adiciona as linhas na tabela.
function preencherTabela() {
  const corpo = document.getElementById("corpo-tabela");
  corpo.replaceChildren();

  disciplinasAtivas.forEach(function (item) {
    const linha = criarLinhaTabela(item);
    corpo.appendChild(linha);
  });
}

// ============================================================
// FUNÇÃO: preencherCards
// ============================================================
// Calcula os totais e preenche os cards de resumo.
function preencherCards() {
  let somaMedias = 0;
  let qtdMedias = 0;
  let totalFaltas = 0;
  let totalBom = 0;
  let totalAtencao = 0;

  disciplinasAtivas.forEach(function (item) {
    const n1 = normalizarNota(item.tri1);
    const n2 = normalizarNota(item.tri2);
    const n3 = normalizarNota(item.tri3);
    const media = calcularMedia([n1, n2, n3]);

    if (media !== null) {
      somaMedias += media;
      qtdMedias++;

      if (media >= 6.0) totalBom++;
      else totalAtencao++;
    }

    totalFaltas += somarFaltas(item.faltas);
  });

  // Média geral (só das disciplinas que têm nota)
  const mediaGeral = qtdMedias > 0 ? somaMedias / qtdMedias : null;

  document.getElementById("media-geral").textContent =
    mediaGeral === null ? "—" : formatarNota(mediaGeral);

  document.getElementById("total-faltas").textContent = totalFaltas;
  document.getElementById("total-bom").textContent = totalBom;
  document.getElementById("total-atencao").textContent = totalAtencao;

  // FREQUÊNCIA FICTÍCIA — apenas demonstrativa nesta etapa.
  // No futuro, será calculada de outra forma (não a partir das faltas).
  document.getElementById("frequencia").textContent = "92%";
  document.getElementById("frequencia-texto").textContent = "Frequência adequada";
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================
// Quando a página terminar de carregar, configura acesso e editor.
document.addEventListener("DOMContentLoaded", function () {
  const porId = function (id) { return document.getElementById(id); };
  const acesso = porId("formAcesso");
  const editor = porId("formEditor");

  acesso.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    if (ocupado) return;
    const pin = porId("pinAluno").value.trim();
    if (!pin) {
      porId("estadoAcesso").textContent = "Informe seu PIN.";
      return;
    }
    ocupado = true;
    porId("botaoAcessar").disabled = true;
    porId("estadoAcesso").textContent = "Abrindo boletim…";
    try {
      const resposta = await requisitarBoletim("abrir", "POST", pin);
      // dados:null não implica erro, mesmo quando novo:false.
      const lista = resposta.dados === null ? copiaInicial().disciplinas : validarDados(resposta.dados);
      disciplinasAtivas = lista;
      pinAtivo = pin;
      porId("pinAluno").value = "";
      preencherTabela();
      preencherCards();
      porId("origemDados").textContent = resposta.dados === null
        ? "Dados iniciais de teste (ainda não salvos)."
        : "Dados carregados da API.";
      porId("estadoSalvamento").textContent = "";
      porId("estadoAcesso").textContent = "";
      porId("painelAcesso").hidden = true;
      porId("painelBoletim").hidden = false;
    } catch (erro) {
      porId("estadoAcesso").textContent = mensagemErro(erro);
    } finally {
      ocupado = false;
      porId("botaoAcessar").disabled = false;
    }
  });

  porId("botaoSair").addEventListener("click", function () {
    if (ocupado) return;
    pinAtivo = null;
    disciplinasAtivas = [];
    porId("linhasEditor").replaceChildren();
    porId("painelEditor").hidden = true;
    porId("corpo-tabela").replaceChildren();
    porId("painelBoletim").hidden = true;
    porId("painelAcesso").hidden = false;
    porId("pinAluno").value = "";
    porId("estadoAcesso").textContent = "";
    porId("estadoSalvamento").textContent = "";
  });

  porId("botaoEditar").addEventListener("click", function () {
    if (ocupado || pinAtivo === null) return;
    const linhas = porId("linhasEditor");
    linhas.replaceChildren();
    disciplinasAtivas.forEach(function (item, indice) {
      const grupo = document.createElement("fieldset");
      const titulo = document.createElement("legend");
      titulo.textContent = item.disciplina;
      grupo.appendChild(titulo);
      ["tri1", "tri2", "tri3", "falta0", "falta1", "falta2"].forEach(function (campo, posicao) {
        const rotulo = document.createElement("label");
        rotulo.textContent = posicao < 3 ? (posicao + 1) + "º tri — nota" : (posicao - 2) + "º tri — faltas";
        const input = document.createElement("input");
        input.type = "text";
        input.inputMode = posicao < 3 ? "decimal" : "numeric";
        input.dataset.campo = campo;
        input.dataset.indice = String(indice);
        const valor = posicao < 3 ? item[campo] : item.faltas[posicao - 3];
        input.value = valor === null ? "" : String(valor).replace(".", ",");
        rotulo.appendChild(input);
        grupo.appendChild(rotulo);
      });
      linhas.appendChild(grupo);
    });
    porId("erroEditor").textContent = "";
    porId("painelEditor").hidden = false;
  });

  porId("botaoCancelar").addEventListener("click", function () {
    if (ocupado) return;
    porId("painelEditor").hidden = true;
    porId("linhasEditor").replaceChildren();
    porId("erroEditor").textContent = "";
  });

  editor.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    if (ocupado || pinAtivo === null || porId("painelEditor").hidden) return;
    const campos = Array.from(porId("linhasEditor").querySelectorAll("input"));
    const copia = disciplinasAtivas.map(function (item) {
      return { disciplina: item.disciplina, tri1: item.tri1, tri2: item.tri2,
        tri3: item.tri3, faltas: item.faltas.slice() };
    });
    for (const campo of campos) {
      const indice = Number(campo.dataset.indice);
      const texto = campo.value.trim();
      const chave = campo.dataset.campo;
      if (chave.startsWith("falta")) {
        if (!/^\d+$/.test(texto) || !Number.isSafeInteger(Number(texto))) {
          porId("erroEditor").textContent = "Faltas devem ser números inteiros a partir de zero.";
          campo.focus();
          return;
        }
        copia[indice].faltas[Number(chave.slice(-1))] = Number(texto);
      } else {
        const numero = Number(texto.replace(",", "."));
        if (texto !== "" && (!/^(?:\d+)(?:[,.]\d+)?$/.test(texto) || numero < 0 || numero > 10)) {
          porId("erroEditor").textContent = "Notas devem estar entre 0 e 10 (use vírgula ou ponto), ou ficar vazias.";
          campo.focus();
          return;
        }
        copia[indice][chave] = texto === "" ? null : numero;
      }
    }
    porId("erroEditor").textContent = "";
    porId("estadoSalvamento").textContent = "Salvando boletim…";
    ocupado = true;
    porId("botaoSalvar").disabled = true;
    porId("botaoCancelar").disabled = true;
    porId("botaoEditar").disabled = true;
    porId("botaoSair").disabled = true;
    try {
      const resposta = await requisitarBoletim("salvar", "PUT", pinAtivo, { disciplinas: copia });
      if (!resposta || resposta.ok !== true) throw new Error("salvamento-recusado");
      disciplinasAtivas = copia;
      preencherTabela();
      preencherCards();
      porId("origemDados").textContent = "Dados carregados da API.";
      porId("painelEditor").hidden = true;
      porId("linhasEditor").replaceChildren();
      porId("estadoSalvamento").textContent = "Dados salvos com sucesso.";
    } catch (erro) {
      porId("estadoSalvamento").textContent = mensagemErro(erro);
      porId("erroEditor").textContent = "As alterações não foram salvas. Corrija ou tente novamente.";
    } finally {
      ocupado = false;
      porId("botaoSalvar").disabled = false;
      porId("botaoCancelar").disabled = false;
      porId("botaoEditar").disabled = false;
      porId("botaoSair").disabled = false;
    }
  });
});