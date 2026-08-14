export function dataAtualISO() {
  return new Date().toISOString().slice(0, 10);
}

export function horarioAtualBR() {
  return new Date().toLocaleTimeString('pt-BR', { hour12: false });
}

export function timestampLog() {
  return new Date().toLocaleString('pt-BR');
}
