/**
 * Fitxa de presa de cada suplement: quan, amb quin menjar, què evitar i de què separar-lo.
 * `fitxaPer` hi afegeix els ajustos personals (medicació, restriccions, hàbits).
 */

export const FITXES = {
  proteina: {
    moment: "En les 2 h després d'entrenar, o a l'àpat que en vagi més curt (sovint l'esmorzar).",
    menjar: "Amb aigua, llet o beguda vegetal. Després d'entrenar, acompanya-la d'hidrats: fruita, pa o civada.",
    evitar: [],
    separar: [],
    forma: 'Sèrum de llet (whey concentrat o aïllat).',
    durada: "Només els dies que no arribis al teu objectiu amb el menjar.",
  },
  creatina: {
    moment: "Cada dia, també els de descans. Els dies d'entrenament, millor després.",
    menjar: "Amb un àpat que porti hidrats i proteïna: n'ajuda una mica l'absorció.",
    evitar: [],
    separar: [],
    forma: 'Creatina monohidrat en pols, sense additius.',
    durada: 'Contínua. Els efectes es noten a partir de 3–4 setmanes.',
  },
  magnesi: {
    moment: "30–60 minuts abans d'anar a dormir.",
    menjar: 'Després de sopar o amb una mica de menjar: es tolera millor.',
    evitar: ['Prendre\'l al mateix moment que el calci, el ferro o el zinc (competeixen per absorbir-se).'],
    separar: ['2 h del calci, el ferro i el zinc', "2 h d'antibiòtics (quinolones, tetraciclines)"],
    forma: "Bisglicinat (el més ben tolerat) o citrat. Evita l'òxid: s'absorbeix poc.",
    durada: 'Pot ser continu. Revisa-ho si canvies de dieta o d\'entrenament.',
  },
  vitd: {
    moment: 'Al migdia o al matí. Millor no a la nit.',
    menjar: "Amb l'àpat amb més greix del dia (oli d'oliva, ou, peix, fruits secs, alvocat). Sense greix se n'absorbeix bastant menys.",
    evitar: [],
    separar: [],
    forma: 'Vitamina D3 (colecalciferol) en gotes o càpsules amb oli.',
    durada: "Si en prens més de 1.000 UI/dia, repeteix l'analítica al cap de 3 mesos.",
  },
  omega3: {
    moment: "Amb l'àpat principal.",
    menjar: 'Amb un àpat que porti greix. Si et fa repetir, guarda les càpsules a la nevera o reparteix la dosi en dues preses.',
    evitar: [],
    separar: [],
    forma: "Oli de peix concentrat (forma triglicèrid). Mira els mg d'EPA + DHA, no els mg d'oli.",
    durada: 'Continu. Els efectes es noten a partir de 8–12 setmanes.',
  },
  b12: {
    moment: "Al matí, amb l'esmorzar o en dejú.",
    menjar: 'Indiferent. La dosi setmanal alta, sempre el mateix dia de la setmana.',
    evitar: [],
    separar: [],
    forma: 'Cianocobalamina (la més estable i estudiada), en comprimit mastegable o sublingual.',
    durada: 'Si ets vegà, de per vida. Si no, segons l\'analítica.',
  },
  ferro: {
    moment: "Al matí en dejú, 30 min abans d'esmorzar. En dies alterns s'absorbeix millor que cada dia.",
    menjar: 'Amb vitamina C: un suc de taronja natural, un kiwi o unes maduixes.',
    evitar: ["Cafè, te, cacau i vi: en redueixen molt l'absorció (espera 1–2 h)", 'Làctics i calci al mateix àpat'],
    separar: ['2 h del calci, el magnesi i els làctics'],
    forma: 'Bisglicinat ferrós (millor tolerat) o sulfat ferrós, el que pauti el metge.',
    durada: 'Normalment 3 mesos i després una nova analítica de ferritina.',
  },
  calci: {
    moment: 'Amb el dinar. Si en prens més de 500 mg, reparteix-lo en dues preses.',
    menjar: "Amb un àpat: el carbonat de calci necessita l'acidesa de l'estómac.",
    evitar: ['Prendre\'l amb el ferro'],
    separar: ['2 h del ferro i del magnesi'],
    forma: 'Carbonat (sempre amb menjar) o citrat. Millor si porta vitamina D.',
    durada: 'Mentre la dieta no cobreixi la necessitat. Prioritza els aliments.',
  },
  electrolits: {
    moment: "Abans: aigua 2–4 h abans. Durant: comença en els primers 30 minuts i beu cada 15–20 minuts.",
    menjar: 'Beguda isotònica, sals, gels o fruita seca dolça (dàtils, panses).',
    evitar: ['Beure molt més del que sues: pot fer baixar massa el sodi a la sang'],
    separar: [],
    forma: "Pastilles o sobres d'electròlits (300–600 mg de sodi) i gels de 20–30 g d'hidrats.",
    durada: 'Només en sessions llargues o amb molta calor.',
  },
  cafeina: {
    moment: "30–60 minuts abans d'entrenar o competir.",
    menjar: 'Amb poc menjar, o en dejú si la toleres bé.',
    evitar: ['Prendre-la en les 6–8 h abans de dormir'],
    separar: [],
    forma: 'Cafè, càpsules o gels amb cafeïna. Compta també el cafè que ja prens.',
    durada: 'Reserva-la per als entrenaments clau i les competicions.',
  },
};

/** Fitxa personalitzada per a aquest perfil. */
export function fitxaPer(id, ctx) {
  const base = FITXES[id];
  if (!base) return null;
  const f = { ...base, evitar: [...base.evitar], separar: [...base.separar] };
  const { c, restriccions, ffq } = ctx;
  const minerals = ['magnesi', 'calci', 'ferro'].includes(id);

  if (minerals && c.has('tiroide')) f.separar.push('4 h de la levotiroxina');
  if (minerals && c.has('bisfosfonats')) f.separar.push("Pren el bisfosfonat en dejú i espera almenys 2 h per prendre aquest suplement");
  if (id === 'calci' && c.has('ibp')) f.forma = "Citrat de calci: prens protector d'estómac i el carbonat s'absorbiria malament.";
  if (id === 'ferro' && ((ffq?.cafe || 0) + (ffq?.te || 0)) > 0) {
    f.evitar.unshift("Prens cafè o te: deixa'ls almenys 1 h abans o després del ferro");
  }
  if (id === 'proteina') {
    if (ctx.dieta === 'vegana' || restriccions.has('lactosa')) {
      f.forma = ctx.dieta === 'vegana'
        ? 'Proteïna vegetal: barreja de pèsol i arròs, o soja.'
        : 'Aïllat de sèrum (gairebé sense lactosa) o proteïna vegetal de pèsol i arròs.';
    }
    if (restriccions.has('celiaquia')) f.evitar.push('Comprova que porti el segell "sense gluten"');
  }
  if (id === 'omega3' && (ctx.dieta !== 'omnivora' || restriccions.has('peix'))) {
    f.forma = "Oli d'algues (font vegetal d'EPA i DHA). Mira els mg d'EPA + DHA.";
  }
  if (id === 'vitd' && ctx.dieta === 'vegana') f.forma = "Vitamina D3 d'origen liquen (apta per a vegans) o D2.";
  if (id === 'electrolits' && c.has('hipertensio')) f.evitar.push("Tens hipertensió: comenta la dosi de sodi amb el metge");
  return f;
}
