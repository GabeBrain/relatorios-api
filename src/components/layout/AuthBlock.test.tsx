import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GeobrainSessionContext } from '@/features/shared/geobrain-session/context';
import { AuthBlock } from './AuthBlock';
import { useAuthStore } from '@/store/auth-store';
vi.mock('@/hooks/use-openapi-docs',()=>({useOpenAPIDocs:()=>({data:[]})}));
const login=vi.fn(),logout=vi.fn(),cancel=vi.fn();
beforeEach(()=>{vi.clearAllMocks();useAuthStore.getState().clearToken();login.mockResolvedValue(undefined);});
afterEach(cleanup);
function setup(action=''){render(<MemoryRouter><GeobrainSessionContext.Provider value={{state:'anonymous',request:action?1:0,action,login,logout,cancel}}><AuthBlock/></GeobrainSessionContext.Provider></MemoryRouter>);}
it('o menu usa a mesma autenticação em qualquer rota e limpa senha',async()=>{setup();fireEvent.change(screen.getByLabelText('Email'),{target:{value:'staff@example.invalid'}});fireEvent.change(screen.getByLabelText('Senha'),{target:{value:'fixture'}});fireEvent.click(screen.getByRole('button',{name:'Entrar'}));await waitFor(()=>expect(login).toHaveBeenCalledWith('staff@example.invalid','fixture',null));await waitFor(()=>expect(screen.getByLabelText('Senha')).toHaveValue(''));});
it('a intenção apresenta cancelar no formulário existente',()=>{setup('salvar decisão');expect(screen.getByLabelText('Email')).toHaveFocus();fireEvent.click(screen.getByText('Cancelar'));expect(cancel).toHaveBeenCalledOnce();expect(screen.queryByRole('dialog')).not.toBeInTheDocument();});
it('token expirado mostra formulário em vez de Autenticado',()=>{useAuthStore.setState({token:'expired',expiresAt:Date.now()-1});setup();expect(screen.getByLabelText('Senha')).toBeInTheDocument();expect(screen.queryByText('Autenticado')).not.toBeInTheDocument();});
