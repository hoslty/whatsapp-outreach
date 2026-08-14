import fs from 'fs';
import config from '../config/index.js';
import { paraChaveControle } from '../utils/phoneFormatter.js';
import { dataAtualISO, horarioAtualBR } from '../utils/dateFormatter.js';

function carregarEstado() {
  if (!fs.existsSync(config.controlFilePath)) {
    return {};
  }
  const conteudo = fs.readFileSync(config.controlFilePath, 'utf-8');
  if (!conteudo.trim()) return {};

  const registros = JSON.parse(conteudo);
  const estado = {};
  for (const registro of registros) {
    estado[registro.chave] = registro;
  }
  return estado;
}

function salvarEstado(estado) {
  const registros = Object.values(estado);
  fs.writeFileSync(config.controlFilePath, JSON.stringify(registros, null, 2), 'utf-8');
}

// Reconstrói a fila a partir do control.json, não do dataset original.
// Contatos já marcados como "enviado" nunca voltam à fila.
export function construirFila(contatos) {
  const estado = carregarEstado();

  return contatos
    .map((contato) => {
      const chave = paraChaveControle(contato.telefone);
      const registro = estado[chave];
      return {
        ...contato,
        chave,
        status: registro?.status || 'pendente',
        tentativas: registro?.tentativas || 0,
      };
    })
    .filter((contato) => contato.status !== 'enviado');
}

export function marcarComoEnviado(contato) {
  const estado = carregarEstado();
  estado[contato.chave] = {
    chave: contato.chave,
    telefone: contato.telefone,
    nome: contato.nome,
    cidade: contato.cidade,
    linkSite: contato.linkSite,
    enviado: true,
    data: dataAtualISO(),
    horario: horarioAtualBR(),
    status: 'enviado',
    tentativas: (estado[contato.chave]?.tentativas || 0) + 1,
    ultimoErro: null,
  };
  salvarEstado(estado);
}

export function marcarComoErro(contato, erro) {
  const estado = carregarEstado();
  const tentativasAnteriores = estado[contato.chave]?.tentativas || 0;
  estado[contato.chave] = {
    chave: contato.chave,
    telefone: contato.telefone,
    nome: contato.nome,
    cidade: contato.cidade,
    linkSite: contato.linkSite,
    enviado: false,
    data: dataAtualISO(),
    horario: horarioAtualBR(),
    status: 'erro',
    tentativas: tentativasAnteriores + 1,
    ultimoErro: erro?.message || String(erro),
  };
  salvarEstado(estado);
}
