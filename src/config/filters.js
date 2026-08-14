// Cada filtro recebe a lista de contatos e devolve a lista já filtrada.
// Para adicionar uma nova regra, crie uma função aqui e inclua na lista
// FILTROS_ATIVOS abaixo — nenhum outro arquivo precisa mudar.

function apenasSemSite(contatos) {
  return contatos.filter((c) => c.temSite !== 'Sim');
}

const FILTROS_ATIVOS = [apenasSemSite];

export function aplicarFiltros(contatos) {
  return FILTROS_ATIVOS.reduce((lista, filtro) => filtro(lista), contatos);
}
