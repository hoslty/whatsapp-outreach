import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { normalizarTelefone } from '../utils/phoneFormatter.js';

const { Client, LocalAuth } = pkg;

let client = null;

// Único arquivo que conhece a biblioteca whatsapp-web.js.
// Se um dia for migrar pra Cloud API oficial da Meta, é só reescrever este arquivo.
export function iniciarCliente(logService) {
  client = new Client({
    authStrategy: new LocalAuth(),
  });

  client.on('qr', (qr) => {
    logService.info('QR Code gerado. Escaneie com o WhatsApp (Aparelhos conectados → Conectar um aparelho).');
    qrcode.generate(qr, { small: true });
  });

  client.on('authenticated', () => {
    logService.info('Sessão autenticada com sucesso.');
  });

  client.on('auth_failure', (msg) => {
    logService.error(`Falha na autenticação: ${msg}`);
  });

  client.on('disconnected', (motivo) => {
    logService.warn(`Cliente desconectado: ${motivo}`);
  });

  const pronto = new Promise((resolve) => {
    client.on('ready', () => {
      logService.info('Cliente do WhatsApp pronto.');
      resolve();
    });
  });

  client.initialize();
  return pronto;
}

export async function enviarMensagem(contato, texto) {
  const numero = normalizarTelefone(contato.telefone);

  // Pede ao próprio WhatsApp pra resolver o ID correto do número,
  // em vez de montar "numero@c.us" manualmente. Reduz o erro "No LID for user"
  // causado pela migração do WhatsApp para o novo sistema de IDs (LID).
  const idResolvido = await client.getNumberId(numero);

  if (!idResolvido) {
    throw new Error(`Número não encontrado no WhatsApp: ${contato.telefone}`);
  }

  await client.sendMessage(idResolvido._serialized, texto);
}

export async function encerrarCliente() {
  if (client) {
    await client.destroy();
  }
}
