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

  // forms: no backend yet, show a confirmation instead
  document.querySelectorAll('form[data-demo]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      f.style.display = 'none';
      var ok = f.parentNode.querySelector('.form-success');
      if (ok) { ok.classList.add('show'); ok.scrollIntoView({ block: 'center' }); }
    });
  });

  var y = document.getElementById('yr'); if (y) y.textContent = new Date().getFullYear();
})();
