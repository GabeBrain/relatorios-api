export interface CollectionFailureAuditRow {
  city: string;
  operation: string;
  status: string;
  failureClass: 'transient' | 'auth' | 'contract' | 'empty';
  attempts: number;
  durationMs: number;
  error: string;
}

const columns: (keyof CollectionFailureAuditRow)[] = ['city', 'operation', 'status', 'failureClass', 'attempts', 'durationMs', 'error'];
const safeCell = (value: unknown) => {
  const text = String(value ?? '').replace(/Bearer\s+\S+/gi, 'Bearer [redigido]').replace(/https?:\/\/\S+/gi, '[endpoint]');
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function buildCollectionFailureCsv(rows: CollectionFailureAuditRow[]): string {
  return `\uFEFF${columns.join(';')}\r\n${rows.map((row) => columns.map((column) => safeCell(row[column])).join(';')).join('\r\n')}`;
}

export function downloadCollectionFailureCsv(rows: CollectionFailureAuditRow[]): void {
  const url = URL.createObjectURL(new Blob([buildCollectionFailureCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'auditoria-coleta-panorama.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}
