// Único arquivo que precisa ser editado para alterar o texto enviado.
// A lógica de escolha de variante é baseada em:
//   - temSite: "Não" | "Não (só rede social)" | "Sim"
//   - categoria: categoryName vindo da busca no Google Maps (Apify)

// 1. Mapeamento de categoria -> área de atuação legível.
//    Categorias fora deste mapa (ex: "Serviços jurídicos", "Advogado") caem
//    na variante genérica, sem citar área específica.
const MAPA_AREAS = {
  'Advogado trabalhista': 'Direito Trabalhista',
  'Advogado previdenciário': 'Direito Previdenciário',
  'Advogado criminal': 'Direito Criminal',
  'Advogado imobiliário': 'Direito Imobiliário',
};

// 2. Saudações variadas, para não repetir o mesmo texto em sequência.
const SAUDACOES = [
  'Boa tarde! Tudo bem?',
  'Oi, tudo bem?',
];

const INTRODUCAO = 'Sou Pedro, desenvolvedor de sites pra escritórios de advocacia aqui na Bahia.';

// 3. Corpo padrão (área não identificada).
const CORPO_PADRAO = {
  semSite: (nome) =>
    `Vi seu perfil no Google e notei que vocês ainda não têm site, isso ajuda bastante a trazer clientes novos direto pelo WhatsApp.`,
  soRedeSocial: (nome) =>
    `Vi seu perfil no google e notei que o contato ainda é só pelo Instagram/WhatsApp. Um site próprio ajuda a passar mais credibilidade e centraliza os contatos.`,
};

// 4. Corpo com área de atuação identificada.
const CORPO_COM_AREA = (nome, area, cidade) =>
  `Vi que seu pefil atua com ${area} em ${cidade} e ainda não tem site, isso ajuda bastante a atrair quem já busca advogado de ${area} no Google.`;

const FECHO = 'Posso te mostrar um exemplo rápido?';

function sortear(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

/**
 * @param {Object} contato
 * @param {string} contato.nome
 * @param {string} [contato.categoria]
 * @param {string} contato.cidade
 * @param {string} contato.temSite - "Sim" | "Não" | "Não (só rede social)"
 * @returns {string|null} mensagem pronta, ou null se o contato já tem site
 */
export function gerarMensagem(contato) {
  const { nome, categoria, cidade, temSite } = contato;

  // Lead já tem site -> não deveria estar na fila (filtro em config/filters.js
  // já remove, mas a checagem aqui é uma segunda barreira de segurança).
  if (temSite === 'Sim') {
    return null;
  }

  const area = MAPA_AREAS[categoria] || null;
  const saudacao = sortear(SAUDACOES);

  let corpo;
  if (area) {
    corpo = CORPO_COM_AREA(nome, area, cidade);
  } else if (temSite === 'Não (só rede social)') {
    corpo = CORPO_PADRAO.soRedeSocial(nome);
  } else {
    corpo = CORPO_PADRAO.semSite(nome);
  }

  return `${saudacao} ${INTRODUCAO}\n\n${corpo}\n\n${FECHO}`;
}
