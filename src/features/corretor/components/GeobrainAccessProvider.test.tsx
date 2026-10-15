import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import Provider from './GeobrainAccessProvider';
import { useGeobrainAccess } from '../lib/geobrain-access-context';
import { requireProjectIdentity } from '../lib/projects';
import { loginCorretor } from '../lib/project-access';
vi.mock('../lib/projects',()=>({requireProjectIdentity:vi.fn()}));
vi.mock('../lib/project-access',()=>({loginCorretor:vi.fn()}));
function Probe({saved}:{saved:()=>void}){const access=useGeobrainAccess(),nav=useNavigate();return <><button onClick={async()=>{if(await access('salvar a revisão'))saved();}}>Salvar decisão</button><button onClick={()=>nav('/outro')}>Outra rota</button></>;}
function setup(){const saved=vi.fn();render(<MemoryRouter><Provider><Probe saved={saved}/></Provider></MemoryRouter>);return saved;}
beforeEach(()=>{vi.clearAllMocks();vi.mocked(requireProjectIdentity).mockRejectedValue(new Error('Login necessário'));vi.mocked(loginCorretor).mockResolvedValue('geo-fixture');});
it('cancelar autenticação não executa a decisão',async()=>{const saved=setup();fireEvent.click(screen.getByText('Salvar decisão'));await screen.findByRole('dialog');fireEvent.click(screen.getByText('Cancelar'));await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());expect(saved).not.toHaveBeenCalled();});
it('retoma a ação uma única vez depois de entrar com Geobrain',async()=>{const saved=setup();fireEvent.click(screen.getByText('Salvar decisão'));await screen.findByRole('dialog');fireEvent.change(screen.getByLabelText('E-mail Geobrain'),{target:{value:'fixture@example.invalid'}});fireEvent.change(screen.getByLabelText('Senha Geobrain'),{target:{value:'fixture-password'}});fireEvent.click(screen.getByText('Entrar e continuar'));await waitFor(()=>expect(saved).toHaveBeenCalledTimes(1));expect(loginCorretor).toHaveBeenCalledWith('fixture@example.invalid','fixture-password');});
it('falha de autenticação não libera a ação',async()=>{vi.mocked(loginCorretor).mockRejectedValue(new Error('Credenciais inválidas'));const saved=setup();fireEvent.click(screen.getByText('Salvar decisão'));await screen.findByRole('dialog');fireEvent.change(screen.getByLabelText('E-mail Geobrain'),{target:{value:'fixture@example.invalid'}});fireEvent.change(screen.getByLabelText('Senha Geobrain'),{target:{value:'bad'}});fireEvent.click(screen.getByText('Entrar e continuar'));await screen.findByRole('alert');expect(saved).not.toHaveBeenCalled();});
it('trocar de rota cancela a intenção antiga',async()=>{const saved=setup();fireEvent.click(screen.getByText('Salvar decisão'));await screen.findByRole('dialog');fireEvent.click(screen.getByText('Outra rota'));await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());expect(saved).not.toHaveBeenCalled();});
