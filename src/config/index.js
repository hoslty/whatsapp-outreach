import 'dotenv/config';

function parseWindows(str) {
  return str.split(',').map((janela) => {
    const [start, end] = janela.trim().split('-');
    return { start, end };
  });
}

const config = {
  dataPath: process.env.DATA_PATH || './data/contatos.json',
  controlFilePath: process.env.CONTROL_FILE_PATH || './data/contkrol.json',
  businessHours: {
    windows: parseWindows(process.env.BUSINESS_HOURS_WINDOWS || '09:00-11:30,14:00-16:30'),
  },
  interval: {
    minMinutes: Number(process.env.MIN_INTERVAL_MINUTES || 1),
    maxMinutes: Number(process.env.MAX_INTERVAL_MINUTES || 2),
  },
  logDir: process.env.LOG_DIR || './logs',
};

export default config;