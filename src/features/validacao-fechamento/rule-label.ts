export function ruleLabel(rule: string): string {
  return rule.replace(/ - (Empreendimento|Tipologia)$/, '');
}
