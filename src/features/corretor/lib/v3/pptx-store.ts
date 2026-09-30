// Corretor v3 — cofre LOCAL do PPTX (IndexedDB do navegador), por sha1.
// O arquivo não vai para o servidor (100–250 MB por estudo); fica no navegador
// de quem subiu, para que retomar a análise e vincular planilhas depois não
// exijam subir o PPTX de novo. Em outro computador/navegador o cofre está vazio
// e a interface pede o arquivo uma única vez. Tudo é best-effort: sem IndexedDB
// (testes, modo privado) as funções não falham, só devolvem null.

const DB_NAME = 'corretor-pptx';
const STORE = 'decks';
const KEEP = 8; // estudos mais recentes mantidos; os mais antigos saem

interface StoredDeck { sha1: string; name: string; bytes: Uint8Array; savedAt: number }

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'sha1' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function done<T>(req: IDBRequest<T>): Promise<T | null> {
  return new Promise((resolve) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

/** Guarda o PPTX e poda os mais antigos. Falha silenciosa (quota, modo privado). */
export async function savePptx(sha1: string, name: string, bytes: Uint8Array): Promise<boolean> {
  const db = await open();
  if (!db) return false;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    await done(store.put({ sha1, name, bytes, savedAt: Date.now() } satisfies StoredDeck));
    const all = ((await done(store.getAll())) ?? []) as StoredDeck[];
    for (const old of all.sort((a, b) => b.savedAt - a.savedAt).slice(KEEP)) store.delete(old.sha1);
    return true;
  } catch {
    return false;
  } finally {
    db.close();
  }
}

/** PPTX guardado neste navegador para o sha1, ou null. */
export async function loadPptx(sha1: string | null | undefined): Promise<{ name: string; bytes: Uint8Array } | null> {
  if (!sha1) return null;
  const db = await open();
  if (!db) return null;
  try {
    const hit = (await done(db.transaction(STORE, 'readonly').objectStore(STORE).get(sha1))) as StoredDeck | undefined;
    return hit ? { name: hit.name, bytes: hit.bytes } : null;
  } catch {
    return null;
  } finally {
    db.close();
  }
}
