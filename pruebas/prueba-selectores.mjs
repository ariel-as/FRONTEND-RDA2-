import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
const paginas=['frontend/index.html',...readdirSync('frontend/cliente').filter((n)=>n.endsWith('.html')).map((n)=>`frontend/cliente/${n}`),...readdirSync('frontend/admin').filter((n)=>n.endsWith('.html')).map((n)=>`frontend/admin/${n}`)];
for(const archivo of paginas){const html=readFileSync(archivo,'utf8');const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map((m)=>m[1]);assert.equal(new Set(ids).size,ids.length,`${archivo}: IDs duplicados`);for(const [,id]of html.matchAll(/\b(?:aria-labelledby|aria-describedby|aria-controls)="([^"]+)"/g)){for(const referencia of id.split(/\s+/))assert.ok(ids.includes(referencia),`${archivo}: referencia sin destino ${referencia}`);}}
const login=readFileSync(path.join('frontend','admin','login.html'),'utf8');assert.match(login,/data-boton-tema/);
console.log(`Selectores y ARIA: IDs y referencias válidos en ${paginas.length} páginas.`);
