import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:5179';
const folder = resolve('.local-inputs/relatorios-lucas/fortaleza/monthly-visual');
await mkdir(folder, { recursive: true });
const cities = ['Fortaleza', 'Aquiraz', 'Caucaia', 'Eusébio', 'Maracanaú'];
const standards = ['Econômico', 'Compacto', 'Standard', 'Médio', 'Médio-Alto', 'Alto', 'Luxo'];
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
const orderOnly = process.argv.includes('--order-only');
try {
  for (const width of orderOnly ? [1440] : [1440, 390]) for (const dark of orderOnly ? [false] : [false, true]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    await context.addInitScript(({ dark }) => {
      localStorage.setItem('brain-auth', JSON.stringify({ state: { token: 'synthetic-fortaleza-monthly', email: 'fixture@example.invalid', issuedAt: Date.now(), expiresAt: Date.now() + 3600000 }, version: 0 }));
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    }, { dark });
    const calls = []; let mode = 'success';
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin === base) return route.continue();
      const reply = value => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) });
      if (url.pathname === '/public-api/monitored-cities') return reply({ data: cities.map(city => ({ city, state: 'CE' })), links: { next: null } });
      if (url.pathname === '/public-api/v2/building-with-history-internal') {
        assert.equal(route.request().method(),'POST'); calls.push({city:url.searchParams.get('city'),metric:'history-v2'});
        const city=url.searchParams.get('city'),type=url.searchParams.get('type'),months=Array.from({length:13},(_,i)=>new Date(Date.UTC(2025,6+i,1)).toISOString().slice(0,7));
        const products=type==='Vertical'?Array.from({length:44},()=> 'Standard'):['Condominio de Casas','Loteamento Fechado','Loteamento Aberto'];
        const data=mode==='empty'?[]:products.map((product,index)=>({building_id:`${city}-${type}-${index}`,city,state:'CE',building_type:type,standard:product,release_date:'2020-01-01',neighborhood:`Bairro ${String(index+1).padStart(2,'0')}`,typologies:[{id:index+1,type_of_typology:'Padrao'}],typologies_history:months.map((month,i)=>({typology_id:index+1,period:`${month}-01`,qty:100,sold_in_period:3,typology_stock:10,price_private_area:1000+index*500+i*30}))}));
        if(mode==='missing'&&data.length)data[0].typologies_history.pop();
        return reply({data,meta:{total:data.length,current_page:1,last_page:1}});
      }
      if (url.hostname !== 'geobrain.com.br') return route.abort();
      const city = url.searchParams.get('city'), metric = url.pathname.split('/').at(-1);
      calls.push({ city, metric });
      if (metric === 'building-with-history') return reply({ data: [{ city, state: 'CE', building_type: 'Vertical' }], meta: { total: 1 } });
      if (metric === 'building') {
        const type = url.searchParams.get('type');
        return reply({ data: [{ building_id: `${city}-${type}`, city, state: 'CE', building_type: type, release_date: '2026-07-01', name: 'Empreendimento sintético', standard: type === 'Horizontal' ? 'Condomínio de Casas' : 'Econômico', neighborhood: 'Centro' }], meta: { total: 1, last_page: 1, current_page: 1 } });
      }
      assert.ok(['releases', 'sales', 'stock'].includes(metric));
      const start = url.searchParams.get('start_period'), end = url.searchParams.get('end_period'), months = [];
      for (let date = new Date(`${start.slice(0, 7)}-01T00:00:00Z`); date.toISOString().slice(0, 7) <= end.slice(0, 7); date.setUTCMonth(date.getUTCMonth() + 1)) months.push(date.toISOString().slice(0, 7));
      const historical = months.length >= 25, segment = url.searchParams.getAll('type[]')[0] || 'Vertical';
      const groups = segment === 'Horizontal' ? ['Condomínio de Casas/Sobrados','Loteamento Aberto','Loteamento Fechado','Condomínio de Chácaras'] : standards;
      let data = mode === 'empty' && historical ? [] : months.flatMap((month, index) => groups.map((group, groupIndex) => ({ city, state: 'CE', building_type: segment, period: `${month}-01`, group, vgv_release:(groupIndex === 0 ? 10 + index : 2)*500000, vgv_liquid_sales:(groupIndex === 1 ? -2 : groupIndex === 0 ? 10 + index : 2)*500000, [metric === 'releases' ? 'releases_in_period' : metric === 'sales' ? 'liquid_sales' : 'stock']: metric === 'stock' ? 100 : metric === 'sales' && groupIndex === 1 ? -2 : groupIndex === 0 ? 10 + index : 2 })));
      if (mode === 'missing' && historical) data.pop();
      if (mode === 'slow' && historical && city === 'Fortaleza' && segment === 'Horizontal' && metric === 'releases') await new Promise(done => setTimeout(done, 1200));
      const page = Number(url.searchParams.get('page') || 1), total = data.length, last = Math.max(1, Math.ceil(total / 100));
      data = data.slice((page - 1) * 100, page * 100);
      try { return await reply({ data, meta: { total, last_page: last, current_page: page }, links: { next: page === last ? null : 'https://provider.invalid/next' } }); } catch { /* Cancelled page. */ }
    });
    const page = await context.newPage();
    await page.goto(`${base}/rebrain/relatorios-institucionais/fortaleza`);
    await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
    assert.match(await page.locator('#fortaleza-periodicity').innerText(), /Mensal/);
    assert.equal(await page.locator('#fortaleza-territory').count(),0);
    assert.equal(await page.getByRole('combobox').count(),3);
    await page.getByRole('heading', { name: 'Fortaleza / SINDUSCON-CE', exact: true }).waitFor();
    await page.locator('#fortaleza-position').click(); await page.getByRole('option', { name: 'julho', exact: true }).click();
    await page.locator('#fortaleza-year').click(); await page.getByRole('option', { name: '2026', exact: true }).click();
    mode = orderOnly ? 'success' : 'slow'; await page.getByRole('button', { name: 'Gerar prévia mensal', exact: true }).click();
    if (!orderOnly) {
      await page.getByText(/fontes mensais concluídas/).first().waitFor();
      const localLoading = page.getByRole('region', { name:'Carregamento do relatório Fortaleza',exact:true });
      await localLoading.scrollIntoViewIfNeeded();
      const geometry = await localLoading.evaluate(section => {
        const overlay = section.querySelector('[role="status"]'), card = section.getBoundingClientRect(), box = overlay.getBoundingClientRect();
        const aside = document.querySelector('aside').getBoundingClientRect();
        const hit = document.elementFromPoint(aside.left + aside.width / 2, Math.max(aside.top + 100,100));
        return { position:getComputedStyle(overlay).position,contained:box.left >= card.left-1 && box.right <= card.right+1 && box.top >= card.top-1 && box.bottom <= card.bottom+1,menuAccessible:Boolean(hit?.closest('aside')) };
      });
      assert.equal(geometry.position,'absolute'); assert.equal(geometry.contained,true); assert.equal(geometry.menuAccessible,true);
      await page.screenshot({ path: resolve(folder, `loading-${width}-${dark}.png`) });
    }
    await page.getByRole('button', { name: 'Gerar prévia mensal', exact: true }).waitFor({ state: 'visible' });
    await page.waitForFunction(() => !document.querySelector('button') || ![...document.querySelectorAll('button')].find(button => button.textContent === 'Gerar prévia mensal')?.disabled);
    mode = 'success';
    const diagnosticButton=page.getByRole('button',{name:'Baixar diagnóstico JSON',exact:true});
    await diagnosticButton.waitFor();
    const [diagnosticDownload]=await Promise.all([page.waitForEvent('download'),diagnosticButton.click()]);
    const diagnosticPath=resolve(folder,`diagnostic-${width}-${dark}.json`);await diagnosticDownload.saveAs(diagnosticPath);
    const diagnostic=JSON.parse(await (await import('node:fs/promises')).readFile(diagnosticPath,'utf8'));
    assert.equal(diagnostic.slides.length,60);assert.equal(diagnostic.homologated,false);assert.ok(diagnostic.slides.every((slide,index)=>slide.number===index+1));assert.equal(diagnostic.selection.territory,'capital-rm');
    assert.equal(JSON.stringify(diagnostic).includes('synthetic-fortaleza-monthly'),false);assert.equal(JSON.stringify(diagnostic).includes('typologies_history'),false);assert.equal(JSON.stringify(diagnostic).includes('data:image'),false);
    assert.equal(diagnostic.slides[1].status,'source-pending');assert.equal(diagnostic.slides[56].status,'editorial-review');
    const count = calls.length;
    for (const number of Array.from({ length:50 },(_,index) => index+11)) {
      await page.getByRole('navigation', { name: 'Slides implementados', exact: true }).getByRole('button', { name: String(number), exact: true }).click();
      await page.evaluate(() => document.fonts.ready);
      const slide = page.getByRole('img', { name: `Fortaleza · slide ${number}`, exact: true });
      assert.equal(await slide.getByLabel('Histórico de lançamentos pendente').count(), 0);
      assert.equal(await slide.getByLabel('Histórico mensal pendente').count(), 0);
      assert.equal(await slide.getByLabel('Tabela mensal pendente').count(), 0, `slide ${number}: ${(await page.locator('details').allTextContents()).join(' | ')}`);
      assert.equal(await slide.getByLabel('Análise mensal pendente').count(), 0, `slide ${number}: ${(await page.locator('details').allTextContents()).join(' | ')}`);
      await slide.screenshot({ path: resolve(folder, `slide-${number}-${width}-${dark}.png`) });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    }
    assert.equal(calls.length, count, 'Slide navigation must not issue queries.');
    if(width===1440&&!dark){
      await page.getByRole('navigation',{name:'Slides implementados',exact:true}).getByRole('button',{name:'57',exact:true}).click();
      await page.getByText('Personalizar equipe e fotos',{exact:true}).click();
      await page.getByLabel('Nome',{exact:true}).fill('Analista Teste');
      assert.ok((await page.getByRole('img',{name:'Fortaleza · slide 57',exact:true}).textContent()).includes('Analista Teste'));
      await page.locator('#fort-person-photo').setInputFiles(resolve('src/features/relatorios-institucionais/fortaleza/assets/monthly/people/57-1.png'));
      await page.waitForFunction(()=>document.querySelector('svg[aria-label="Fortaleza · slide 57"] g[aria-label="Integrante 1"] image')?.getAttribute('href')?.startsWith('data:image'));
      await page.getByRole('button',{name:'Restaurar referência',exact:true}).click();
      assert.equal(await page.getByLabel('Nome',{exact:true}).inputValue(),'Fábio Tadeu Araújo');
      await page.getByRole('button',{name:'Ocultar integrante',exact:true}).click();
      assert.equal(await page.getByRole('img',{name:'Fortaleza · slide 57',exact:true}).getByLabel('Integrante 1',{exact:true}).count(),0);
      await page.getByRole('button',{name:'Restaurar referência',exact:true}).click();
      assert.equal(calls.length,count,'Editorial edits must not query API.');
    }

    await page.getByRole('navigation', { name: 'Slides implementados', exact: true }).getByRole('button', { name: '11', exact: true }).click();
    for (let number = 12;number <= 60;number++) {
      await page.getByRole('navigation', { name: 'Slides implementados', exact: true }).getByRole('button', { name: 'Próximo', exact: true }).click();
      await page.getByRole('img', { name: `Fortaleza · slide ${number}`, exact: true }).waitFor();
      if (number === 12 || number === 14) {
        assert.equal(await page.getByLabel('Histórico mensal pendente').count(),0);
      }
    }
    assert.equal(calls.length, count, 'Official sequence must not issue queries.');
    if (!orderOnly && width === 1440 && !dark) {
      for (const scenario of ['missing','empty']) {
        mode = scenario; await page.getByRole('button', { name: 'Gerar prévia mensal', exact: true }).click();
        await page.waitForFunction(() => ![...document.querySelectorAll('button')].find(button => button.textContent === 'Gerar prévia mensal')?.disabled);
        await page.getByRole('navigation', { name: 'Slides implementados', exact: true }).getByRole('button', { name: '13', exact: true }).click();
        await page.getByLabel('Histórico de lançamentos pendente').waitFor();
        await page.getByRole('navigation', { name: 'Slides implementados', exact: true }).getByRole('button', { name: '37', exact: true }).click();
        await page.getByLabel('Análise mensal pendente').waitFor();
      }
      mode = 'slow'; await page.getByRole('button', { name: 'Gerar prévia mensal', exact: true }).click();
      await page.getByText(/fontes mensais concluídas/).first().waitFor();
      await page.getByRole('button', { name: 'Cancelar consulta', exact: true }).click();
      await page.getByText('Prévia cancelada', { exact: true }).waitFor();
    }
    results.push({ width, dark, calls: calls.length, slides: Array.from({ length:50 },(_,index) => index+11), officialSequence: '11–60 sem saltos', offline: true });
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(resolve(folder, orderOnly ? 'order-results.json' : 'results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
