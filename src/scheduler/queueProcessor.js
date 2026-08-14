import config from '../config/index.js';
import { aguardarHorarioComercialSeNecessario } from './businessHours.js';
import { intervaloAleatorioMs, sleep } from '../utils/randomInterval.js';
import { gerarMensagem } from '../message/messageTemplate.js';
import { enviarMensagem } from '../services/whatsappService.js';
import { marcarComoEnviado, marcarComoErro } from '../data/controlRepository.js';

// Um único for...of com await dentro: garante, por construção, que nunca
// duas mensagens saem ao mesmo tempo. Nada de Promise.all aqui.
export async function processarFila(fila, logService) {
  logService.info(`Fila com ${fila.length} contato(s) pendente(s).`);

  for (let i = 0; i < fila.length; i++) {
    const contato = fila[i];

    await aguardarHorarioComercialSeNecessario(logService);
    await enviarParaContato(contato, logService);

    const haProximo = i < fila.length - 1;
    if (haProximo) {
      const esperaMs = intervaloAleatorioMs(config.interval.minMinutes, config.interval.maxMinutes);
      logService.info(`Aguardando ${Math.round(esperaMs / 1000)}s antes do próximo envio.`);
      await sleep(esperaMs);
    }
  }

  logService.info('Fila finalizada.');
}

async function enviarParaContato(contato, logService) {
  try {
    const texto = gerarMensagem(contato);

    if (!texto) {
      logService.warn(`Pulado (já tem site): ${contato.nome}`);
      return;
    }

    await enviarMensagem(contato, texto);
    marcarComoEnviado(contato);
    logService.info(`Enviado para ${contato.nome} (${contato.telefone})`);
  } catch (erro) {
    // Erro nunca interrompe a fila: registra e segue pro próximo contato.
    marcarComoErro(contato, erro);
    logService.error(`Erro ao enviar para ${contato.nome}: ${erro.message}`);
  }
}
