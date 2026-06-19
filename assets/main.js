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

    var closeBtn = menu.querySelector('[data-menu-close]');
    var isOpen = false;
    var scrollY = 0;

    // JS ist aktiv → das hidden-Attribut (No-JS-Fallback) entfernen, damit
    // die Sichtbarkeit per CSS-Klasse animiert gesteuert werden kann.
    menu.removeAttribute('hidden');

    var setOpen = function (open) {
      if (open === isOpen) return; // idempotent: kein versehentliches scrollTo
      isOpen = open;
      toggle.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('is-open', open);

      if (open) {
        // Scroll-Position merken und Body fixieren (Scroll-Lock ohne Shift)
        scrollY = window.scrollY;
        document.body.style.top = '-' + scrollY + 'px';
        document.body.classList.add('menu-open');
        // Fokus auf das Schließen-X (erstes fokussierbares Element)
        (menu.querySelector('button, a') || menu).focus();
      } else {
        document.body.classList.remove('menu-open');
        document.body.style.top = '';
        window.scrollTo(0, scrollY); // exakte Position wiederherstellen
        toggle.focus(); // Fokus zurück zum Burger
      }
    };

    toggle.addEventListener('click', function () { setOpen(!isOpen); });
    if (closeBtn) closeBtn.addEventListener('click', function () { setOpen(false); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) setOpen(false);
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

    // Wochenend-/Kapazitäts-Check (gilt auch für das native Date-Input,
    // falls Flatpickr nicht geladen wurde)
    var isWeekend = function (iso) {
      var day = new Date(iso + 'T12:00:00').getDay();
      return day === 0 || day === 6;
    };

    // Ein Tag ist „ausgebucht“, wenn er MANUELL gesperrt ist
    // (booking.blocked_dates, z. B. Urlaub) ODER der Buchungszähler
    // (booking.daily_bookings) die Tageskapazität erreicht — Standard 3
    // parallele Termine, nicht schon nach der ersten Buchung.
    var capacity = config.capacity || 3;
    var manualBlocked = Array.isArray(config.blockedDates) ? config.blockedDates : [];
    var dailyBookings = config.dailyBookings || {};
    var isDayFull = function (iso) {
      if (manualBlocked.indexOf(iso) !== -1) return true;
      return (dailyBookings[iso] || 0) >= capacity;
    };
    // Kalender-Modul nutzt exakt dieselbe Logik (eine Quelle der Wahrheit)
    config.isDayFull = isDayFull;

    // Paket-Exklusivität: Leistungen, die in einem gewählten Paket stecken,
    // werden gesperrt („Im Paket enthalten“) statt doppelt wählbar zu sein.
    // Wird das Paket abgewählt, sind sie sofort wieder einzeln verfügbar.
    var applyBundleLocks = function () {
      var lockedHandles = {};
      checkboxes.forEach(function (cb) {
        if (cb.checked && cb.dataset.includes) {
          cb.dataset.includes.split(',').forEach(function (h) {
            if (h) lockedHandles[h] = true;
          });
        }
      });
      checkboxes.forEach(function (cb) {
        if (cb.dataset.includes !== undefined) return; // Pakete selbst nie sperren
        var locked = !!lockedHandles[cb.dataset.serviceHandle];
        if (locked && cb.checked) cb.checked = false; // im Paket → Einzelwahl no-op
        cb.disabled = locked || cb.dataset.soldout === '1';
        var card = cb.closest('.service-select');
        if (card) {
          card.classList.toggle('is-locked', locked);
          var lockEl = card.querySelector('[data-bundle-lock]');
          if (lockEl) lockEl.hidden = !locked;
        }
      });
    };

    var updateSummary = function () {
      applyBundleLocks();

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

      // Auswahl übersteht Seitenwechsel (Quality Bar) — URL-Param hat Vorrang
      try {
        sessionStorage.setItem('klaro-booking-selection', JSON.stringify(
          items.map(function (cb) { return cb.dataset.serviceHandle; })
        ));
      } catch (e) { /* Private Mode o. Ä. — Persistenz ist optional */ }

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

      if (typeof updateUpsell === 'function') updateUpsell();
      if (stepper) stepper.render();
    };

    /* ── Paket-Upsell (bundle-recommender.js, pure & getestet) ──
       Tipp bei genau einer Einzelleistung, Smart-Upgrade ab zwei.
       Beide nur ohne bereits gewähltes Paket, beide session-dismissbar,
       und beide schweigen, wenn kein echter Win-Win existiert. */
    var recommender = (window.KlaroClean && window.KlaroClean.bundleRecommender) || null;
    var upsellTip = root.querySelector('[data-upsell-tip]');
    var upgradeEl = root.querySelector('[data-upsell-upgrade]');

    var servicesData = {};
    var bundlesData = [];
    checkboxes.forEach(function (cb) {
      if (cb.dataset.includes !== undefined) {
        bundlesData.push({
          handle: cb.dataset.serviceHandle,
          title: cb.dataset.title,
          cents: parseInt(cb.dataset.priceCents, 10) || 0,
          includes: cb.dataset.includes.split(',').filter(Boolean)
        });
      } else {
        servicesData[cb.dataset.serviceHandle] = {
          cents: parseInt(cb.dataset.priceCents, 10) || 0,
          title: cb.dataset.title
        };
      }
    });

    var upsellDismissed = function (key) {
      try { return sessionStorage.getItem('upsell-dismissed-' + key) === '1'; } catch (e) { return false; }
    };
    var dismissUpsell = function (key) {
      try { sessionStorage.setItem('upsell-dismissed-' + key, '1'); } catch (e) { /* optional */ }
    };

    var extrasNames = function (handles) {
      return handles.map(function (h) {
        return (servicesData[h] && servicesData[h].title) || h;
      }).join(' + ');
    };

    var fillTemplate = function (tmpl, rec) {
      return (tmpl || '')
        .replace('[bundle]', rec.bundle.title)
        .replace('[extras]', extrasNames(rec.extras))
        .replace('[delta]', '+' + money.format(rec.upcharge / 100))
        .replace('[value]', money.format(rec.extrasValue / 100));
    };

    var switchToBundle = function (handle) {
      var bundleCb = root.querySelector('[data-bundle-checkbox][data-service-handle="' + handle + '"]');
      if (!bundleCb || bundleCb.disabled) return;
      bundleCb.checked = true;
      // change-Event nutzt die normale Logik: Locks, Exklusivität, Summary
      bundleCb.dispatchEvent(new Event('change', { bubbles: true }));
    };

    var updateUpsell = function () {
      if (!recommender || !bundlesData.length) return;
      var items = selected();
      var singles = items.filter(function (cb) { return cb.dataset.includes === undefined; });
      var singleHandles = singles.map(function (cb) { return cb.dataset.serviceHandle; });
      var bundleSelected = items.length !== singles.length;

      // Tipp: genau EINE Einzelleistung, kein Paket aktiv
      if (upsellTip) {
        var tip = null;
        if (!bundleSelected && singleHandles.length === 1) {
          tip = recommender.suggestForService(singleHandles[0], singleHandles, bundlesData, servicesData);
        }
        if (tip && !upsellDismissed(tip.bundle.handle)) {
          upsellTip.querySelector('[data-tip-text]').textContent = fillTemplate(strings.upsellTip, tip);
          upsellTip.dataset.bundleHandle = tip.bundle.handle;
          // unter die gewählte Karte schieben (volle Grid-Breite via CSS)
          var card = singles[0].closest('.service-select');
          if (card && card.nextElementSibling !== upsellTip) {
            card.parentNode.insertBefore(upsellTip, card.nextElementSibling);
          }
          upsellTip.hidden = false;
        } else {
          upsellTip.hidden = true;
        }
      }

      // Smart-Upgrade: 2+ Einzelleistungen, nur bei echtem Win-Win
      if (upgradeEl) {
        var rec = null;
        if (!bundleSelected && singleHandles.length >= 2) {
          rec = recommender.recommendUpgrade(singleHandles, bundlesData, servicesData);
        }
        if (rec && !upsellDismissed('upgrade-' + rec.bundle.handle)) {
          upgradeEl.querySelector('[data-upsell-headline]').textContent = fillTemplate(strings.upsellHeadline, rec);
          upgradeEl.querySelector('[data-upsell-text]').textContent = fillTemplate(strings.upsellText, rec);
          upgradeEl.dataset.bundleHandle = rec.bundle.handle;
          if (upgradeEl.hidden) {
            // Desktop standardmäßig offen, mobil kollabierte Zeile
            upgradeEl.open = window.matchMedia('(min-width: 990px)').matches;
          }
          upgradeEl.hidden = false;
        } else {
          upgradeEl.hidden = true;
        }
      }
    };

    if (upsellTip) {
      upsellTip.querySelector('[data-tip-accept]').addEventListener('click', function () {
        switchToBundle(upsellTip.dataset.bundleHandle);
      });
      upsellTip.querySelector('[data-tip-dismiss]').addEventListener('click', function () {
        dismissUpsell(upsellTip.dataset.bundleHandle);
        upsellTip.hidden = true;
      });
    }

    if (upgradeEl) {
      upgradeEl.querySelector('[data-upsell-accept]').addEventListener('click', function () {
        switchToBundle(upgradeEl.dataset.bundleHandle);
      });
      upgradeEl.querySelector('[data-upsell-dismiss]').addEventListener('click', function () {
        dismissUpsell('upgrade-' + upgradeEl.dataset.bundleHandle);
        upgradeEl.hidden = true;
      });
    }

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
          if (!iso || !isWeekend(iso) || isDayFull(iso)) {
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
        // Pakete schließen sich gegenseitig aus, sobald sich ihre
        // enthaltenen Leistungen überlappen (das neue ersetzt das alte).
        if (cb.checked && cb.dataset.includes !== undefined) {
          var mine = cb.dataset.includes.split(',');
          checkboxes.forEach(function (other) {
            if (other !== cb && other.checked && other.dataset.includes !== undefined) {
              var overlap = other.dataset.includes.split(',').some(function (h) {
                return h && mine.indexOf(h) !== -1;
              });
              if (overlap) other.checked = false;
            }
          });
        }
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

    // Ohne URL-Param: zuletzt gemerkte Auswahl wiederherstellen
    // (z. B. Rücksprung von /preise auf die Buchungsseite)
    if (!preselected) {
      try {
        JSON.parse(sessionStorage.getItem('klaro-booking-selection') || '[]').forEach(function (handle) {
          var cb = root.querySelector('[data-service-checkbox][data-service-handle="' + handle + '"]');
          if (cb && !cb.disabled) cb.checked = true;
        });
      } catch (e) { /* defekter Storage-Eintrag → einfach leer starten */ }
    }

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
            var itemProps = {};
            for (var key in properties) itemProps[key] = properties[key];
            if (cb.dataset.includes) {
              // Verstecktes Property (Unterstrich-Prefix): im Admin abfragbar,
              // für Kund:innen unsichtbar. Die enthaltenen Leistungen werden
              // bewusst NICHT als eigene Positionen hinzugefügt — Paketpreis
              // PLUS Einzelpreise würde doppelt verrechnen.
              itemProps['_bundle_includes'] = cb.dataset.includes;
            }
            return { id: parseInt(cb.value, 10), quantity: 1, properties: itemProps };
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

    // Verfügbarkeit: Section-Config zuerst, window-Globals als Fallback
    // (beide werden in booking-form.liquid gesetzt)
    var capacity = config.capacity || 3;
    var manualBlocked = Array.isArray(config.blockedDates) && config.blockedDates.length
      ? config.blockedDates
      : ((window.KlaroClean && window.KlaroClean.bookedDates) || []);
    var dailyBookings = config.dailyBookings ||
      (window.KlaroClean && window.KlaroClean.dailyBookings) || {};
    var isDayFull = config.isDayFull || function (iso) {
      if (manualBlocked.indexOf(iso) !== -1) return true;
      return (dailyBookings[iso] || 0) >= capacity;
    };
    var strings = config.strings || {};

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
          // Alles AUSSER Samstag (6) und Sonntag (0) deaktivieren …
          var day = date.getDay();
          if (day !== 0 && day !== 6) return true;
          // … und volle Tage: manuell gesperrt ODER Kapazität erreicht
          return isDayFull(toIso(date));
        }
      ],
      // Drei-Zustands-Optik: läuft pro Tageszelle bei JEDEM Rendern —
      // überlebt damit Monatswechsel (im Gegensatz zu Init-Zeit-Klassen).
      onDayCreate: function (dObj, dStr, fp, dayElem) {
        var date = dayElem.dateObj;
        var day = date.getDay();
        if (day !== 0 && day !== 6) return; // Werktage: Standard-Disabled-Optik

        var iso = toIso(date);
        if (isDayFull(iso)) {
          dayElem.classList.add('day-booked');
          dayElem.setAttribute('aria-label',
            (dayElem.getAttribute('aria-label') || dStr) + ' – ' + (strings.booked || 'ausgebucht'));
        } else if (!dayElem.classList.contains('flatpickr-disabled')) {
          // verfügbar = künftiges Wochenende innerhalb des Buchungsfensters
          dayElem.classList.add('day-available');
          // Dezenter Hinweis auf Restplätze — nur im aria-label/Tooltip,
          // nicht in der Zelle selbst ("Samstag, 14. Juni – noch 1 Termin verfügbar")
          var count = dailyBookings[iso] || 0;
          if (count > 0 && count < capacity) {
            var left = capacity - count;
            var tmpl = (left === 1 ? strings.slotsOne : strings.slotsOther) || 'noch # verfügbar';
            var hint = tmpl.replace('#', left);
            dayElem.setAttribute('aria-label',
              (dayElem.getAttribute('aria-label') || dStr) + ' – ' + hint);
            dayElem.setAttribute('title', hint);
          }
        }
      },
      onChange: function (dates, dateStr, instance) {
        onDate(dates.length ? instance.altInput.value : '');
      },
      // Bugfix Monatsnavigation: disable-Logik nach jedem Monats-/Jahres-
      // wechsel neu auswerten lassen — sonst können Wochenend-Tage im
      // Folgemonat fälschlich ausgegraut bleiben. Wichtig: disable bleibt
      // eine Funktion (keine vorberechneten Daten) und die ISO-Berechnung
      // ist lokal (toIso) statt toISOString(), das in UTC kippen würde.
      onMonthChange: function (dates, dateStr, instance) {
        instance.redraw();
      },
      onYearChange: function (dates, dateStr, instance) {
        instance.redraw();
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
