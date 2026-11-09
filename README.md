# SuplementAPP

App per al mòbil (PWA) que recomana la quantitat diària de proteïna, aigua i energia, i els suplements adequats
(magnesi, vitamina D, creatina, omega-3, B12, ferro, electròlits, cafeïna) segons el teu perfil i l'esport que fas.

Funciona sense connexió i les dades es guarden **només al dispositiu**.

> Informació orientativa basada en guies generals (ISSN, ACSM, EFSA, NIH). No substitueix el consell d'un professional sanitari.

## Estructura

| Fitxer | Què fa |
|---|---|
| `index.html` | Formulari de 5 passos i pantalla de resultats |
| `js/rules.js` | **Motor de regles**: necessitats, dèficits de la dieta, analítica, medicació i dosis. Si vols canviar una recomanació, és aquí. |
| `js/aliments.js` | Qüestionari de dieta i taula de nutrients per ració (BEDCA/USDA) |
| `js/fitxes.js` | Quan i amb quin menjar prendre cada suplement, i de què separar-lo |
| `js/horari.js` | "El teu dia": horari personalitzat per a dia d'entrenament i de descans |
| `js/app.js` | Interfície: navegació, desar el perfil i mostrar resultats |
| `css/styles.css` | Estils (mode clar i fosc) |
| `manifest.webmanifest`, `sw.js`, `icons/` | El que fa que s'instal·li al mòbil i funcioni sense connexió |
| `tests/rules.test.mjs` | Proves del motor de regles |
| `tools/` | Servidor local i generador d'icones |

## Provar-la a l'ordinador

```bash
node tools/servidor.mjs
```

I obre http://localhost:5173

Proves del motor de regles:

```bash
node --test tests/
```

## Instal·lar-la a l'Android

Per instal·lar-se com a app (amb icona i sense connexió), Android necessita que estigui publicada amb **HTTPS**.
L'opció més senzilla i gratuïta és **GitHub Pages**:

1. Crea un repositori a GitHub (per exemple `suplementapp`) i puja-hi tots els fitxers d'aquesta carpeta.
2. Al repositori: **Settings → Pages → Branch: `main` / `(root)` → Save**.
3. En un parell de minuts tindràs l'adreça `https://<el-teu-usuari>.github.io/suplementapp/`.
4. Obre-la amb **Chrome** al mòbil → menú ⋮ → **Instal·la l'aplicació** (o *Afegeix a la pantalla d'inici*).

Quan canviïs alguna cosa, puja els fitxers de nou i augmenta `VERSIO` a `sw.js` (per exemple `suplementapp-v2`)
perquè el mòbil descarregui la versió nova.
