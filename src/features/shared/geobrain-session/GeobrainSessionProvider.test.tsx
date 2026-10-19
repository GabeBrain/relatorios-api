import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Provider from './GeobrainSessionProvider';
import { useGeobrainSession } from './context';
import { useGeobrainAccess } from '@/features/corretor/lib/geobrain-access-context';
import { useAuthStore } from '@/store/auth-store';
const m = vi.hoisted(() => ({identity:vi.fn(),login:vi.fn(),signOut:vi.fn(),geo:vi.fn()}));
vi.mock('@/features/corretor/lib/projects',()=>({requireProjectIdentity:m.identity}));
vi.mock('@/features/corretor/lib/project-access',()=>({loginCorretor:m.login,CorretorAccessUnavailable:class extends Error{}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getSession:async()=>({data:{session:{user:{id:"uid",email:"staff@example.invalid"}}}}),signOut:m.signOut,onAuthStateChange:()=>({data:{subscription:{unsubscribe:vi.fn()}}})}}}));
vi.mock('@/lib/http-client',()=>({loginRequest:m.geo}));
function Probe({saved}:{saved:()=>void}) {
 const session=useGeobrainSession(),ensure=useGeobrainAccess(),nav=useNavigate();
 return <><span data-testid="state">{session.state}</span><span>{session.action}</span><button onClick={async()=>{if(await ensure('salvar decisão'))saved();}}>Salvar</button><button onClick={()=>session.cancel()}>Cancelar</button><button onClick={()=>nav('/outra')}>Sair da rota</button><button onClick={()=>void session.logout()}>Remover</button><button onClick={()=>void session.login('staff@example.invalid','fixture','https://fixture.invalid/login').catch(()=>{})}>Entrar</button></>;
}
function setup(){const saved=vi.fn();render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><Provider><Probe saved={saved}/></Provider></MemoryRouter></QueryClientProvider>);return saved;}
beforeEach(()=>{vi.clearAllMocks();useAuthStore.getState().clearToken();m.identity.mockRejectedValue(new Error('sem acesso'));m.login.mockImplementation(async()=>{m.identity.mockResolvedValue('uid');return 'token';});m.signOut.mockResolvedValue({});});
afterEach(cleanup);
it('cancela a intenção sem executar decisão',async()=>{const saved=setup();await screen.findByText('anonymous');fireEvent.click(screen.getByText('Salvar'));await screen.findByText('salvar decisão');fireEvent.click(screen.getByText('Cancelar'));expect(saved).not.toHaveBeenCalled();});
it('retoma uma única vez no mesmo menu',async()=>{const saved=setup();await screen.findByText('anonymous');fireEvent.click(screen.getByText('Salvar'));await screen.findByText('salvar decisão');fireEvent.click(screen.getByText('Entrar'));await waitFor(()=>expect(saved).toHaveBeenCalledTimes(1));expect(m.login).toHaveBeenCalledWith('staff@example.invalid','fixture');expect(m.geo).not.toHaveBeenCalled();});
it('troca de rota invalida intenção mesmo com login tardio',async()=>{let done!:(v:string)=>void;m.login.mockReturnValue(new Promise<string>(r=>{done=r;}));const saved=setup();await screen.findByText('anonymous');fireEvent.click(screen.getByText('Salvar'));await screen.findByText('salvar decisão');fireEvent.click(screen.getByText('Entrar'));fireEvent.click(screen.getByText('Sair da rota'));m.identity.mockResolvedValue('uid');done('late-token');await waitFor(()=>expect(m.signOut).toHaveBeenCalled());expect(saved).not.toHaveBeenCalled();expect(useAuthStore.getState().token).toBe('');});
it('credenciais rejeitadas nunca usam fallback de API',async()=>{m.login.mockRejectedValue(new Error('inválidas'));const saved=setup();await screen.findByText('anonymous');fireEvent.click(screen.getByText('Entrar'));await screen.findByText('error');expect(m.geo).not.toHaveBeenCalled();expect(saved).not.toHaveBeenCalled();});
it('token antigo é somente API e não libera alteração',async()=>{useAuthStore.getState().setToken('old','staff@example.invalid');const saved=setup();await screen.findByText('api_only');fireEvent.click(screen.getByText('Salvar'));await screen.findByText('salvar decisão');expect(saved).not.toHaveBeenCalled();});
it('token expirado não aparece como autenticado',async()=>{useAuthStore.setState({token:'old',expiresAt:Date.now()-1});setup();await screen.findByText('expired');});
it('remoção apaga token e encerra sessão local',async()=>{useAuthStore.getState().setToken('valid','staff@example.invalid');m.identity.mockResolvedValue('uid');setup();await screen.findByText('ready');fireEvent.click(screen.getByText('Remover'));await screen.findByText('anonymous');expect(m.signOut).toHaveBeenCalledWith({scope:'local'});});
