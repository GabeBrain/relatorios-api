/** Materiais locais por hash da versão; não prometem disponibilidade em outro dispositivo. */
interface LocalMaterial { key: string; name: string; bytes: Uint8Array; manifest?: PreviewManifest }
export interface PreviewManifest {
  originalSha1: string; pdfSha256: string; pages: number;
  source: 'pdf-confirmado-pelo-usuario'; includesHidden: true; confirmedAt: string;
}
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('corretor-workspace', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('materials', { keyPath: 'key' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('O armazenamento deste navegador está indisponível.'));
  });
}
export async function saveLocalMaterial(material: LocalMaterial): Promise<void> {
  const db = await open();
  try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('materials', 'readwrite');
    tx.objectStore('materials').put(material);
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(new Error('Não foi possível guardar o material neste navegador. Confira o espaço disponível.'));
  }); } finally { db.close(); }
}
export async function loadLocalMaterial(key: string): Promise<LocalMaterial | null> {
  const db = await open();
  try { return await new Promise<LocalMaterial | null>((resolve, reject) => {
    const req = db.transaction('materials', 'readonly').objectStore('materials').get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(new Error('Não foi possível recuperar o material local.'));
  }); } finally { db.close(); }
}

/** Nunca apaga a preparação de outro arquivo ao excluir um estudo na carteira. */
export async function clearPreparationForDocument(sha1?: string | null): Promise<void> {
  if (!sha1) return;
  const draft = await loadLocalMaterial('preparation:pptx');
  if (!draft) return;
  const digest = await crypto.subtle.digest('SHA-1', draft.bytes.slice().buffer);
  const current = [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
  if (current === sha1) await clearPreparationDraft();
}

/** Consome só o rascunho de envio; originais por hash e prévias continuam disponíveis. */
export async function clearPreparationDraft(documentSha1?: string, sheetKeys?: string[]): Promise<void> {
  const db = await open();
  try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('materials', 'readwrite');
    const fields = tx.objectStore('materials').get('preparation:fields');
    fields.onsuccess = () => {
      let selected: Set<string>;
      try { selected = new Set(sheetKeys ?? (fields.result ? JSON.parse(new TextDecoder().decode(fields.result.bytes)).sheets ?? [] : [])); }
      catch { tx.abort(); return; }
      const request = tx.objectStore('materials').openCursor(IDBKeyRange.bound('preparation:', 'preparation:\uffff'));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        if (documentSha1 && selected.has(String(cursor.key)) && String(cursor.key).startsWith('preparation:sheet:')) {
          tx.objectStore('materials').put({ ...cursor.value, key: `study:${documentSha1}:sheet:${String(cursor.key).slice('preparation:sheet:'.length)}` });
        }
        cursor.delete(); cursor.continue();
      };
    };
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(new Error('Não foi possível limpar o rascunho deste navegador.'));
  }); } finally { db.close(); }
}

export async function loadLocalStudySheets(documentSha1: string): Promise<LocalMaterial[]> {
  const db = await open();
  try { return await new Promise<LocalMaterial[]>((resolve, reject) => {
    const prefix = `study:${documentSha1}:sheet:`;
    const request = db.transaction('materials', 'readonly').objectStore('materials').getAll(IDBKeyRange.bound(prefix, `${prefix}\uffff`));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Não foi possível recuperar as planilhas deste navegador.'));
  }); } finally { db.close(); }
}
