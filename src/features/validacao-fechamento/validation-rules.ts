import type { ValidationBuilding, ValidationHistory } from './api';

export interface Divergence {
  building_id: string; typology_id: string; building_name: string; private_area: number | null; city: string; status: string; period: string;
  field: string; error: string; value: string; rule: string; group: string; isBuildingRule: boolean;
}
interface Row {
  b: ValidationBuilding; h: ValidationHistory; typologyId: string; database: string;
  buildingUnits: number; buildingSold: number; buildingPrice: number; buildingArea: number;
  cityPriceM2: number; cityTicket: number; cityAvgArea: number; citySalesRate: number; cityBuildingUnits: number;
  standardTicket: number; standardPriceM2: number; noGarageTicket: number; loteFechadoM2: number;
}
const n = (v: number | null | undefined) => v ?? 0;
const ratio = (a: number, b: number) => b ? a / b : 0;
const key = (...v: string[]) => v.join('|');
const contains = (value: string, needle: string) => value.toLocaleLowerCase('pt-BR').includes(needle.toLocaleLowerCase('pt-BR'));
const fmt = (v: number | null | undefined) => n(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/** Tradução literal das tratativas v3. `database` é o período de data[] informado pelo usuário. */
export function validateBuildings(buildings: ValidationBuilding[]): Divergence[] {
  const out: Divergence[] = [];
  const base = buildings.flatMap((b) => b.typologies.flatMap((t) => t.history.map((h) => ({ b, h, typologyId: t.typology_id, database: b.period }))));
  const sum = new Map<string, { qty: number; sold: number; price: number; area: number; standardQty: number; standardPrice: number; standardArea: number; noGarageQty: number; noGaragePrice: number }>();
  const city = new Map<string, { qty: number; sold: number; price: number; area: number; units: number[] }>();
  const cityLote = new Map<string, { price: number; area: number }>();
  for (const r of base) {
    const qty = n(r.h.qty), price = n(r.h.price), area = n(r.h.private_area), total = qty * price, totalArea = qty * area;
    const bk = key(r.b.building_id, r.h.period); const bs = sum.get(bk) ?? { qty: 0, sold: 0, price: 0, area: 0, standardQty: 0, standardPrice: 0, standardArea: 0, noGarageQty: 0, noGaragePrice: 0 };
    bs.qty += qty; bs.sold += n(r.h.sold); bs.price += total; bs.area += totalArea;
    if (r.h.type_of_typology === 'Padrão') { bs.standardQty += qty; bs.standardPrice += total; bs.standardArea += totalArea; }
    if (contains(r.h.pattern, 'Loteamento') || !/^0|^1\s*vagas?/i.test(r.h.garage_label)) { bs.noGarageQty += qty; bs.noGaragePrice += total; }
    sum.set(bk, bs);
    const ck = key(r.b.city, r.b.building_type, r.h.type_of_typology, r.h.pattern, `${r.h.number_bedroom} dorms`, r.h.period); const cs = city.get(ck) ?? { qty: 0, sold: 0, price: 0, area: 0, units: [] };
    cs.qty += qty; cs.sold += n(r.h.sold); cs.price += total; cs.area += totalArea; city.set(ck, cs);
    const lk = key(r.b.city, r.h.period); const ls = cityLote.get(lk) ?? { price: 0, area: 0 }; if (r.h.pattern === 'Loteamento Fechado') { ls.price += total; ls.area += totalArea; } cityLote.set(lk, ls);
  }
  for (const r of base) { const bs = sum.get(key(r.b.building_id, r.h.period))!; const cs = city.get(key(r.b.city, r.b.building_type, r.h.type_of_typology, r.h.pattern, `${r.h.number_bedroom} dorms`, r.h.period))!; cs.units.push(bs.qty); }
  const rows: Row[] = base.map(({ b, h, typologyId, database }) => { const bs = sum.get(key(b.building_id, h.period))!; const cs = city.get(key(b.city, b.building_type, h.type_of_typology, h.pattern, `${h.number_bedroom} dorms`, h.period))!; const ls = cityLote.get(key(b.city, h.period))!; const median = [...cs.units].sort((a, z) => a - z)[Math.floor(cs.units.length / 2)] ?? 0; return { b, h, typologyId, database, buildingUnits: bs.qty, buildingSold: bs.sold, buildingPrice: bs.price, buildingArea: bs.area, cityPriceM2: ratio(cs.price, cs.area), cityTicket: ratio(cs.price, cs.qty), cityAvgArea: ratio(cs.area, cs.qty), citySalesRate: ratio(cs.sold, cs.qty), cityBuildingUnits: median, standardTicket: ratio(bs.standardPrice, bs.standardQty), standardPriceM2: ratio(bs.standardPrice, bs.standardArea), noGarageTicket: ratio(bs.noGaragePrice, bs.noGarageQty), loteFechadoM2: ratio(ls.price, ls.area) }; });
  const enterpriseErrors = new Set(['Vertical ou comercial com incorporadora PARTICULAR', 'Antigo com alta disponibilidade (mais 2 anos com mais 50% estoque)', 'Novo com baixa disponibilidade (menos 2 anos com 50% estoque ou menos)', 'Loteamento Comercial não deve entrar na base', 'Loteamento Fechado com preço acima de R$ 3.000/m2, deve ser Condomínio de Casas', 'Loteamento Aberto com poucas unidades (100 lotes ou menos)', 'Loteamento Fechado com entrada fora do limite 10% a 40%', 'Loteamento Aberto com entrada fora do limite 5% a 10%', 'Loteamento Fechado com mais de 60 parcelas', 'Loteamento Aberto com menos de 120 parcelas', 'Loteamento com financiamento bancário', 'Taxa de juros deve ser anual mas apresenta valor menor ou igual 1%', 'Oferta lançada precisa bater com o total de unidades por tipologia', 'Velocidade de vendas com variação maior que 50% da mediana do padrão para cidade', 'Oferta lançada com variação maior que 50% da mediana do padrão da cidade']);
  const emit = (r: Row, field: string, error: string, value: string, rule: string) => {
    const cityAverage = error.includes('ticket') ? `Média cidade: ${fmt(r.cityTicket)}` : error.includes('Metragem') ? `Média cidade: ${fmt(r.cityAvgArea)}` : `Média cidade: ${fmt(r.cityPriceM2)}`;
    const hasCityAverage = /preço\/m2|preço por m²|ticket|Metragem|Vertical com preço/i.test(error);
    const usesCityGroup = hasCityAverage || value.includes('Média cidade:') || value.includes('Mediana cidade:');
    const usesEnterpriseGroup = field === 'total_stock' || field === 'total_units' || value.includes('Ticket Empreendimento') || value.includes('Padrão') || error.includes('empreendimento');
    const groups = [
      usesEnterpriseGroup ? `Empreendimento: building_id=${r.b.building_id} | período=${r.h.period}` : '',
      usesCityGroup ? `Cidade: cidade=${r.b.city} | tipo=${r.b.building_type} | tipologia=${r.h.type_of_typology} | padrão=${r.h.pattern} | dormitórios=${r.h.number_bedroom} | período=${r.h.period}` : '',
    ].filter(Boolean).join(' / ');
    out.push({ building_id: r.b.building_id, typology_id: r.typologyId, building_name: r.b.name, private_area: r.h.private_area, city: r.b.city, status: r.h.building_status, period: r.h.period, field, error, value: hasCityAverage && !value.includes('Média cidade:') ? `${value} | ${cityAverage}` : value, rule, group: groups, isBuildingRule: enterpriseErrors.has(error) });
  };
  const latestBuilding = new Map<string, Row>(), latestTypology = new Map<string, Row>();
  for (const r of rows) { const order = `${r.database}|${r.h.period}|${r.b.building_id}|${r.typologyId}`; if (!latestBuilding.has(r.b.building_id) || order > `${latestBuilding.get(r.b.building_id)!.database}|${latestBuilding.get(r.b.building_id)!.h.period}|${r.b.building_id}|${latestBuilding.get(r.b.building_id)!.typologyId}`) latestBuilding.set(r.b.building_id, r); if (!latestTypology.has(r.typologyId) || r.h.period > latestTypology.get(r.typologyId)!.h.period) latestTypology.set(r.typologyId, r); }
  for (const r of latestBuilding.values()) { const months = Math.round((new Date(r.h.period).getTime() - new Date(r.b.release_date).getTime()) / 86400000 / 30.44); const half = r.buildingUnits * .5; const lot = contains(r.b.standard, 'Loteamento');
    if (r.b.builder_name === 'Particular' && r.b.building_type !== 'Horizontal') emit(r, 'builder_name', 'Vertical ou comercial com incorporadora PARTICULAR', r.b.builder_name, 'OFERTA, TIPOLOGIA E CADASTRO');
    if (months > 24 && r.b.status === 'Ativo' && n(r.b.total_stock) > half) emit(r, 'total_stock', 'Antigo com alta disponibilidade (mais 2 anos com mais 50% estoque)', `Tempo venda: ${months} | Estoque atual: ${fmt(r.b.total_stock)} | Total unidades: ${fmt(r.buildingUnits)}`, 'ESTOQUE / DISPONIBILIDADE');
    if (months <= 24 && r.b.status === 'Ativo' && n(r.b.total_stock) <= half) emit(r, 'total_stock', 'Novo com baixa disponibilidade (menos 2 anos com 50% estoque ou menos)', `Tempo venda: ${months} | Estoque atual: ${fmt(r.b.total_stock)} | Total unidades: ${fmt(r.buildingUnits)}`, 'ESTOQUE / DISPONIBILIDADE');
    if (r.b.standard === 'Loteamento Comercial') emit(r, 'standard', 'Loteamento Comercial não deve entrar na base', r.b.standard, 'OFERTA, TIPOLOGIA E CADASTRO');
    if (r.b.standard === 'Loteamento Fechado' && n(r.h.price_private_area) > 3000) emit(r, 'price_private_area', 'Loteamento Fechado com preço acima de R$ 3.000/m2, deve ser Condomínio de Casas', fmt(r.h.price_private_area), 'OFERTA, TIPOLOGIA E CADASTRO');
    if (r.b.standard === 'Loteamento Aberto' && r.buildingUnits <= 100) emit(r, 'qty', 'Loteamento Aberto com poucas unidades (100 lotes ou menos)', `Total unidades: ${fmt(r.buildingUnits)}`, 'OFERTA, TIPOLOGIA E CADASTRO');
    if (r.b.standard === 'Loteamento Fechado' && (n(r.b.down_payment_percentage) < 10 || n(r.b.down_payment_percentage) > 40)) emit(r, 'down_payment_percentage', 'Loteamento Fechado com entrada fora do limite 10% a 40%', fmt(r.b.down_payment_percentage), 'CONDIÇÕES DE PAGAMENTO');
    if (r.b.standard === 'Loteamento Aberto' && (n(r.b.down_payment_percentage) < 5 || n(r.b.down_payment_percentage) > 10)) emit(r, 'down_payment_percentage', 'Loteamento Aberto com entrada fora do limite 5% a 10%', fmt(r.b.down_payment_percentage), 'CONDIÇÕES DE PAGAMENTO');
    if (r.b.standard === 'Loteamento Fechado' && n(r.b.number_of_installments) > 60) emit(r, 'number_of_installments', 'Loteamento Fechado com mais de 60 parcelas', fmt(r.b.number_of_installments), 'CONDIÇÕES DE PAGAMENTO');
    if (r.b.standard === 'Loteamento Aberto' && n(r.b.number_of_installments) < 120) emit(r, 'number_of_installments', 'Loteamento Aberto com menos de 120 parcelas', fmt(r.b.number_of_installments), 'CONDIÇÕES DE PAGAMENTO');
    if (lot && n(Number(r.b.bank_financing)) !== 0) emit(r, 'bank_financing', 'Loteamento com financiamento bancário', String(r.b.bank_financing), 'CONDIÇÕES DE PAGAMENTO');
    if (r.b.building_type === 'Horizontal' && n(Number(r.b.own_financing)) === 1 && n(r.b.interest_rate_tax) <= 1) emit(r, 'interest_rate_tax', 'Taxa de juros deve ser anual mas apresenta valor menor ou igual 1%', fmt(r.b.interest_rate_tax), 'CONDIÇÕES DE PAGAMENTO');
    if (n(r.b.total_units) !== r.buildingUnits) emit(r, 'total_units', 'Oferta lançada precisa bater com o total de unidades por tipologia', `Oferta lançada: ${fmt(r.b.total_units)} | Unidades empreendimento: ${fmt(r.buildingUnits)}`, 'OFERTA E FASEAMENTO');
    if (Math.abs(ratio(r.buildingSold, r.buildingUnits) / r.citySalesRate - 1) > .5) emit(r, 'sold', 'Velocidade de vendas com variação maior que 50% da mediana do padrão para cidade', `Empreendimento: ${fmt(ratio(r.buildingSold, r.buildingUnits))} | Mediana cidade: ${fmt(r.citySalesRate)}`, 'ESTOQUE / DISPONIBILIDADE');
    if (Math.abs(ratio(r.buildingUnits, r.cityBuildingUnits) - 1) > .5) emit(r, 'qty', 'Oferta lançada com variação maior que 50% da mediana do padrão da cidade', `Oferta lançada: ${fmt(r.buildingUnits)} | Mediana cidade: ${fmt(r.cityBuildingUnits)}`, 'ESTOQUE / DISPONIBILIDADE'); }
  for (const r of latestTypology.values()) { const h=r.h, lot=contains(h.pattern,'Loteamento'), p=n(h.price_private_area), area=n(h.private_area), garage=h.garage_label;
    if (h.sold > h.qty) emit(r,'sold','Quantidade vendida maior Quantidade lançada',`Vendido: ${h.sold} > Lançado: ${h.qty}`,'OFERTA, TIPOLOGIA E CADASTRO');
    if (r.b.release_date === h.period && Math.round(n(h.release_price)) !== Math.round(n(h.price))) emit(r,'release_price','Preço de lançamento diferente do preço do período',`Preço Lançamento: ${fmt(h.release_price)} | Preço Período: ${fmt(h.price)}`,'PREÇO');
    if (h.sold_in_period !== 0 && h.building_status === 'Futuro') emit(r,'sold_in_period','Empreendimento Futuro com venda',fmt(h.sold_in_period),'OFERTA, TIPOLOGIA E CADASTRO');
    if (r.b.release_date < h.period && h.building_status === 'Futuro') emit(r,'release_date','Data lançamento < Período atual',`Data lançamento: ${r.b.release_date} < Período atual: ${h.period}`,'OFERTA, TIPOLOGIA E CADASTRO');
    if (Math.abs(ratio(n(h.price),r.cityTicket)-1)>=.2) emit(r,'price','Variação de 20% do ticket da tipologia comparando com o ticket do padrão da cidade',fmt(h.price),'PREÇO');
    if (n(h.distractions)>5) emit(r,'distractions','Mais de 5 distratos no período',fmt(h.distractions),'OFERTA, TIPOLOGIA E CADASTRO');
    if (lot && area<120) emit(r,'private_area','Loteamento menor que 120 m2',fmt(h.private_area),'METRAGEM E VAGAS DE GARAGEM'); if (lot && area>800) emit(r,'private_area','Loteamento maior que 800 m2',fmt(h.private_area),'METRAGEM E VAGAS DE GARAGEM');
    if (h.pattern==='Loteamento Aberto' && p>r.loteFechadoM2) emit(r,'price_private_area','Loteamento aberto com preço/m2 maior que o do fechado da cidade',`Preço/m2 Aberto: ${fmt(p)} | Preço/m2 Fechado Cidade: ${fmt(r.loteFechadoM2)}`,'PREÇO');
    if (h.pattern==='Loteamento Fechado' && p<600 && Math.abs(ratio(p,r.cityPriceM2)-1)>=.2) emit(r,'price_private_area','Loteamento Fechado com preço abaixo de R$ 600/m2',fmt(p),'PREÇO');
    if (h.pattern==='Loteamento Aberto' && p<150 && Math.abs(ratio(p,r.cityPriceM2)-1)>=.2) emit(r,'price_private_area','Loteamento Aberto com preço abaixo de R$ 150/m2',fmt(p),'PREÇO');
    if (contains(h.pattern,'Condomínio de Casas') && p<3500 && Math.abs(ratio(p,r.cityPriceM2)-1)>=.2) emit(r,'price_private_area','Condomínio de Casas com preço abaixo de R$ 3.500/m2',fmt(p),'PREÇO');
    if (area<ratio(r.buildingArea,r.buildingUnits) && n(h.price)>ratio(r.buildingPrice,r.buildingUnits)) emit(r,'price','Unidades menores com ticket maior que a média do empreendimento',`Preço: ${fmt(h.price)} | Ticket Empreendimento: ${fmt(ratio(r.buildingPrice,r.buildingUnits))}`,'PREÇO');
    if (area<ratio(r.buildingArea,r.buildingUnits) && Math.abs(ratio(p,ratio(r.buildingPrice,r.buildingArea)))<.8) emit(r,'price_private_area','Unidades menores com preço/m2 20% menor que a média do empreendimento',fmt(p),'PREÇO');
    if (r.b.building_type==='Vertical' && Math.abs(ratio(p,ratio(r.buildingPrice,r.buildingArea)))>=1.15) emit(r,'price_private_area','Empreendimentos Verticais com diferença do preço/m2 maior que 15% entre tipologias',fmt(p),'PREÇO');
    if (!/^0/.test(garage) && n(h.price) <= r.noGarageTicket) emit(r,'price','Unidade com vaga com preço inferior à unidade sem vaga',`Ticket: ${fmt(h.price)} | Sem vagas: ${fmt(r.noGarageTicket)}`,'PREÇO');
    if (!lot && r.b.building_type!=='Comercial' && area>=100 && h.number_bedroom<=1) emit(r,'number_bedroom','Tipologia acima de 100 m2 com no máximo 1 dormitório',`Quartos: ${h.number_bedroom} | M2: ${fmt(area)}`,'METRAGEM E VAGAS DE GARAGEM');
    if (r.b.building_type==='Vertical' && p<5000 && Math.abs(ratio(p,r.cityPriceM2)-1)>.15) emit(r,'price_private_area','Vertical com preço/m2 abaixo de R$ 5.000',fmt(p),'PREÇO');
    if (r.b.building_type==='Vertical' && h.pattern==='Econômico' && !/0|1\s*vagas?/i.test(garage)) emit(r,'garage','Econômico com mais de 1 vaga de garagem',garage,'METRAGEM E VAGAS DE GARAGEM');
    if (r.b.building_type==='Vertical' && h.pattern==='Econômico' && contains(garage,'Rotativa')) emit(r,'garage','Econômico com vaga rotativa',garage,'METRAGEM E VAGAS DE GARAGEM');
    if (r.b.building_type==='Vertical' && h.pattern!=='Econômico' && contains(garage,'Descoberta')) emit(r,'garage','Não econômico com vaga descoberta',garage,'METRAGEM E VAGAS DE GARAGEM');
    if (r.b.building_type==='Vertical' && /0|1\s*vagas?/i.test(garage) && area>=150) emit(r,'garage','Tipologia com 150 m2 ou mais com menos de 2 vagas',garage,'METRAGEM E VAGAS DE GARAGEM');
    if (r.b.building_type==='Vertical' && /0\s*vagas?/i.test(garage) && area>=40 && h.pattern==='Compacto') emit(r,'garage','Compacto com 40 m2 ou mais sem vaga de garagem',garage,'METRAGEM E VAGAS DE GARAGEM');
    if (Math.abs(ratio(p,r.cityPriceM2)-1)>=.4) emit(r,'price_private_area','Preço/m2 com variação a partir de 40% sobre a média do padrão da cidade',fmt(p),'PREÇO');
    if (h.type_of_typology==='Garden' && Math.round(n(h.price))>=Math.round(r.standardTicket)) emit(r,'price','Ticket Garden >= Ticket Padrão',`Garden: ${fmt(h.price)} >= Padrão: ${fmt(r.standardTicket)}`,'METRAGEM E VAGAS DE GARAGEM');
    if (h.type_of_typology==='Cobertura' && Math.round(n(h.price))<=Math.round(r.standardTicket)) emit(r,'price','Ticket Cobertura <= Ticket Padrão',`Cobertura: ${fmt(h.price)} <= Padrão: ${fmt(r.standardTicket)}`,'METRAGEM E VAGAS DE GARAGEM');
    if (h.type_of_typology==='Cobertura' && Math.round(p)>=Math.round(r.standardPriceM2)) emit(r,'price','Preço/M2 Cobertura >= Preço/M2 Padrão',`Cobertura: ${fmt(p)} >= Padrão: ${fmt(r.standardPriceM2)}`,'PREÇO');
    if (Math.abs(ratio(area,r.cityAvgArea)-1)>=.2) emit(r,'private_area','Metragem variando a partir de 20% sobre a média do grupo da cidade',`${fmt(area)} | Média cidade: ${fmt(r.cityAvgArea)}`,'PREÇO'); }
  return out;
}
