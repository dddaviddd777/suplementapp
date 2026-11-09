/**
 * Motor de regles de SuplementAPP (v2).
 *
 * Funció pura: rep el perfil i retorna recomanacions. No toca el DOM,
 * així es pot provar amb `node --test`.
 *
 * Idea central: necessitat − el que aporta la dieta = el que cal suplementar.
 * Si hi ha valors d'analítica, tenen prioritat sobre les estimacions.
 *
 * Fonts de les xifres (orientatives):
 *  - Proteïna: ISSN Position Stand (2017), ACSM/AND/DC (2016), PROT-AGE (2013)
 *  - Magnesi, calci, ferro, vitamina D: NIH Office of Dietary Supplements (RDA i límits màxims)
 *  - B12: EFSA (4 µg/dia) i Academy of Nutrition and Dietetics (2016)
 *  - Creatina: ISSN Position Stand (2017, 2021)
 *  - Omega-3: EFSA (250 mg/dia d'EPA+DHA)
 *  - Hidratació i electròlits: ACSM (2007, 2016)
 *  - Cafeïna: ISSN Position Stand (2021)
 *  - Composició d'aliments: BEDCA / USDA (vegeu aliments.js)
 */
import { estimarIngesta, ffqEfectiu, NUTRIENTS } from './aliments.js';
import { fitxaPer } from './fitxes.js';

export const ESPORTS = {
  forca: { nom: 'Força / gimnàs', tipus: 'forca', met: 5 },
  correr: { nom: 'Córrer', tipus: 'resistencia', met: 9 },
  ciclisme: { nom: 'Ciclisme', tipus: 'resistencia', met: 7.5 },
  natacio: { nom: 'Natació', tipus: 'resistencia', met: 7 },
  senderisme: { nom: 'Senderisme / muntanya', tipus: 'resistencia', met: 6 },
  equip: { nom: "Esports d'equip o de raqueta", tipus: 'mixt', met: 7 },
  hiit: { nom: 'HIIT / crossfit', tipus: 'mixt', met: 8 },
  ioga: { nom: 'Ioga / pilates', tipus: 'suau', met: 3 },
  caminar: { nom: 'Caminar (vida quotidiana)', tipus: 'suau', met: 3.5 },
};

export const INTENSITATS = {
  baixa: { nom: 'Suau', factor: 0.75 },
  moderada: { nom: 'Moderada', factor: 1 },
  alta: { nom: 'Intensa', factor: 1.25 },
};

export const CONDICIONS = {
  renal: 'Malaltia renal',
  embaras: 'Embaràs',
  lactancia: 'Lactància',
  hipertensio: 'Hipertensió',
  cardiac: 'Problemes de cor o arítmies',
};

export const MEDICAMENTS = {
  anticoagulants: 'Anticoagulants o antiagregants (Sintrom, aspirina diària…)',
  diuretics: 'Diürètics',
  tiroide: 'Levotiroxina (tiroide)',
  ibp: "Protector d'estómac (omeprazol, pantoprazol…)",
  metformina: 'Metformina (diabetis)',
  anticonceptius: 'Anticonceptius hormonals',
  bisfosfonats: "Bisfosfonats per a l'osteoporosi (alendronat…)",
  altres: 'Altres medicaments de manera habitual',
};

export const RESTRICCIONS = {
  lactosa: 'Intolerància a la lactosa',
  celiaquia: 'Celiaquia',
  fruitsSecs: 'Al·lèrgia als fruits secs',
  peix: 'Al·lèrgia al peix o al marisc',
};

export const SUPLEMENTS_ACTUALS = {
  proteina: 'Proteïna en pols',
  creatina: 'Creatina',
  magnesi: 'Magnesi',
  vitd: 'Vitamina D',
  omega3: 'Omega-3',
  b12: 'Vitamina B12',
  ferro: 'Ferro',
  calci: 'Calci',
  multivitaminic: 'Multivitamínic',
};

export const NIVELLS = {
  sedentari: 'Sedentari',
  lleu: 'Activitat lleugera',
  moderat: 'Activitat moderada',
  alt: 'Activitat alta',
};

export const OBJECTIUS = {
  salut: 'Salut general',
  muscul: 'Guanyar múscul',
  greix: 'Perdre greix',
  rendiment: 'Rendiment esportiu',
};

export const PRIORITATS = ['recomanat', 'considerar', 'analitica', 'consulta', 'no'];

const arrod = (x, pas = 1) => Math.round(x / pas) * pas;
const fmt = (n, d = 1) => Number(n).toLocaleString('ca-ES', { maximumFractionDigits: d });
const limita = (x, mn, mx) => Math.min(Math.max(x, mn), mx);
const numOpc = (v) => {
  const n = Number(v);
  return v === '' || v === null || v === undefined || !Number.isFinite(n) || n <= 0 ? null : n;
};

export function validarPerfil(p) {
  const errors = [];
  if (!p || typeof p !== 'object') return ['Falten les dades del perfil.'];
  if (!['home', 'dona'].includes(p.sexe)) errors.push('Indica el sexe.');
  if (!(p.edat >= 10 && p.edat <= 110)) errors.push('Edat no vàlida.');
  if (!(p.alcada >= 120 && p.alcada <= 230)) errors.push('Alçada no vàlida (120–230 cm).');
  if (!(p.pes >= 30 && p.pes <= 250)) errors.push('Pes no vàlid (30–250 kg).');
  return errors;
}

export function resumActivitat(activitats = []) {
  const r = { hores: 0, forca: 0, resist: 0, mixt: 0, suau: 0, kcalPerKgSetmana: 0, minutsMax: 0, minutsMaxResist: 0 };
  for (const a of activitats) {
    const e = ESPORTS[a.esport];
    const dies = Number(a.dies) || 0;
    const minuts = Number(a.minuts) || 0;
    if (!e || dies <= 0 || minuts <= 0) continue;
    const hs = (dies * minuts) / 60;
    const factor = INTENSITATS[a.intensitat]?.factor ?? 1;
    r.hores += hs;
    if (e.tipus === 'forca') r.forca += hs;
    else if (e.tipus === 'resistencia') r.resist += hs;
    else if (e.tipus === 'mixt') r.mixt += hs;
    else r.suau += hs;
    r.kcalPerKgSetmana += Math.max(e.met * factor - 1, 0) * hs;
    if (e.tipus !== 'suau') {
      r.minutsMax = Math.max(r.minutsMax, minuts);
      if (e.tipus !== 'forca') r.minutsMaxResist = Math.max(r.minutsMaxResist, minuts);
    }
  }
  r.efectives = r.forca + r.resist + r.mixt + 0.3 * r.suau;
  r.nivell = r.efectives < 1.5 ? 'sedentari' : r.efectives < 3.5 ? 'lleu' : r.efectives < 7 ? 'moderat' : 'alt';
  return r;
}

function rdaMagnesi(sexe, edat, embaras) {
  if (embaras) return edat <= 30 ? 350 : 360;
  if (sexe === 'home') return edat <= 30 ? 400 : 420;
  return edat <= 30 ? 310 : 320;
}

function categoriaImc(imc) {
  if (imc < 18.5) return 'Pes baix';
  if (imc < 25) return 'Pes normal';
  if (imc < 30) return 'Sobrepès';
  return 'Obesitat';
}

const nouSuplement = (id, nom, extra = {}) => ({
  id, nom, prioritat: 'no', dosi: '', curt: '', motius: [], notes: [], evidencia: 'moderada', jaPren: false, fitxa: null, ...extra,
});

export function calcular(p, avui = new Date()) {
  const r = { bloquejat: null, avisos: [], suplements: [], consellsDieta: [], resum: null, dieta: null, precisio: null };

  const errors = validarPerfil(p);
  if (errors.length) { r.bloquejat = errors.join(' '); return r; }
  if (p.edat < 18) {
    r.bloquejat = "Aquesta app està pensada per a persones adultes (18 anys o més). En menors, la suplementació l'ha de valorar un pediatre o un dietista-nutricionista.";
    return r;
  }

  // ---------- Context ----------
  const c = new Set(p.condicions || []);
  const restriccions = new Set(p.restriccions || []);
  const actuals = new Set(p.suplementsActuals || []);
  const an = p.analitica || {};
  const embarasOLact = c.has('embaras') || c.has('lactancia');
  const renal = c.has('renal');
  const dieta = p.dieta || 'omnivora';
  const vega = dieta === 'vegana';
  const vegetal = vega || dieta === 'vegetariana';
  const dona = p.sexe === 'dona';
  const menopausa = dona && p.estatHormonal === 'menopausa';
  const menstrua = dona && !menopausa && p.estatHormonal !== 'cap' && p.edat <= 55;
  const son = Number(p.son) || 8;
  const hivern = [9, 10, 11, 0, 1, 2].includes(avui.getMonth());
  const detallat = p.mode === 'detallat';

  const h = p.alcada / 100;
  const imc = p.pes / (h * h);
  const act = resumActivitat(p.activitats);
  const ffq = ffqEfectiu(p);
  const ing = estimarIngesta(ffq);
  const ctxFitxa = { c, restriccions, ffq, dieta };

  // ---------- Energia (Mifflin-St Jeor + exercici) ----------
  const bmr = 10 * p.pes + 6.25 * p.alcada - 5 * p.edat + (p.sexe === 'home' ? 5 : -161);
  const factorFeina = { sedentaria: 1.25, activa: 1.4, fisica: 1.6 }[p.feina] ?? 1.25;
  const tdee = bmr * factorFeina + (act.kcalPerKgSetmana * p.pes) / 7;
  let kcalObjectiu = tdee;
  if (p.objectiu === 'greix') kcalObjectiu = tdee * 0.85;
  if (p.objectiu === 'muscul') kcalObjectiu = tdee * 1.1;

  // ---------- Pes de referència (per a la proteïna) ----------
  let pesRef = p.pes;
  let notaPes = null;
  const greix = numOpc(p.greix);
  if (greix && greix >= 3 && greix <= 60) {
    const ref = p.sexe === 'home' ? 0.15 : 0.25;
    if (greix / 100 > ref + 0.05) {
      pesRef = (p.pes * (1 - greix / 100)) / (1 - ref);
      notaPes = `Amb un ${fmt(greix)}% de greix, el càlcul es fa sobre la massa magra (pes de referència: ${fmt(arrod(pesRef, 0.5))} kg).`;
    }
  } else if (imc >= 30) {
    pesRef = 27 * h * h;
    notaPes = 'Amb un IMC de 30 o més, el càlcul es fa sobre un pes de referència ajustat, no sobre el pes total.';
  }

  // ---------- Proteïna ----------
  const RANGS = { sedentari: [0.8, 1.0], lleu: [1.0, 1.2], moderat: [1.2, 1.6], alt: [1.4, 1.8] };
  let [mn, mx] = RANGS[act.nivell];
  const motiusProt = [`${NIVELLS[act.nivell]}: unes ${fmt(act.efectives)} h/setmana d'exercici.`];
  const entrenaForca = act.forca + act.mixt >= 2;

  if (act.nivell !== 'sedentari' && (entrenaForca || p.objectiu === 'muscul')) {
    mn = Math.max(mn, 1.6); mx = Math.max(mx, 2.2);
    motiusProt.push('Entrenes força o busques guanyar múscul: cal més proteïna per construir-lo i recuperar-te.');
  }
  if (p.objectiu === 'muscul' && act.nivell === 'sedentari') {
    mn = Math.max(mn, 1.2); mx = Math.max(mx, 1.6);
    motiusProt.push("Per guanyar múscul cal sobretot entrenament de força: la proteïna sola no n'hi ha prou.");
  }
  if (p.objectiu === 'greix') {
    if (act.nivell === 'sedentari') { mn = Math.max(mn, 1.2); mx = Math.max(mx, 1.6); } else { mn = Math.max(mn, 1.8); mx = Math.max(mx, 2.2); }
    motiusProt.push('Quan menges menys calories, més proteïna ajuda a conservar el múscul i a tenir menys gana.');
  }
  if (p.edat >= 65) {
    mn = Math.max(mn, 1.2); mx = Math.max(mx, 1.5);
    motiusProt.push("A partir dels 65 anys el múscul respon pitjor a la proteïna i se'n necessita més.");
  } else if (p.edat >= 50 || menopausa) {
    mn = Math.max(mn, 1.0); mx = Math.max(mx, 1.2);
    motiusProt.push(menopausa
      ? 'Després de la menopausa es perd múscul més de pressa: convé un mínim d\'1 g/kg.'
      : "A partir dels 50 anys convé un mínim d'1 g/kg per frenar la pèrdua de múscul.");
  }
  if (vega) { mn *= 1.1; mx *= 1.1; motiusProt.push("La proteïna vegetal s'absorbeix una mica pitjor: s'hi suma un 10%."); }
  if (notaPes) motiusProt.push(notaPes);
  if (renal) {
    mn = 0.8; mx = 0.8;
    motiusProt.push("Amb malaltia renal la proteïna sovint s'ha de limitar: la quantitat l'ha de fixar el nefròleg.");
  }
  mn = arrod(mn, 0.1); mx = arrod(mx, 0.1);
  const proteina = {
    gkgMin: mn, gkgMax: mx,
    gMin: arrod(mn * pesRef, 5), gMax: arrod(mx * pesRef, 5),
    perApatMin: limita(arrod(0.3 * pesRef, 5), 20, 40),
    perApatMax: limita(arrod(0.4 * pesRef, 5), 25, 50),
    motius: motiusProt,
  };

  // ---------- Necessitats de micronutrients ----------
  let necMg = rdaMagnesi(p.sexe, p.edat, embarasOLact);
  if (act.efectives >= 4 || p.suor) necMg = arrod(necMg * 1.1, 10);
  const necCa = (dona && (p.edat > 50 || menopausa)) || p.edat > 70 ? 1200 : 1000;
  let necFe = menstrua ? 18 : 8;
  if (c.has('embaras')) necFe = 27;
  if (vegetal) necFe *= 1.8;
  if (act.resist + act.mixt >= 5) necFe *= 1.3;
  necFe = arrod(necFe, 1);
  const nec = { prot: proteina.gMin, ca: necCa, mg: necMg, fe: necFe, b12: 4, epadha: 250, vitd: p.edat > 70 ? 20 : 15 };

  r.dieta = {
    fiable: detallat,
    items: Object.keys(NUTRIENTS).map((k) => ({
      id: k, nom: NUTRIENTS[k].nom, unitat: NUTRIENTS[k].unitat,
      ingesta: ing[k], necessitat: nec[k], pct: Math.round((ing[k] / nec[k]) * 100),
    })),
    cafeina: arrod(ing.cafeina, 10),
  };

  r.resum = {
    imc: arrod(imc, 0.1), imcCategoria: categoriaImc(imc),
    bmr: arrod(bmr, 10), tdee: arrod(tdee, 50), kcalObjectiu: arrod(kcalObjectiu, 50),
    activitat: act, nivell: NIVELLS[act.nivell],
    proteina, aiguaL: arrod(0.035 * p.pes * 0.8, 0.1), pesRef: arrod(pesRef, 0.5),
  };

  // ---------- Avisos ----------
  const avis = (nivell, text) => r.avisos.push({ nivell, text });
  if (embarasOLact) avis('alerta', "Durant l'embaràs o la lactància, la suplementació (àcid fòlic, iode, ferro, DHA…) l'ha de pautar el teu metge o llevadora. Aquí només es mostra com a informació.");
  if (renal) avis('alerta', 'Tens malaltia renal: la proteïna, el magnesi, el calci, la creatina i el potassi els ha de valorar el teu nefròleg abans de prendre res.');
  if (c.has('altres')) avis('info', 'Prens altres medicaments: abans de començar un suplement, comenta-ho amb el farmacèutic per descartar interaccions.');
  if (actuals.has('multivitaminic')) avis('info', 'Prens un multivitamínic: mira quanta vitamina D, B12, magnesi i ferro porta i descompta-ho de les dosis d\'aquí.');
  if (imc < 18.5 && p.objectiu === 'greix') avis('alerta', 'El teu IMC indica pes baix: no és recomanable perdre més pes. Consulta un professional.');
  const cintura = numOpc(p.cintura);
  if (cintura && cintura / p.alcada > 0.5) {
    avis('info', `La teva cintura és el ${fmt((cintura / p.alcada) * 100, 0)}% de l'alçada. Per sobre del 50% indica greix abdominal elevat: l'exercici i la dieta hi tenen més impacte que qualsevol suplement.`);
  }
  if (ing.alcoholSetmana > 14) avis('info', "Prens més de 14 begudes alcohòliques per setmana: l'alcohol augmenta la pèrdua de magnesi i vitamines del grup B i empitjora la recuperació.");
  const hb = numOpc(an.hemoglobina);
  const anemia = hb && hb < (p.sexe === 'home' ? 13 : 12);
  if (anemia) avis('alerta', `Hemoglobina de ${fmt(hb)} g/dl: indica anèmia. Consulta el metge abans de prendre cap suplement de ferro.`);
  const vd = numOpc(an.vitd);
  if (vd && vd > 100) avis('alerta', `Vitamina D de ${fmt(vd)} ng/ml: és massa alta. Deixa el suplement i comenta-ho amb el metge.`);

  // ---------- Suplements ----------
  const S = [];

  // Proteïna en pols
  {
    const s = nouSuplement('proteina', 'Proteïna en pols', { evidencia: 'alta' });
    const falta = arrod(proteina.gMin - ing.prot, 5);
    if (renal) {
      s.motius.push('Amb malaltia renal no es recomana sense control mèdic.');
    } else if (falta > 0) {
      s.prioritat = 'considerar';
      s.dosi = falta <= 30
        ? '1 batut de 20–30 g, els dies que no arribis al teu objectiu amb el menjar'
        : '1–2 batuts de 25–30 g, o afegir més proteïna als àpats';
      s.curt = '20–30 g';
      s.motius.push(`La teva dieta n'aporta uns ${fmt(arrod(ing.prot, 5), 0)} g i el teu objectiu és ${proteina.gMin}–${proteina.gMax} g: et falten uns ${falta} g.`);
      s.notes.push('Abans del batut, prova d\'afegir proteïna als àpats (ous, làctics, llegums, carn o peix).');
    } else {
      s.motius.push(`Ja hi arribes amb el menjar (uns ${fmt(arrod(ing.prot, 5), 0)} g/dia).`);
    }
    S.push(s);
  }

  // Magnesi
  {
    const s = nouSuplement('magnesi', 'Magnesi', { evidencia: 'moderada' });
    const gap = necMg - ing.mg;
    const factors = [];
    if (p.estres === 'alt' || son < 6) factors.push("Tens estrès alt o dorms poc: augmenta'n la pèrdua i el magnesi pot ajudar al descans.");
    if (ing.alcoholSetmana >= 7) factors.push("L'alcohol augmenta la pèrdua de magnesi per l'orina.");
    if (c.has('diuretics')) factors.push('Alguns diürètics augmenten la pèrdua de magnesi.');
    if (c.has('ibp')) factors.push("Els protectors d'estómac presos durant temps redueixen l'absorció de magnesi.");
    if (p.edat >= 50) factors.push("A partir dels 50 anys l'absorció de magnesi tendeix a baixar.");

    s.motius.push(`La teva dieta n'aporta uns ${fmt(arrod(ing.mg, 10), 0)} mg i en necessites uns ${necMg} mg${necMg > rdaMagnesi(p.sexe, p.edat, embarasOLact) ? ' (una mica més pel volum d\'exercici o la suor)' : ''}.`);
    if (renal) {
      s.prioritat = 'consulta';
      s.dosi = 'Només amb indicació mèdica';
      s.motius.push('Amb malaltia renal el magnesi es pot acumular a la sang.');
    } else if (gap > 30 || (factors.length >= 2 && gap > -30)) {
      const dosi = limita(arrod(Math.max(gap, 100), 50), 100, 350);
      s.prioritat = gap >= 100 || factors.length >= 2 ? 'recomanat' : 'considerar';
      s.dosi = `${dosi} mg/dia de magnesi elemental`;
      s.curt = `${dosi} mg`;
      s.motius.push(...factors);
      s.notes.push('No superis 350 mg/dia en suplements: pot provocar diarrea.');
      s.notes.push("Mira el \"magnesi elemental\" a l'etiqueta, no el pes total del compost.");
      if (c.has('diuretics')) s.notes.push('Prens diürètics: comenta-ho amb el metge abans de començar.');
    } else {
      s.motius.push('La teva dieta ja en cobreix la necessitat.');
    }
    S.push(s);
  }

  // Vitamina D
  {
    const s = nouSuplement('vitd', 'Vitamina D', { evidencia: 'alta' });
    const gran = p.edat >= 65;
    let solNivell = { poc: 0, moderat: 1, molt: 2 }[p.sol] ?? 1;
    const motiusSol = [];
    if (p.fototip === 'fosc') { solNivell -= 1; motiusSol.push('La pell fosca necessita més temps de sol per fabricar vitamina D.'); }
    if (p.protector) { solNivell -= 1; motiusSol.push('El protector solar bloqueja gran part de la síntesi de vitamina D.'); }
    solNivell = Math.max(solNivell, 0);

    if (vd) {
      const interp = vd < 12 ? 'dèficit greu' : vd < 20 ? 'dèficit' : vd < 30 ? 'insuficient' : vd <= 60 ? 'correcte' : 'alt';
      s.motius.push(`La teva analítica: ${fmt(vd)} ng/ml (${interp}).`);
      if (vd < 12) {
        s.prioritat = 'consulta';
        s.dosi = 'Dèficit greu: el metge ha de pautar la dosi de correcció';
      } else if (vd < 20) {
        s.prioritat = 'recomanat';
        s.dosi = "2.000–4.000 UI/dia durant 8–12 setmanes; després, nova analítica i dosi de manteniment";
        s.curt = '2.000–4.000 UI';
      } else if (vd < 30) {
        s.prioritat = 'recomanat';
        s.dosi = '1.000–2.000 UI/dia (25–50 µg)';
        s.curt = '1.000–2.000 UI';
      } else if (vd <= 60) {
        if (solNivell === 0 || (hivern && solNivell === 1)) {
          s.prioritat = 'considerar';
          s.dosi = "1.000 UI/dia d'octubre a març per mantenir el nivell";
          s.curt = '1.000 UI';
        } else {
          s.motius.push('El nivell és bo: no cal suplementar-la ara.');
        }
      } else if (actuals.has('vitd')) {
        s.notes.push('Tens el nivell alt: redueix o deixa el suplement.');
      }
    } else {
      if (solNivell === 0) {
        s.prioritat = 'recomanat';
        s.dosi = '1.000–2.000 UI/dia (25–50 µg)';
        s.curt = '1.000–2.000 UI';
        s.motius.push(p.sol === 'poc' ? 'Prens poc el sol, i el sol és la font principal de vitamina D.' : 'Amb la teva exposició al sol en fabriques poca.');
      } else if (solNivell === 1) {
        s.prioritat = hivern || gran ? 'recomanat' : 'considerar';
        s.dosi = "1.000 UI/dia (25 µg), almenys d'octubre a març";
        s.curt = '1.000 UI';
        s.motius.push("D'octubre a març el sol és massa feble per fabricar-ne prou.");
      } else if (gran) {
        s.prioritat = 'considerar';
        s.dosi = '800–1.000 UI/dia (20–25 µg)';
        s.curt = '800–1.000 UI';
      } else {
        s.motius.push('Prens prou sol: en principi no cal suplementar-la.');
      }
      s.motius.push(...motiusSol);
      if (gran && s.prioritat !== 'no') s.motius.push('A partir dels 65 anys la pell en fabrica molt menys.');
      if (s.prioritat === 'recomanat' && ing.vitd >= 10 && solNivell >= 1) {
        s.prioritat = 'considerar';
        s.motius.push(`Menges força peix blau i ous (uns ${fmt(ing.vitd)} µg/dia): et cobreix bona part de la necessitat.`);
      }
      if (s.prioritat !== 'no') s.notes.push("L'ideal és fer-se una analítica de 25-OH-vitamina D per ajustar la dosi.");
      if (imc >= 30 && s.prioritat !== 'no') s.notes.push('Amb un IMC de 30 o més sovint calen dosis més altes: ajusta-ho amb una analítica.');
    }
    if (s.prioritat !== 'no' && s.prioritat !== 'consulta') s.notes.push('No superis 4.000 UI/dia sense control mèdic.');
    S.push(s);
  }

  // Calci
  {
    const s = nouSuplement('calci', 'Calci', { evidencia: 'moderada' });
    const gap = necCa - ing.ca;
    s.motius.push(`La teva dieta n'aporta uns ${fmt(arrod(ing.ca, 50), 0)} mg i en necessites uns ${fmt(necCa, 0)} mg.`);
    if (gap >= 300) {
      const dosi = Math.min(arrod(gap, 250), 500);
      s.prioritat = gap >= 500 && (menopausa || p.edat >= 50 || vega) ? 'recomanat' : 'considerar';
      s.dosi = `${dosi} mg/dia, només si no ho pots cobrir amb menjar`;
      s.curt = `${dosi} mg`;
      if (menopausa) s.motius.push('Després de la menopausa es perd massa òssia més de pressa.');
      s.notes.push('Primer intenta-ho amb aliments: és més segur que el suplement. No passis de 500 mg per presa.');
      if (renal) { s.prioritat = 'consulta'; s.dosi = 'Només amb indicació mèdica'; }
    } else {
      s.motius.push("La teva dieta en cobreix la necessitat o s'hi acosta prou.");
    }
    S.push(s);
  }

  // Creatina
  {
    const s = nouSuplement('creatina', 'Creatina', { evidencia: 'alta' });
    const forcaMixt = act.forca + act.mixt;
    if (forcaMixt >= 2) {
      s.prioritat = 'recomanat';
      s.motius.push(`Fas unes ${fmt(forcaMixt)} h/setmana de força o esports intensos: la creatina millora la força, la potència i la recuperació.`);
    } else if (['muscul', 'rendiment'].includes(p.objectiu) && act.efectives >= 2) {
      s.prioritat = forcaMixt > 0 ? 'recomanat' : 'considerar';
      s.motius.push(forcaMixt > 0
        ? 'El teu objectiu és guanyar múscul o rendiment: és el suplement amb més evidència per a això.'
        : 'En esports de resistència pura el benefici és menor, però ajuda en canvis de ritme, sprints i pujades.');
    }
    if ((p.edat >= 50 || menopausa) && act.efectives >= 1.5) {
      if (s.prioritat === 'no') s.prioritat = 'considerar';
      s.motius.push('A partir dels 50 anys o després de la menopausa, combinada amb exercici, ajuda a conservar múscul i força.');
    }
    if (vegetal && s.prioritat !== 'no') s.motius.push('Les dietes vegetarianes aporten poca creatina: el benefici sol ser més gran.');

    if (renal) {
      s.prioritat = 'consulta';
      s.dosi = 'No recomanada sense control mèdic';
      s.motius.splice(0, s.motius.length, 'Amb malaltia renal no es recomana.');
    } else if (s.prioritat !== 'no') {
      s.dosi = '3–5 g/dia de creatina monohidrat';
      s.curt = '3–5 g';
      s.notes.push("Pot fer pujar 1–2 kg de pes per l'aigua que reté dins el múscul: és normal.");
    } else {
      s.motius.push("No fas prou entrenament de força o d'alta intensitat perquè en treguis un benefici clar.");
    }
    S.push(s);
  }

  // Omega-3
  {
    const s = nouSuplement('omega3', 'Omega-3 (EPA + DHA)', { evidencia: 'moderada' });
    const e = arrod(ing.epadha, 10);
    s.motius.push(`La teva dieta n'aporta uns ${fmt(e, 0)} mg/dia d'EPA + DHA (el mínim recomanat és 250 mg i l'ideal, uns 500 mg).`);
    if (e >= 500) {
      s.motius.push('Ja en tens prou amb el peix que menges.');
    } else {
      s.prioritat = e < 250 ? 'recomanat' : 'considerar';
      s.dosi = e < 250 ? "250–500 mg/dia d'EPA + DHA" : "250 mg/dia d'EPA + DHA";
      s.curt = e < 250 ? '250–500 mg' : '250 mg';
      if (c.has('anticoagulants')) {
        s.prioritat = 'consulta';
        s.notes.push("L'omega-3 pot potenciar l'efecte dels anticoagulants: consulta-ho amb el metge.");
      }
    }
    S.push(s);
  }

  // Vitamina B12
  {
    const s = nouSuplement('b12', 'Vitamina B12', { evidencia: 'alta' });
    const b12an = numOpc(an.b12);
    const medB12 = c.has('ibp') || c.has('metformina');
    const dosiMant = '50–100 µg/dia, o bé 2.000 µg un cop per setmana (cianocobalamina)';
    if (b12an) {
      s.motius.push(`La teva analítica: ${fmt(b12an, 0)} pg/ml.`);
      if (b12an < 200) {
        s.prioritat = 'recomanat';
        s.dosi = '1.000 µg/dia durant 1–2 mesos i després dosi de manteniment (comenta-ho amb el metge)';
        s.curt = '1.000 µg';
        s.motius.push('El nivell és baix.');
      } else if (b12an < 300) {
        s.prioritat = 'recomanat';
        s.dosi = dosiMant; s.curt = '50–100 µg';
        s.motius.push('El nivell és just: convé pujar-lo.');
      } else if (vega) {
        s.prioritat = 'recomanat';
        s.dosi = dosiMant; s.curt = '50–100 µg';
        s.motius.push('El nivell és bo, però com a vegà has de mantenir el suplement.');
      } else {
        s.motius.push('El nivell és correcte.');
      }
    } else if (vega) {
      s.prioritat = 'recomanat';
      s.dosi = dosiMant; s.curt = '50–100 µg';
      s.motius.push("La B12 només es troba de manera fiable en aliments d'origen animal: en una dieta vegana és imprescindible.");
    } else if (ing.b12 < 2.4) {
      s.prioritat = vegetal ? 'recomanat' : 'considerar';
      s.dosi = dosiMant; s.curt = '50–100 µg';
      s.motius.push(`La teva dieta n'aporta uns ${fmt(ing.b12)} µg/dia, per sota del que cal.`);
    } else if (vegetal) {
      s.prioritat = 'considerar';
      s.dosi = dosiMant; s.curt = '50–100 µg';
      s.motius.push('En una dieta vegetariana és fàcil quedar curt de B12.');
    } else if (p.edat >= 65 || medB12) {
      s.prioritat = 'analitica';
      s.dosi = "Segons l'analítica";
      s.motius.push(medB12
        ? "La metformina i els protectors d'estómac redueixen l'absorció de B12: convé revisar-ne el nivell."
        : "Amb l'edat se n'absorbeix menys: convé revisar-ne el nivell.");
    } else {
      s.motius.push(`La teva dieta n'aporta prou (uns ${fmt(ing.b12)} µg/dia).`);
    }
    S.push(s);
  }

  // Ferro
  {
    const s = nouSuplement('ferro', 'Ferro', { evidencia: 'alta' });
    const fer = numOpc(an.ferritina);
    if (fer) {
      s.motius.push(`La teva analítica: ferritina ${fmt(fer, 0)} ng/ml.`);
      if (fer < 30 || anemia) {
        s.prioritat = 'consulta';
        s.dosi = 'Habitualment 60–100 mg de ferro elemental en dies alterns, pautat pel metge';
        s.curt = 'segons pauta mèdica';
        s.motius.push('Les reserves de ferro són baixes.');
      } else if (fer < 50 && (menstrua || act.resist + act.mixt >= 4)) {
        s.prioritat = 'analitica';
        s.dosi = "No cal ara. Repeteix l'analítica en 3–6 mesos";
        s.motius.push('Les reserves són justes per a algú amb el teu perfil.');
      } else {
        s.motius.push('Les reserves són correctes.');
      }
    } else {
      const risc = [];
      if (menstrua && p.estatHormonal === 'abundant') risc.push('Les menstruacions abundants són la causa més freqüent de dèficit de ferro.');
      if (menstrua && act.resist + act.mixt >= 4) risc.push('Les dones que fan molt esport de resistència tenen més risc de dèficit.');
      if (vegetal) risc.push("El ferro vegetal s'absorbeix pitjor.");
      if (ing.fe < necFe * 0.8) risc.push(`La teva dieta n'aporta uns ${fmt(ing.fe)} mg i en necessites uns ${necFe} mg.`);
      if (risc.length) {
        s.prioritat = 'analitica';
        s.dosi = "Només si l'analítica ho indica";
        s.motius.push(...risc);
        s.notes.push('Demana al metge una analítica de ferritina i hemoglobina, i torna a omplir-la aquí.');
      } else {
        s.motius.push('Amb el teu perfil no hi ha un risc especial de dèficit.');
      }
    }
    if (s.prioritat !== 'no') s.notes.push("L'excés de ferro és perjudicial: no el prenguis \"per si de cas\".");
    if (c.has('anticonceptius') && menstrua) s.notes.push("Els anticonceptius hormonals solen reduir el sagnat i, per tant, la pèrdua de ferro.");
    S.push(s);
  }

  // Electròlits i hidrats durant l'exercici
  {
    const s = nouSuplement('electrolits', "Electròlits i hidrats durant l'exercici", { evidencia: 'alta' });
    const llarga = act.minutsMaxResist >= 75 || (p.suor && act.minutsMax >= 60);
    if (llarga) {
      s.prioritat = 'recomanat';
      s.dosi = 'Sodi: 300–600 mg per hora. Hidrats: 30–60 g per hora (en sessions de més de 2,5 h, fins a 90 g/h).';
      s.curt = 'sodi 300–600 mg/h + 30–60 g hidrats/h';
      s.motius.push(act.minutsMaxResist >= 75
        ? `Fas sessions de fins a ${act.minutsMaxResist} minuts: prou llargues per perdre sodi i gastar glucogen.`
        : "Sues molt i fas sessions de més d'una hora.");
    } else {
      s.motius.push("Les teves sessions són prou curtes: n'hi ha prou amb aigua.");
    }
    S.push(s);
  }

  // Cafeïna (només si l'objectiu és rendiment)
  if (p.objectiu === 'rendiment' && act.efectives >= 2) {
    const s = nouSuplement('cafeina', 'Cafeïna', { evidencia: 'alta' });
    if (c.has('hipertensio') || c.has('cardiac') || embarasOLact) {
      s.prioritat = 'consulta';
      s.motius.push('Amb hipertensió, problemes cardíacs o embaràs, millor no prendre-la com a suplement sense consultar-ho.');
    } else {
      const dosi = arrod(3 * p.pes, 10);
      s.prioritat = 'considerar';
      s.dosi = `${dosi} mg (3 mg/kg), 30–60 min abans de competicions o entrenaments clau`;
      s.curt = `${dosi} mg`;
      s.motius.push("Millora el rendiment i redueix la sensació d'esforç.");
      if (ing.cafeina >= 150) s.notes.push(`Ja prens uns ${fmt(arrod(ing.cafeina, 10), 0)} mg de cafeïna al dia amb el cafè i el te: no passis de 400 mg en total.`);
      else s.notes.push('Màxim 400 mg/dia en total (un cafè ≈ 80–100 mg).');
    }
    S.push(s);
  }

  // ---------- Postprocés ----------
  for (const s of S) {
    if (embarasOLact && s.prioritat !== 'no') {
      s.prioritat = 'consulta';
      s.notes.unshift("En embaràs o lactància, la dosi l'ha de confirmar el teu metge o llevadora.");
    }
    if (actuals.has(s.id)) {
      s.jaPren = true;
      s.notes.unshift(s.prioritat === 'no'
        ? "Ja el prens, però amb el teu perfil probablement no cal. Si te'l va pautar un professional, comenta-ho abans de deixar-lo."
        : "Ja el prens: comprova que la dosi de l'etiqueta coincideixi amb aquesta.");
    }
    if (s.prioritat !== 'no') s.fitxa = fitxaPer(s.id, ctxFitxa);
  }
  S.sort((a, b) => PRIORITATS.indexOf(a.prioritat) - PRIORITATS.indexOf(b.prioritat));
  r.suplements = S;

  // ---------- Precisió ----------
  const teAnalitica = ['vitd', 'ferritina', 'hemoglobina', 'b12'].some((k) => numOpc(an[k]));
  let punts = 0;
  if (detallat) punts += 2;
  if (teAnalitica) punts += 2;
  if (greix) punts += 1;
  const millores = [];
  if (!detallat) millores.push('Fes el qüestionari detallat: la dieta ara és una estimació a partir de 3 preguntes.');
  if (!teAnalitica) millores.push("Afegeix valors d'una analítica recent (vitamina D, ferritina, B12).");
  if (!greix && detallat) millores.push('Indica el teu % de greix si el saps (bàscula de bioimpedància o plecs).');
  r.precisio = { nivell: punts >= 4 ? 'alta' : punts >= 2 ? 'mitjana' : 'baixa', millores };

  // ---------- Consells d'alimentació ----------
  const fonts = vega
    ? ['100 g de tofu ferm ≈ 12–15 g', '100 g de tempeh ≈ 19 g', '100 g de seitan ≈ 20–25 g', '1 plat de llenties o cigrons ≈ 17 g', 'Got de beguda de soja (250 ml) ≈ 8 g']
    : dieta === 'vegetariana'
      ? ['2 ous ≈ 13 g', 'Skyr o iogurt proteic (150 g) ≈ 15 g', '100 g de formatge fresc ≈ 12 g', '100 g de tofu ferm ≈ 12–15 g', '1 plat de llenties o cigrons ≈ 17 g']
      : ['100 g de pit de pollastre o gall dindi ≈ 30 g', '100 g de salmó o tonyina ≈ 20–25 g', '2 ous ≈ 13 g', 'Skyr o iogurt proteic (150 g) ≈ 15 g', '1 plat de llenties o cigrons ≈ 17 g'];
  if (!restriccions.has('fruitsSecs')) fonts.push('30 g de cacauets ≈ 7 g');
  r.consellsDieta.push({
    titol: 'Com arribar a la teva proteïna',
    text: `Reparteix-la en 3–4 àpats d'uns ${proteina.perApatMin}–${proteina.perApatMax} g cadascun. Algunes equivalències:`,
    llista: fonts,
  });
  if (necCa - ing.ca >= 200) {
    const opc = vega
      ? 'begudes vegetals enriquides amb calci, tofu quallat amb calci, mongetes blanques i verdura de fulla verda'
      : `${restriccions.has('lactosa') ? 'làctics sense lactosa' : 'iogurt, formatge'}, begudes vegetals enriquides, ${restriccions.has('peix') ? '' : 'sardines amb espina, '}tofu i verdura de fulla verda`;
    r.consellsDieta.push({ titol: 'Calci', text: `Et falten uns ${fmt(arrod(necCa - ing.ca, 50), 0)} mg de calci al dia. Bones opcions: ${opc}.` });
  }
  if (S.find((s) => s.id === 'magnesi' && s.prioritat !== 'no')) {
    r.consellsDieta.push({
      titol: 'Magnesi amb el menjar',
      text: restriccions.has('fruitsSecs')
        ? 'Abans que el suplement, prioritza: llavors de carbassa i de gira-sol (si les toleres), llegums, cereals integrals, cacau pur i espinacs.'
        : 'Abans que el suplement, prioritza: ametlles i anacards (30 g ≈ 80 mg), llavors de carbassa, llegums, cereals integrals, cacau pur i espinacs.',
    });
  }
  if (ing.epadha < 500) {
    r.consellsDieta.push({
      titol: 'Omega-3 amb el menjar',
      text: vegetal || restriccions.has('peix')
        ? 'Les nous i les llavors de lli i de xia aporten omega-3 vegetal (ALA), però el cos el converteix poc en EPA i DHA.'
        : 'Dues racions de peix blau per setmana (sardina, verat, salmó, seitó) cobreixen la necessitat sense suplements.',
    });
  }
  if (S.find((s) => s.id === 'ferro' && s.prioritat !== 'no')) {
    r.consellsDieta.push({
      titol: 'Ferro amb el menjar',
      text: "Acompanya els llegums i la verdura de fulla verda amb vitamina C (pebrot, tomàquet, cítrics) i deixa el cafè i el te per a una hora després dels àpats.",
    });
  }
  if (p.tabac) r.consellsDieta.push({ titol: 'Tabac', text: 'Fumar augmenta la necessitat de vitamina C en uns 35 mg/dia: una taronja o un kiwi extra al dia ho cobreix.' });
  if (son < 6) r.consellsDieta.push({ titol: 'Son', text: "Dormir menys de 6 hores redueix la recuperació i el rendiment més que qualsevol suplement. Prova d'arribar a 7–8 hores." });

  return r;
}
