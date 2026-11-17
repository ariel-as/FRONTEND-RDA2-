import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../frontend');
function listar(carpeta) { return readdirSync(carpeta,{withFileTypes:true}).flatMap((e)=>e.isDirectory()?listar(path.join(carpeta,e.name)):[path.join(carpeta,e.name)]); }
const modulos = listar(raiz).filter((f)=>f.endsWith('.js'));
const relativo = (archivo) => path.relative(raiz,archivo).replaceAll(path.sep,'/');
for (const archivo of modulos) {
  const texto=readFileSync(archivo,'utf8');
  for (const [,referencia] of texto.matchAll(/from\s*['"](\.[^'"]+)['"]/g)) assert.ok(existsSync(path.resolve(path.dirname(archivo),referencia)), `${relativo(archivo)}: importa un archivo inexistente ${referencia}`);
  if (!relativo(archivo).startsWith('models/api.model.js')) assert.ok(!/\bfetch\s*\(/.test(texto), `${relativo(archivo)}: fetch fuera de api.model.js`);
  if (relativo(archivo).startsWith('models/')) assert.ok(!/from\s*['"][^'"]*(?:views|controllers)\//.test(texto), `${relativo(archivo)}: el modelo depende de una capa superior`);
  if (relativo(archivo).startsWith('views/')) assert.ok(!/\bfetch\s*\(/.test(texto), `${relativo(archivo)}: la vista realiza una petición`);
}
const comunes=readFileSync(path.join(raiz,'controllers/comunes.controller.js'),'utf8');
const admin=readFileSync(path.join(raiz,'controllers/admin.controller.js'),'utf8');
assert.match(comunes,/export\s+function\s+iniciarTema/);
assert.match(admin,/import\s*\{\s*iniciarTema\s*\}\s*from\s*['"]\.\/comunes\.controller\.js['"]/);
console.log(`Arquitectura: ${modulos.length} módulos, rutas de importación y fetch centralizado correctos.`);
