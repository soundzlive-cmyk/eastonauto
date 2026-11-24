// Easton Auto Body — website requests -> Google Sheet + email.
// Paste this into Extensions > Apps Script of the "Easton Auto Body Requests" sheet,
// then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).

var NOTIFY = 'eastonautobody@verizon.net, soundzlive@yahoo.com';
var SHEET_NAME = 'Requests';
var PHOTO_FOLDER = 'Easton Auto Body - Request Photos';
var HEADERS = ['Received', 'Source', 'Job type', 'Name', 'Phone', 'Email', 'Contact preference', 'Details', 'Photos', 'Page'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);
    var fields = (d.fields || []).map(function (r) { return [String(r[0]), String(r[1])]; });
    var details = fields.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n');

    // Save photos to Drive and collect them for the email
    var blobs = [], links = [];
    if (d.photos && d.photos.length) {
      var folder = getFolder_();
      var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HHmm');
      d.photos.slice(0, 10).forEach(function (p, i) {
        var blob = Utilities.newBlob(Utilities.base64Decode(p.data), p.type || 'image/jpeg',
          stamp + ' ' + (d.name || 'request') + ' ' + (i + 1) + ' - ' + p.name);
        var file = folder.createFile(blob);
        links.push(file.getUrl());
        blobs.push(blob);
      });
    }

    var sheet = getSheet_();
    sheet.appendRow([new Date(), d.source || '', d.jobType || '', d.name || '', "'" + (d.phone || ''),
      d.email || '', d.pref || '', details, links.join('\n'), d.page || '']);

    var subject = 'New ' + (d.jobType || 'website') + ' request from ' + (d.name || 'website visitor');
    var rows = [['Received', new Date().toLocaleString()], ['Source', d.source || '']].concat(fields);
    var html = '<h2 style="font-family:Arial;color:#c8102e">' + esc_(subject) + '</h2>' +
      '<table cellpadding="6" style="font-family:Arial;font-size:14px;border-collapse:collapse">' +
      rows.map(function (r) {
        return '<tr><td style="border-bottom:1px solid #ddd;font-weight:bold;vertical-align:top">' + esc_(r[0]) +
          '</td><td style="border-bottom:1px solid #ddd">' + esc_(r[1]).replace(/\n/g, '<br>') + '</td></tr>';
      }).join('') + '</table>' +
      (links.length ? '<p style="font-family:Arial">Photos are attached and saved in Google Drive.</p>' : '') +
      '<p style="font-family:Arial;color:#888;font-size:12px">All requests: ' + SpreadsheetApp.getActive().getUrl() + '</p>';

    var opts = { htmlBody: html, name: 'Easton Auto Body Website', attachments: blobs };
    if (d.email && /^\S+@\S+\.\S+$/.test(d.email)) opts.replyTo = d.email;
    MailApp.sendEmail(NOTIFY, subject, details, opts);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() { return json_({ ok: true, status: 'Easton Auto Body request receiver is running' }); }

// Run once from the editor to approve permissions and send a test email.
function testSetup() {
  doPost({ postData: { contents: JSON.stringify({ source: 'Test', jobType: 'Test', name: 'Test Customer',
    phone: '508-555-0100', email: '', pref: 'Call', fields: [['Job type', 'Test'], ['Notes', 'Setup test, you can delete this row.']] }) } });
}

function getSheet_() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#111').setFontColor('#fff');
    sh.setFrozenRows(1);
    sh.setColumnWidth(8, 420);
  }
  return sh;
}

function getFolder_() {
  var it = DriveApp.getFoldersByName(PHOTO_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(PHOTO_FOLDER);
}

function esc_(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
