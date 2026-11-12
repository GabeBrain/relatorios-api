export async function snapshotHash(value: unknown) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(buffer)].map(n => n.toString(16).padStart(2, '0')).join('');
}
