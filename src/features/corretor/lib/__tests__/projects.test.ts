import { describe, expect, it, vi, beforeEach } from 'vitest';
import { webcrypto } from 'node:crypto';
const mocks = vi.hoisted(() => ({ user: vi.fn(), download: vi.fn(), session: vi.fn(), exists: vi.fn(), rpc: vi.fn(), from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: mocks.user, getSession: mocks.session }, storage: { from: () => ({ download: mocks.download, exists: mocks.exists }) }, from: mocks.from, rpc: mocks.rpc } }));
import { matchOriginal, digest, downloadOriginal, requireProjectIdentity, uploadOriginal, type OriginalAsset } from '../projects';
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('crypto', webcrypto); mocks.user.mockResolvedValue({ data: { user: { id: 'owner', is_anonymous: false } }, error: null }); });
describe('originais sem IA, com identidade e vínculo exatos', () => {
  it('recusa identidade ausente/anonima antes de ler storage', async () => {
    mocks.user.mockResolvedValue({ data: { user: null }, error: null });
    await expect(requireProjectIdentity()).rejects.toThrow('acesso'); expect(mocks.download).not.toHaveBeenCalled();
    mocks.user.mockResolvedValue({ data: { user: { id: 'anon', is_anonymous: true } }, error: null });
    await expect(requireProjectIdentity()).rejects.toThrow('acesso');
  });
  it('rejeita arquivo de outra versão e versão sem hash', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    await expect(matchOriginal(bytes, '0'.repeat(40))).rejects.toThrow('não corresponde');
    await expect(matchOriginal(bytes, null)).rejects.toThrow('hash');
    expect((await matchOriginal(bytes, await digest(bytes, 'SHA-1'))).sha256).toHaveLength(64);
  });
  it('recupera e recusa objeto alterado, sem modificar achados', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const asset = { path: 'project/version/hash.pptx', bytes: 3, sha256: await digest(bytes, 'SHA-256'), sha1: await digest(bytes, 'SHA-1'), original_name: 'original.pptx' } as OriginalAsset;
    mocks.download.mockResolvedValue({ data: { arrayBuffer: async () => bytes.buffer }, error: null });
    expect((await downloadOriginal(asset)).bytes).toEqual(bytes);
    mocks.download.mockResolvedValue({ data: { arrayBuffer: async () => new Uint8Array([1, 2, 4]).buffer }, error: null });
    await expect(downloadOriginal(asset)).rejects.toThrow('integridade'); expect(mocks.from).not.toHaveBeenCalled();
  });
  it('retenta somente registro se o objeto imutável já existe', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    mocks.session.mockResolvedValue({ data: { session: { access_token: 'fixture' } } });
    mocks.exists.mockResolvedValue({ data: true, error: null }); mocks.rpc.mockResolvedValue({ error: null });
    const file = { arrayBuffer: async () => bytes.buffer, name: 'original.pptx', size: 3 } as File;
    await uploadOriginal('project', { id: 'version', sha1: await digest(bytes, 'SHA-1') } as never, file, vi.fn());
    expect(mocks.rpc).toHaveBeenCalledWith('register_corretor_original', expect.objectContaining({ p_project: 'project', p_version: 'version', p_bytes: 3 }));
  });
});
