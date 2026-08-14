import { lerContatos } from '../data/datasetReader.js';
import { construirFila } from '../data/controlRepository.js';
import { aplicarFiltros } from '../config/filters.js';
import { processarFila } from '../scheduler/queueProcessor.js';
import { iniciarCliente, encerrarCliente } from '../services/whatsappService.js';

// Orquestra as camadas, sem conter lógica de negócio própria.
export async function iniciarCampanha(logService) {
  logService.info('Iniciando automação de prospecção.');

  const contatos = lerContatos();
  const contatosFiltrados = aplicarFiltros(contatos);
  const fila = construirFila(contatosFiltrados);

  if (fila.length === 0) {
    logService.info('Nenhum contato pendente. Encerrando.');
    return;
  }

  await iniciarCliente(logService);
  await processarFila(fila, logService);
  await encerrarCliente();

  logService.info('Campanha finalizada.');
}
