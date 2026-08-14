import config from '../config/index.js';
import { sleep } from '../utils/randomInterval.js';
import { horarioAtualBR } from '../utils/dateFormatter.js';

function paraMinutos(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function estaDentroDoHorarioComercial(agora = new Date()) {
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  return config.businessHours.windows.some(
    ({ start, end }) => minutosAgora >= paraMinutos(start) && minutosAgora <= paraMinutos(end)
  );
}

function proximaEsperaEmMs(agora = new Date()) {
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

  const inicios = config.businessHours.windows.map((w) => paraMinutos(w.start));
  const janelasFuturasHoje = inicios.filter((inicio) => inicio > minutosAgora).sort((a, b) => a - b);

  if (janelasFuturasHoje.length > 0) {
    return (janelasFuturasHoje[0] - minutosAgora) * 60 * 1000;
  }

  // Nenhuma janela resta hoje: aguarda até a primeira janela de amanhã.
  const primeiraJanelaAmanha = Math.min(...inicios);
  const minutosAteMeiaNoite = 24 * 60 - minutosAgora;
  return (minutosAteMeiaNoite + primeiraJanelaAmanha) * 60 * 1000;
}

// Barreira: bloqueia a fila até o horário comercial abrir, em vez de
// simplesmente filtrar/pular contatos fora do horário.
export async function aguardarHorarioComercialSeNecessario(logService) {
  let avisado = false;

  while (!estaDentroDoHorarioComercial()) {
    if (!avisado) {
      const minutos = Math.ceil(proximaEsperaEmMs() / 60000);
      logService.info(
        `Fora do horário comercial (${horarioAtualBR()}). Aguardando ~${minutos} min até a próxima janela.`
      );
      avisado = true;
    }
    // Reavalia a cada 1 min em vez de dormir o bloco inteiro de uma vez.
    await sleep(60 * 1000);
  }
}
