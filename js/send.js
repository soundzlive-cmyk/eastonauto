// Easton Auto Body — sends website requests to the shop's Google Sheet,
// which logs a row and emails the shop (see google-sheet/Code.gs).
(function () {
  // Paste the Google Apps Script "Web app URL" here (ends in /exec).
  // Left empty, forms fall back to opening the customer's email app.
  var SHEET_URL = '';

  // Shrink photos to keep uploads fast (max 1600px, JPEG).
  function shrink(file) {
    return new Promise(function (resolve) {
      var fail = function () { resolve(null); };
      if (!/^image\//.test(file.type)) return fail();
      var img = new Image(), url = URL.createObjectURL(file);
      img.onerror = function () { URL.revokeObjectURL(url); fail(); };
      img.onload = function () {
        var max = 1600, s = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        var name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
        resolve({ name: name, type: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.82).split(',')[1] });
      };
      img.src = url;
    });
  }

  // payload: { source, jobType, name, phone, email, pref, fields: [[label, value], ...] }
  function send(payload, files) {
    files = Array.prototype.slice.call(files || [], 0, 10);
    return Promise.all(files.map(shrink)).then(function (photos) {
      payload.photos = photos.filter(Boolean);
      payload.page = location.href;
      return fetch(SHEET_URL, { method: 'POST', body: JSON.stringify(payload) });
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || 'Send failed');
      return j;
    });
  }

  window.EAB = { enabled: !!SHEET_URL, send: send };
})();
