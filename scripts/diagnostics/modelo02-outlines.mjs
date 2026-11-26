// Cartographic artwork only. This file never defines the authorized city scope.
import {readFile,writeFile} from 'node:fs/promises';
import {geoMercator,geoPath} from 'd3-geo';
const source=JSON.parse(await readFile('public/geo/br-states.json','utf8'));
const regions={sul:['PR','SC','RS'],sudeste:['ES','MG','RJ','SP'],nordeste:['AL','BA','CE','MA','PB','PE','PI','RN','SE'],norte:['AC','AP','AM','PA','RO','RR','TO'],'centro-oeste':['DF','GO','MT','MS']};
const result={};
for(const [region,ufs] of Object.entries(regions)){
 const features=source.features.filter(f=>ufs.includes(f.properties.sigla));
 const projection=geoMercator().fitExtent([[10,10],[300,290]],{type:'FeatureCollection',features});
 const path=geoPath(projection).digits(0);
 result[region]=features.map(feature=>({uf:feature.properties.sigla,path:path(feature),centroid:path.centroid(feature)}));
}
await writeFile('src/features/relatorios-institucionais/modelo-02/region-outlines.json',JSON.stringify(result));
