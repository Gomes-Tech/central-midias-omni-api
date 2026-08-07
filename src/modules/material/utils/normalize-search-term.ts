export function normalizeSearchTerm(term: string): string {
  return term.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}
