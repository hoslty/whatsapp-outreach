import fs from 'fs';
import path from 'path';
import config from '../config/index.js';
import { dataAtualISO, timestampLog } from '../utils/dateFormatter.js';

function garantirPastaDeLogs() {
  if (!fs.existsSync(config.logDir)) {
    fs.mkdirSync(config.logDir, { recursive: true });
  }
}

function caminhoDoArquivoDeLog() {
  return path.join(config.logDir, `automacao-${dataAtualISO()}.log`);
}

function escrever(nivel, mensagem) {
  const linha = `[${timestampLog()}] [${nivel}] ${mensagem}`;
  console.log(linha);
  garantirPastaDeLogs();
  fs.appendFileSync(caminhoDoArquivoDeLog(), linha + '\n', 'utf-8');
}

export default {
  info: (msg) => escrever('INFO', msg),
  warn: (msg) => escrever('WARN', msg),
  error: (msg) => escrever('ERROR', msg),
};
