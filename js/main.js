// Easton Auto Body — light site JS
(function () {
  // mobile menu
  var btn = document.querySelector('.menu-btn'), nav = document.querySelector('.nav');
  if (btn && nav) btn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });

  // reveal on scroll
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .12 });
    els.forEach(function (el) { io.observe(el); });
  } else els.forEach(function (el) { el.classList.add('in'); });

  // Google reviews carousel: auto-scrolls, pauses on hover/focus, honours reduced motion
  document.querySelectorAll('.rv-carousel').forEach(function (c) {
    var track = c.querySelector('.rv-track'), slides = track.children, dots = c.querySelector('.rv-dots'), i = 0, t;
    if (slides.length < 2) return;
    dots.removeAttribute('aria-hidden');
    for (var k = 0; k < slides.length; k++) (function (k) {
      var d = document.createElement('button'); d.type = 'button'; d.setAttribute('aria-label', 'Show review ' + (k + 1));
      d.addEventListener('click', function () { go(k); }); dots.appendChild(d);
    })(k);
    function go(n) {
      i = (n + slides.length) % slides.length;
      track.style.transform = 'translateX(' + (-100 * i) + '%)';
      Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle('on', k === i); });
    }
    function play() { stop(); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) t = setInterval(function () { go(i + 1); }, 6000); }
    function stop() { clearInterval(t); }
    c.addEventListener('mouseenter', stop); c.addEventListener('mouseleave', play);
    c.addEventListener('focusin', stop); c.addEventListener('focusout', play);
    go(0); play();
  });

  // before/after sliders
  document.querySelectorAll('.slider').forEach(function (s) {
    var r = s.querySelector('input'), top = s.querySelector('.top'), h = s.querySelector('.handle');
    function set(v) { top.style.clipPath = 'inset(0 ' + (100 - v) + '% 0 0)'; h.style.left = v + '%'; }
    r.addEventListener('input', function () { set(r.value); });
    set(r.value);
  });

  // gallery filters
  var fbtns = document.querySelectorAll('.filters button');
  fbtns.forEach(function (b) {
    b.addEventListener('click', function () {
      fbtns.forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      var f = b.dataset.f;
      document.querySelectorAll('.g-item').forEach(function (g) {
        g.classList.toggle('hide', f !== 'all' && g.dataset.cat !== f);
      });
    });
  });

  // photo upload list
  var fileIn = document.querySelector('.drop input');
  if (fileIn) fileIn.addEventListener('change', function () {
    var list = document.querySelector('.file-list');
    list.textContent = Array.prototype.map.call(fileIn.files, function (f) { return f.name; }).join(', ');
  });

  // forms: send to the shop's Google Sheet + email (js/send.js), or fall back to the email app
  function labelFor(f, el) {
    var l = el.id && f.querySelector('label[for="' + el.id + '"]');
    if (!l) { var box = el.closest('.radio-row'); l = box && box.parentNode.querySelector('label'); }
    return l ? l.textContent.replace(/\*/g, '').trim() : (el.name || 'Field');
  }
  function collect(f) {
    var out = [], files = [];
    Array.prototype.forEach.call(f.querySelectorAll('input, select, textarea'), function (el) {
      if (el.type === 'file') { files = files.concat(Array.prototype.slice.call(el.files)); return; }
      if (el.type === 'submit' || el.type === 'button') return;
      if (el.type === 'radio' || el.type === 'checkbox') { if (!el.checked) return; out.push([labelFor(f, el), el.parentNode.textContent.trim()]); return; }
      var v = el.tagName === 'SELECT' ? (el.value ? el.options[el.selectedIndex].text : '') : el.value.trim();
      if (v) out.push([labelFor(f, el), v]);
    });
    return { fields: out, files: files };
  }
  function pick(fields, re) { for (var i = 0; i < fields.length; i++) if (re.test(fields[i][0])) return fields[i][1]; return ''; }

  document.querySelectorAll('form[data-form]').forEach(function (f) {
    var kind = f.getAttribute('data-form');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!f.reportValidity()) return;
      var d = collect(f), btn = f.querySelector('[type=submit]');
      var name = pick(d.fields, /name/i), email = pick(d.fields, /^email/i);
      var showOk = function () {
        f.style.display = 'none';
        var ok = f.parentNode.querySelector('.form-success');
        if (ok) { ok.classList.add('show'); ok.scrollIntoView({ block: 'center' }); }
      };
      if (window.EAB && window.EAB.enabled) {
        var label = btn.innerHTML; btn.disabled = true; btn.textContent = 'Sending...';
        var err = f.querySelector('.form-error');
        if (err) err.hidden = true;
        window.EAB.send({ source: kind, jobType: kind, name: name, phone: pick(d.fields, /phone/i), email: email, pref: pick(d.fields, /reach/i), fields: d.fields }, d.files)
          .then(showOk)
          .catch(function () {
            btn.disabled = false; btn.innerHTML = label;
            if (!err) { err = document.createElement('p'); err.className = 'form-note form-error'; err.style.color = 'var(--red)'; btn.parentNode.appendChild(err); }
            err.hidden = false;
            err.innerHTML = 'Sorry, that did not go through. Please try again or call <a href="tel:+15082383611">(508) 238-3611</a>.';
          });
      } else {
        var body = d.fields.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n');
        location.href = 'mailto:eastonautobody@verizon.net?subject=' + encodeURIComponent(kind + (name ? ' from ' + name : '')) + '&body=' + encodeURIComponent(body + (d.files.length ? '\n\n(Please attach your photos to this email.)' : ''));
        showOk();
      }
    });
  });

  var y = document.getElementById('yr'); if (y) y.textContent = new Date().getFullYear();
})();
