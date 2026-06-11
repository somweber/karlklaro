# KlaroClean — Shopify Theme

Custom-Theme (Online Store 2.0) für **KlaroClean** — professionelle Fahrzeugaufbereitung
in Innsbruck. Dunkles Premium-Design, komplett über den Theme-Editor pflegbar,
ohne externe UI-Frameworks.

## Dateistruktur

```
├── layout/
│   ├── theme.liquid              # Basis-Layout (Fonts, Header, Footer, Sticky-CTA)
│   └── password.liquid           # Layout für die Passwort-Seite
├── config/
│   ├── settings_schema.json      # Globale Einstellungen: Farben, Typo, Kontakt, Buchung
│   └── settings_data.json
├── locales/
│   └── de.default.json           # Deutsch als Standard-Sprache (Shop-Microcopy)
├── templates/
│   ├── index.json                # Startseite
│   ├── page.leistungen.json      # Leistungen
│   ├── page.preise.json          # Preise
│   ├── page.buchung.json         # Buchung / Termin
│   ├── page.galerie.json         # Galerie
│   ├── page.ueber-uns.json       # Über uns
│   ├── page.kontakt.json         # Kontakt
│   ├── page.json                 # Standard-Seite (Impressum etc.)
│   ├── 404.json · product.json · collection.json · list-collections.json
│   ├── cart.json · search.json · blog.json · article.json · password.json
├── sections/
│   ├── header.liquid · footer.liquid
│   ├── hero.liquid · trust-bar.liquid · services-overview.liquid
│   ├── process-steps.liquid · before-after.liquid · testimonials.liquid
│   ├── cta-banner.liquid · page-hero.liquid · services-list.liquid
│   ├── pricing-table.liquid · booking-form.liquid · gallery-grid.liquid
│   ├── image-with-text.liquid · team-grid.liquid · contact.liquid
│   └── main-*.liquid             # Seite, 404, Produkt, Kollektion(en), Cart, Suche, Blog, Artikel, Passwort
├── snippets/
│   ├── css-variables.liquid      # ZENTRALE DESIGN-TOKENS (aus Theme-Einstellungen)
│   ├── meta-tags.liquid · icon.liquid · button.liquid · rating-stars.liquid
│   ├── service-card.liquid · product-card.liquid · responsive-image.liquid
│   ├── compare-slider.liquid · pagination.liquid · sticky-booking-cta.liquid
└── assets/
    ├── base.css                  # Vanilla CSS, mobile-first, konsumiert nur Tokens
    └── main.js                   # Menü, Header, Vergleichs-Slider, Filter, Buchungs-Stepper
```

## Installation (als Entwurfs-Theme — Live-Theme bleibt unberührt)

**Variante A – Shopify CLI (empfohlen):**
```bash
shopify theme push --unpublished --theme "KlaroClean Dev"
```

**Variante B – ZIP-Upload:**
Repo-Inhalt als ZIP packen → Shopify-Admin → *Onlineshop → Themes →
Theme hinzufügen → ZIP-Datei hochladen*. Nicht veröffentlichen, bis alles eingerichtet ist.

## Einrichtung nach dem Upload

1. **Seiten anlegen** (Onlineshop → Seiten). Die Handles müssen zu den Templates passen,
   das Template jeweils rechts unter „Theme-Template“ zuweisen:

   | Seite       | Handle      | Template          |
   |-------------|-------------|-------------------|
   | Leistungen  | `leistungen`| `page.leistungen` |
   | Preise      | `preise`    | `page.preise`     |
   | Buchung     | `buchung`   | `page.buchung`    |
   | Galerie     | `galerie`   | `page.galerie`    |
   | Über uns    | `ueber-uns` | `page.ueber-uns`  |
   | Kontakt     | `kontakt`   | `page.kontakt`    |

2. **Menüs** (Onlineshop → Navigation):
   - `main-menu` (Hauptmenü): Leistungen, Preise, Galerie, Über uns, Kontakt
   - `footer` (Footer-Menü): beliebige Quicklinks
   - optional ein Menü „Rechtliches“ (Impressum, Datenschutz, AGB) → im Footer-Editor zuweisen

3. **Theme-Einstellungen** (Anpassen → Theme-Einstellungen):
   - *Kontaktdaten*: Telefon, E-Mail, Adresse, Zeiten, Google-Maps-Embed-URL & -Profillink
   - *Social Media*: Instagram, Facebook, WhatsApp
   - *Buchung*: Ziel-URL der Buchungsseite + Sticky-Button-Beschriftung
   - *Marke & Farben / Typografie*: bei Bedarf anpassen — alle Werte landen als
     CSS-Custom-Properties in `snippets/css-variables.liquid`

4. **Bilder hochladen**: Alle Bild-Slots zeigen bis dahin dezente Platzhalter.
   Empfohlen: dunkle Hochglanz-Fotografie, Hero min. 2000 px Breite, Team 4:5.

5. **Cowlendar (Buchungs-App)**: App installieren → Theme-Editor → Buchungsseite →
   Section „Buchungsformular“ → **App-Block hinzufügen**. Optional die Einstellung
   „Anfrage-Formular anzeigen“ deaktivieren, wenn nur Cowlendar laufen soll.
   Bis dahin arbeitet das eingebaute 3-Schritte-Formular über Shopifys
   Kontaktformular (Anfragen kommen als E-Mail an die Shop-Adresse).

## Design-Entscheidungen & Annahmen

- **Akzentfarbe Electric Blue (#1E90FF)** statt Silber: höhere Signalwirkung für CTAs
  und 6:1-Kontrast auf Near-Black. Buttons nutzen dunkle Schrift auf Blau, weil Weiß
  auf #1E90FF WCAG AA für normalen Text verfehlen würde.
- **Schriften**: Space Grotesk (Display) + Inter (Text) via Google Fonts, da sie die
  geometrisch-technische Markenrichtung exakt treffen. Über *Typografie →
  „Markenschriften verwenden“* lässt sich auf Shopify-gehostete Schriften umschalten.
- **Preise & Leistungen** sind Section-Block-Inhalte (Theme-Editor), keine Produkte —
  Endpreise hängen von Fahrzeuggröße/Zustand ab. Nichts davon ist im Code hartkodiert.
- **Team-Namen/-Fotos** auf „Über uns“ sind Platzhalter.
- Kunden-Templates (`customers/*`) und `gift_card.liquid` sind bewusst nicht enthalten;
  bei Bedarf (Kundenkonten, Gutschein-Verkauf) ergänzen.

## Technik-Notizen

- **Progressive Enhancement**: Menü, Buchungs-Stepper, Vergleichs-Slider und Filter
  funktionieren ohne JS in einer vollwertigen Fallback-Variante.
- **Performance**: ein CSS- und ein JS-File (defer), `srcset`/`sizes` auf allen Bildern,
  Hero eager + `fetchpriority=high`, alles andere lazy, Map-iframe lazy.
- **A11y**: Skip-Link, Fokus-Stile, `aria-expanded`/`aria-current`/`aria-pressed`,
  tastaturbedienbarer Vorher/Nachher-Slider (Range-Input), `prefers-reduced-motion`.
- **SEO**: genau ein H1 pro Seite (Hero bzw. Seiten-Kopf), Meta-Description über
  Shopify-Seiteneinstellungen, OG/Twitter-Tags in `snippets/meta-tags.liquid`,
  Alt-Texte für alle Bild-Slots im Editor pflegbar.
