(function () {
  'use strict';
  var CATS = ['Electronics','Books & Notes','ID & Cards','Keys','Clothing','Bags','Accessories','Other'];
  var BASE = (window.API_BASE || '').replace(/\/$/, '');
  var LS = 'clf_demo_items';
  var demo = false;
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 2800);
  }
  function today() { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }

  // ---------- demo (browser-only) storage, used if the backend is unreachable ----------
  function demoLoad() {
    try { var v = JSON.parse(localStorage.getItem(LS)); if (Array.isArray(v)) return v; } catch (e) {}
    var seed = [
      { id: 'd1', type: 'lost', title: 'Black laptop bag', description: 'Contains a charger and a blue notebook.', category: 'Bags', location: 'Central Library, 2nd floor', event_date: today(), contact_name: 'Ravi', contact_info: 'ravi@campus.edu', status: 'open', created_at: new Date().toISOString() },
      { id: 'd2', type: 'found', title: 'Student ID card', description: 'Found near the canteen entrance.', category: 'ID & Cards', location: 'Main Canteen', event_date: today(), contact_name: 'Ananya', contact_info: 'ananya@campus.edu', status: 'open', created_at: new Date().toISOString() }
    ];
    demoSave(seed); return seed;
  }
  function demoSave(v) { try { localStorage.setItem(LS, JSON.stringify(v)); } catch (e) {} }

  // ---------- API ----------
  function api(path, opts) {
    return fetch(BASE + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error || 'Request failed (' + r.status + ')');
        return j;
      });
    });
  }
  function getItems(f) {
    if (!demo) {
      var p = new URLSearchParams();
      Object.keys(f).forEach(function (k) { if (f[k]) p.set(k, f[k]); });
      return api('/api/items?' + p.toString());
    }
    var q = f.q.toLowerCase();
    return Promise.resolve(demoLoad().filter(function (i) {
      return (!f.type || i.type === f.type) && (!f.category || i.category === f.category) && (!f.status || i.status === f.status) &&
        (!q || (i.title + ' ' + i.description + ' ' + i.location).toLowerCase().indexOf(q) > -1);
    }));
  }
  function createItem(data) {
    if (!demo) return api('/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    var all = demoLoad(); data.id = 'd' + Date.now(); data.status = 'open'; data.created_at = new Date().toISOString();
    all.unshift(data); demoSave(all); return Promise.resolve(data);
  }
  function resolveItem(id) {
    if (!demo) return api('/api/items/' + encodeURIComponent(id) + '/resolve', { method: 'PATCH' });
    var all = demoLoad(); all.forEach(function (i) { if (i.id === id) i.status = 'resolved'; }); demoSave(all); return Promise.resolve({});
  }
  function getStats() {
    if (!demo) return api('/api/stats');
    var a = demoLoad();
    return Promise.resolve({
      lost: a.filter(function (i) { return i.type === 'lost' && i.status === 'open'; }).length,
      found: a.filter(function (i) { return i.type === 'found' && i.status === 'open'; }).length,
      resolved: a.filter(function (i) { return i.status === 'resolved'; }).length
    });
  }

  // ---------- UI ----------
  function filters() { return { q: $('q').value.trim(), type: $('fType').value, category: $('fCat').value, status: $('fStatus').value }; }

  function render(items) {
    $('empty').hidden = items.length > 0;
    $('list').innerHTML = items.map(function (i) {
      var d = i.event_date ? new Date(i.event_date + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      return '<article class="card ' + esc(i.type) + (i.status === 'resolved' ? ' done' : '') + '">' +
        '<span class="tag">' + (i.type === 'lost' ? 'Lost' : 'Found') + '</span>' +
        '<h3>' + esc(i.title) + '</h3>' +
        (i.description ? '<p>' + esc(i.description) + '</p>' : '') +
        '<div class="meta"><span>' + esc(i.category) + '</span><span>' + esc(i.location) + '</span><span>' + esc(d) + '</span></div>' +
        '<div class="contact"><span>' + esc(i.contact_name) + ': ' + esc(i.contact_info) + '</span>' +
        (i.status === 'resolved' ? '<span>Returned</span>' : '<button class="link" type="button" data-id="' + esc(i.id) + '">Mark as returned</button>') +
        '</div></article>';
    }).join('');
  }

  function refresh() {
    getStats().then(function (s) {
      $('sLost').textContent = s.lost; $('sFound').textContent = s.found; $('sDone').textContent = s.resolved;
    }).catch(function () {});
    return getItems(filters()).then(render).catch(function (e) {
      render([]); toast(e.message);
    });
  }

  function init() {
    var opts = CATS.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
    $('fCat').insertAdjacentHTML('beforeend', opts);
    $('catSel').innerHTML = '<option value="">Choose a category</option>' + opts;
    $('dateIn').value = today(); $('dateIn').max = today();

    var timer;
    $('q').addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(refresh, 250); });
    ['fType', 'fCat', 'fStatus'].forEach(function (id) { $(id).addEventListener('change', refresh); });

    $('openForm').addEventListener('click', function () { $('formErr').hidden = true; $('dlg').showModal(); });
    $('cancel').addEventListener('click', function () { $('dlg').close(); });

    $('list').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-id]'); if (!b) return;
      b.disabled = true;
      resolveItem(b.getAttribute('data-id')).then(function () { toast('Marked as returned'); refresh(); })
        .catch(function (err) { b.disabled = false; toast(err.message); });
    });

    $('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData($('form')), data = {};
      fd.forEach(function (v, k) { data[k] = String(v).trim(); });
      var err = $('formErr');
      var msg = data.title.length < 3 ? 'Item name needs at least 3 characters.' :
        !data.category ? 'Choose a category.' :
        data.location.length < 2 ? 'Add a location.' :
        data.contact_name.length < 2 ? 'Add your name.' :
        data.contact_info.length < 5 ? 'Add an email or phone number.' : '';
      if (msg) { err.textContent = msg; err.hidden = false; return; }
      err.hidden = true; $('submitBtn').disabled = true;
      createItem(data).then(function () {
        $('dlg').close(); $('form').reset(); $('dateIn').value = today(); toast('Item posted'); refresh();
      }).catch(function (x) { err.textContent = x.message; err.hidden = false; })
        .then(function () { $('submitBtn').disabled = false; });
    });

    // Detect backend; fall back to demo mode so the page always works
    api('/api/health').then(function () { demo = false; }).catch(function () {
      demo = true;
      var b = $('banner');
      b.textContent = 'Backend not reachable, so you are in demo mode. Posts are saved only in this browser. Start the backend to use Supabase.';
      b.hidden = false;
    }).then(refresh);
  }
  init();
})();
