import fs from 'fs';
import config from '../config/index.js';

// Único arquivo que sabe como os contatos estão armazenados fisicamente.
// Devolve sempre o mesmo formato de objeto, não importa a fonte real.
export function lerContatos() {
  const conteudo = fs.readFileSync(config.dataPath, 'utf-8');
  const linhas = JSON.parse(conteudo);

  return linhas.map((linha) => ({
    telefone: linha.telefone,
    nome: linha.nome,
    categoria: linha.categoria || null,
    temSite: linha.temSite,
    linkSite: linha.linkSite ?? null,
    cidade: linha.cidade,
  }));
}
