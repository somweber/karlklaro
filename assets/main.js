/* ============================================================
   KlaroClean — main.js
   Minimales Vanilla-JS, ausschließlich Progressive Enhancement:
   Ohne JS bleiben Navigation, Formulare und Inhalte voll nutzbar
   (die Warenkorb-Buchung zeigt ohne JS einen <noscript>-Hinweis).

   Module: Header / Mobile-Menü / Vorher-Nachher-Slider / Carousel /
           Galerie-Filter / Buchungs-Stepper / Warenkorb-Buchung /
           Wochenend-Kalender (Flatpickr) / Scroll-Reveal
   ============================================================ */
(function () {
  'use strict';

  // Kennzeichnet aktives JS — CSS nutzt .js für Reveal-Animationen,
  // damit Inhalte ohne JS niemals versteckt sind.
  document.documentElement.classList.add('js');

  /* ── Header: Zustand beim Scrollen ───────────────────────── */
  function initHeader() {
    var header = document.querySelector('[data-header]');
    if (!header) return;

    var update = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 12);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  /* ── Mobiles Menü ────────────────────────────────────────── */
  function initMobileMenu() {
    var toggle = document.querySelector('[data-menu-toggle]');
    var menu = document.getElementById('MobileMenu');
    if (!toggle || !menu) return;

    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
      document.body.classList.toggle('menu-open', open);
      if (open) {
        var firstLink = menu.querySelector('a');
        if (firstLink) firstLink.focus();
      }
    };

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Nach Klick auf einen Menüpunkt (z. B. Anker) schließen
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    // Beim Wechsel auf Desktop-Layout zurücksetzen
    window.matchMedia('(min-width: 990px)').addEventListener('change', function (mq) {
      if (mq.matches) setOpen(false);
    });
  }

  /* ── Vorher/Nachher-Vergleich ────────────────────────────────
     Der unsichtbare Range-Input ist das (tastaturbedienbare)
     Steuerelement; sein Wert setzt die CSS-Variable --pos. */
  function initCompareSliders() {
    document.querySelectorAll('[data-compare]').forEach(function (root) {
      var range = root.querySelector('.compare__range');
      if (!range) return;

      var update = function () {
        root.style.setProperty('--pos', range.value + '%');
      };

      range.addEventListener('input', update);
      update();
    });
  }

  /* ── Scroll-Snap-Carousel mit Prev/Next-Buttons ──────────── */
  function initCarousels() {
    document.querySelectorAll('[data-carousel]').forEach(function (root) {
      var track = root.querySelector('[data-carousel-track]');
      var prev = root.querySelector('[data-carousel-prev]');
      var next = root.querySelector('[data-carousel-next]');
      if (!track || !prev || !next) return;

      var step = function () {
        var item = track.firstElementChild;
        return item ? item.getBoundingClientRect().width + 24 : track.clientWidth;
      };

      var updateButtons = function () {
        var maxScroll = track.scrollWidth - track.clientWidth - 2;
        prev.disabled = track.scrollLeft <= 2;
        next.disabled = track.scrollLeft >= maxScroll;
      };

      prev.addEventListener('click', function () {
        track.scrollBy({ left: -step(), behavior: 'smooth' });
      });
      next.addEventListener('click', function () {
        track.scrollBy({ left: step(), behavior: 'smooth' });
      });

      track.addEventListener('scroll', updateButtons, { passive: true });
      window.addEventListener('resize', updateButtons);
      updateButtons();
    });
  }

  /* ── Galerie-Filter ──────────────────────────────────────── */
  function initGalleryFilters() {
    document.querySelectorAll('[data-gallery]').forEach(function (root) {
      var buttons = root.querySelectorAll('[data-filter]');
      var items = root.querySelectorAll('[data-category]');
      if (!buttons.length) return;

      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var filter = btn.getAttribute('data-filter');

          buttons.forEach(function (b) {
            b.setAttribute('aria-pressed', String(b === btn));
          });

          items.forEach(function (item) {
            var match = filter === 'all' || item.getAttribute('data-category') === filter;
            item.hidden = !match;
          });
        });
      });
    });
  }

  /* ── Buchungs-Stepper (gemeinsame Basis) ─────────────────────
     Wird vom Anfrage-Formular ([data-booking-form]) und der
     Warenkorb-Buchung ([data-booking-cart]) genutzt. Ohne JS werden
     alle Schritte untereinander angezeigt. Optionen:
       validateStep(stepEl)   → false bricht „Weiter“ ab (eigene Meldung)
       isNextDisabled(stepEl) → true deaktiviert den „Weiter“-Button */
  function setupStepper(root, options) {
    var opts = options || {};
    var steps = Array.prototype.slice.call(root.querySelectorAll('[data-booking-step]'));
    var prev = root.querySelector('[data-booking-prev]');
    var next = root.querySelector('[data-booking-next]');
    var submit = root.querySelector('[data-booking-submit]');
    var progress = root.querySelectorAll('[data-booking-progress] li');
    if (steps.length < 2 || !prev || !next || !submit) return null;

    var current = 0;
    var defaultNextLabel = next.textContent;
    root.classList.add('booking--enhanced');

    var render = function () {
      steps.forEach(function (step, i) {
        step.classList.toggle('is-active', i === current);
      });
      progress.forEach(function (item, i) {
        item.classList.toggle('is-active', i === current);
        item.classList.toggle('is-done', i < current);
      });
      prev.hidden = current === 0;
      next.hidden = current === steps.length - 1;
      submit.hidden = current !== steps.length - 1;
      // Schritt-spezifische Beschriftung („Weiter zur Terminauswahl“ …)
      next.textContent = steps[current].dataset.nextLabel || defaultNextLabel;
      if (opts.isNextDisabled) next.disabled = !!opts.isNextDisabled(steps[current]);
      if (opts.onRender) opts.onRender();
    };

    // Native Validierung nur für die Felder des aktuellen Schritts
    var nativeValid = function (stepEl) {
      var fields = stepEl.querySelectorAll('input, select, textarea');
      for (var i = 0; i < fields.length; i++) {
        // Vom Kalender-Widget ersetzte Felder überspringen (nicht fokussierbar)
        if (fields[i].dataset.skipNative === '1') continue;
        if (!fields[i].checkValidity()) {
          fields[i].reportValidity();
          return false;
        }
      }
      return true;
    };

    next.addEventListener('click', function () {
      if (!goNext()) return;
      var focusable = steps[current].querySelector('input:not([type="hidden"]), select, textarea');
      if (focusable && focusable.dataset.skipNative !== '1') focusable.focus();
    });

    prev.addEventListener('click', function () {
      current = Math.max(current - 1, 0);
      render();
    });

    var goNext = function () {
      if (opts.validateStep && !opts.validateStep(steps[current])) return false;
      if (!nativeValid(steps[current])) return false;
      current = Math.min(current + 1, steps.length - 1);
      render();
      return true;
    };

    render();
    return {
      render: render,
      next: goNext,
      getStep: function () { return steps[current]; }
    };
  }

  /* ── Warenkorb-Buchung: mehrere Leistungen pro Termin ────────
     Auswahl als Checkbox-Karten → Summary (Zwischensumme, Gesamtdauer)
     → /cart/add.js mit allen Leistungen als separate Positionen.
     Wunschtermin/Fahrzeug/Kennzeichen/Telefon als Line-Item-Properties,
     Buchungsdatum zusätzlich als Cart-Attribut, Nachricht als Bestellnotiz. */
  function initBookingCart() {
    var root = document.querySelector('[data-booking-cart]');
    if (!root) return;

    var configEl = document.querySelector('[data-booking-config]');
    if (!configEl) return;
    var config;
    try {
      config = JSON.parse(configEl.textContent);
    } catch (e) {
      return;
    }
    var strings = config.strings || {};

    var checkboxes = Array.prototype.slice.call(root.querySelectorAll('[data-service-checkbox]'));
    var errorBox = root.querySelector('[data-booking-error]');
    var dateInput = root.querySelector('[data-booking-date]');
    var summary = document.querySelector('[data-booking-summary]');
    var minibar = document.querySelector('[data-booking-minibar]');

    // Hinweis: Intl statt Shop-Money-Format — für EUR/de-AT deckungsgleich
    var money = new Intl.NumberFormat('de-AT', {
      style: 'currency',
      currency: config.currency || 'EUR'
    });

    var formatDuration = function (minutes) {
      if (!minutes) return '';
      var h = Math.floor(minutes / 60);
      var m = minutes % 60;
      var parts = [strings.approx];
      if (h > 0) {
        parts.push(h + ' ' + strings.hour);
        if (m > 0) parts.push(m + ' ' + strings.minute);
      } else {
        parts.push(m + ' ' + strings.minute);
      }
      return parts.join(' ');
    };

    var selected = function () {
      return checkboxes.filter(function (cb) { return cb.checked; });
    };

    // Gemeinsamer Listen-Renderer für Summary (Aside) und Mobile-Minibar
    var fillList = function (listEl, items) {
      listEl.textContent = '';
      items.forEach(function (cb) {
        var li = document.createElement('li');
        var title = document.createElement('span');
        title.textContent = cb.dataset.title;
        var price = document.createElement('span');
        price.textContent = money.format((parseInt(cb.dataset.priceCents, 10) || 0) / 100);
        li.appendChild(title);
        li.appendChild(price);
        listEl.appendChild(li);
      });
    };

    // Minibar-CTA spiegelt den jeweils aktiven echten Button (Weiter/Submit)
    var syncMinibarCta = function () {
      if (!minibar) return;
      var cta = minibar.querySelector('[data-minibar-cta]');
      if (!cta) return;
      var nextBtn = root.querySelector('[data-booking-next]');
      var submitBtn = root.querySelector('[data-booking-submit]');
      var src = nextBtn && !nextBtn.hidden ? nextBtn : submitBtn;
      if (src) {
        var label = src.querySelector('[data-booking-submit-label]') || src;
        cta.textContent = label.textContent;
        cta.disabled = src.disabled;
      }
    };

    var showError = function (msg) {
      if (!errorBox) return;
      errorBox.textContent = msg;
      errorBox.hidden = false;
      errorBox.focus();
    };

    var clearError = function () {
      if (!errorBox) return;
      errorBox.hidden = true;
      errorBox.textContent = '';
    };

    // Wochenend-/Sperrtermin-Check (gilt auch für das native Date-Input,
    // falls Flatpickr nicht geladen wurde)
    var isWeekend = function (iso) {
      var day = new Date(iso + 'T12:00:00').getDay();
      return day === 0 || day === 6;
    };
    var isBlocked = function (iso) {
      return Array.isArray(config.blockedDates) && config.blockedDates.indexOf(iso) !== -1;
    };

    var updateSummary = function () {
      var items = selected();
      var cents = 0;
      var minutes = 0;
      items.forEach(function (cb) {
        cents += parseInt(cb.dataset.priceCents, 10) || 0;
        minutes += parseInt(cb.dataset.duration, 10) || 0;
      });

      // „ausgewählt“-Zustand als Klasse (Styling-Hook ohne :has-Pflicht)
      checkboxes.forEach(function (cb) {
        var card = cb.closest('.service-select');
        if (card) card.classList.toggle('is-selected', cb.checked);
      });

      if (summary) {
        var list = summary.querySelector('[data-summary-list]');
        var totals = summary.querySelector('[data-summary-totals]');
        var empty = summary.querySelector('[data-summary-empty]');

        fillList(list, items);

        empty.hidden = items.length > 0;
        list.hidden = items.length === 0;
        totals.hidden = items.length === 0;
        summary.querySelector('[data-summary-subtotal]').textContent = money.format(cents / 100);
        summary.querySelector('[data-summary-duration]').textContent = formatDuration(minutes) || '–';
      }

      if (minibar) {
        minibar.querySelector('[data-minibar-count]').textContent =
          items.length + ' ' + (items.length === 1 ? strings.serviceSingular : strings.servicePlural);
        minibar.querySelector('[data-minibar-total]').textContent =
          items.length ? money.format(cents / 100) : '';
        minibar.querySelector('[data-minibar-duration]').textContent =
          items.length ? formatDuration(minutes) : '';
        var mbList = minibar.querySelector('[data-minibar-list]');
        if (mbList) fillList(mbList, items);
      }

      if (stepper) stepper.render();
    };

    // Gewähltes Datum (menschenlesbar) in Summary + Property übernehmen
    var setBookingDate = function (human) {
      root._dateHuman = human || '';
      if (!summary) return;
      var row = summary.querySelector('[data-summary-date-row]');
      summary.querySelector('[data-summary-date]').textContent = human || '';
      row.hidden = !human;
    };

    var stepper = setupStepper(root, {
      onRender: syncMinibarCta,
      isNextDisabled: function (stepEl) {
        return !!stepEl.querySelector('[data-service-grid]') && selected().length === 0;
      },
      validateStep: function (stepEl) {
        clearError();
        if (stepEl.querySelector('[data-service-grid]') && selected().length === 0) {
          showError(strings.errorNoService);
          return false;
        }
        if (dateInput && stepEl.contains(dateInput)) {
          var iso = dateInput.value;
          if (!iso || !isWeekend(iso) || isBlocked(iso)) {
            showError(strings.errorDate);
            return false;
          }
        }
        return true;
      }
    });

    checkboxes.forEach(function (cb) {
      cb.addEventListener('change', function () {
        clearError();
        updateSummary();
      });
    });

    // Vorauswahl über ?services=handle1,handle2 — genutzt von den
    // Leistungs-Karten und den Paketen auf /preise (Bundles sind reine
    // URL-Konfiguration, keine eigenen Produkte).
    var preselected = 0;
    var params = new URLSearchParams(window.location.search);
    (params.get('services') || '').split(',').filter(Boolean).forEach(function (handle) {
      var cb = root.querySelector('[data-service-checkbox][data-service-handle="' + handle.trim() + '"]');
      if (cb && !cb.disabled && !cb.checked) {
        cb.checked = true;
        preselected++;
      }
    });

    // Natives Date-Input → deutsches Langdatum ableiten
    if (dateInput) {
      dateInput.addEventListener('change', function () {
        if (!dateInput.value) {
          setBookingDate('');
          return;
        }
        var d = new Date(dateInput.value + 'T12:00:00');
        setBookingDate(d.toLocaleDateString('de-AT', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        }));
      });
    }

    // Upgrade auf Flatpickr-Wochenend-Kalender (Feature 3)
    initBookingCalendar(root, config, setBookingDate);

    // Mobile-Minibar: Aufklappen, CTA-Proxy, Fade-out am Formular-Ende
    if (minibar) {
      var mbToggle = minibar.querySelector('[data-minibar-toggle]');
      var mbPanel = minibar.querySelector('[data-minibar-panel]');
      var mbCta = minibar.querySelector('[data-minibar-cta]');

      if (mbToggle && mbPanel) {
        mbToggle.addEventListener('click', function () {
          var open = mbPanel.hidden;
          mbPanel.hidden = !open;
          mbToggle.setAttribute('aria-expanded', String(open));
          minibar.classList.toggle('is-open', open);
        });
      }

      if (mbCta) {
        mbCta.addEventListener('click', function () {
          // Proxy auf die echten Buttons → identische Validierung & Meldungen
          var nextBtn = root.querySelector('[data-booking-next]');
          var submitBtn = root.querySelector('[data-booking-submit]');
          (nextBtn && !nextBtn.hidden ? nextBtn : submitBtn).click();
          var motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
          root.scrollIntoView({ behavior: motion, block: 'start' });
        });
      }

      // Fade-out via IntersectionObserver (keine Scroll-Listener):
      // sobald die echte Button-Leiste sichtbar ist, weicht die Minibar.
      var nav = root.querySelector('.booking-nav');
      if (nav && 'IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          minibar.classList.toggle('is-out', entries[0].isIntersecting);
        }, { threshold: 0.4 }).observe(nav);
      }
    }

    var submit = root.querySelector('[data-booking-submit]');
    submit.addEventListener('click', function () {
      clearError();

      // Kontakt-Schritt nativ validieren (Fahrzeug, Telefon, Datenschutz)
      var fields = stepper ? stepper.getStep().querySelectorAll('input, select, textarea') : [];
      for (var i = 0; i < fields.length; i++) {
        if (!fields[i].checkValidity()) {
          fields[i].reportValidity();
          return;
        }
      }

      var items = selected();
      if (!items.length) {
        showError(strings.errorNoService);
        return;
      }

      var dateHuman = root._dateHuman || (dateInput ? dateInput.value : '');
      var vehicle = root.querySelector('[data-booking-vehicle]').value;
      var plate = root.querySelector('[data-booking-plate]').value.trim();
      var phone = root.querySelector('[data-booking-phone]').value.trim();
      var note = root.querySelector('[data-booking-note]').value.trim();
      var timeEl = root.querySelector('[data-booking-time]');
      var timeVal = timeEl ? timeEl.value : '';

      // Line-Item-Properties hängen an JEDER Position → sichtbar im
      // Checkout, in der Bestellbestätigung und im Admin-Bestelldetail.
      var properties = {
        'Wunschtermin': dateHuman,
        'Fahrzeug': vehicle,
        'Telefon': phone
      };
      if (plate) properties['Kennzeichen'] = plate;
      if (timeVal) properties['Tageszeit'] = timeVal;

      var label = submit.querySelector('[data-booking-submit-label]') || submit;
      var originalLabel = label.textContent;
      submit.disabled = true;
      label.textContent = strings.adding;

      var fail = function (msg) {
        submit.disabled = false;
        label.textContent = originalLabel;
        showError(msg || strings.errorAdd);
      };

      fetch(config.cartAddUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          items: items.map(function (cb) {
            return { id: parseInt(cb.value, 10), quantity: 1, properties: properties };
          })
        })
      })
        .then(function (res) {
          if (!res.ok) {
            // Shopify liefert bei z. B. nicht verfügbaren Produkten eine
            // sprechende description — die zeigen wir statt der Generik.
            return res.json().then(function (data) {
              throw new Error(data.description || data.message || strings.errorAdd);
            });
          }
          // Buchungsdatum als Cart-Attribut für die ganze Bestellung,
          // Nachricht als Bestellnotiz
          return fetch(config.cartUpdateUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ attributes: { 'Buchungsdatum': dateHuman }, note: note })
          });
        })
        .then(function () {
          window.location.href = config.redirect;
        })
        .catch(function (err) {
          fail(err && err.message);
        });
    });

    updateSummary();

    // Nach URL-Vorauswahl direkt zur Terminauswahl springen, damit die
    // nächste Aktion sichtbar ist (Schritt 1 ist ja bereits erledigt).
    if (preselected > 0 && stepper && stepper.next()) {
      var motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      root.scrollIntoView({ behavior: motion, block: 'start' });
    }
  }

  /* ── Wochenend-Kalender (Flatpickr) ──────────────────────────
     Wertet das native Date-Input zum Inline-Kalender auf, in dem nur
     Samstage und Sonntage wählbar sind. Ohne geladenes Flatpickr bleibt
     das native Input mit Wochenend-Validierung (validateStep) aktiv. */
  function initBookingCalendar(root, config, onDate) {
    var input = root.querySelector('[data-booking-date]');
    if (!input || typeof window.flatpickr !== 'function') return;

    // Deutsche Locale, sofern das l10n-Bundle geladen ist
    // (de bringt Wochenstart Montag bereits mit — wir erzwingen ihn explizit)
    var locale = (window.flatpickr.l10ns && window.flatpickr.l10ns.de) || 'default';
    if (typeof locale === 'object') locale.firstDayOfWeek = 1;

    var maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + (config.maxDays || 90));

    var toIso = function (date) {
      return date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
    };

    window.flatpickr(input, {
      locale: locale,
      dateFormat: 'Y-m-d',
      altInput: true,
      altFormat: 'l, j. F Y', // „Samstag, 14. Juni 2026“
      minDate: 'today',
      maxDate: maxDate,
      inline: true, // Kalender dauerhaft sichtbar statt Popup
      disable: [
        function (date) {
          // Alles AUSSER Samstag (6) und Sonntag (0) deaktivieren
          var day = date.getDay();
          if (day !== 0 && day !== 6) return true;
          // Gesperrte Termine aus dem Shop-Metafeld booking.blocked_dates
          // (Liste "YYYY-MM-DD"). TODO: ausgebuchte Wochenenden künftig
          // automatisiert pflegen — der Stub ist bereits verdrahtet.
          return Array.isArray(config.blockedDates) &&
            config.blockedDates.indexOf(toIso(date)) !== -1;
        }
      ],
      onChange: function (dates, dateStr, instance) {
        onDate(dates.length ? instance.altInput.value : '');
      }
    });

    // Das ersetzte Original-Input ist nicht mehr fokussierbar → native
    // Validierung überspringen; validateStep übernimmt die Datumsprüfung.
    input.dataset.skipNative = '1';
  }

  /* ── Anfrage-Formular (Fallback-Modus) ───────────────────── */
  function initBookingLegacy() {
    document.querySelectorAll('[data-booking-form]').forEach(function (form) {
      setupStepper(form, {});
    });

    // Wunschtermin: frühestens heute wählbar
    document.querySelectorAll('input[type="date"][data-min-today]').forEach(function (input) {
      var now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      input.min = now.toISOString().split('T')[0];
    });

    // Erfolgsmeldung nach Versand in den Fokus holen
    var success = document.querySelector('[data-form-success]');
    if (success) {
      success.setAttribute('tabindex', '-1');
      success.focus({ preventScroll: false });
      success.scrollIntoView({ block: 'center' });
    }
  }

  /* ── Scroll-Reveal (IntersectionObserver) ────────────────── */
  function initReveal() {
    var elements = document.querySelectorAll('[data-reveal]');
    if (!elements.length || !('IntersectionObserver' in window)) {
      elements.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    elements.forEach(function (el) { observer.observe(el); });
  }

  /* ── Init ────────────────────────────────────────────────── */
  var init = function () {
    initHeader();
    initMobileMenu();
    initCompareSliders();
    initCarousels();
    initGalleryFilters();
    initBookingLegacy();
    initBookingCart();
    initReveal();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Theme-Editor: Sections werden live neu gerendert → Module re-initialisieren
  if (window.Shopify && window.Shopify.designMode) {
    document.addEventListener('shopify:section:load', init);
  }
})();
