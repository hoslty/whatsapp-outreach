export function normalizarTelefone(telefone) {
  return telefone.replace(/\D/g, '');
}

export function paraChaveControle(telefone) {
  return normalizarTelefone(telefone);
}
