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

/** El logo: una càpsula. La meitat dreta agafa el color de `currentColor`. */
const PILL = (cls = '') => `<svg class="pill ${cls}" viewBox="0 0 64 64" aria-hidden="true"><g transform="rotate(45 32 32)"><rect x="7" y="21" width="50" height="22" rx="11" fill="#fff"/><path d="M32 21h14a11 11 0 0 1 0 22H32z" fill="currentColor"/><rect x="7.5" y="21.5" width="49" height="21" rx="10.5" fill="none" stroke="rgba(255,255,255,.35)"/></g></svg>`;

const form = $('#form');
const totsElsPassos = $$('.pas', form);
const resultats = $('#resultats');
const perfilVista = $('#perfil');
const nav = $('#nav-app');
let pas = 0;
let ffqTocat = false;
let edicio = null; // { cua: [seccions], idx, copia: entrades, abans: resultat }
let actualitzat = null;

// ---------- Emmagatzematge local ----------
const entrades = () => [...new FormData(form).entries()];

function desar() {
  actualitzat = new Date().toISOString();
  try { localStorage.setItem(CLAU, JSON.stringify({ versio: 2, actualitzat, entrades: entrades() })); } catch { /* sense emmagatzematge */ }
}

function carregar() {
  try {
    const t = localStorage.getItem(CLAU);
    if (t) {
      const d = JSON.parse(t);
      actualitzat = d.actualitzat || null;
      return d.entrades;
    }
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
    if (!el.name || (!mapa.has(el.name) && el.type !== 'checkbox')) continue;
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
  $$('[data-pill]').forEach((el) => { el.outerHTML = PILL(); });

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
const pasPerTitol = (titol) => totsElsPassos.find((s) => s.dataset.titol === titol);

function actualitzarVisibilitats() {
  const mode = modeActual();
  const dieta = form.elements.dieta.value || 'omnivora';
  $$('.esport', form).forEach((el) => el.classList.toggle('actiu', $('input[name=esport]', el).checked));
  $$('[data-nomes]', form).forEach((el) => { el.hidden = el.dataset.nomes !== mode; });
  $$('[data-sexe]', form).forEach((el) => { el.hidden = form.elements.sexe.value !== el.dataset.sexe; });
  $$('[data-nomes-onboarding]', form).forEach((el) => { el.hidden = !!edicio; });
  $('#camp-peix').hidden = dieta !== 'omnivora';
  $$('[data-ffq]', form).forEach((el) => { el.hidden = exclosPer(dieta, el.dataset.ffq); });
  if (!form.hidden) actualitzarIndicador();
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

// ---------- Validació ----------
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
    else if (p.mode === 'detallat' && !dinsRang(p.greix, 3, 60)) msg = "El % de greix ha d'estar entre 3 i 60 (o deixa-ho en blanc).";
    else if (p.mode === 'detallat' && !dinsRang(p.cintura, 50, 200)) msg = "La cintura ha d'estar entre 50 i 200 cm (o deixa-ho en blanc).";
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
    if (!dinsRang(a.vitd, 3, 200)) msg = "La vitamina D ha d'estar entre 3 i 200 ng/ml.";
    else if (!dinsRang(a.ferritina, 1, 1500)) msg = "La ferritina ha d'estar entre 1 i 1.500 ng/ml.";
    else if (!dinsRang(a.hemoglobina, 5, 20)) msg = "L'hemoglobina ha d'estar entre 5 i 20 g/dl.";
    else if (!dinsRang(a.b12, 50, 3000)) msg = "La B12 ha d'estar entre 50 i 3.000 pg/ml.";
  }
  const err = $('.error', sec);
  err.textContent = msg;
  err.hidden = !msg;
  return !msg;
}

// ---------- Vistes ----------
function mostrarVista(vista) {
  form.hidden = vista !== 'form';
  resultats.hidden = vista !== 'pla';
  perfilVista.hidden = vista !== 'perfil';
  const ambNav = vista !== 'form';
  nav.hidden = !ambNav;
  document.body.classList.toggle('amb-nav', ambNav);
  $('#progres').hidden = vista !== 'form';
  $$('[data-vista]', nav).forEach((b) => {
    if (b.dataset.vista === vista) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
}

function actualitzarIndicador() {
  if (edicio) {
    const sec = edicio.cua[edicio.idx];
    $('#pas-indicador').textContent = edicio.cua.length > 1
      ? `Editant ${edicio.idx + 1}/${edicio.cua.length} · ${sec.dataset.titol}`
      : `Editant · ${sec.dataset.titol}`;
    $('#progres-ple').style.width = `${((edicio.idx + 1) / edicio.cua.length) * 100}%`;
    const ultim = edicio.idx === edicio.cua.length - 1;
    $('#seguent').textContent = ultim ? 'Desa i actualitza el pla' : 'Següent';
    $('#enrere').textContent = 'Cancel·la';
    return;
  }
  const actius = passosActius();
  const i = Math.min(pas, actius.length - 1);
  $('#pas-indicador').textContent = `${i + 1}/${actius.length} · ${actius[i].dataset.titol}`;
  $('#progres-ple').style.width = `${((i + 1) / actius.length) * 100}%`;
  $('#seguent').textContent = i === actius.length - 1 ? 'Veure el meu pla' : 'Següent';
  $('#enrere').textContent = 'Enrere';
}

function mostrarSeccio(sec) {
  totsElsPassos.forEach((s) => { s.hidden = s !== sec; });
  mostrarVista('form');
  actualitzarVisibilitats();
}

function anarA(i) {
  edicio = null;
  const actius = passosActius();
  pas = Math.max(0, Math.min(i, actius.length - 1));
  mostrarSeccio(actius[pas]);
  $('#enrere').hidden = pas === 0;
}

function comencarEdicio(seccions) {
  const p = llegirForm();
  edicio = { cua: seccions, idx: 0, copia: entrades(), abans: calcular(p), modeAbans: p.mode };
  $('#enrere').hidden = false;
  mostrarSeccio(seccions[0]);
}

// ---------- Pla ----------
const ETIQUETA = { recomanat: 'Recomanat', considerar: 'A considerar', analitica: 'Analítica', consulta: 'Consulta', no: 'No cal' };
const EVIDENCIA = { alta: 'Evidència alta', moderada: 'Evidència moderada', baixa: 'Evidència baixa' };
const PRECISIO = { baixa: 'Precisió baixa', mitjana: 'Precisió mitjana', alta: 'Precisió alta' };
const actiu = (s) => s && ['recomanat', 'considerar'].includes(s.prioritat);
const llista = (arr, cls = '') => (arr?.length ? `<ul class="${cls}">${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '');

function estat() {
  const p = llegirForm();
  const r = calcular(p);
  const horari = r.bloquejat ? null : construirHorari(p, r);
  const quan = (id) => {
    if (id === 'electrolits') return "Durant l'entrenament";
    for (const dia of [horari?.descans, horari?.entreno]) {
      const e = dia?.find((ev) => ev.items.some((i) => i.id === id));
      if (e) return `${e.hora} · ${e.titol}`;
    }
    return '';
  };
  const perfilText = `${p.sexe === 'home' ? 'Home' : 'Dona'} · ${fmt(p.edat, 0)} anys · ${fmt(p.alcada, 0)} cm · ${fmt(p.pes)} kg`;
  return { p, r, horari, quan, perfilText, objectiu: OBJECTIUS[p.objectiu] || '' };
}

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
    <article class="suplement p-${s.prioritat}" id="s-${s.id}">
      <header>
        <h4>${PILL(`p-${s.prioritat}`)}${esc(s.nom)}</h4>
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
    const e = it.pct >= 100 ? 'ok' : it.pct >= 75 ? 'just' : 'baix';
    return `<div class="nutrient n-${e}">
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

function diferencies(abans, ara) {
  if (!abans || abans.bloquejat || ara.bloquejat) return [];
  const mapa = (r) => Object.fromEntries(r.suplements.map((s) => [s.id, s]));
  const A = mapa(abans);
  const B = mapa(ara);
  const out = [];
  const pa = abans.resum.proteina;
  const pb = ara.resum.proteina;
  if (pa.gMin !== pb.gMin || pa.gMax !== pb.gMax) out.push({ tipus: 'canvi', text: `Proteïna: ${pa.gMin}–${pa.gMax} g → ${pb.gMin}–${pb.gMax} g/dia` });
  for (const id of new Set([...Object.keys(A), ...Object.keys(B)])) {
    const a = A[id];
    const b = B[id];
    const nom = (b || a).nom;
    if (!actiu(a) && actiu(b)) out.push({ tipus: 'nou', text: `${nom}: ${b.curt || b.dosi}` });
    else if (actiu(a) && !actiu(b)) out.push({ tipus: 'tret', text: `${nom}: ja no cal` });
    else if (actiu(a) && actiu(b) && a.curt !== b.curt) out.push({ tipus: 'canvi', text: `${nom}: ${a.curt} → ${b.curt}` });
  }
  return out;
}

function mostrarPla(canvis = null) {
  const { p, r, horari, quan, perfilText } = estat();
  mostrarVista('pla');
  $('#pas-indicador').textContent = 'El meu pla';

  if (r.bloquejat) {
    resultats.innerHTML = `<div class="avis alerta">${esc(r.bloquejat)}</div>
      <div class="navegacio"><button type="button" class="boto primari" data-vista="perfil">Revisa el perfil</button></div>`;
    return;
  }

  const { resum } = r;
  const pr = resum.proteina;
  const actius = r.suplements.filter(actiu);
  const revisar = r.suplements.filter((s) => ['analitica', 'consulta'].includes(s.prioritat));
  const noCal = r.suplements.filter((s) => s.prioritat === 'no');
  const detall = r.suplements.filter((s) => s.prioritat !== 'no');
  const dataAct = actualitzat ? new Date(actualitzat).toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  const canvisHtml = canvis ? `
    <div class="canvis" role="status">
      <strong>Pla actualitzat</strong>
      ${canvis.length ? `<ul>${canvis.map((c) => `<li class="c-${c.tipus}">${esc(c.text)}</li>`).join('')}</ul>` : '<span class="petit">La suplementació no ha canviat amb les dades noves.</span>'}
    </div>` : '';

  resultats.innerHTML = `
    ${canvisHtml}
    <section class="pla-hero" aria-labelledby="titol-pla">
      <div class="pla-cap">
        ${PILL()}
        <div>
          <p class="sobretitol">El meu pla de suplementació</p>
          <h2 class="pla-titol" id="titol-pla">${actius.length ? `${actius.length} ${actius.length === 1 ? 'suplement' : 'suplements'} al dia` : 'Cap suplement necessari'}</h2>
          <p class="pla-perfil">${esc(perfilText)} · ${esc(OBJECTIUS[p.objectiu] || '')}</p>
        </div>
      </div>

      <div class="objectius">
        <div class="objectiu"><span>Proteïna</span><strong>${pr.gMin === pr.gMax ? pr.gMin : `${pr.gMin}–${pr.gMax}`}<small> g</small></strong></div>
        <div class="objectiu"><span>Aigua</span><strong>${fmt(resum.aiguaL)}<small> L</small></strong></div>
        <div class="objectiu"><span>Energia</span><strong>${fmt(resum.kcalObjectiu, 0)}<small> kcal</small></strong></div>
      </div>

      ${actius.length ? `<ul class="pla-llista">
        ${actius.map((s) => `
          <li class="pla-fila">
            ${PILL(`p-${s.prioritat}`)}
            <span class="pla-nom">${esc(s.nom)}<small>${esc(quan(s.id) || ETIQUETA[s.prioritat])}${s.prioritat === 'considerar' ? ' · a considerar' : ''}</small></span>
            <span class="pla-dosi">${esc(s.curt || '')}<small>${s.id === 'ferro' ? 'dies alterns' : s.id === 'electrolits' ? 'per hora' : 'al dia'}</small></span>
          </li>`).join('')}
      </ul>` : '<p class="pla-buit">Una dieta variada ja et cobreix tot el que necessites.</p>'}

      ${revisar.length ? `<div class="pla-revisar"><strong>Per revisar amb un professional</strong>
        <ul>${revisar.map((s) => `<li>${esc(s.nom)}: ${esc(s.prioritat === 'analitica' ? "fes-te una analítica" : 'consulta-ho abans de prendre\'l')}</li>`).join('')}</ul></div>` : ''}

      <div class="accions">
        <button type="button" class="boto primari" data-accio="pdf">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
          Descarrega PDF
        </button>
        <button type="button" class="boto secundari" data-vista="perfil">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          Edita el perfil
        </button>
      </div>
      ${dataAct ? `<p class="actualitzat">Actualitzat el ${esc(dataAct)}</p>` : ''}
    </section>

    <div class="precisio pr-${r.precisio.nivell}">
      <strong>${PRECISIO[r.precisio.nivell]}</strong>
      ${r.precisio.millores.length ? `<span>Per millorar-la:</span>${llista(r.precisio.millores)}` : '<span>Tens el perfil complet.</span>'}
      ${p.mode === 'rapid' ? '<button type="button" class="boto enllac" data-accio="detallat">Passar al mode detallat</button>' : ''}
    </div>

    ${r.avisos.map((a) => `<div class="avis ${a.nivell}">${esc(a.text)}</div>`).join('')}

    ${horariHtml(horari)}

    ${detall.length ? `<h3>${PILL()}Com prendre cada suplement</h3><div class="llista-suplements">${detall.map(targetaSuplement).join('')}</div>` : ''}

    ${dietaHtml(r.dieta, p.mode)}

    <details class="desplegable">
      <summary>Per què ${pr.gMin}–${pr.gMax} g de proteïna?</summary>
      ${llista(pr.motius, 'motius')}
      <p class="ajuda petit">${fmt(pr.gkgMin)}–${fmt(pr.gkgMax)} g per kg · ${pr.perApatMin}–${pr.perApatMax} g per àpat · ${esc(resum.nivell)}, ${fmt(resum.activitat.hores)} h/setmana · IMC ${fmt(resum.imc)} (${esc(resum.imcCategoria)})</p>
    </details>

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
      ${PILL()}
      Informació orientativa basada en guies generals (ISSN, ACSM, EFSA, NIH) i en taules de composició d'aliments (BEDCA).
      No substitueix el consell d'un metge, farmacèutic o dietista-nutricionista.
    </p>`;
}

// ---------- Perfil ----------
function resumSeccions(p) {
  const llistaNoms = (ids, dic) => ids.filter((i) => dic[i]).map((i) => dic[i].split(' (')[0]);
  const esports = p.activitats.map((a) => `${ESPORTS[a.esport].nom} ${a.dies}×${a.minuts} min`);
  const salut = [...llistaNoms(p.condicions, CONDICIONS), ...llistaNoms(p.condicions, MEDICAMENTS)];
  const an = p.analitica || {};
  const valors = [an.vitd && `Vit. D ${an.vitd}`, an.ferritina && `Ferritina ${an.ferritina}`, an.hemoglobina && `Hb ${an.hemoglobina}`, an.b12 && `B12 ${an.b12}`].filter(Boolean);
  const dietaNom = { omnivora: 'Menja de tot', vegetariana: 'Vegetariana', vegana: 'Vegana' }[p.dieta];
  const f = p.ffq;
  const cicle = { regular: 'menstruació regular', abundant: 'menstruacions abundants', menopausa: 'menopausa', cap: 'sense regla' }[p.estatHormonal];
  return {
    Inici: p.mode === 'detallat' ? 'Mode detallat' : 'Mode ràpid · dieta estimada amb 3 preguntes',
    Perfil: [`${p.sexe === 'home' ? 'Home' : 'Dona'}, ${p.edat} anys, ${p.alcada} cm, ${fmt(p.pes)} kg`, p.greix && `${fmt(p.greix)}% de greix`, cicle].filter(Boolean).join(' · '),
    Activitat: `${esports.length ? esports.join(', ') : 'Sense esport habitual'}${p.horaris.entreno && esports.length ? ` · entrenes a les ${p.horaris.entreno}` : ''}`,
    'Objectiu i dieta': [OBJECTIUS[p.objectiu], dietaNom, ...(p.restriccions || []).map((x) => RESTRICCIONS[x])].filter(Boolean).join(' · '),
    'Què menges': f ? `Peix blau ${f.peixBlau}/setm. · llegums ${f.llegums}/setm. · làctics ${fmt(f.llet + f.iogurt + f.formatge)}/dia · cereals ${{ integrals: 'integrals', mixt: 'mixtos', refinats: 'blancs' }[f.cerealsTipus]}` : '',
    'Horaris i hàbits': `Esmorzar ${p.horaris.esmorzar} · dinar ${p.horaris.dinar} · sopar ${p.horaris.sopar} · dormir ${p.horaris.dormir}`,
    'Què ja prens': (p.suplementsActuals || []).length ? p.suplementsActuals.map((x) => SUPLEMENTS_ACTUALS[x]).join(', ') : 'Cap suplement',
    Salut: salut.length ? salut.join(', ') : 'Cap condició ni medicació',
    Analítica: valors.length ? valors.join(' · ') : 'Sense valors',
  };
}

function mostrarPerfil() {
  const p = llegirForm();
  const resum = resumSeccions(p);
  mostrarVista('perfil');
  $('#pas-indicador').textContent = 'Perfil';
  const titols = { Inici: 'Mode del qüestionari' };
  perfilVista.innerHTML = `
    <div class="perfil-cap">
      ${PILL()}
      <div>
        <h2>El meu perfil</h2>
        <p>Canvia qualsevol dada i el pla es recalcula al moment.</p>
      </div>
    </div>
    <div class="perfil-llista">
      ${passosActius().map((sec) => `
        <div class="perfil-seccio">
          <div>
            <h4>${esc(titols[sec.dataset.titol] || sec.dataset.titol)}</h4>
            <p>${esc(resum[sec.dataset.titol] || '')}</p>
          </div>
          <button type="button" class="boto secundari petit" data-editar="${esc(sec.dataset.titol)}">Edita</button>
        </div>`).join('')}
    </div>
    <div class="perfil-peu">
      ${p.mode === 'rapid' ? '<button type="button" class="boto primari" data-accio="detallat">Passa al mode detallat (més precís)</button>' : ''}
      <button type="button" class="boto perill" data-accio="esborrar">Esborra totes les meves dades</button>
    </div>`;
}

// ---------- PDF ----------
let generantPdf = false;
function avis(text) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.add('visible');
  clearTimeout(avis.t);
  avis.t = setTimeout(() => t.classList.remove('visible'), 3200);
}

async function pdf() {
  if (generantPdf) return;
  const dades = estat();
  if (dades.r.bloquejat) { avis('Primer completa el perfil.'); return; }
  generantPdf = true;
  $$('[data-accio=pdf]').forEach((b) => { b.disabled = true; });
  avis('Generant el PDF…');
  try {
    const { descarregarPDF } = await import('./pdf.js');
    await descarregarPDF(dades);
    avis('PDF descarregat');
  } catch (e) {
    avis(e?.message || "No s'ha pogut generar el PDF");
  } finally {
    generantPdf = false;
    $$('[data-accio=pdf]').forEach((b) => { b.disabled = false; });
  }
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
  if (edicio) {
    const sec = edicio.cua[edicio.idx];
    if (!validarPas(sec)) return;
    // Si en editar el mode es passa a detallat, s'afegeixen els passos nous
    if (sec.dataset.titol === 'Inici' && modeActual() === 'detallat' && edicio.modeAbans !== 'detallat') {
      edicio.cua = [sec, ...passosActius().filter((s) => s.dataset.titol !== 'Inici')];
      edicio.modeAbans = modeActual();
    }
    if (edicio.idx < edicio.cua.length - 1) {
      edicio.idx += 1;
      mostrarSeccio(edicio.cua[edicio.idx]);
    } else {
      const abans = edicio.abans;
      edicio = null;
      desar();
      mostrarPla(diferencies(abans, calcular(llegirForm())));
    }
    return;
  }
  const actius = passosActius();
  if (!validarPas(actius[pas])) return;
  if (pas < actius.length - 1) {
    anarA(pas + 1);
  } else {
    desar();
    mostrarPla();
  }
});

$('#enrere').addEventListener('click', () => {
  if (edicio) {
    restaurar(edicio.copia);
    edicio = null;
    mostrarPerfil();
    return;
  }
  anarA(pas - 1);
});

document.addEventListener('click', (ev) => {
  const boto = ev.target.closest('[data-vista], [data-accio], [data-editar], [data-dia]');
  if (!boto || boto.closest('form')) return;
  if (boto.dataset.dia) {
    $$('[data-dia]', resultats).forEach((b) => b.setAttribute('aria-selected', String(b === boto)));
    $$('[data-panell]', resultats).forEach((pn) => { pn.hidden = pn.dataset.panell !== boto.dataset.dia; });
    return;
  }
  if (boto.dataset.vista === 'pla') mostrarPla();
  if (boto.dataset.vista === 'perfil') mostrarPerfil();
  if (boto.dataset.editar) comencarEdicio([pasPerTitol(boto.dataset.editar)]);
  const accio = boto.dataset.accio;
  if (accio === 'pdf') pdf();
  if (accio === 'detallat') {
    const copia = entrades();
    const abans = calcular(llegirForm());
    form.elements.mode.value = 'detallat';
    comencarEdicio(passosActius().filter((s) => s.dataset.titol !== 'Inici'));
    Object.assign(edicio, { copia, abans, modeAbans: 'detallat' });
  }
  if (accio === 'esborrar' && confirm("Vols esborrar les teves dades d'aquest dispositiu? No es pot desfer.")) {
    esborrar();
    form.reset();
    ffqTocat = false;
    actualitzat = null;
    anarA(0);
  }
});

// ---------- Inici ----------
construir();
const desat = carregar();
if (desat) {
  restaurar(desat);
  actualitzarVisibilitats();
  mostrarPla();
} else {
  actualitzarVisibilitats();
  anarA(0);
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* sense mode offline */ });
}
