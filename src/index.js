import { iniciarCampanha } from './controllers/campaignController.js';
import logService from './services/logService.js';

iniciarCampanha(logService).catch((erro) => {
  logService.error(`Erro fatal: ${erro.message}`);
  process.exit(1);
});
