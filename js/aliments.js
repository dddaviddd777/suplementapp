/**
 * Qüestionari de freqüència d'aliments i estimació de la ingesta diària.
 *
 * Valors aproximats per ració, arrodonits a partir de BEDCA (Base de Datos Española
 * de Composición de Alimentos) i USDA FoodData Central. Són estimacions de grup:
 * serveixen per detectar si un nutrient queda clarament curt, no per comptar al mil·ligram.
 *
 * Unitats: prot (g), ca (mg), mg (mg), fe (mg), b12 (µg), vitd (µg), epadha (mg)
 */

export const NUTRIENTS = {
  prot: { nom: 'Proteïna', unitat: 'g' },
  ca: { nom: 'Calci', unitat: 'mg' },
  mg: { nom: 'Magnesi', unitat: 'mg' },
  fe: { nom: 'Ferro', unitat: 'mg' },
  b12: { nom: 'Vitamina B12', unitat: 'µg' },
  epadha: { nom: 'Omega-3 (EPA+DHA)', unitat: 'mg' },
  vitd: { nom: 'Vitamina D (dieta)', unitat: 'µg' },
};

export const OPCIONS_FREQ = {
  setmana: [0, 1, 2, 3, 4, 5, 6, 7, 10, 14],
  dia: [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6],
};

const NO_CARN = ['vegetariana', 'vegana'];

export const ALIMENTS = {
  carnBlanca: { nom: 'Carn blanca', detall: 'pollastre, gall dindi, conill · ració ≈ 125 g', freq: 'setmana', def: 3, excl: NO_CARN, n: { prot: 30, ca: 15, mg: 35, fe: 1, b12: 0.4, vitd: 0.1, epadha: 30 } },
  carnVermella: { nom: 'Carn vermella i embotits', detall: 'vedella, porc, xai · ració ≈ 125 g', freq: 'setmana', def: 2, excl: NO_CARN, n: { prot: 26, ca: 15, mg: 28, fe: 2.5, b12: 2, vitd: 0.2, epadha: 20 } },
  peixBlanc: { nom: 'Peix blanc', detall: 'lluç, bacallà, rap · ració ≈ 150 g', freq: 'setmana', def: 1, excl: NO_CARN, n: { prot: 27, ca: 40, mg: 45, fe: 0.5, b12: 1.5, vitd: 1.5, epadha: 300 } },
  peixBlau: { nom: 'Peix blau', detall: 'sardina, salmó, verat, seitó, tonyina · ració ≈ 125 g', freq: 'setmana', def: 1, excl: NO_CARN, n: { prot: 25, ca: 60, mg: 35, fe: 1.2, b12: 6, vitd: 10, epadha: 1800 } },
  marisc: { nom: 'Marisc', detall: 'musclos, gambes, calamars · ració ≈ 100 g', freq: 'setmana', def: 0, excl: NO_CARN, n: { prot: 20, ca: 60, mg: 40, fe: 3, b12: 10, vitd: 0, epadha: 400 } },
  ous: { nom: 'Ous', detall: 'unitats per setmana', freq: 'setmana', def: 4, excl: ['vegana'], n: { prot: 6.5, ca: 28, mg: 6, fe: 1, b12: 0.5, vitd: 1.1, epadha: 30 } },
  llet: { nom: 'Llet', detall: '1 got = 250 ml', freq: 'dia', def: 1, excl: ['vegana'], n: { prot: 8, ca: 300, mg: 27, fe: 0.1, b12: 1.1, vitd: 0.1 } },
  iogurt: { nom: 'Iogurt o quefir', detall: '1 unitat = 125 g', freq: 'dia', def: 0.5, excl: ['vegana'], n: { prot: 5, ca: 180, mg: 15, fe: 0.1, b12: 0.5 } },
  formatge: { nom: 'Formatge', detall: '1 ració = 40 g curat o 80 g fresc', freq: 'dia', def: 0.5, excl: ['vegana'], n: { prot: 9, ca: 250, mg: 12, fe: 0.2, b12: 0.6, vitd: 0.1 } },
  begudaVegetal: { nom: 'Beguda vegetal', detall: 'soja, civada, ametlla · 1 got = 250 ml', freq: 'dia', def: 0, n: { prot: 4, ca: 30, mg: 30, fe: 0.8 } },
  llegums: { nom: 'Llegums', detall: 'llenties, cigrons, mongetes · 1 plat', freq: 'setmana', def: 2, n: { prot: 17, ca: 80, mg: 80, fe: 5 } },
  soja: { nom: 'Tofu, tempeh o soja texturitzada', detall: 'ració ≈ 125 g', freq: 'setmana', def: 0, n: { prot: 18, ca: 200, mg: 70, fe: 3 } },
  seitan: { nom: 'Seitan', detall: 'ració ≈ 100 g', freq: 'setmana', def: 0, n: { prot: 22, ca: 30, mg: 25, fe: 2 } },
  fruitsSecs: { nom: 'Fruits secs i llavors', detall: '1 grapat = 30 g', freq: 'setmana', def: 2, n: { prot: 6, ca: 50, mg: 75, fe: 1 } },
  cereals: { nom: 'Pa, pasta, arròs o cereals', detall: '1 ració = 60 g de pa o 80 g en sec', freq: 'dia', def: 3, n: {} },
  fruita: { nom: 'Fruita', detall: '1 peça', freq: 'dia', def: 2, n: { prot: 0.8, ca: 15, mg: 15, fe: 0.3 } },
  verdura: { nom: 'Verdura i amanides', detall: '1 plat o amanida', freq: 'dia', def: 1, n: { prot: 3, ca: 60, mg: 35, fe: 1.2 } },
  fullaVerda: { nom: 'Verdura de fulla verda', detall: 'espinacs, bledes, kale, bròquil · 1 plat', freq: 'setmana', def: 1, n: { prot: 5, ca: 150, mg: 110, fe: 4 } },
  cafe: { nom: 'Cafè', detall: 'tasses al dia', freq: 'dia', def: 1, n: { mg: 7 }, cafeina: 80 },
  te: { nom: 'Te', detall: 'tasses al dia', freq: 'dia', def: 0, n: { mg: 5 }, cafeina: 40 },
  alcohol: { nom: 'Alcohol', detall: 'cervesa, vi, combinats · begudes per setmana', freq: 'setmana', def: 2, n: {} },
};

export const GRUPS_FFQ = [
  { titol: 'Carn, peix i ous', items: ['carnBlanca', 'carnVermella', 'peixBlanc', 'peixBlau', 'marisc', 'ous'] },
  { titol: 'Làctics i begudes vegetals', items: ['llet', 'iogurt', 'formatge', 'begudaVegetal'] },
  { titol: 'Proteïna vegetal', items: ['llegums', 'soja', 'seitan', 'fruitsSecs'] },
  { titol: 'Cereals, fruita i verdura', items: ['cereals', 'fruita', 'verdura', 'fullaVerda'] },
  { titol: 'Begudes', items: ['cafe', 'te', 'alcohol'] },
];

const CEREALS = {
  integrals: { prot: 9, ca: 30, mg: 100, fe: 2.2 },
  mixt: { prot: 8, ca: 25, mg: 60, fe: 1.6 },
  refinats: { prot: 7, ca: 20, mg: 25, fe: 1.1 },
};
const ENRIQUIDA = { ca: 270, b12: 0.95, vitd: 1.9 }; // extra per got de beguda enriquida
const BASE = { prot: 5, ca: 100, mg: 50, fe: 1 }; // aigua, oli, patates, salses, espècies…

export function exclosPer(dieta, id) {
  return (ALIMENTS[id]?.excl || []).includes(dieta);
}

/** Valors per defecte del qüestionari segons el tipus de dieta. */
export function ffqPerDefecte(dieta = 'omnivora') {
  const f = { cerealsTipus: 'mixt', begudaEnriquida: dieta === 'vegana' };
  for (const [id, a] of Object.entries(ALIMENTS)) f[id] = exclosPer(dieta, id) ? 0 : a.def;
  if (dieta === 'vegetariana') Object.assign(f, { ous: 5, llegums: 4, soja: 1 });
  if (dieta === 'vegana') Object.assign(f, { llegums: 5, soja: 3, begudaVegetal: 1.5, fruitsSecs: 5 });
  return f;
}

/** Converteix les 3 preguntes del mode ràpid en un qüestionari aproximat. */
export function ffqDesDeRapid(p) {
  const f = ffqPerDefecte(p.dieta);
  const omni = !p.dieta || p.dieta === 'omnivora';
  if (omni) f.peixBlau = Number(p.peixBlau) || 0;

  const lactis = Number(p.lactis) || 2; // 1 = "0–1", 2, 3 = "3 o més"
  if (p.dieta === 'vegana') {
    f.begudaVegetal = lactis === 1 ? 0.5 : lactis;
    f.begudaEnriquida = true;
  } else {
    const rep = { 1: [0.5, 0, 0], 2: [1, 0.5, 0.5], 3: [1.5, 1, 0.5] }[lactis] || [1, 0.5, 0.5];
    [f.llet, f.iogurt, f.formatge] = rep;
  }

  if (p.fruitsSecs === 'poc') {
    f.fruitsSecs = 1; f.llegums = Math.min(f.llegums, 1); f.cerealsTipus = 'refinats';
  } else if (p.fruitsSecs === 'sovint') {
    f.fruitsSecs = Math.max(f.fruitsSecs, 5); f.llegums = Math.max(f.llegums, 3);
  }
  return f;
}

/** Qüestionari que s'ha de fer servir per a aquest perfil. */
export function ffqEfectiu(p) {
  if (p.mode === 'detallat' && p.ffq) {
    const f = { ...ffqPerDefecte(p.dieta), ...p.ffq };
    for (const id of Object.keys(ALIMENTS)) if (exclosPer(p.dieta, id)) f[id] = 0;
    return f;
  }
  return ffqDesDeRapid(p);
}

/** Ingesta diària estimada de cada nutrient. */
export function estimarIngesta(ffq) {
  const t = { prot: BASE.prot, ca: BASE.ca, mg: BASE.mg, fe: BASE.fe, b12: 0, vitd: 0, epadha: 0, cafeina: 0, alcoholSetmana: 0 };
  for (const [id, a] of Object.entries(ALIMENTS)) {
    const q = Number(ffq[id]) || 0;
    if (!q) continue;
    const perDia = a.freq === 'setmana' ? q / 7 : q;
    const n = id === 'cereals' ? CEREALS[ffq.cerealsTipus] || CEREALS.mixt : a.n;
    for (const [k, v] of Object.entries(n)) t[k] += v * perDia;
    if (id === 'begudaVegetal' && ffq.begudaEnriquida) {
      for (const [k, v] of Object.entries(ENRIQUIDA)) t[k] += v * perDia;
    }
    if (a.cafeina) t.cafeina += a.cafeina * perDia;
    if (id === 'alcohol') t.alcoholSetmana = q;
  }
  return t;
}
