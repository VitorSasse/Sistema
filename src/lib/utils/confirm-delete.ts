export function confirmDeleteAction(targetLabel: string) {
  if (typeof window === "undefined") {
    return true;
  }

  return window.confirm(
    `Tem certeza que deseja excluir ${targetLabel}? Essa acao nao pode ser desfeita.`
  );
}
