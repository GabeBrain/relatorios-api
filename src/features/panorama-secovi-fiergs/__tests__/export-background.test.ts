import {afterEach,describe,expect,it,vi} from 'vitest';
import {settlePaint} from '../lib/pdf-export';
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('espera de renderização ao trocar de aba',()=>{
  function setup(state='visible'){
    vi.useFakeTimers();let visibility=state;
    vi.spyOn(document,'visibilityState','get').mockImplementation(()=>visibility as DocumentVisibilityState);
    const frames:FrameRequestCallback[]=[];
    const request=vi.fn((fn:FrameRequestCallback)=>{frames.push(fn);return frames.length;});
    const cancel=vi.fn();vi.stubGlobal('requestAnimationFrame',request);vi.stubGlobal('cancelAnimationFrame',cancel);
    return {frames,request,cancel,hide:()=>{visibility='hidden';document.dispatchEvent(new Event('visibilitychange'));}};
  }
  it('mantém dois quadros quando a aba fica visível e limpa recursos',async()=>{
    const {frames,cancel}=setup();const pending=settlePaint();frames[0](0);frames[1](16);await pending;
    expect(cancel).toHaveBeenCalledTimes(2);expect(vi.getTimerCount()).toBe(0);
  });
  it('conclui quando a aba é escondida entre os dois quadros',async()=>{
    const {frames,hide}=setup();const pending=settlePaint();frames[0](0);hide();await pending;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('não espera quadros em aba já oculta',async()=>{
    const {request}=setup('hidden');const pending=settlePaint();await vi.advanceTimersByTimeAsync(0);await pending;expect(request).not.toHaveBeenCalled();
  });
  it('tem limite se os quadros forem suspensos sem evento de visibilidade',async()=>{
    setup();const pending=settlePaint();await vi.advanceTimersByTimeAsync(250);await pending;expect(vi.getTimerCount()).toBe(0);
  });
});
