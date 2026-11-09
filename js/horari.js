/**
 * "El teu dia": col·loca cada suplement recomanat a l'hora i l'àpat adequats,
 * respectant les separacions (ferro lluny del calci i del cafè, magnesi a la nit,
 * levotiroxina sola en dejú…). Genera un dia d'entrenament i un de descans.
 */

const aMinuts = (s) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const aHora = (min) => {
  const m = ((Math.round(min / 5) * 5) % 1440 + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export const HORARIS_PER_DEFECTE = { esmorzar: '08:00', dinar: '14:00', berenar: '', sopar: '21:00', dormir: '23:30', entreno: '19:00' };

export function construirHorari(p, r) {
  if (!r || r.bloquejat) return null;
  const h = { ...HORARIS_PER_DEFECTE, ...(p.horaris || {}) };
  const esmorzar = aMinuts(h.esmorzar) ?? 480;
  const dinar = aMinuts(h.dinar) ?? 840;
  const berenar = aMinuts(h.berenar);
  const sopar = aMinuts(h.sopar) ?? 1260;
  let dormir = aMinuts(h.dormir) ?? 1410;
  if (dormir < esmorzar) dormir += 1440;
  const entreno = aMinuts(h.entreno);

  const actiu = r.resum.activitat.efectives >= 1 && entreno !== null;
  const durada = Math.max(r.resum.activitat.minutsMax || 0, 45);
  const c = new Set(p.condicions || []);
  const pr = r.resum.proteina;
  const actiuSup = (id) => r.suplements.find((s) => s.id === id && ['recomanat', 'considerar'].includes(s.prioritat));
  const cafeAmbApats = ((p.ffq?.cafe ?? 1) + (p.ffq?.te ?? 0)) > 0;

  function dia(entrena) {
    const ev = [];
    const afegir = (min, titol, tipus) => {
      const e = { min, hora: aHora(min), titol, tipus, items: [] };
      ev.push(e);
      return e;
    };
    const proteinaApat = `~${pr.perApatMin}–${pr.perApatMax} g de proteïna`;
    const apats = [
      afegir(esmorzar, 'Esmorzar', 'apat'),
      afegir(dinar, 'Dinar', 'apat'),
      ...(berenar !== null ? [afegir(berenar, 'Berenar', 'apat')] : []),
      afegir(sopar, 'Sopar', 'apat'),
    ];
    for (const a of apats) if (a.titol !== 'Berenar') a.items.push({ text: proteinaApat, tipus: 'menjar' });
    const sup = (e, s, text) => e.items.push({ text, tipus: 'suplement', id: s.id });

    // Entrenament
    let apatPost = null;
    if (entrena) {
      const fi = entreno + durada;
      const ses = afegir(entreno, `Entrenament (~${durada} min)`, 'entreno');
      const elec = actiuSup('electrolits');
      if (elec) {
        const pre = afegir(entreno - 180, 'Abans d\'entrenar', 'altre');
        pre.items.push({ text: `Beu ${Math.round((p.pes * 6) / 50) * 50} ml d'aigua (5–7 ml/kg)`, tipus: 'menjar' });
        sup(ses, elec, `Durant: ${elec.curt}`);
      } else {
        ses.items.push({ text: 'Aigua segons la set', tipus: 'menjar' });
      }
      const caf = actiuSup('cafeina');
      if (caf) {
        const massaTard = dormir - entreno < 480;
        const e = afegir(entreno - 45, 'Abans d\'entrenar', 'altre');
        e.items.push(massaTard
          ? { text: `Cafeïna (${caf.curt}): avui no, entrenes massa a prop de l'hora de dormir`, tipus: 'avis' }
          : { text: `Cafeïna ${caf.curt}`, tipus: 'suplement', id: 'cafeina' });
      }
      apatPost = apats.find((a) => a.min >= fi && a.min <= fi + 120) || null;
      const prot = actiuSup('proteina');
      const creat = actiuSup('creatina');
      if (apatPost) {
        apatPost.items.push({ text: 'Àpat de recuperació: proteïna + hidrats', tipus: 'menjar' });
        if (prot) sup(apatPost, prot, `Si no arribes a la proteïna: batut de ${prot.curt}`);
        if (creat) sup(apatPost, creat, `Creatina ${creat.curt}`);
      } else if (prot || creat) {
        const post = afegir(fi + 15, "Després d'entrenar", 'altre');
        if (prot) sup(post, prot, `Batut de proteïna ${prot.curt} + una fruita`);
        if (creat) sup(post, creat, `Creatina ${creat.curt}`);
      }
    } else {
      const esm = apats[0];
      const prot = actiuSup('proteina');
      const creat = actiuSup('creatina');
      if (prot) sup(esm, prot, `Si en vas curt, batut de proteïna ${prot.curt} (l'esmorzar sol ser l'àpat més fluix)`);
      if (creat) sup(esm, creat, `Creatina ${creat.curt}`);
    }

    // Levotiroxina i ferro (en dejú, separats entre ells)
    const ferro = actiuSup('ferro');
    if (c.has('tiroide')) {
      const e = afegir(esmorzar - 30, 'En dejú', 'altre');
      e.items.push({ text: 'Levotiroxina només amb aigua (cap suplement de calci, ferro o magnesi fins d\'aquí a 4 h)', tipus: 'avis' });
    }
    if (ferro) {
      const min = c.has('tiroide') ? dinar + 180 : esmorzar - 30;
      const e = afegir(min, c.has('tiroide') ? 'Mitja tarda' : 'En dejú', 'altre');
      sup(e, ferro, 'Ferro + vitamina C (suc de taronja o kiwi), en dies alterns');
      if (cafeAmbApats) e.items.push({ text: 'Espera 1 h per prendre cafè o te', tipus: 'avis' });
    }

    const esm = apats[0];
    const din = apats.find((a) => a.titol === 'Dinar');
    const b12 = actiuSup('b12');
    if (b12) sup(esm, b12, `Vitamina B12 ${b12.curt}`);
    const vitd = actiuSup('vitd');
    if (vitd) sup(din, vitd, `Vitamina D ${vitd.curt} (amb l'àpat amb més greix)`);
    const om = actiuSup('omega3');
    if (om) sup(din, om, `Omega-3 ${om.curt}`);
    const ca = actiuSup('calci');
    if (ca) sup(din, ca, `Calci ${ca.curt}`);
    const mg = actiuSup('magnesi');
    if (mg) {
      const e = afegir(dormir - 45, 'Abans de dormir', 'altre');
      sup(e, mg, `Magnesi ${mg.curt}`);
    }
    afegir(dormir, 'Dormir', 'dormir');

    // Ordena a partir de 3 h abans d'esmorzar (perquè la nit quedi al final)
    const inici = esmorzar - 180;
    ev.sort((a, b) => ((a.min - inici + 2880) % 1440) - ((b.min - inici + 2880) % 1440));
    // Ajunta els blocs "altre" sense res i treu el berenar buit
    return ev.filter((e) => e.items.length || e.tipus === 'dormir' || e.tipus === 'entreno' || e.tipus === 'apat');
  }

  return actiu ? { entreno: dia(true), descans: dia(false) } : { descans: dia(false) };
}
