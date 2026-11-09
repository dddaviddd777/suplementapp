import {
  calcular, ESPORTS, INTENSITATS, CONDICIONS, MEDICAMENTS, RESTRICCIONS, SUPLEMENTS_ACTUALS, OBJECTIUS,
} from './rules.js';
import { ALIMENTS, GRUPS_FFQ, OPCIONS_FREQ, ffqPerDefecte, exclosPer } from './aliments.js';
import { construirHorari } from './horari.js';

const CLAU = 'suplementapp.v2';
const CLAU_V1 = 'suplementapp.perfil.v1';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n, d = 1) => Number(n).toLocaleString('ca-ES', { maximumFractionDigits: d });

const form = $('#form');
const totsElsPassos = $$('.pas', form);
const resultats = $('#resultats');
let pas = 0;
let ffqTocat = false;

// ---------- Emmagatzematge local ----------
const entrades = () => [...new FormData(form).entries()];

function desar() {
  try { localStorage.setItem(CLAU, JSON.stringify({ versio: 2, entrades: entrades() })); } catch { /* sense emmagatzematge */ }
}

function carregar() {
  try {
    const t = localStorage.getItem(CLAU);
    if (t) return JSON.parse(t).entrades;
    const v1 = localStorage.getItem(CLAU_V1);
    if (v1) return entradesDesDeV1(JSON.parse(v1));
  } catch { /* res */ }
  return null;
}

function esborrar() {
  try { localStorage.removeItem(CLAU); localStorage.removeItem(CLAU_V1); } catch { /* res */ }
}

/** Converteix un perfil desat per la versió 1 a entrades del formulari actual. */
function entradesDesDeV1(p) {
  const e = [['mode', 'rapid']];
  for (const k of ['sexe', 'edat', 'alcada', 'pes', 'feina', 'objectiu', 'dieta', 'peixBlau', 'lactis', 'fruitsSecs', 'sol', 'son', 'estres']) {
    if (p[k] !== undefined && p[k] !== null) e.push([k, String(p[k])]);
  }
  if (p.suor) e.push(['suor', 'si']);
  for (const a of p.activitats || []) {
    e.push(['esport', a.esport], [`dies-${a.esport}`, String(a.dies)], [`minuts-${a.esport}`, String(a.minuts)], [`int-${a.esport}`, a.intensitat]);
  }
  for (const c of p.condicions || []) e.push([c in MEDICAMENTS ? 'medicament' : 'condicio', c]);
  return e;
}

function restaurar(llista) {
  form.reset();
  const mapa = new Map();
  for (const [k, v] of llista) mapa.set(k, [...(mapa.get(k) || []), v]);
  for (const el of form.elements) {
    if (!el.name || !mapa.has(el.name) && el.type !== 'checkbox') continue;
    const vals = mapa.get(el.name) || [];
    if (el.type === 'checkbox' || el.type === 'radio') el.checked = vals.includes(el.value);
    else el.value = vals[0];
  }
  ffqTocat = llista.some(([k]) => k.startsWith('ffq-'));
}

// ---------- Construcció del formulari ----------
const caselles = (nom, obj) => Object.entries(obj)
  .map(([id, txt]) => `<label class="check"><input type="checkbox" name="${nom}" value="${id}"><span>${esc(txt)}</span></label>`)
  .join('');

function construir() {
  const dies = [1, 2, 3, 4, 5, 6, 7].map((d) => `<option value="${d}"${d === 3 ? ' selected' : ''}>${d}</option>`).join('');
  const ints = Object.entries(INTENSITATS)
    .map(([id, i]) => `<option value="${id}"${id === 'moderada' ? ' selected' : ''}>${esc(i.nom)}</option>`).join('');
  $('#esports').innerHTML = Object.entries(ESPORTS).map(([id, e]) => `
    <div class="esport" data-id="${id}">
      <label class="esport-cap"><input type="checkbox" name="esport" value="${id}"><span>${esc(e.nom)}</span></label>
      <div class="esport-detall">
        <label><span>Dies/setmana</span><select name="dies-${id}">${dies}</select></label>
        <label><span>Minuts/sessió</span><input type="number" name="minuts-${id}" min="10" max="600" step="5" value="60" inputmode="numeric"></label>
        <label><span>Intensitat</span><select name="int-${id}">${ints}</select></label>
      </div>
    </div>`).join('');

  $('#condicions').innerHTML = caselles('condicio', CONDICIONS);
  $('#medicaments').innerHTML = caselles('medicament', MEDICAMENTS);
  $('#restriccions').innerHTML = caselles('restriccio', RESTRICCIONS);
  $('#actuals').innerHTML = caselles('actual', SUPLEMENTS_ACTUALS);

  const etiqueta = (v, freq) => {
    if (v === 0) return 'Mai';
    const n = v === 0.5 ? '½' : v === 1.5 ? '1½' : String(v);
    return freq === 'dia' ? `${n} al dia` : `${n} per setmana`;
  };
  const def = ffqPerDefecte('omnivora');
  $('#ffq').innerHTML = GRUPS_FFQ.map((g) => `
    <h3 class="ffq-titol">${esc(g.titol)}</h3>
    <div class="ffq-grup">
      ${g.items.map((id) => {
        const a = ALIMENTS[id];
        const opts = OPCIONS_FREQ[a.freq]
          .map((v) => `<option value="${v}"${v === def[id] ? ' selected' : ''}>${etiqueta(v, a.freq)}</option>`).join('');
        return `<label class="ffq-item" data-ffq="${id}">
          <span class="ffq-nom">${esc(a.nom)}<small>${esc(a.detall)}</small></span>
          <select name="ffq-${id}">${opts}</select>
        </label>`;
      }).join('')}
    </div>`).join('');
}

function aplicarDefectesFfq(dieta) {
  const d = ffqPerDefecte(dieta);
  for (const id of Object.keys(ALIMENTS)) {
    const sel = form.elements[`ffq-${id}`];
    if (sel) sel.value = String(d[id]);
  }
  form.elements['ffq-begudaEnriquida'].checked = !!d.begudaEnriquida;
}

const modeActual = () => form.elements.mode.value || 'rapid';
const passosActius = () => totsElsPassos.filter((s) => ['tots', modeActual()].includes(s.dataset.mode));

function actualitzarVisibilitats() {
  const mode = modeActual();
  const dieta = form.elements.dieta.value || 'omnivora';
  $$('.esport', form).forEach((el) => el.classList.toggle('actiu', $('input[name=esport]', el).checked));
  $$('[data-nomes]', form).forEach((el) => { el.hidden = el.dataset.nomes !== mode; });
  $$('[data-sexe]', form).forEach((el) => { el.hidden = form.elements.sexe.value !== el.dataset.sexe; });
  $('#camp-peix').hidden = dieta !== 'omnivora';
  $$('[data-ffq]', form).forEach((el) => { el.hidden = exclosPer(dieta, el.dataset.ffq); });
  if (resultats.hidden) actualitzarIndicador();
}

// ---------- Lectura del formulari ----------
function llegirForm() {
  const fd = new FormData(form);
  const num = (k) => Number(String(fd.get(k) ?? '').replace(',', '.'));
  const opc = (k) => (String(fd.get(k) ?? '').trim() === '' ? null : num(k));
  const mode = fd.get('mode') || 'rapid';
  const detallat = mode === 'detallat';
  const sexe = fd.get('sexe');

  const p = {
    mode,
    sexe,
    edat: num('edat'),
    alcada: num('alcada'),
    pes: num('pes'),
    estatHormonal: sexe === 'dona' ? fd.get('estatHormonal') : null,
    feina: fd.get('feina'),
    activitats: fd.getAll('esport').map((id) => ({
      esport: id, dies: num(`dies-${id}`), minuts: num(`minuts-${id}`), intensitat: fd.get(`int-${id}`),
    })),
    horaris: Object.fromEntries(['entreno', 'esmorzar', 'dinar', 'berenar', 'sopar', 'dormir'].map((k) => [k, fd.get(`h-${k}`) || ''])),
    objectiu: fd.get('objectiu'),
    dieta: fd.get('dieta'),
    peixBlau: num('peixBlau'),
    lactis: num('lactis'),
    fruitsSecs: fd.get('fruitsSecs'),
    sol: fd.get('sol'),
    son: num('son'),
    estres: fd.get('estres'),
    suor: fd.get('suor') === 'si',
    condicions: [...fd.getAll('condicio'), ...fd.getAll('medicament')],
  };

  if (detallat) {
    p.greix = opc('greix');
    p.cintura = opc('cintura');
    p.restriccions = fd.getAll('restriccio');
    p.fototip = fd.get('fototip');
    p.protector = fd.get('protector') === 'si';
    p.tabac = fd.get('tabac') === 'si';
    p.suplementsActuals = fd.getAll('actual');
    p.analitica = { vitd: opc('an-vitd'), ferritina: opc('an-ferritina'), hemoglobina: opc('an-hemoglobina'), b12: opc('an-b12') };
    p.ffq = { cerealsTipus: fd.get('ffq-cerealsTipus') || 'mixt', begudaEnriquida: fd.get('ffq-begudaEnriquida') === 'si' };
    for (const id of Object.keys(ALIMENTS)) p.ffq[id] = num(`ffq-${id}`);
  }
  return p;
}

// ---------- Validació i navegació ----------
const dinsRang = (v, mn, mx) => v === null || (v >= mn && v <= mx);
const horaValida = (s) => /^\d{2}:\d{2}$/.test(s || '');

function validarPas(sec) {
  const p = llegirForm();
  const titol = sec.dataset.titol;
  let msg = '';
  if (titol === 'Perfil') {
    if (!p.sexe) msg = 'Tria el sexe.';
    else if (p.edat > 0 && p.edat < 18) msg = 'Aquesta app és per a persones adultes (18 anys o més).';
    else if (!(p.edat >= 18 && p.edat <= 100)) msg = 'Escriu una edat entre 18 i 100 anys.';
    else if (!(p.alcada >= 120 && p.alcada <= 230)) msg = "Escriu l'alçada en centímetres (entre 120 i 230).";
    else if (!(p.pes >= 30 && p.pes <= 250)) msg = 'Escriu el pes en quilos (entre 30 i 250).';
    else if (p.mode === 'detallat' && !dinsRang(p.greix, 3, 60)) msg = 'El % de greix ha d\'estar entre 3 i 60 (o deixa-ho en blanc).';
    else if (p.mode === 'detallat' && !dinsRang(p.cintura, 50, 200)) msg = 'La cintura ha d\'estar entre 50 i 200 cm (o deixa-ho en blanc).';
  }
  if (titol === 'Activitat') {
    const dolenta = p.activitats.find((a) => !(a.minuts >= 10 && a.minuts <= 600));
    if (dolenta) msg = `Revisa els minuts de "${ESPORTS[dolenta.esport].nom}" (entre 10 i 600).`;
  }
  if (titol === 'Horaris i hàbits') {
    const falta = ['esmorzar', 'dinar', 'sopar', 'dormir'].find((k) => !horaValida(p.horaris[k]));
    if (falta) msg = `Indica l'hora de ${{ esmorzar: "l'esmorzar", dinar: 'dinar', sopar: 'sopar', dormir: 'anar a dormir' }[falta]}.`;
  }
  if (titol === 'Analítica') {
    const a = p.analitica;
    if (!dinsRang(a.vitd, 3, 200)) msg = 'La vitamina D ha d\'estar entre 3 i 200 ng/ml.';
    else if (!dinsRang(a.ferritina, 1, 1500)) msg = 'La ferritina ha d\'estar entre 1 i 1.500 ng/ml.';
    else if (!dinsRang(a.hemoglobina, 5, 20)) msg = 'L\'hemoglobina ha d\'estar entre 5 i 20 g/dl.';
    else if (!dinsRang(a.b12, 50, 3000)) msg = 'La B12 ha d\'estar entre 50 i 3.000 pg/ml.';
  }
  const err = $('.error', sec);
  err.textContent = msg;
  err.hidden = !msg;
  return !msg;
}

function actualitzarIndicador() {
  const actius = passosActius();
  const i = Math.min(pas, actius.length - 1);
  $('#pas-indicador').textContent = `${i + 1}/${actius.length} · ${actius[i].dataset.titol}`;
  $('#progres-ple').style.width = `${((i + 1) / actius.length) * 100}%`;
  $('#seguent').textContent = i === actius.length - 1 ? 'Veure el meu pla' : 'Següent';
}

function anarA(i) {
  const actius = passosActius();
  pas = Math.max(0, Math.min(i, actius.length - 1));
  form.hidden = false;
  resultats.hidden = true;
  $('#progres').hidden = false;
  totsElsPassos.forEach((s) => { s.hidden = s !== actius[pas]; });
  $('#enrere').hidden = pas === 0;
  actualitzarIndicador();
  window.scrollTo(0, 0);
}

// ---------- Resultats ----------
const GRUPS = [
  ['recomanat', 'Recomanats per al teu perfil'],
  ['considerar', 'A considerar'],
  ['analitica', 'Millor amb una analítica'],
  ['consulta', 'Consulta-ho amb un professional'],
];
const ETIQUETA = { recomanat: 'Recomanat', considerar: 'A considerar', analitica: 'Analítica', consulta: 'Consulta', no: 'No cal' };
const EVIDENCIA = { alta: 'Evidència alta', moderada: 'Evidència moderada', baixa: 'Evidència baixa' };
const PRECISIO = { baixa: 'Precisió baixa', mitjana: 'Precisió mitjana', alta: 'Precisió alta' };

const llista = (arr, cls = '') => (arr?.length ? `<ul class="${cls}">${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '');

function fitxaHtml(f) {
  if (!f) return '';
  const fila = (t, v) => (v ? `<div><dt>${t}</dt><dd>${v}</dd></div>` : '');
  return `<dl class="fitxa">
    ${fila('Quan', esc(f.moment))}
    ${fila('Amb quin menjar', esc(f.menjar))}
    ${fila('Evita', f.evitar.length ? llista(f.evitar) : '')}
    ${fila('Separa-ho de', f.separar.length ? llista(f.separar) : '')}
    ${fila('Quin triar', esc(f.forma))}
    ${fila('Durant quant de temps', esc(f.durada))}
  </dl>`;
}

function targetaSuplement(s) {
  return `
    <article class="suplement p-${s.prioritat}">
      <header>
        <h4>${esc(s.nom)}</h4>
        <span class="etiquetes">
          ${s.jaPren ? '<span class="etiqueta e-japren">Ja el prens</span>' : ''}
          <span class="etiqueta e-${s.prioritat}">${ETIQUETA[s.prioritat]}</span>
        </span>
      </header>
      ${s.dosi ? `<p class="dosi">${esc(s.dosi)}</p>` : ''}
      ${s.motius.length ? `<p class="subtitol">Per què</p>${llista(s.motius, 'motius')}` : ''}
      ${fitxaHtml(s.fitxa)}
      ${llista(s.notes, 'notes')}
      <p class="evidencia">${EVIDENCIA[s.evidencia] || ''}</p>
    </article>`;
}

function dietaHtml(d, mode) {
  const fmtVal = (v, u) => (u === 'mg' && v >= 100 ? fmt(Math.round(v / 10) * 10, 0) : fmt(v, v < 10 ? 1 : 0));
  const files = d.items.map((it) => {
    const pct = Math.min(it.pct, 150);
    const estat = it.pct >= 100 ? 'ok' : it.pct >= 75 ? 'just' : 'baix';
    return `<div class="nutrient n-${estat}">
      <div class="n-cap"><span>${esc(it.nom)}</span><span>${fmtVal(it.ingesta, it.unitat)} / ${fmtVal(it.necessitat, it.unitat)} ${esc(it.unitat)}</span></div>
      <div class="n-barra" role="img" aria-label="${esc(it.nom)}: ${it.pct}% del que necessites"><div style="width:${(pct / 150) * 100}%"></div><span class="n-100"></span></div>
    </div>`;
  }).join('');
  return `
    <h3>La teva dieta vs. el que necessites</h3>
    <div class="caixa">
      <p class="ajuda petit">${mode === 'detallat'
        ? 'Estimació a partir del teu qüestionari. La línia vertical marca el 100% del que necessites.'
        : 'Estimació aproximada a partir de 3 preguntes. Fes el mode detallat per afinar-la.'}</p>
      ${files}
      <p class="ajuda petit">La vitamina D ve sobretot del sol, no de la dieta: és normal que la barra quedi curta. Cafeïna estimada: ~${fmt(d.cafeina, 0)} mg/dia.</p>
    </div>`;
}

function diaHtml(events) {
  return `<ol class="horari">${events.map((e) => `
    <li class="h-${e.tipus}">
      <span class="h-hora">${esc(e.hora)}</span>
      <div class="h-cos">
        <strong>${esc(e.titol)}</strong>
        ${e.items.length ? `<ul>${e.items.map((i) => `<li class="i-${i.tipus}">${esc(i.text)}</li>`).join('')}</ul>` : ''}
      </div>
    </li>`).join('')}</ol>`;
}

function horariHtml(h) {
  if (!h) return '';
  if (!h.entreno) return `<h3>El teu dia</h3>${diaHtml(h.descans)}`;
  return `
    <h3>El teu dia</h3>
    <div class="pestanyes" role="tablist">
      <button type="button" role="tab" aria-selected="true" data-dia="entreno">Dia d'entrenament</button>
      <button type="button" role="tab" aria-selected="false" data-dia="descans">Dia de descans</button>
    </div>
    <div data-panell="entreno">${diaHtml(h.entreno)}</div>
    <div data-panell="descans" hidden>${diaHtml(h.descans)}</div>`;
}

function mostrarResultats() {
  const p = llegirForm();
  const r = calcular(p);
  form.hidden = true;
  resultats.hidden = false;
  $('#progres').hidden = true;
  $('#pas-indicador').textContent = 'El teu pla';

  const botons = `
    <div class="navegacio">
      <button type="button" class="boto secundari" data-accio="esborrar">Esborrar dades</button>
      <button type="button" class="boto primari" data-accio="editar">Editar dades</button>
    </div>`;

  if (r.bloquejat) {
    resultats.innerHTML = `<div class="avis alerta">${esc(r.bloquejat)}</div>${botons}`;
    return;
  }

  const { resum } = r;
  const pr = resum.proteina;
  const act = resum.activitat;
  const kcalTxt = p.objectiu === 'greix' ? 'per perdre greix (−15%)' : p.objectiu === 'muscul' ? 'per guanyar múscul (+10%)' : 'per mantenir el pes';
  const grups = GRUPS.map(([prio, titol]) => {
    const items = r.suplements.filter((s) => s.prioritat === prio);
    return items.length ? `<h3>${titol}</h3><div class="llista-suplements">${items.map(targetaSuplement).join('')}</div>` : '';
  }).join('');
  const noCal = r.suplements.filter((s) => s.prioritat === 'no');

  resultats.innerHTML = `
    <h2>El teu pla diari</h2>
    <p class="ajuda">${esc(p.sexe === 'home' ? 'Home' : 'Dona')}, ${fmt(p.edat, 0)} anys, ${fmt(p.pes)} kg, ${fmt(p.alcada, 0)} cm · ${esc(OBJECTIUS[p.objectiu] || '')}</p>

    <div class="precisio pr-${r.precisio.nivell}">
      <strong>${PRECISIO[r.precisio.nivell]}</strong>
      ${r.precisio.millores.length ? `<span>Per millorar-la:</span>${llista(r.precisio.millores)}` : '<span>Tens el perfil complet.</span>'}
      ${p.mode === 'rapid' ? '<button type="button" class="boto enllac" data-accio="detallat">Passar al mode detallat</button>' : ''}
    </div>

    ${r.avisos.map((a) => `<div class="avis ${a.nivell}">${esc(a.text)}</div>`).join('')}

    <div class="rajoles">
      <div class="rajola destacada">
        <span class="r-etiqueta">Proteïna</span>
        <span class="r-valor">${pr.gMin === pr.gMax ? pr.gMin : `${pr.gMin}–${pr.gMax}`} g<small>/dia</small></span>
        <span class="r-sub">${fmt(pr.gkgMin)}${pr.gkgMin === pr.gkgMax ? '' : `–${fmt(pr.gkgMax)}`} g per kg · ${pr.perApatMin}–${pr.perApatMax} g per àpat</span>
      </div>
      <div class="rajola">
        <span class="r-etiqueta">Aigua</span>
        <span class="r-valor">${fmt(resum.aiguaL)} L<small>/dia</small></span>
        <span class="r-sub">en begudes, + 0,5–0,75 L per hora d'exercici</span>
      </div>
      <div class="rajola">
        <span class="r-etiqueta">Energia</span>
        <span class="r-valor">~${fmt(resum.kcalObjectiu, 0)}<small> kcal</small></span>
        <span class="r-sub">${kcalTxt}</span>
      </div>
      <div class="rajola">
        <span class="r-etiqueta">Activitat</span>
        <span class="r-valor">${fmt(act.hores)} h<small>/setm.</small></span>
        <span class="r-sub">${esc(resum.nivell)} · IMC ${fmt(resum.imc)} (${esc(resum.imcCategoria)})</span>
      </div>
    </div>

    <details class="desplegable">
      <summary>Per què aquesta proteïna?</summary>
      ${llista(pr.motius, 'motius')}
    </details>

    ${dietaHtml(r.dieta, p.mode)}
    ${horariHtml(construirHorari(p, r))}

    ${grups || '<div class="avis info">Amb el teu perfil no cal cap suplement: una dieta variada ho cobreix tot.</div>'}

    ${noCal.length ? `
      <details class="desplegable">
        <summary>No necessaris per al teu perfil (${noCal.length})</summary>
        <div class="llista-suplements">${noCal.map(targetaSuplement).join('')}</div>
      </details>` : ''}

    <h3>Consells d'alimentació</h3>
    <div class="consells">
      ${r.consellsDieta.map((cd) => `
        <article class="consell">
          <h4>${esc(cd.titol)}</h4>
          <p>${esc(cd.text)}</p>
          ${llista(cd.llista)}
        </article>`).join('')}
    </div>

    <p class="descarrec">
      Aquesta informació és orientativa i es basa en guies generals (ISSN, ACSM, EFSA, NIH) i en taules de composició
      d'aliments (BEDCA). No substitueix el consell d'un metge, farmacèutic o dietista-nutricionista.
      Prioritza sempre el menjar: els suplements només completen el que la dieta no cobreix.
    </p>
    ${botons}`;
  window.scrollTo(0, 0);
}

// ---------- Esdeveniments ----------
form.addEventListener('change', (ev) => {
  const nom = ev.target.name || '';
  if (nom.startsWith('ffq-')) ffqTocat = true;
  if (nom === 'dieta' && !ffqTocat) aplicarDefectesFfq(ev.target.value);
  actualitzarVisibilitats();
});

form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const actius = passosActius();
  if (!validarPas(actius[pas])) return;
  if (pas < actius.length - 1) {
    anarA(pas + 1);
  } else {
    desar();
    mostrarResultats();
  }
});

$('#enrere').addEventListener('click', () => anarA(pas - 1));

resultats.addEventListener('click', (ev) => {
  const boto = ev.target.closest('[data-accio], [data-dia]');
  if (!boto) return;
  if (boto.dataset.dia) {
    $$('[data-dia]', resultats).forEach((b) => b.setAttribute('aria-selected', String(b === boto)));
    $$('[data-panell]', resultats).forEach((pn) => { pn.hidden = pn.dataset.panell !== boto.dataset.dia; });
    return;
  }
  const accio = boto.dataset.accio;
  if (accio === 'editar') anarA(1);
  if (accio === 'detallat') {
    form.elements.mode.value = 'detallat';
    actualitzarVisibilitats();
    anarA(1);
  }
  if (accio === 'esborrar' && confirm("Vols esborrar les teves dades d'aquest dispositiu?")) {
    esborrar();
    form.reset();
    ffqTocat = false;
    actualitzarVisibilitats();
    anarA(0);
  }
});

// ---------- Inici ----------
construir();
const desat = carregar();
if (desat) {
  restaurar(desat);
  actualitzarVisibilitats();
  mostrarResultats();
} else {
  actualitzarVisibilitats();
  anarA(0);
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* sense mode offline */ });
}
