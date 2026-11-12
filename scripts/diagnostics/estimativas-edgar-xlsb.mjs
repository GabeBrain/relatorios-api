import XLSX from 'xlsx';
import {writeFile} from 'node:fs/promises';
const folder='.local-inputs/estimativas-vendas/edgar-drive-20261022';
const workbook=XLSX.readFile(`${folder}/horizontal.xlsb`);
const sheets=[];
for(const name of workbook.SheetNames){
 const rows=XLSX.utils.sheet_to_json(workbook.Sheets[name],{header:1,raw:true,defval:null});
 const headers=rows.shift();const keep=headers.map((h,i)=>h==='Preço'?-1:i).filter(i=>i>=0);
 const content=rows.filter(r=>r.some(v=>v!==null)).map(r=>Object.fromEntries(keep.map(i=>[headers[i],r[i]])));
 await writeFile(`${folder}/horizontal-${name.replace(/[^a-z0-9]/gi,'')}.json`,JSON.stringify(content));
 sheets.push({name,rows:content.length,headers});
}
console.log(JSON.stringify(sheets,null,2));
