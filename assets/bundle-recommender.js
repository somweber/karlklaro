/* ============================================================
   KlaroClean — bundle-recommender.js
   Pure Empfehlungs-Logik für Paket-Upsells. KEIN DOM-Zugriff —
   dadurch in Node testbar (assets/bundle-recommender.test.js).

   Datenformat:
     services: { "<handle>": { cents: 5900, title: "Handwäsche" }, … }
     bundles:  [{ handle, title, cents, includes: ["<handle>", …] }, …]
   Alle Beträge in CENT (centgenau, keine Float-Rundungsfehler).

   Browser:  window.KlaroClean.bundleRecommender
   Node:     module.exports
   ============================================================ */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.KlaroClean = root.KlaroClean || {};
    root.KlaroClean.bundleRecommender = api;
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  function sumCents(handles, services) {
    return (handles || []).reduce(function (sum, h) {
      return sum + ((services[h] && services[h].cents) || 0);
    }, 0);
  }

  /* Feature „Smart Upgrade“: 2+ gewählte Leistungen überlappen mit einem
     Paket. Empfohlen wird NUR bei echtem Win-Win:
       upcharge      = Paketpreis − Wert der aktuellen Auswahl  (> 0: Shop verdient mehr)
       extras_value  = Wert der Leistungen, die das Paket zusätzlich enthält
       customer_gain = extras_value − upcharge
     Bedingung: upcharge > 0 UND customer_gain >= upcharge * 0.5
     (⇔ Extras sind mindestens das 1,5-Fache des Aufpreises wert).
     Bestes Angebot = höchster customer_gain. Kein Kandidat → null:
     schlechte Upsells zerstören Vertrauen schneller als gar keine. */
  function recommendUpgrade(selectedHandles, bundles, services, opts) {
    opts = opts || {};
    var minOverlap = opts.minOverlap == null ? 2 : opts.minOverlap;
    var currentValue = sumCents(selectedHandles, services);
    var best = null;

    (bundles || []).forEach(function (b) {
      var includes = b.includes || [];
      var overlap = selectedHandles.filter(function (h) {
        return includes.indexOf(h) !== -1;
      });
      if (overlap.length < minOverlap) return;

      var extras = includes.filter(function (h) {
        return selectedHandles.indexOf(h) === -1;
      });
      var extrasValue = sumCents(extras, services);
      var upcharge = b.cents - currentValue;
      var customerGain = extrasValue - upcharge;

      if (upcharge <= 0) return;
      if (customerGain < upcharge * 0.5) return;

      var candidate = {
        bundle: b,
        upcharge: upcharge,
        customerGain: customerGain,
        extras: extras,
        extrasValue: extrasValue
      };
      if (!best || candidate.customerGain > best.customerGain) best = candidate;
    });

    return best;
  }

  /* Feature „Tipp bei Einzelleistung“: bestes Paket, das die gerade
     gewählte Leistung enthält — kleinster positiver Aufpreis gewinnt. */
  function suggestForService(serviceHandle, selectedHandles, bundles, services) {
    var currentValue = sumCents(selectedHandles, services);
    var best = null;

    (bundles || []).forEach(function (b) {
      var includes = b.includes || [];
      if (includes.indexOf(serviceHandle) === -1) return;

      var extras = includes.filter(function (h) {
        return selectedHandles.indexOf(h) === -1;
      });
      var upcharge = b.cents - currentValue;
      if (upcharge <= 0) return;

      var extrasValue = sumCents(extras, services);
      var candidate = {
        bundle: b,
        upcharge: upcharge,
        customerGain: extrasValue - upcharge,
        extras: extras,
        extrasValue: extrasValue
      };
      if (!best || candidate.upcharge < best.upcharge) best = candidate;
    });

    return best;
  }

  return {
    sumCents: sumCents,
    recommendUpgrade: recommendUpgrade,
    suggestForService: suggestForService
  };
});
