# MIGRATION.md — Buchungs-Flow: Leistungen als Produkte

Dieses Update stellt den Buchungs-Flow um: **Leistungen sind jetzt Shopify-Produkte**
(Pflege komplett im Admin), Kund:innen können **mehrere Leistungen pro Buchung**
wählen (separate Warenkorb-Positionen mit gemeinsamem Termin) und der Wunschtermin
wird über einen **Wochenend-Kalender** (Flatpickr) gewählt.

> **Wichtig (Update Datenquelle):** Leistungen und Pakete werden jetzt
> **ausschließlich** aus den Shopify-Kollektionen gerendert. Es gibt **keine**
> hartkodierten Fallback-Blöcke mehr. Admin-Änderungen sind die alleinige Quelle
> der Wahrheit — **keine Theme-Deploys** für Inhaltsänderungen nötig.

---

## 0. Datenquelle: alles dynamisch aus dem Admin

- **Leistungen** = aktive Produkte der Kollektion `detailing-services`.
- **Pakete** = aktive Produkte der Kollektion `detailing-bundles`.
- Startseite („Leistungs-Übersicht“), `/leistungen` („Leistungsliste“), `/preise`
  („Preis-Pakete“) und die Buchungs-Auswahl ziehen alle aus diesen Kollektionen.
- **Produkt löschen / auf „Entwurf“ stellen → verschwindet sofort** überall beim
  nächsten Reload. Wieder auf **„Aktiv“** → erscheint wieder. Kein Code-Eingriff.
- Ist eine Kollektion leer (keine aktiven Produkte), zeigt der Bereich einen
  **Leerzustand** statt alter Beispieldaten.
- ⚠️ **Nur Produkte mit Status „Aktiv“** erscheinen im Storefront. **„Entwurf“**
  und **„Nicht gelistet/Unlisted“** werden von Shopify aus Kollektions-Listen
  ausgeschlossen und tauchen **nicht** auf. (Beim Aufsetzen dieses Updates standen
  alle 12 Produkte auf „Unlisted“ — sie wurden auf „Aktiv“ gesetzt, damit sie
  wieder erscheinen. Genau dieser Zustand war die Ursache des „gelöschte Produkte
  erscheinen weiter“-Symptoms: leere Kollektion → alte Fallback-Blöcke.)

## 0a. „Shopify Bundles“-App: bewusst NICHT integriert (inkompatibel)

**Entscheidung:** Die native **Shopify-Bundles-App** wird **nicht** verwendet.
Pakete bleiben **normale Produkte mit dem Metafeld `custom.bundle_includes`**.

**Begründung (recherchiert via Shopify-Doku + Store-Prüfung):**

1. **Komponenten sind in Liquid nicht abrufbar.** Native Bundle-Komponenten gibt
   es nur über die **Storefront API / Hydrogen** (`ProductVariant.requiresComponents`
   / `.components`) oder den **App-Block**, den die Bundles-App auf der
   Produktseite injiziert. In einer server-gerenderten Liquid-Section, die eine
   Kollektion durchläuft (Startseite, /preise, Buchung), sind sie **nicht**
   verfügbar — `product.requires_components` existiert als Liquid-Objekt nicht.
   Unsere Inhalts-Liste, die Sperr-Logik („im Paket enthalten“) und der
   Upsell-Recommender brauchen die Komponenten aber **direkt in Liquid** — das
   liefert nur `custom.bundle_includes` (`list.product_reference`).
2. **Buchungs-Flow mit Termin-Properties.** Der Flow fügt Leistungen per
   `/cart/add.js` mit **Line-Item-Properties pro Position** hinzu (Wunschtermin,
   Fahrzeug …). Native Fixed-Bundles fügen nur die **Eltern-Variante** hinzu und
   splitten serverseitig per Shopify-Function — inkompatibel mit dem
   ad-hoc-Mehrfach-Add mit eigenen Buchungsdaten.
3. **Dienstleistungen sind keine physische Ware.** Native Bundles koppeln den
   Bundle-Bestand an den Komponenten-Bestand (Oversell-Schutz). Unsere Leistungen
   sind nicht bestandsgeführt — diese Kopplung ist sinnlos und kann die
   Veröffentlichung blockieren.
4. **Store-Realität:** Es existieren **keine** nativen Bundles
   (`hasVariantsThatRequiresComponents: false`); alle Pakete nutzen bereits das
   Metafeld und funktionieren.

**Robustheit:** Landet doch ein natives Bundle in der Paket-Kollektion, rendert
das Theme es **ohne** Inhaltsliste als einfache Karte (kein Bruch) — die
Komponenten sind aus Liquid schlicht nicht lesbar. Die **Shopify-Bundles-App ist
keine Voraussetzung** für dieses Theme und kann deinstalliert bleiben.

---

## 1. Metafeld-Definitionen anlegen

**Einstellungen → Benutzerdefinierte Daten → Produkte → Definition hinzufügen:**

| Name | Namespace und Schlüssel | Typ | Verwendung |
|---|---|---|---|
| Kurzbeschreibung | `custom.short_description` | Einzeiliger Text | Kartentext auf Startseite/Leistungen/Buchung (Fallback: Produktbeschreibung) |
| Dauer (Minuten) | `custom.duration_minutes` | Ganzzahl | Anzeige „ca. 1 Std. 30 Min.“ + Gesamtdauer im Buchungs-Summary |

Beide Metafelder sind **optional** — ohne sie zeigen die Karten Beschreibung bzw.
keine Dauer.

### Tageskapazität: Buchungszähler (NEU)

| Name | Namespace und Schlüssel | Typ | Objekt |
|---|---|---|---|
| Buchungen pro Tag | `booking.daily_bookings` | **JSON** | **Shop** |

Beispielwert: `{ "2026-06-13": 2, "2026-06-14": 3, "2026-06-20": 1 }`

Ein Tag gilt erst als **ausgebucht**, wenn der Zähler die Kapazität erreicht
(Theme-Editor → Buchungsformular → „Termine pro Tag“, Standard **3**). Tage mit
1–2 Buchungen bleiben buchbar und zeigen im Tooltip/Screenreader dezent
„noch X Termine verfügbar“. Die Liste `booking.blocked_dates` (unten) bleibt
als **manueller Override** bestehen — Urlaub/Krankheit sperrt den Tag sofort,
unabhängig vom Zähler.

**Buchungszähler automatisch pflegen — zwei Optionen:**

1. **Shopify Flow (empfohlen):** Workflow „Order created → Condition
   (Cart-Attribut `Buchungsdatum` vorhanden) → Run code (Zähler im JSON
   erhöhen) → Update metafield“. Die vollständige Bauanleitung inklusive
   Run-code-Snippet liegt im Repo: **`flow/increment-booking-count.json`**
   (Flow-Exporte sind store-gebunden, daher als Nachbau-Vorlage).
2. **Manuell:** Nach jeder Buchung im Admin (Einstellungen →
   Benutzerdefinierte Daten → Shop → „Buchungen pro Tag“) den Zähler für das
   Datum erhöhen. Für geringes Volumen okay, skaliert nicht.

### Manuell gesperrte Termine (Override)

| Name | Namespace und Schlüssel | Typ | Objekt |
|---|---|---|---|
| Gesperrte Termine | `booking.blocked_dates` | **Datum**, „Liste von Werten akzeptieren“ aktiviert (`list.date`) | **Shop** |

**Definition anlegen:** Einstellungen → Benutzerdefinierte Daten → **Shop** →
Definition hinzufügen → Name „Gesperrte Termine“, Namespace und Schlüssel
`booking.blocked_dates`, Typ „Datum“ mit Option „Liste von Werten akzeptieren“.

**Termin als ausgebucht markieren:** Einstellungen → Benutzerdefinierte Daten →
Shop → „Gesperrte Termine“ → Datum hinzufügen (Format `YYYY-MM-DD`, z. B.
`2026-06-20`). Der Tag erscheint im Buchungskalender sofort als **Ausgebucht**
(gestreift + durchgestrichen, nicht klickbar) — klar unterscheidbar von
Werktagen („Kein Termin möglich“, ausgegraut) und freien Wochenenden
(„Termin verfügbar“, Akzent-Rahmen). Die Legende unter dem Kalender erklärt
alle drei Zustände.

## 2. Produkte (Leistungen) anlegen

Für jede Leistung ein Produkt (**Produkte → Produkt hinzufügen**):

- **Titel, Preis, Bild, Beschreibung** wie gewohnt — genau das zeigt das Theme.
- Metafelder „Kurzbeschreibung“ und „Dauer (Minuten)“ befüllen (siehe oben).
- **Wichtig für Dienstleistungen:** Im Block „Versand“ das Häkchen
  *„Dieses Produkt ist ein physisches Produkt“* **entfernen** — sonst fragt der
  Checkout nach einer Versandadresse/Versandart.
- Lagerbestand: *„Menge nicht verfolgen“* (Leistungen sind nicht limitiert).
- Status **Aktiv** (zwingend) — nur **aktive** Produkte erscheinen überhaupt im
  Storefront. **„Entwurf“** und **„Nicht gelistet“** werden ausgeschlossen (siehe
  Abschnitt 0). Im Warenkorb-Modus zeigt ein zwar aktives, aber nicht verfügbares
  Produkt den Hinweis „Derzeit nicht verfügbar“.

## 3. Kollektion `detailing-services` anlegen

**Produkte → Kategorien (Kollektionen) → Kategorie erstellen:**

- Titel frei wählbar (z. B. „Detailing-Leistungen“), aber das **Handle** muss
  `detailing-services` lauten (unter „Suchmaschinen-Listing bearbeiten“ prüfbar) —
  das Theme greift ohne weitere Konfiguration auf dieses Handle zu.
- Typ „Manuell“ und alle Leistungs-Produkte hinzufügen. Die Reihenfolge in der
  Kollektion bestimmt die Reihenfolge der Karten.
- Alternativ kann in den Sections (Theme-Editor) jede beliebige andere Kollektion
  gewählt werden — das Handle-Default greift nur, wenn nichts gewählt ist.

## 4. Theme-Editor prüfen

- **Startseite → Leistungs-Übersicht** und **Leistungen → Leistungsliste**:
  Kollektion wählbar, Button-Text „Zur Buchung hinzufügen“ anpassbar.
- **Buchung → Buchungsformular**:
  - *Buchungsmodus*: „Automatisch“ (empfohlen) — Warenkorb-Buchung, sobald die
    Kollektion Produkte hat; sonst Anfrage-Formular.
  - *Weiterleitung*: Checkout (Standard) oder Warenkorb.
  - *Buchbarer Zeitraum*: Standard 90 Tage.
  - Hinweistext unter dem Kalender anpassbar.

## Wie die Buchung im Auftrag ankommt

- Jede gewählte Leistung = eigene Bestellposition mit den Properties
  **Wunschtermin, Fahrzeug, Telefon** (+ optional **Kennzeichen, Tageszeit**) —
  sichtbar im Checkout, in der Bestellbestätigung und im Admin-Bestelldetail.
- Das Buchungsdatum steht zusätzlich als **Cart-/Bestell-Attribut „Buchungsdatum“**
  an der gesamten Bestellung; die Nachricht der Kund:innen als Bestellnotiz.

## Pakete (Bundles) als echte Produkte

Pakete leben in der Kollektion **`detailing-bundles`** und sind normale
Shopify-Produkte. Das Theme liest:

| Name | Namespace und Schlüssel | Typ | Objekt | Verwendung |
|---|---|---|---|---|
| Enthaltene Leistungen | `custom.bundle_includes` | **Liste von Produkt-Referenzen** (`list.product_reference`) | Produkt | Inhalts-Liste auf /preise + Buchung, Sperr-Logik, Upsell-Empfehlungen |
| Dauer (Minuten) | `custom.duration_minutes` | Ganzzahl | Produkt | Summe der enthaltenen Leistungen (manuell pflegen) |
| Ersparnis-Label | `custom.savings_label` | Einzeiliger Text | Produkt | Badge, z. B. „Spare 35 €“ |

**So legst du ein Paket an (ohne Bundles-App):**

1. **Metafeld-Definitionen** anlegen (Einstellungen → Benutzerdefinierte Daten →
   Produkte): `custom.bundle_includes` als **Produkt-Referenz mit „Liste von
   Werten akzeptieren“** (`list.product_reference`); optional `custom.savings_label`
   (Text) und `custom.duration_minutes` (Ganzzahl).
2. **Paket-Produkt** anlegen wie eine Leistung (nicht-physisch, Bestand nicht
   verfolgen, Status **Aktiv**), Preis = Paketpreis.
3. Im Metafeld **„Enthaltene Leistungen“** die Leistungs-Produkte auswählen.
4. Produkt der Kollektion **`detailing-bundles`** hinzufügen.

**Komponente entfernen / hinzufügen:** Einfach im Metafeld „Enthaltene
Leistungen“ Referenzen entfernen/ergänzen. Da es **Live-Referenzen** sind,
ändert sich die angezeigte Inhaltsliste auf /preise und in der Buchung **sofort**
beim nächsten Reload — kein Deploy. Wird ein referenziertes Leistungs-Produkt
gelöscht oder deaktiviert, verschwindet es automatisch aus allen Paketen.

**Verhalten:** Auf der Buchungsseite erscheinen Pakete als eigene Kategorie.
Ein gewähltes Paket sperrt seine enthaltenen Einzelleistungen („Im Paket
enthalten“); im Warenkorb landet **nur das Paket** als Position — die
enthaltenen Leistungen hängen als verstecktes Property `_bundle_includes`
an (Unterstrich-Prefix = unsichtbar für Kund:innen, abfragbar im Admin).
Bewusste Abweichung: enthaltene Leistungen werden NICHT als eigene bepreiste
Positionen hinzugefügt — das würde doppelt verrechnen.

**Upsell:** `assets/bundle-recommender.js` schlägt Pakete vor (Tipp bei einer
Leistung, Smart-Upgrade ab zwei) — nur bei echtem Win-Win, session-dismissbar.
Tests: `node assets/bundle-recommender.test.js`.

**Angelegte Bundle-Produkte** (Preise vom Händler bestätigt):

| Paket | Handle | Preis | Enthält | Dauer |
|---|---|---|---|---|
| Basic Pflege | `basic-pflege` | **129 €** (Einzelwert 148 €, „Spare 19 €“) | Handwäsche + Innenreinigung | 240 Min. |
| Premium Detail | `premium-detail` | **399 €** (Einzelwert 476 €, „Spare 77 €“) | Basic + Einstufige Politur + Scheinwerfer | 780 Min. |
| Full Detail | `full-detail` | **619 €** (Einzelwert 775 €, „Spare 156 €“) | Premium + Keramik Basis | 1260 Min. |

⚠️ **Produktbilder fehlen noch** — bitte im Admin dunkle, stimmungsvolle Fotos
(Hero-Ästhetik) zu den drei Paketen hochladen.

## Newsletter-Versand

Die Footer-Anmeldung legt Kund:innen mit Tag **`newsletter`** und
Marketing-Einwilligung an (Shopify-Bordmittel, keine App). Für den
tatsächlichen Versand später Shopify Email, Klaviyo oder Brevo verbinden
und auf das Kundensegment mit Tag `newsletter` zielen.

## Technische Referenz (für Entwickler:innen)

- Quelle der Leistungen: Section-Setting `collection` → Fallback
  `collections['detailing-services']` (Collection-Picker erlauben keine Defaults).
- Cart-Aufrufe: `POST /cart/add.js` (ein Request, `items`-Array) +
  `POST /cart/update.js` (`attributes`, `note`), danach Redirect.
- Kalender: Flatpickr 4.6.13 via jsDelivr, nur auf `page.buchung` geladen
  (Template-Gate in `layout/theme.liquid`), Dark-Theme-Overrides in
  `assets/base.css` (Abschnitt 17). Ohne Flatpickr greift das native Date-Input,
  die Wochenend-Regel wird in JS weiterhin erzwungen.
