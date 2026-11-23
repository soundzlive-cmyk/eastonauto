// Easton Auto Body — job intake assistant (scripted guided chat, no AI backend)
(function () {
  var SHOP_EMAIL = 'contactus@eastonautobody.net';
  var SHOP_PHONE = '(508) 238-3611', SHOP_TEL = '+15082383611';
  // Set this to a Formspree (or similar) endpoint to send requests straight to the shop,
  // photos included. Left empty, "Send" opens the customer's email app instead.
  var FORM_ENDPOINT = '';

  var VEHICLE = { key: 'vehicle', type: 'text', q: 'What vehicle is it? Year, make and model.', ph: 'e.g. 2019 Honda Accord', label: 'Vehicle' };
  var PHOTOS = { key: 'photos', type: 'file', q: 'Photos help us a lot. Add a few of the damage or the area, or skip.', label: 'Photos' };
  var CONTACT = { key: 'contact', type: 'contact', q: 'Last step. How do we reach you?', label: 'Contact' };

  var FLOWS = {
    insurance: { title: 'Insurance claim', steps: [
      { key: 'filed', type: 'choice', q: 'Have you already opened a claim with an insurance company?', opts: ['Yes, claim is open', 'Not yet', 'Not sure'], label: 'Claim filed' },
      { key: 'whose', type: 'choice', q: 'Whose insurance is covering it?', opts: ['My insurance', "The other driver's insurance", 'Not sure yet'], label: 'Covering insurer' },
      { key: 'insurer', type: 'text', q: 'Which insurance company?', ph: 'e.g. Safety, Arbella, Progressive', label: 'Insurance company', skip: true },
      { key: 'claimNo', type: 'text', q: 'Claim number, if you have it.', ph: 'Claim #', label: 'Claim number', skip: true, when: function (a) { return a.filed === 'Yes, claim is open'; } },
      { key: 'date', type: 'date', q: 'When did the accident happen?', label: 'Accident date', skip: true },
      { key: 'drivable', type: 'choice', q: 'Is the car drivable right now?', opts: ['Yes, drivable', 'No, needs a tow', 'Not sure'], label: 'Drivable' },
      VEHICLE,
      { key: 'damage', type: 'textarea', q: 'Tell us what happened and where the car is damaged.', ph: 'e.g. Rear-ended at a light, rear bumper and trunk pushed in', label: 'Damage' },
      PHOTOS, CONTACT
    ]},
    repair: { title: 'Simple repair', steps: [
      { key: 'kind', type: 'choice', q: 'What needs fixing?', opts: ['Dent or ding', 'Scratch or scuff', 'Bumper damage', 'Paint touch-up', 'Something else'], label: 'Repair type' },
      { key: 'where', type: 'text', q: 'Where on the vehicle?', ph: 'e.g. Driver side rear door', label: 'Location on vehicle' },
      VEHICLE,
      { key: 'pay', type: 'choice', q: 'How are you planning to pay?', opts: ['Out of pocket', 'Might go through insurance', 'Not sure yet'], label: 'Payment' },
      { key: 'notes', type: 'textarea', q: 'Anything else we should know?', ph: 'Optional', label: 'Notes', skip: true },
      PHOTOS, CONTACT
    ]},
    custom: { title: 'Custom job', steps: [
      { key: 'kind', type: 'choice', q: 'What kind of custom work?', opts: ['Custom paint or color change', 'Restoration', 'Body kit or modifications', 'Graphics or accents', 'Something else'], label: 'Custom work' },
      VEHICLE,
      { key: 'vision', type: 'textarea', q: 'Describe what you have in mind. Colors, finish, inspiration, anything.', ph: 'e.g. Full respray in a satin dark grey, black out the trim', label: 'Description' },
      { key: 'budget', type: 'choice', q: 'Do you have a budget range in mind?', opts: ['Under $2,500', '$2,500 to $7,500', '$7,500 to $15,000', '$15,000+', 'Not sure yet'], label: 'Budget' },
      { key: 'timeline', type: 'choice', q: 'When are you hoping to get started?', opts: ['As soon as possible', 'In the next 1 to 3 months', 'Just planning', 'Flexible'], label: 'Timeline' },
      { key: 'photos', type: 'file', q: 'Add photos of the car or any inspiration pics, or skip.', label: 'Photos' },
      CONTACT
    ]}
  };

  var root, log, input, flow, step, answers, files;

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function build() {
    var launch = el('button', 'ia-launch', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>Start a job</span>');
    launch.type = 'button'; launch.setAttribute('aria-label', 'Open job intake assistant');
    root = el('div', 'ia-panel');
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Job intake assistant'); root.hidden = true;
    root.innerHTML = '<div class="ia-head"><div><strong>Easton Auto Body</strong><span>Job intake assistant</span></div>' +
      '<button type="button" class="ia-restart" title="Start over" aria-label="Start over">&#8634;</button>' +
      '<button type="button" class="ia-close" aria-label="Close">&times;</button></div>' +
      '<div class="ia-log" aria-live="polite"></div><div class="ia-input"></div>';
    document.body.appendChild(launch); document.body.appendChild(root);
    log = root.querySelector('.ia-log'); input = root.querySelector('.ia-input');
    launch.addEventListener('click', function () { open(); });
    root.querySelector('.ia-close').addEventListener('click', close);
    root.querySelector('.ia-restart').addEventListener('click', start);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !root.hidden) close(); });
    // any link/button with data-intake="insurance|repair|custom" (or empty) opens the assistant
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-intake]');
      if (!t) return; e.preventDefault(); open(t.getAttribute('data-intake'));
    });
    var p = new URLSearchParams(location.search).get('intake');
    if (p !== null) open(p);
  }

  function open(path) {
    root.hidden = false; document.body.classList.add('ia-open');
    if (path && FLOWS[path]) { start(); pick(path); }
    else if (!log.children.length) start();
  }
  function close() { root.hidden = true; document.body.classList.remove('ia-open'); }

  function bot(html) { var m = el('div', 'ia-msg ia-bot', html); log.appendChild(m); scroll(); return m; }
  function me(text) { var m = el('div', 'ia-msg ia-me'); m.textContent = text; log.appendChild(m); scroll(); }
  function scroll() { log.scrollTop = log.scrollHeight; }

  function start() {
    log.innerHTML = ''; input.innerHTML = ''; flow = null; step = -1; answers = {}; files = [];
    bot('Hi! I can get your job started and send the details to the shop. What are we working on?');
    choices([['Insurance claim', 'insurance'], ['Simple repair', 'repair'], ['Custom job', 'custom'], ['I just have a question', 'q']], function (v, label) {
      me(label);
      if (v === 'q') { bot('No problem. Call us at <a href="tel:' + SHOP_TEL + '">' + SHOP_PHONE + '</a> or email <a href="mailto:' + SHOP_EMAIL + '">' + SHOP_EMAIL + '</a>.'); return restartBtn(); }
      pick(v, true);
    });
  }

  function pick(v, echoed) {
    flow = FLOWS[v]; answers.type = flow.title;
    if (!echoed) me(flow.title);
    if (v === 'insurance') bot('Good call. Our owner, Jose Andrade, is a licensed auto damage appraiser and we work with every insurer. A few quick questions.');
    else if (v === 'custom') bot('Love it. Tell us about the project and we will follow up to talk it through.');
    else bot('Easy. A few quick questions and we will get you an estimate.');
    step = -1; next();
  }

  function next() {
    input.innerHTML = '';
    do { step++; } while (step < flow.steps.length && flow.steps[step].when && !flow.steps[step].when(answers));
    if (step >= flow.steps.length) return summary();
    var s = flow.steps[step];
    setTimeout(function () { bot(esc(s.q)); ask(s); }, 220);
  }

  function answer(s, val, shown) { answers[s.key] = val; me(shown != null ? shown : val); next(); }

  function choices(list, cb) {
    input.innerHTML = '';
    var w = el('div', 'ia-choices');
    list.forEach(function (o) {
      var b = el('button', 'ia-chip'); b.type = 'button'; b.textContent = o[0];
      b.addEventListener('click', function () { input.innerHTML = ''; cb(o[1], o[0]); });
      w.appendChild(b);
    });
    input.appendChild(w);
  }

  function skipBtn(s, row) {
    if (!s.skip && s.type !== 'file') return;
    var k = el('button', 'ia-skip', 'Skip'); k.type = 'button';
    k.addEventListener('click', function () { answer(s, '', 'Skip'); });
    row.appendChild(k);
  }

  function ask(s) {
    if (s.type === 'choice') return choices(s.opts.map(function (o) { return [o, o]; }), function (v) { answer(s, v); });
    var f = el('form', 'ia-form'); f.noValidate = true;
    if (s.type === 'contact') {
      f.innerHTML = '<input name="name" placeholder="Your name" autocomplete="name" required>' +
        '<input name="phone" type="tel" placeholder="Phone" autocomplete="tel">' +
        '<input name="email" type="email" placeholder="Email" autocomplete="email">' +
        '<select name="pref"><option>Call me</option><option>Text me</option><option>Email me</option></select>' +
        '<p class="ia-err" hidden></p><div class="ia-row"><button class="ia-send" type="submit">Continue</button></div>';
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var n = f.name.value.trim(), p = f.phone.value.trim(), m = f.email.value.trim(), err = f.querySelector('.ia-err');
        var msg = !n ? 'Please add your name.' : (!p && !m) ? 'Please add a phone number or email.' :
          (m && !/^\S+@\S+\.\S+$/.test(m)) ? 'That email does not look right.' : (p && p.replace(/\D/g, '').length < 10) ? 'Please use a 10 digit phone number.' : '';
        if (msg) { err.textContent = msg; err.hidden = false; return; }
        answers.name = n; answers.phone = p; answers.email = m; answers.pref = f.pref.value;
        answer(s, '', [n, p, m].filter(Boolean).join(' · '));
      });
    } else if (s.type === 'file') {
      f.innerHTML = '<label class="ia-file"><input type="file" accept="image/*" multiple><span>Choose photos</span></label><div class="ia-row"><button class="ia-send" type="submit">Continue</button></div>';
      var fi = f.querySelector('input'), lbl = f.querySelector('.ia-file span');
      fi.addEventListener('change', function () { lbl.textContent = fi.files.length ? fi.files.length + ' photo' + (fi.files.length > 1 ? 's' : '') + ' selected' : 'Choose photos'; });
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        files = Array.prototype.slice.call(fi.files);
        answer(s, files.map(function (x) { return x.name; }).join(', '), files.length ? files.length + ' photo' + (files.length > 1 ? 's' : '') + ' added' : 'No photos');
      });
    } else {
      var field = s.type === 'textarea' ? '<textarea rows="3"></textarea>' : '<input type="' + (s.type === 'date' ? 'date' : 'text') + '">';
      f.innerHTML = field + '<div class="ia-row"><button class="ia-send" type="submit">Send</button></div>';
      var inp = f.querySelector('input,textarea');
      if (s.ph) inp.placeholder = s.ph;
      if (s.type === 'date') inp.max = new Date().toISOString().slice(0, 10);
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && s.type === 'textarea') { e.preventDefault(); f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit')); } });
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = inp.value.trim(); if (!v) { if (s.skip) return answer(s, '', 'Skip'); inp.focus(); return; }
        if (s.type === 'date') v = new Date(v + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        answer(s, v);
      });
      setTimeout(function () { inp.focus(); }, 50);
    }
    skipBtn(s, f.querySelector('.ia-row'));
    input.appendChild(f);
  }

  function lines() {
    var out = [['Job type', answers.type]];
    flow.steps.forEach(function (s) { if (s.key !== 'contact' && answers[s.key]) out.push([s.label, answers[s.key]]); });
    out.push(['Name', answers.name]);
    if (answers.phone) out.push(['Phone', answers.phone]);
    if (answers.email) out.push(['Email', answers.email]);
    out.push(['Contact preference', answers.pref]);
    return out;
  }

  function summary() {
    var L = lines();
    var html = '<strong>Here is your request:</strong><dl class="ia-sum">' + L.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl>';
    bot(html);
    bot('Look right? Send it to the shop and we will get back to you, usually within one business day.');
    var w = el('div', 'ia-choices');
    var send = el('button', 'ia-chip ia-primary', 'Send to the shop'); send.type = 'button';
    var call = el('a', 'ia-chip', 'Call ' + SHOP_PHONE); call.href = 'tel:' + SHOP_TEL;
    var again = el('button', 'ia-chip', 'Start over'); again.type = 'button'; again.addEventListener('click', start);
    send.addEventListener('click', function () { submit(L, send); });
    w.appendChild(send); w.appendChild(call); w.appendChild(again);
    input.innerHTML = ''; input.appendChild(w);
  }

  function submit(L, btn) {
    var text = L.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n');
    var subject = 'New ' + answers.type.toLowerCase() + ' request from ' + answers.name;
    if (FORM_ENDPOINT) {
      btn.disabled = true; btn.textContent = 'Sending...';
      var fd = new FormData();
      fd.append('_subject', subject);
      L.forEach(function (r) { fd.append(r[0], r[1]); });
      if (answers.email) fd.append('_replyto', answers.email);
      files.forEach(function (f) { fd.append('photos', f); });
      fetch(FORM_ENDPOINT, { method: 'POST', body: fd, headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw 0; done(); })
        .catch(function () { btn.disabled = false; btn.textContent = 'Send to the shop'; bot('Sorry, that did not go through. Please try again or call <a href="tel:' + SHOP_TEL + '">' + SHOP_PHONE + '</a>.'); });
    } else {
      location.href = 'mailto:' + SHOP_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(text + '\n\n(Sent from the website intake assistant)');
      bot('Your email app should open with everything filled in. Just hit send' + (files.length ? ', and attach your photos to that email.' : '.') + ' Prefer to talk? Call <a href="tel:' + SHOP_TEL + '">' + SHOP_PHONE + '</a>.');
    }
  }

  function done() {
    input.innerHTML = '';
    bot('Thanks, ' + esc(answers.name.split(' ')[0]) + '! Your request is in. We will reach out soon. Need us sooner? Call <a href="tel:' + SHOP_TEL + '">' + SHOP_PHONE + '</a>.');
    restartBtn();
  }

  function restartBtn() {
    var w = el('div', 'ia-choices'), b = el('button', 'ia-chip', 'Start over'); b.type = 'button';
    b.addEventListener('click', start); w.appendChild(b); input.innerHTML = ''; input.appendChild(w);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
