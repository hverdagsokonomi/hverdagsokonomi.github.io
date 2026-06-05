# Hverdagsøkonomi

Hverdagsøkonomi er en statisk norsk nettside for praktisk privatøkonomi. Den inneholder guider, sjekklister og kalkulatorer for budsjett, buffer, strøm, renter, abonnementer, forsikring, egenandel, bilkostnader, matbudsjett og feriebudsjett.

Prosjektet er laget for gratis hosting på GitHub Pages.

## Teknologi

- HTML5
- CSS3
- Vanilla JavaScript
- Ingen build step
- Ingen backend
- Ingen database
- Ingen betalte API-er

Alle kalkulatorer kjører lokalt i nettleseren. Kalkulatordata sendes ikke til en server.

## Filstruktur

```text
/
  index.html
  forsikring.html
  privatokonomi.html
  kalkulatorer.html
  guider.html
  om-oss.html
  personvern.html
  cookies.html
  affiliate.html
  kontakt.html
  sitemap.xml
  robots.txt
  README.md
  assets/
    css/styles.css
    js/main.js
    js/calculators.js
    js/cookie-consent.js
    img/hverdagsokonomi-logo.svg
```

## Hosting på GitHub Pages

1. Opprett repoet `hverdagsokonomi` på GitHub.
2. Last opp filene til `main` branch.
3. Gå til `Settings` -> `Pages`.
4. Velg `Deploy from a branch`.
5. Velg `main` og `/root`.
6. Lagre og vent til GitHub Pages publiserer siden.

Siden bruker relative lenker og krever ingen serverkonfigurasjon.

## Bytte domenenavn

Oppdater disse stedene når ekte domene er klart:

- `canonical`-lenker i HTML-filene
- Open Graph `og:url`
- Open Graph `og:image`
- JSON-LD `url`, `@id` og `logo` på forsiden
- `sitemap.xml`
- `robots.txt`

Hvis du bruker eget domene på GitHub Pages, legg også til en `CNAME`-fil med domenet.

Standard publisert URL er `https://hverdagsokonomi.github.io/`. Dersom siden senere publiseres på et eget domene, kan du bytte dette til for eksempel `https://dittdomene.no/`.

## Oppdatere sitemap

Når domenet eller URL-strukturen endres, oppdater alle `<loc>`-verdier i `sitemap.xml`. Oppdater også `Sitemap:`-linjen i `robots.txt` slik at den peker til den publiserte sitemap-filen.

## Bytte AdSense publisher-ID

Det ligger kun kommenterte AdSense-eksempler og annonseplassholdere i prosjektet. Ingen ekte publisher-ID er lagt inn.

Når AdSense er godkjent:

1. Bytt `ca-pub-XXXXXXXXXXXX` med ekte publisher-ID.
2. Aktiver script bare etter gyldig samtykke til annonsering.
3. Ikke plasser annonser inne i kalkulatorresultater eller slik at de kan forveksles med navigasjon.

## Legge til affiliate-lenker

Affiliate-lenker skal merkes tydelig:

```html
<a href="DIN_LENKE" rel="nofollow sponsored" class="affiliate-link">
  Sammenlign tjeneste <span class="affiliate-label">Annonselenke</span>
</a>
```

Viktige regler:

- Merk kommersielle lenker med `Annonselenke` eller `Affiliate`.
- Bruk `rel="nofollow sponsored"`.
- Skill redaksjonelt innhold fra annonser.
- Ikke presenter en kommersiell lenke som personlig anbefaling.

## Oppdatere innhold

Rediger de relevante HTML-filene direkte. Hold tonen enkel, nøktern og praktisk. Unngå garantier, absolutte sparepåstander, rikdomsløfter og formuleringer som kan oppfattes som en personlig anbefaling av forsikring, lån, kredittkort eller investering.

Bruk heller formuleringer som:

- Kan være nyttig
- Sjekk vilkårene
- Sammenlign flere alternativer
- Vurder behovet ditt

## Teste lokalt

Siden kan åpnes direkte i nettleseren ved å åpne `index.html`.

For en mer realistisk lokal test kan du kjøre en enkel statisk server fra prosjektmappen, for eksempel med Python hvis det er installert:

```bash
python -m http.server 8000
```

Åpne deretter `http://localhost:8000`.

## Viktige compliance-punkter

- Ikke gi personlig finansiell rådgivning.
- Ikke gi personlig forsikringsrådgivning.
- Ikke lov garanterte besparelser.
- Ikke presenter lån, kredittkort, forsikring eller investering som risikofritt.
- Bruk tydelige forbehold.
- Merk alle affiliate-lenker.
- Ikke bruk ekte AdSense-ID før godkjenning.
- Ikke last annonse- eller tracking-script før gyldig samtykke.
- Ikke lagre eller sende kalkulatordata eksternt.
- Gjør det like lett å avvise cookies som å godta.

## Cookie-samtykke

`assets/js/cookie-consent.js` viser banner første gang og lagrer valg i `localStorage`.

Funksjoner:

- `window.openCookieSettings()` åpner innstillinger.
- `window.deleteCookieConsent()` sletter lagret samtykke.
- `window.getCookieConsent()` leser lagret samtykke.

Analyse og annonsering er bare struktur og placeholders. Ingen ekte tracking er implementert.

## Legge til nye kalkulatorer

1. Legg til en ny seksjon i `kalkulatorer.html`.
2. Gi skjemaet en unik `id`.
3. Legg inn labels, input-felt, feilmeldingsfelt, resultatområde og knapper.
4. Legg beregningen i `assets/js/calculators.js`.
5. Bruk `Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' })` for NOK.
6. Legg til internlenker fra forsiden eller guidesiden hvis kalkulatoren bør fremheves.
7. Test validering, nullstilling, kopiering og mobilvisning.
