const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {renderNarrationDocument} = require('../scripts/collect-narration.cjs');
const base = JSON.parse(fs.readFileSync('public/data/site_payload.json', 'utf8'));
const cacheKey = 'ffo-public-payload-v1';

test('initial fetch failure restores the saved public update with its timestamp', async () => {
  const dom = await renderNarrationDocument(base, '', window => {
    window.localStorage.setItem(cacheKey, JSON.stringify(base));
    window.fetch = async () => { throw new Error('Offline'); };
  });
  try {
    const d = dom.window.document;
    assert.equal(d.getElementById('readings').hidden, false);
    assert.equal(d.getElementById('observatorySummary').hidden, false);
    assert.equal(d.getElementById('feedStatus').hidden, false);
    assert.ok(d.getElementById('feedStatus').textContent.includes(`last available update from ${dom.window.formatDate(base.status.published_at)}`));
    assert.match(d.getElementById('feedStatus').textContent, /checking automatically/);
    assert.equal(d.querySelector('.feed-error'), null);
  } finally { dom.window.close(); }
});

test('saved observations are visible before the network request completes', async () => {
  let visibleDuringFetch = false;
  const dom = await renderNarrationDocument(base, '', window => {
    window.localStorage.setItem(cacheKey, JSON.stringify(base));
    window.fetch = async () => {
      visibleDuringFetch = !window.document.getElementById('observatorySummary').hidden &&
        window.document.getElementById('summaryStrip').textContent.includes('Current River Level');
      return {ok: true, json: async () => base};
    };
  });
  try { assert.equal(visibleDuringFetch, true); }
  finally { dom.window.close(); }
});

test('an unusable saved update does not prevent loading a valid online update', async () => {
  const malformed = structuredClone(base);
  malformed.summary_metrics = [null];
  const dom = await renderNarrationDocument(base, '', window => {
    window.localStorage.setItem(cacheKey, JSON.stringify(malformed));
  });
  try {
    const d = dom.window.document;
    assert.equal(d.getElementById('readings').hidden, false);
    assert.equal(d.getElementById('feedStatus').hidden, true);
    assert.equal(d.querySelectorAll('#readAloudPlayer').length, 1);
    assert.ok(dom.window.localStorage.getItem(cacheKey) === JSON.stringify(base), 'The valid online payload replaces the unusable saved update');
  } finally { dom.window.close(); }
});

test('failed, malformed and older refreshes leave the last usable data and cache intact', async () => {
  const dom = await renderNarrationDocument(base);
  try {
    const w = dom.window, d = w.document;
    const saved = w.localStorage.getItem(cacheKey);
    const metrics = d.getElementById('summaryStrip').textContent;
    const older = structuredClone(base);
    older.status.published_at = '2020-01-01T00:00:00Z';
    for (const fetch of [
      async () => { throw new Error('Offline'); },
      async () => ({ok: false, status: 503}),
      async () => ({ok: true, json: async () => { throw new SyntaxError('Truncated JSON'); }}),
      async () => ({ok: true, json: async () => ({})}),
      async () => ({ok: true, json: async () => ({...base, status: {...base.status, published_at: '2099-01-01T00:00:00Z'}, summary_metrics: [null]})}),
      async () => ({ok: true, json: async () => older}),
    ]) {
      w.fetch = fetch;
      await w.refreshPublicPayload();
      assert.equal(d.getElementById('summaryStrip').textContent, metrics);
      assert.equal(w.localStorage.getItem(cacheKey), saved);
      assert.equal(d.getElementById('readings').hidden, false);
      assert.equal(d.getElementById('feedStatus').hidden, false);
    }
  } finally { dom.window.close(); }
});

test('a newer update recovers in place, preserves selections and replaces audio controls once', async () => {
  const dom = await renderNarrationDocument(base);
  try {
    const w = dom.window, d = w.document;
    d.getElementById('today-tab-five_days').click();
    d.querySelector('[data-window-id="5d"]').click();
    const count = d.querySelectorAll('.read-aloud-button').length;
    d.querySelector('#observatorySummary .read-aloud-button').click();
    const previousPlayer = d.getElementById('readAloudPlayer');
    const next = structuredClone(base);
    next.status.published_at = new Date(Date.parse(base.status.published_at) + 900000).toISOString();
    next.summary_metrics[0].value = .876;
    w.fetch = async () => ({ok: true, json: async () => next});
    await w.refreshPublicPayload();
    assert.match(d.getElementById('summaryStrip').textContent, /0\.876/);
    assert.equal(d.getElementById('today-tab-five_days').getAttribute('aria-selected'), 'true');
    assert.equal(d.querySelector('[data-window-id="5d"]').getAttribute('aria-pressed'), 'true');
    assert.equal(d.querySelectorAll('.read-aloud-button').length, count);
    assert.equal(d.querySelectorAll('#readAloudPlayer').length, 1);
    assert.equal(previousPlayer.isConnected, false);
    assert.equal(d.getElementById('feedStatus').hidden, true);
    assert.equal(JSON.parse(w.localStorage.getItem(cacheKey)).status.published_at, next.status.published_at);
  } finally { dom.window.close(); }
});

test('online loading still works when browser storage is disabled', async () => {
  const dom = await renderNarrationDocument(base, '', window => {
    Object.defineProperty(window, 'localStorage', {get() { throw new Error('Storage disabled'); }});
  });
  try {
    const d = dom.window.document;
    assert.equal(d.getElementById('readings').hidden, false);
    assert.equal(d.getElementById('feedStatus').hidden, true);
  } finally { dom.window.close(); }
});

test('cleared warnings share the green symbol and expired warnings become unknown', async () => {
  const dom = await renderNarrationDocument(base);
  try {
    const w = dom.window, d = w.document;
    assert.equal(w.floodStatusSymbol('warning_no_longer_in_force'), w.floodStatusSymbol('none'));
    const alert = {...base.official_alert, state: 'flood_warning', checked_at: new Date().toISOString(), label: 'Flood Warning in force'};
    w.renderOfficialAlert(alert);
    assert.match(d.getElementById('officialAlertSymbol').innerHTML, /#ce202b/);
    alert.checked_at = '2020-01-01T00:00:00Z';
    w.renderOfficialAlert(alert);
    assert.match(d.getElementById('officialAlertTitle').textContent, /unavailable/);
    assert.match(d.getElementById('officialAlertMessage').textContent, /official source for current/);
    assert.doesNotMatch(d.getElementById('officialAlertSymbol').innerHTML, /#36933d|#ce202b/);
  } finally { dom.window.close(); }
});
