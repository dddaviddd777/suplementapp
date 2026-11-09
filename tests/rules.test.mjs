import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcular } from '../js/rules.js';
import { construirHorari } from '../js/horari.js';
import { estimarIngesta, ffqPerDefecte } from '../js/aliments.js';

const HIVERN = new Date('2026-11-09');
const ESTIU = new Date('2026-07-01');

const base = {
  sexe: 'home', edat: 40, alcada: 178, pes: 75, feina: 'sedentaria',
  activitats: [], objectiu: 'salut', dieta: 'omnivora', peixBlau: 2, lactis: 2,
  fruitsSecs: 'sovint', sol: 'molt', son: 8, estres: 'baix', suor: false, condicions: [],
};
const sup = (r, id) => r.suplements.find((s) => s.id === id);
const natacio = [{ esport: 'natacio', dies: 4, minuts: 60, intensitat: 'moderada' }];

// ---------- Compatibilitat i casos bàsics ----------

test('perfil v1 (sense mode) segueix funcionant i ben alimentat no necessita res', () => {
  const r = calcular(base, ESTIU);
  assert.equal(r.resum.proteina.gMin, 60);
  assert.deepEqual(r.suplements.filter((s) => s.prioritat !== 'no').map((s) => s.id), []);
  assert.equal(r.precisio.nivell, 'baixa');
});

test('nedador de 40 anys (mode ràpid): magnesi segons el dèficit de la dieta', () => {
  const r = calcular({ ...base, sol: 'moderat', fruitsSecs: 'poc', peixBlau: 1, activitats: natacio }, HIVERN);
  assert.deepEqual([r.resum.proteina.gMin, r.resum.proteina.gMax], [90, 120]);
  const mg = sup(r, 'magnesi');
  assert.equal(mg.prioritat, 'recomanat');
  assert.match(mg.dosi, /^1[05]0 mg/);
  assert.equal(sup(r, 'vitd').prioritat, 'recomanat');
  assert.ok(mg.fitxa.moment.includes('dormir'));
});

test('força + objectiu múscul: proteïna 1,6–2,2 g/kg, creatina i batut', () => {
  const r = calcular({ ...base, objectiu: 'muscul', activitats: [{ esport: 'forca', dies: 4, minuts: 60, intensitat: 'alta' }] }, ESTIU);
  assert.equal(r.resum.proteina.gkgMin, 1.6);
  assert.equal(r.resum.proteina.gkgMax, 2.2);
  assert.equal(sup(r, 'creatina').prioritat, 'recomanat');
  assert.equal(sup(r, 'proteina').prioritat, 'considerar');
});

test("vegana: B12 obligatòria, omega-3 d'algues i proteïna vegetal", () => {
  const r = calcular({ ...base, sexe: 'dona', dieta: 'vegana', objectiu: 'muscul', activitats: [{ esport: 'forca', dies: 3, minuts: 60 }] }, ESTIU);
  assert.equal(sup(r, 'b12').prioritat, 'recomanat');
  assert.equal(sup(r, 'omega3').prioritat, 'recomanat');
  assert.match(sup(r, 'omega3').fitxa.forma, /algues/);
  assert.equal(sup(r, 'ferro').prioritat, 'analitica');
});

test('malaltia renal: res de creatina, magnesi ni batuts sense metge', () => {
  const r = calcular({ ...base, condicions: ['renal'], fruitsSecs: 'poc', suor: true, activitats: [{ esport: 'forca', dies: 4, minuts: 60, intensitat: 'alta' }] }, ESTIU);
  assert.equal(sup(r, 'creatina').prioritat, 'consulta');
  assert.equal(sup(r, 'magnesi').prioritat, 'consulta');
  assert.equal(sup(r, 'proteina').prioritat, 'no');
  assert.equal(r.resum.proteina.gkgMax, 0.8);
});

test('embaràs: tot el que es recomana passa a consulta', () => {
  const r = calcular({ ...base, sexe: 'dona', sol: 'poc', condicions: ['embaras'] }, ESTIU);
  assert.ok(r.suplements.every((s) => ['consulta', 'no'].includes(s.prioritat)));
});

test('sessions llargues de resistència: electròlits', () => {
  const r = calcular({ ...base, activitats: [{ esport: 'ciclisme', dies: 2, minuts: 180 }] }, ESTIU);
  assert.equal(sup(r, 'electrolits').prioritat, 'recomanat');
});

test("menors d'edat i dades invàlides: bloquejat", () => {
  assert.ok(calcular({ ...base, edat: 16 }).bloquejat);
  assert.ok(calcular({ ...base, pes: 0 }).bloquejat);
});

test('magnesi suplementat mai per sobre de 350 mg', () => {
  const r = calcular({
    ...base, mode: 'detallat', edat: 60, suor: true, estres: 'alt',
    ffq: { ...ffqPerDefecte(), fruitsSecs: 0, llegums: 0, cerealsTipus: 'refinats', cereals: 1, verdura: 0, fruita: 0, fullaVerda: 0, llet: 0 },
    activitats: [{ esport: 'correr', dies: 5, minuts: 60, intensitat: 'alta' }],
  }, ESTIU);
  assert.equal(sup(r, 'magnesi').dosi, '350 mg/dia de magnesi elemental');
});

// ---------- Fase 2: dieta detallada ----------

test('estimació d\'ingesta: més peix blau = més omega-3 i vitamina D', () => {
  const poc = estimarIngesta({ ...ffqPerDefecte(), peixBlau: 0 });
  const molt = estimarIngesta({ ...ffqPerDefecte(), peixBlau: 3 });
  assert.ok(molt.epadha > 500 && poc.epadha < 250);
  assert.ok(molt.vitd > poc.vitd);
});

test('mode detallat: molts fruits secs i integrals → no cal magnesi', () => {
  const r = calcular({
    ...base, mode: 'detallat', activitats: natacio,
    ffq: { ...ffqPerDefecte(), fruitsSecs: 7, llegums: 4, cerealsTipus: 'integrals', fullaVerda: 3 },
  }, ESTIU);
  assert.equal(sup(r, 'magnesi').prioritat, 'no');
  assert.equal(r.dieta.fiable, true);
  assert.equal(r.precisio.nivell, 'mitjana');
});

test('mode detallat: pocs làctics → calci', () => {
  const r = calcular({
    ...base, sexe: 'dona', edat: 55, estatHormonal: 'menopausa', mode: 'detallat',
    ffq: { ...ffqPerDefecte(), llet: 0, iogurt: 0, formatge: 0 },
  }, ESTIU);
  const ca = sup(r, 'calci');
  assert.equal(ca.prioritat, 'recomanat');
  assert.match(ca.dosi, /500 mg/);
});

test('el batut només surt si la dieta no arriba a la proteïna', () => {
  const ffqRica = { ...ffqPerDefecte(), carnBlanca: 7, ous: 14, llet: 2, iogurt: 2 };
  const r = calcular({ ...base, mode: 'detallat', ffq: ffqRica, objectiu: 'muscul', activitats: [{ esport: 'forca', dies: 4, minuts: 60 }] }, ESTIU);
  assert.equal(sup(r, 'proteina').prioritat, 'no');
});

test('intolerància a la lactosa: proteïna sense lactosa', () => {
  const r = calcular({ ...base, restriccions: ['lactosa'], objectiu: 'muscul', activitats: [{ esport: 'forca', dies: 4, minuts: 60 }] }, ESTIU);
  assert.match(sup(r, 'proteina').fitxa.forma, /Aïllat|vegetal/);
});

// ---------- Fase 3: analítica, medicació i perfil ----------

test('analítica de vitamina D', () => {
  assert.match(sup(calcular({ ...base, analitica: { vitd: 15 } }, ESTIU), 'vitd').dosi, /2\.000–4\.000/);
  assert.equal(sup(calcular({ ...base, analitica: { vitd: 45 } }, ESTIU), 'vitd').prioritat, 'no');
  assert.equal(sup(calcular({ ...base, analitica: { vitd: 8 } }, ESTIU), 'vitd').prioritat, 'consulta');
  const alta = calcular({ ...base, analitica: { vitd: 120 } }, ESTIU);
  assert.ok(alta.avisos.some((a) => a.nivell === 'alerta'));
  assert.equal(alta.precisio.nivell, 'mitjana');
});

test('ferritina baixa → consulta; correcta → no', () => {
  const dona = { ...base, sexe: 'dona', estatHormonal: 'abundant' };
  assert.equal(sup(calcular({ ...dona, analitica: { ferritina: 18 } }, ESTIU), 'ferro').prioritat, 'consulta');
  assert.equal(sup(calcular({ ...dona, analitica: { ferritina: 80 } }, ESTIU), 'ferro').prioritat, 'no');
  assert.equal(sup(calcular(dona, ESTIU), 'ferro').prioritat, 'analitica');
});

test('metformina o omeprazol → revisar B12', () => {
  assert.equal(sup(calcular({ ...base, condicions: ['metformina'] }, ESTIU), 'b12').prioritat, 'analitica');
});

test('% de greix alt → proteïna sobre massa magra', () => {
  const r = calcular({ ...base, pes: 100, greix: 35 }, ESTIU);
  assert.ok(r.resum.pesRef < 80);
});

test('levotiroxina: minerals separats 4 h', () => {
  const r = calcular({ ...base, condicions: ['tiroide'], sol: 'poc', fruitsSecs: 'poc', estres: 'alt' }, ESTIU);
  assert.ok(sup(r, 'magnesi').fitxa.separar.some((t) => t.includes('levotiroxina')));
});

test('ja el prens: avís a la fitxa', () => {
  const r = calcular({ ...base, suplementsActuals: ['creatina'] }, ESTIU);
  assert.equal(sup(r, 'creatina').jaPren, true);
  assert.match(sup(r, 'creatina').notes[0], /probablement no cal/);
});

// ---------- Fase 1: horari ----------

test('horari: magnesi abans de dormir, vitamina D al dinar, proteïna després d\'entrenar', () => {
  const p = { ...base, sol: 'poc', fruitsSecs: 'poc', estres: 'alt', objectiu: 'muscul',
    activitats: [{ esport: 'forca', dies: 4, minuts: 60 }],
    horaris: { esmorzar: '07:30', dinar: '14:00', sopar: '21:00', dormir: '23:30', entreno: '19:00' } };
  const r = calcular(p, ESTIU);
  const hor = construirHorari(p, r);
  assert.ok(hor.entreno && hor.descans);
  const buscar = (dia, id) => dia.find((e) => e.items.some((i) => i.id === id));
  assert.equal(buscar(hor.entreno, 'magnesi').hora, '22:45');
  assert.equal(buscar(hor.entreno, 'vitd').titol, 'Dinar');
  assert.equal(buscar(hor.entreno, 'creatina').titol, 'Sopar');
  assert.equal(buscar(hor.descans, 'creatina').titol, 'Esmorzar');
  assert.equal(hor.entreno.at(-1).titol, 'Dormir');
});

test('horari amb levotiroxina: el ferro va a mitja tarda', () => {
  const p = { ...base, sexe: 'dona', condicions: ['tiroide'], analitica: { ferritina: 40 }, estatHormonal: 'regular',
    activitats: [{ esport: 'correr', dies: 4, minuts: 60 }] };
  const r = calcular(p, ESTIU);
  // Forcem el ferro com a recomanat per comprovar-ne la col·locació
  sup(r, 'ferro').prioritat = 'recomanat';
  const hor = construirHorari(p, r);
  const fe = hor.descans.find((e) => e.items.some((i) => i.id === 'ferro'));
  assert.equal(fe.titol, 'Mitja tarda');
  assert.ok(hor.descans.some((e) => e.items.some((i) => i.text.includes('Levotiroxina'))));
});
