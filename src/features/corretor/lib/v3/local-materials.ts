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
