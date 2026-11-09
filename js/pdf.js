/**
 * Genera i descarrega el pla de suplementació en PDF (A4) amb jsPDF.
 * La llibreria es carrega només quan cal i el service worker la guarda
 * perquè també funcioni sense connexió.
 */

export const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

const FUCSIA = [212, 20, 127];
const FOSC = [74, 8, 56];
const TEXT = [45, 18, 38];
const SUAU = [125, 92, 112];
const ROSA = [253, 236, 245];
const COLORS = {
  recomanat: [212, 20, 127],
  considerar: [205, 135, 20],
  analitica: [40, 120, 200],
  consulta: [215, 80, 55],
};
const ETIQUETA = { recomanat: 'Recomanat', considerar: 'A considerar', analitica: 'Analítica', consulta: 'Consulta' };

// Les fonts estàndard del PDF només admeten Latin-1: substituïm la resta de símbols.
const net = (s) => String(s ?? '')
  .replace(/[–—−]/g, '-')
  .replace(/≈/g, '~')
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/→/g, '->')
  .replace(/…/g, '...')
  .replace(/[^\x00-\xFF]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

function carregarJsPDF() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  return new Promise((resolt, rebutja) => {
    const s = document.createElement('script');
    s.src = JSPDF_URL;
    s.crossOrigin = 'anonymous';
    s.onload = () => (window.jspdf?.jsPDF ? resolt(window.jspdf.jsPDF) : rebutja(new Error('jsPDF')));
    s.onerror = () => rebutja(new Error("No s'ha pogut carregar el generador de PDF. Connecta't a internet un moment i torna-ho a provar."));
    document.head.appendChild(s);
  });
}

async function imatgeDataURL(url) {
  const blob = await fetch(url).then((r) => (r.ok ? r.blob() : Promise.reject(new Error('icona'))));
  return new Promise((resolt) => {
    const lector = new FileReader();
    lector.onload = () => resolt(lector.result);
    lector.readAsDataURL(blob);
  });
}

/**
 * @param {{p:object, r:object, horari:object|null, quan:(id:string)=>string, perfilText:string, objectiu:string}} d
 */
export async function descarregarPDF(d) {
  const JsPDF = await carregarJsPDF();
  const logo = await imatgeDataURL('icons/icon-192.png').catch(() => null);
  const doc = new JsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 15, CW = W - 2 * M, BAIX = 280;
  let y = 0;

  const font = (mida, gruix = 'normal', color = TEXT) => {
    doc.setFont('helvetica', gruix);
    doc.setFontSize(mida);
    doc.setTextColor(...color);
  };
  const interlinia = (mida) => mida * 0.3528 * 1.35;
  const linies = (txt, amplada) => doc.splitTextToSize(net(txt), amplada);
  const espai = (h) => { if (y + h > BAIX) { doc.addPage(); y = 18; } };
  const paragraf = (txt, x, amplada, mida = 10, gruix = 'normal', color = TEXT) => {
    font(mida, gruix, color);
    const ls = linies(txt, amplada);
    const lh = interlinia(mida);
    espai(ls.length * lh);
    doc.text(ls, x, y + mida * 0.3528);
    y += ls.length * lh;
  };
  const seccio = (titol) => {
    espai(16);
    y += 4;
    font(13, 'bold', FUCSIA);
    doc.text(net(titol), M, y + 4.5);
    doc.setDrawColor(...FUCSIA);
    doc.setLineWidth(0.6);
    doc.line(M, y + 7, M + 18, y + 7);
    y += 11;
  };

  // ---------- Capçalera amb degradat ----------
  const franges = 70;
  for (let i = 0; i < franges; i++) {
    const t = i / (franges - 1);
    doc.setFillColor(...[0, 1, 2].map((k) => Math.round(FUCSIA[k] + (FOSC[k] - FUCSIA[k]) * t)));
    doc.rect((W / franges) * i, 0, W / franges + 0.4, 38, 'F');
  }
  if (logo) doc.addImage(logo, 'PNG', M, 9, 20, 20);
  font(19, 'bold', [255, 255, 255]);
  doc.text('El meu pla de suplementació', M + 25, 17.5);
  font(9.5, 'normal', [255, 225, 240]);
  doc.text(linies(d.perfilText, CW - 25), M + 25, 24);
  doc.text(net(`${d.objectiu} · Generat el ${new Date().toLocaleDateString('ca-ES')}`), M + 25, 29.5);
  y = 46;

  const { r } = d;
  const pr = r.resum.proteina;

  // ---------- Objectius diaris ----------
  const caixes = [
    ['PROTEÏNA', `${pr.gMin === pr.gMax ? pr.gMin : `${pr.gMin}-${pr.gMax}`} g/dia`],
    ['AIGUA', `${r.resum.aiguaL.toLocaleString('ca-ES')} L/dia`],
    ['ENERGIA', `~${r.resum.kcalObjectiu.toLocaleString('ca-ES')} kcal`],
  ];
  const ample = (CW - 8) / 3;
  caixes.forEach(([et, val], i) => {
    const x = M + i * (ample + 4);
    doc.setFillColor(...ROSA);
    doc.roundedRect(x, y, ample, 18, 3, 3, 'F');
    font(7.5, 'bold', SUAU);
    doc.text(net(et), x + 4, y + 6);
    font(13, 'bold', FUCSIA);
    doc.text(net(val), x + 4, y + 13.5);
  });
  y += 22;
  paragraf(`Proteïna repartida en 3-4 àpats de ${pr.perApatMin}-${pr.perApatMax} g. Aigua en begudes, més 0,5-0,75 L per hora d'exercici.`, M, CW, 8.5, 'normal', SUAU);

  // ---------- Avisos ----------
  const alertes = r.avisos.filter((a) => a.nivell === 'alerta');
  if (alertes.length) {
    seccio('Important');
    for (const a of alertes) {
      const ls = linies(a.text, CW - 8);
      const h = ls.length * interlinia(9.5) + 5;
      espai(h);
      doc.setFillColor(253, 235, 230);
      doc.roundedRect(M, y, CW, h, 2, 2, 'F');
      doc.setFillColor(...COLORS.consulta);
      doc.rect(M, y, 1.4, h, 'F');
      font(9.5, 'normal', TEXT);
      doc.text(ls, M + 5, y + 5);
      y += h + 3;
    }
  }

  // ---------- Suplements ----------
  const actius = r.suplements.filter((s) => ['recomanat', 'considerar'].includes(s.prioritat));
  seccio(actius.length ? 'Què prendre cada dia' : 'Suplements');
  if (!actius.length) paragraf('Amb el teu perfil no cal cap suplement: una dieta variada ho cobreix tot.', M, CW);

  for (const s of actius) {
    const amplada = CW - 9;
    const files = [];
    files.push({ t: s.dosi, mida: 10.5, gruix: 'bold', color: FUCSIA });
    const quan = d.quan(s.id);
    if (quan) files.push({ t: `Horari: ${quan}`, mida: 9.5, gruix: 'bold', color: TEXT });
    if (s.fitxa) {
      files.push({ t: `Quan: ${s.fitxa.moment}`, mida: 9.5 });
      files.push({ t: `Amb quin menjar: ${s.fitxa.menjar}`, mida: 9.5 });
      const sep = [...s.fitxa.evitar, ...s.fitxa.separar.map((x) => `separa-ho ${x}`)].map((x) => x.replace(/\.$/, ''));
      if (sep.length) files.push({ t: `Evita: ${sep.join('; ')}.`, mida: 9.5 });
      files.push({ t: `Quin triar: ${s.fitxa.forma}`, mida: 9.5 });
    }
    files.push({ t: `Per què: ${s.motius.join(' ')}`, mida: 8.5, color: SUAU });
    for (const f of files) {
      font(f.mida, f.gruix || 'normal');
      f.ls = linies(f.t, amplada);
      f.h = f.ls.length * interlinia(f.mida);
    }
    const alt = 9 + files.reduce((a, f) => a + f.h + 0.8, 0) + 3;
    espai(alt);
    const col = COLORS[s.prioritat];
    doc.setFillColor(...ROSA);
    doc.roundedRect(M, y, CW, alt, 2.5, 2.5, 'F');
    doc.setFillColor(...col);
    doc.rect(M, y, 1.6, alt, 'F');
    font(12, 'bold', TEXT);
    doc.text(net(s.nom), M + 5, y + 6.5);
    font(8, 'bold', col);
    doc.text(net(ETIQUETA[s.prioritat] + (s.jaPren ? ' · ja el prens' : '')), M + CW - 4, y + 6.5, { align: 'right' });
    let yy = y + 10;
    for (const f of files) {
      font(f.mida, f.gruix || 'normal', f.color || TEXT);
      doc.text(f.ls, M + 5, yy + f.mida * 0.3528);
      yy += f.h + 0.8;
    }
    y += alt + 3;
  }

  // ---------- Pendents de revisar ----------
  const revisar = r.suplements.filter((s) => ['analitica', 'consulta'].includes(s.prioritat));
  if (revisar.length) {
    seccio('Per revisar amb un professional');
    for (const s of revisar) {
      paragraf(`${s.nom} (${ETIQUETA[s.prioritat].toLowerCase()})`, M, CW, 10.5, 'bold', COLORS[s.prioritat]);
      paragraf([s.dosi, ...s.motius].filter(Boolean).join(' '), M, CW, 9.5);
      y += 2;
    }
  }

  // ---------- El meu dia ----------
  if (d.horari) {
    const dies = d.horari.entreno
      ? [["Dia d'entrenament", d.horari.entreno], ['Dia de descans', d.horari.descans]]
      : [['El meu dia', d.horari.descans]];
    for (const [titol, events] of dies) {
      seccio(titol);
      for (const e of events) {
        const items = e.items.map((i) => (i.tipus === 'suplement' ? `> ${i.text}` : i.tipus === 'avis' ? `! ${i.text}` : `- ${i.text}`));
        font(9.5);
        const blocs = items.map((t) => linies(t, CW - 22));
        const alt = interlinia(10.5) + blocs.reduce((a, b) => a + b.length * interlinia(9.5), 0) + 1.5;
        espai(alt);
        font(10.5, 'bold', FUCSIA);
        doc.text(net(e.hora), M, y + 3.7);
        font(10.5, 'bold', TEXT);
        doc.text(net(e.titol), M + 18, y + 3.7);
        let yy = y + interlinia(10.5);
        e.items.forEach((it, k) => {
          font(9.5, it.tipus === 'suplement' ? 'bold' : 'normal', it.tipus === 'avis' ? COLORS.consulta : it.tipus === 'suplement' ? FUCSIA : SUAU);
          doc.text(blocs[k], M + 20, yy + 3.3);
          yy += blocs[k].length * interlinia(9.5);
        });
        y += alt;
      }
    }
  }

  // ---------- Consells ----------
  if (r.consellsDieta.length) {
    seccio("Consells d'alimentació");
    for (const c of r.consellsDieta) {
      paragraf(c.titol, M, CW, 10.5, 'bold');
      paragraf(c.text + (c.llista ? ` ${c.llista.join('; ')}.` : ''), M, CW, 9.5);
      y += 2;
    }
  }

  // ---------- Peu de pàgina ----------
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(235, 210, 225);
    doc.setLineWidth(0.3);
    doc.line(M, 286, W - M, 286);
    font(7.5, 'normal', SUAU);
    doc.text(net("SuplementAPP · Informació orientativa (ISSN, ACSM, EFSA, NIH). No substitueix el consell d'un professional sanitari."), M, 290);
    doc.text(`${i}/${total}`, W - M, 290, { align: 'right' });
  }

  const data = new Date().toISOString().slice(0, 10);
  doc.save(`pla-suplementacio-${data}.pdf`);
}
