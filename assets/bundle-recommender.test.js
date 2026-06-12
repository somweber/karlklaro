/* ============================================================
   bundle-recommender.test.js — Node-Tests für die Upsell-Logik.
   Ausführen:  node assets/bundle-recommender.test.js
   (kein Test-Framework nötig; Exit-Code 1 bei Fehlschlag)
   ============================================================ */
'use strict';

var R = require('./bundle-recommender.js');

/* Realistische Fixtures: 5 Leistungen, 3 Pakete mit 2–4 Leistungen */
var services = {
  'handwaesche-exterieur':     { cents: 5900,  title: 'Handwäsche Exterieur' },
  'innenreinigung-komplett':   { cents: 8900,  title: 'Innenreinigung Komplett' },
  'einstufige-politur':        { cents: 24900, title: 'Einstufige Politur' },
  'scheinwerfer-aufbereitung': { cents: 7900,  title: 'Scheinwerfer-Aufbereitung' },
  'keramik-basis':             { cents: 29900, title: 'Keramik Basis' }
};

var bundles = [
  { handle: 'basic-pflege-bundle',   title: 'Basic Pflege',   cents: 13300,
    includes: ['handwaesche-exterieur', 'innenreinigung-komplett'] },
  { handle: 'premium-detail-bundle', title: 'Premium Detail', cents: 39900,
    includes: ['handwaesche-exterieur', 'innenreinigung-komplett', 'einstufige-politur', 'scheinwerfer-aufbereitung'] },
  { handle: 'full-detail-bundle',    title: 'Full Detail',    cents: 55700,
    includes: ['handwaesche-exterieur', 'innenreinigung-komplett', 'einstufige-politur', 'keramik-basis'] }
];

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ✓ ' + name);
  } catch (e) {
    failed++;
    console.error('  ✗ ' + name + '\n    ' + e.message);
  }
}

function eq(actual, expected, what) {
  var a = JSON.stringify(actual);
  var b = JSON.stringify(expected);
  if (a !== b) throw new Error((what || 'Wert') + ': erwartet ' + b + ', erhalten ' + a);
}

console.log('bundle-recommender.test.js\n');

console.log('sumCents');
test('summiert centgenau', function () {
  eq(R.sumCents(['handwaesche-exterieur', 'innenreinigung-komplett'], services), 14800);
});
test('ignoriert unbekannte Handles', function () {
  eq(R.sumCents(['gibts-nicht', 'keramik-basis'], services), 29900);
});

console.log('\nrecommendUpgrade (Smart-Upgrade ab 2 Leistungen)');
test('eine Leistung → null (minOverlap 2)', function () {
  eq(R.recommendUpgrade(['handwaesche-exterieur'], bundles, services), null);
});
test('kein Win-Win → null (ehrlich schweigen statt schlechtem Upsell)', function () {
  // Auswahl 148 €: Premium-Aufpreis 251 €, Extras nur 328 € → Gain 77 < 125,50
  eq(R.recommendUpgrade(['handwaesche-exterieur', 'innenreinigung-komplett'], bundles, services), null);
});
test('bester Kandidat = höchster customer_gain', function () {
  // Auswahl 397 €: Premium (Gain 77 €) UND Full (Gain 139 €) qualifizieren → Full
  var rec = R.recommendUpgrade(
    ['handwaesche-exterieur', 'innenreinigung-komplett', 'einstufige-politur'],
    bundles, services
  );
  eq(rec.bundle.handle, 'full-detail-bundle', 'bundle');
  eq(rec.upcharge, 16000, 'upcharge (160,00 € centgenau)');
  eq(rec.customerGain, 13900, 'customerGain');
  eq(rec.extras, ['keramik-basis'], 'extras');
});
test('Pakete mit upcharge <= 0 werden übersprungen', function () {
  // Auswahl = alle Premium-Inhalte (476 €) → Premium billiger (skip), Full qualifiziert
  var rec = R.recommendUpgrade(
    ['handwaesche-exterieur', 'innenreinigung-komplett', 'einstufige-politur', 'scheinwerfer-aufbereitung'],
    bundles, services
  );
  eq(rec.bundle.handle, 'full-detail-bundle', 'bundle');
  eq(rec.upcharge, 8100, 'upcharge');
});
test('Grenzfall: Gain knapp unter 0,5 × Aufpreis → null', function () {
  var svc = { a: { cents: 3333 }, b: { cents: 6667 }, c: { cents: 1 } };
  var bnd = [{ handle: 'x', title: 'X', cents: 10001, includes: ['a', 'b', 'c'] }];
  // upcharge 1, extrasValue 1, gain 0 < 0.5 → ablehnen
  eq(R.recommendUpgrade(['a', 'b'], bnd, svc), null);
});
test('centgenaue Beträge ohne Float-Drift', function () {
  var svc = { a: { cents: 3333 }, b: { cents: 6667 }, d: { cents: 5000 } };
  var bnd = [{ handle: 'y', title: 'Y', cents: 10500, includes: ['a', 'b', 'd'] }];
  var rec = R.recommendUpgrade(['a', 'b'], bnd, svc);
  eq(rec.upcharge, 500, 'upcharge exakt 5,00 €');
  eq(rec.customerGain, 4500, 'gain exakt 45,00 €');
});
test('leere Paketliste → null', function () {
  eq(R.recommendUpgrade(['handwaesche-exterieur', 'innenreinigung-komplett'], [], services), null);
});

console.log('\nsuggestForService (Tipp bei Einzelleistung)');
test('kleinster positiver Aufpreis gewinnt', function () {
  var rec = R.suggestForService('einstufige-politur', ['einstufige-politur'], bundles, services);
  eq(rec.bundle.handle, 'premium-detail-bundle', 'bundle');
  eq(rec.upcharge, 15000, 'upcharge');
  eq(rec.extras,
    ['handwaesche-exterieur', 'innenreinigung-komplett', 'scheinwerfer-aufbereitung'],
    'extras');
});
test('berücksichtigt weitere gewählte Leistungen im Aufpreis', function () {
  // Handwäsche + Keramik gewählt (358 €) → Basic billiger (skip), Premium +41 €
  var rec = R.suggestForService('handwaesche-exterieur',
    ['handwaesche-exterieur', 'keramik-basis'], bundles, services);
  eq(rec.bundle.handle, 'premium-detail-bundle', 'bundle');
  eq(rec.upcharge, 4100, 'upcharge');
});
test('Leistung in keinem Paket → null', function () {
  eq(R.suggestForService('gibts-nicht', ['gibts-nicht'], bundles, services), null);
});

console.log('\n' + passed + ' bestanden, ' + failed + ' fehlgeschlagen');
process.exitCode = failed > 0 ? 1 : 0;
