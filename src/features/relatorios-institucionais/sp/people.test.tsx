import {useState} from 'react';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {createSpPeople,validateSpPhoto,readSpPhoto} from './people';
import {SpPeopleEditor} from './SpPeopleEditor';
import {SpPeopleSlide} from './SpPeopleSlide';
vi.mock('./people',async original=>({...await original<typeof import('./people')>(),readSpPhoto:vi.fn()}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
function Editor(){const [people,setPeople]=useState(createSpPeople);return <><SpPeopleEditor people={people} onChange={setPeople} onPreview={()=>{}}/><SpPeopleSlide page={82} people={people}/></>;}
describe('Personalização da equipe',()=>{
  it('troca nome/cargo, oculta e restaura sem alterar os padrões globais',()=>{
    render(<Editor/>);fireEvent.click(screen.getByText('Personalizar equipe técnica e consultoria'));
    fireEvent.change(screen.getByLabelText('Nome'),{target:{value:'Ana da Silva'}});
    fireEvent.change(screen.getByLabelText('Cargo ou função'),{target:{value:'Analista responsável'}});
    const slide=within(screen.getByRole('img',{name:'Equipe técnica personalizada'}));
    expect(slide.getByText('Ana da Silva')).toBeInTheDocument();expect(slide.getByText('Analista responsável')).toBeInTheDocument();
    expect(createSpPeople().team[0].name).toBe('Fábio Tadeu Araújo');
    fireEvent.click(screen.getByRole('checkbox'));expect(slide.queryByText('Analista responsável')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Restaurar pessoa de referência'}));
    expect(slide.getByText('CEO')).toBeInTheDocument();expect(screen.getByLabelText('Nome')).toHaveValue('Fábio Tadeu Araújo');
  });
  it('ignora upload que termina depois de restaurar a pessoa',async()=>{
    let finish!:(value:string)=>void;vi.mocked(readSpPhoto).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    render(<Editor/>);fireEvent.click(screen.getByText('Personalizar equipe técnica e consultoria'));
    fireEvent.change(screen.getByLabelText(/Foto \(/),{target:{files:[new File(['a'],'foto.png',{type:'image/png'})]}});
    expect(screen.getByText('Preparando a foto…')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Restaurar pessoa de referência'}));finish('data:image/png;base64,late');
    await waitFor(()=>expect(screen.queryByAltText('Foto de Fábio Tadeu Araújo')).not.toBeInTheDocument());
  });
  it('preserva mudanças de nome enquanto a foto está sendo lida',async()=>{
    let finish!:(value:string)=>void;vi.mocked(readSpPhoto).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    render(<Editor/>);fireEvent.click(screen.getByText('Personalizar equipe técnica e consultoria'));
    fireEvent.change(screen.getByLabelText(/Foto \(/),{target:{files:[new File(['a'],'foto.png',{type:'image/png'})]}});
    fireEvent.change(screen.getByLabelText('Nome'),{target:{value:'Nome atualizado'}});finish('data:image/png;base64,new');
    await screen.findByAltText('Foto de Nome atualizado');expect(screen.getByLabelText('Nome')).toHaveValue('Nome atualizado');
  });
  it('recusa SVG, arquivo não imagem e foto maior que 2 MB',()=>{
    expect(validateSpPhoto(new File(['x'],'bad.svg',{type:'image/svg+xml'}))).toMatch(/PNG/);
    expect(validateSpPhoto(new File(['x'],'bad.txt',{type:'text/plain'}))).toMatch(/PNG/);
    expect(validateSpPhoto(new File([new Uint8Array(2*1024*1024+1)],'big.jpg',{type:'image/jpeg'}))).toMatch(/2 MB/);
    expect(validateSpPhoto(new File(['x'],'ok.webp',{type:'image/webp'}))).toBeNull();
  });
});
