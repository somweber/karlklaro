/* ============================================================
   KlaroClean — main.js
   Minimales Vanilla-JS, ausschließlich Progressive Enhancement:
   Ohne JS bleiben Navigation, Formulare und Inhalte voll nutzbar.

   Module: Header / Mobile-Menü / Vorher-Nachher-Slider /
           Carousel / Galerie-Filter / Buchungs-Stepper / Scroll-Reveal
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

  /* ── Buchungsformular: 3-Schritte-Stepper ──────────────────
     Ohne JS werden alle Schritte untereinander angezeigt und das
     Formular funktioniert als klassisches Kontaktformular. */
  function initBookingStepper() {
    document.querySelectorAll('[data-booking-form]').forEach(function (form) {
      var steps = Array.prototype.slice.call(form.querySelectorAll('[data-booking-step]'));
      var prev = form.querySelector('[data-booking-prev]');
      var next = form.querySelector('[data-booking-next]');
      var submit = form.querySelector('[data-booking-submit]');
      var progress = form.querySelectorAll('[data-booking-progress] li');
      if (steps.length < 2 || !prev || !next || !submit) return;

      var current = 0;
      form.classList.add('booking--enhanced');

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
      };

      // Native Validierung nur für die Felder des aktuellen Schritts
      var stepValid = function () {
        var fields = steps[current].querySelectorAll('input, select, textarea');
        for (var i = 0; i < fields.length; i++) {
          if (!fields[i].checkValidity()) {
            fields[i].reportValidity();
            return false;
          }
        }
        return true;
      };

      next.addEventListener('click', function () {
        if (!stepValid()) return;
        current = Math.min(current + 1, steps.length - 1);
        render();
        steps[current].querySelector('input, select, textarea')?.focus();
      });

      prev.addEventListener('click', function () {
        current = Math.max(current - 1, 0);
        render();
      });

      render();
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
    initBookingStepper();
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
