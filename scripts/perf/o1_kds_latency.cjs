/*
 * O1 — Thời gian món xuống bếp ≤ 3 giây (p95), đo trên giao diện KDS thật.
 *
 * Cách đo: một trình duyệt headless đăng nhập tài khoản kitchen và mở trang /kitchen (polling 1 giây
 * như người dùng thật). Một client API khác (admin) tạo đơn mang về (đợt đầu tự APPROVED) hoặc
 * duyệt một đợt gọi thêm. Mốc t0 = lúc nhận phản hồi 200 của lệnh đó (server đã commit),
 * mốc t1 = lúc thẻ món mang ghi chú duy nhất xuất hiện trên trang KDS. Độ trễ = t1 − t0.
 * Lặp --runs lần (mặc định 20), xen kẽ "đợt đầu" và "gọi thêm được duyệt". Cuối cùng hủy các đơn thử.
 *
 * Chạy trong container Playwright (không cần cài Node/npm trên máy):
 *   docker run --rm --network restaurant_ordering_default -e BASE_URL=http://gateway \
 *     -v "${PWD}:/work" -w /work mcr.microsoft.com/playwright:v1.49.1-noble \
 *     sh -c "npm i --prefix /tmp/pw playwright@1.49.1 >/dev/null && NODE_PATH=/tmp/pw/node_modules node scripts/perf/o1_kds_latency.cjs"
 * Kết quả: docs/verification/perf/o1-kds-latency-result.json (+ ảnh KDS cuối cùng).
 */
const { chromium, request } = require('playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const PASSWORD = process.env.DEMO_PASSWORD || 'RestaurantDemo!2026';
const RUNS = Number(process.env.RUNS || process.argv.find(a => a.startsWith('--runs='))?.split('=')[1] || 20);
const TIMEOUT_MS = 15000;
const OUT_DIR = path.resolve(__dirname, '..', '..', 'docs', 'verification', 'perf');

async function api(ctx, method, p, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (method !== 'GET') {
    const csrf = await ctx.get('/api/v1/auth/csrf');
    headers['X-CSRF-TOKEN'] = (await csrf.json()).token;
    headers['Idempotency-Key'] = crypto.randomUUID();
  }
  const res = await ctx.fetch('/api/v1' + p, { method, headers, data: method === 'GET' ? undefined : JSON.stringify(body || {}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok()) throw new Error(`${method} ${p} -> ${res.status()}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

function pct(values, p) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.max(1, Math.ceil(p / 100 * s.length)) - 1];
}
function summary(values) {
  if (!values.length) return { count: 0 };
  const r = v => Math.round(v * 10) / 10;
  return { count: values.length, min_ms: r(Math.min(...values)), p50_ms: r(pct(values, 50)), p90_ms: r(pct(values, 90)),
    p95_ms: r(pct(values, 95)), max_ms: r(Math.max(...values)), mean_ms: r(values.reduce((a, b) => a + b, 0) / values.length) };
}

(async () => {
  const admin = await request.newContext({ baseURL: BASE });
  await api(admin, 'POST', '/auth/login', { username: 'admin', password: PASSWORD });
  const menu = (await api(admin, 'GET', '/menu')).items.filter(i => i.isAvailable);
  if (menu.length < 2) throw new Error('Cần ít nhất 2 món đang bán.');

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: BASE, viewport: { width: 1440, height: 900 } });
  await api(context.request, 'POST', '/auth/login', { username: 'kitchen', password: PASSWORD });
  const page = await context.newPage();
  await page.goto('/kitchen');
  await page.getByText('Tiến độ chế biến').waitFor({ timeout: 30000 });
  await page.waitForTimeout(2000); // để vòng polling ổn định

  const samples = [];
  const created = [];
  for (let n = 1; n <= RUNS; n++) {
    const mode = n % 2 === 1 ? 'first_batch' : 'approved_extra_batch';
    const marker = `O1-${n}-${crypto.randomBytes(3).toString('hex')}`;
    const item = menu[n % menu.length];
    const line = { menuItemId: item.id, quantity: 1, observedPriceVnd: item.priceVnd, note: marker };
    let t0;
    if (mode === 'first_batch') {
      const before = performance.now();
      const res = await api(admin, 'POST', '/takeaway-orders', { pickupName: 'Đo O1 ' + n, items: [line] });
      t0 = performance.now();
      created.push(res.orderId);
      samples.push({ n, mode, marker, request_ms: Math.round((t0 - before) * 10) / 10 });
    } else {
      const base = await api(admin, 'POST', '/takeaway-orders', { pickupName: 'Đo O1 ' + n, items: [{ ...line, note: `O1-nen-${n}-${crypto.randomBytes(3).toString('hex')}` }] });
      created.push(base.orderId);
      const order = await api(admin, 'GET', `/orders/${base.orderId}`);
      const batch = await api(admin, 'POST', `/orders/${base.orderId}/batches`, { expectedOrderVersion: order.version, items: [line] });
      await page.waitForTimeout(1500); // đảm bảo đợt PENDING không hiện trên KDS trước khi duyệt
      const pendingVisible = await page.evaluate(m => [...document.querySelectorAll('.kitchen-card .note span')].some(e => e.textContent.trim() === m), marker);
      const before = performance.now();
      await api(admin, 'POST', `/batches/${batch.batchId}/approve`, { expectedVersion: batch.version });
      t0 = performance.now();
      samples.push({ n, mode, marker, request_ms: Math.round((t0 - before) * 10) / 10, visible_before_approve: pendingVisible });
    }
    try {
      // polling 'raf' (~16 ms) thay cho cơ chế chờ mặc định của Playwright (bước 500 ms) để không làm tròn số đo.
      await page.waitForFunction(m => [...document.querySelectorAll('.kitchen-card .note span')]
        .some(e => e.textContent.trim() === m), marker, { polling: 'raf', timeout: TIMEOUT_MS });
      samples[samples.length - 1].latency_ms = Math.round((performance.now() - t0) * 10) / 10;
    } catch (e) {
      samples[samples.length - 1].latency_ms = null;
      samples[samples.length - 1].error = `Không thấy món trên KDS sau ${TIMEOUT_MS} ms`;
    }
    console.log(`${n}/${RUNS} ${mode}: ${samples[samples.length - 1].latency_ms ?? 'timeout'} ms`);
    await page.waitForTimeout(300 + Math.random() * 700); // lệch pha so với chu kỳ polling
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(OUT_DIR, 'o1-kds-cuoi-phien-do.png') });

  const cleanup = {};
  for (const oid of created) {
    try {
      const o = await api(admin, 'GET', `/orders/${oid}`);
      if (o.status === 'SERVING') await api(admin, 'POST', `/orders/${oid}/cancel`, { expectedVersion: o.version, reason: 'Dọn dữ liệu sau đo O1.' });
      cleanup[oid] = 'CANCELLED';
    } catch (e) { cleanup[oid] = 'cleanup failed: ' + String(e).slice(0, 150); }
  }
  await browser.close();

  const ok = samples.filter(s => s.latency_ms != null).map(s => s.latency_ms);
  const all = summary(ok);
  const result = {
    objective: 'O1', target: 'Batch APPROVED tới KDS: p95 ≤ 3000 ms (ADR-0006 §5)',
    environment: { base_url: BASE, run_at: new Date().toISOString(), runs: RUNS, kds_poll_interval_ms: 1000,
      browser: 'Chromium headless (Playwright 1.49.1)', note: 'Ghi thêm CPU/RAM host và tài nguyên Docker vào báo cáo.' },
    overall: all,
    by_mode: {
      first_batch: summary(samples.filter(s => s.mode === 'first_batch' && s.latency_ms != null).map(s => s.latency_ms)),
      approved_extra_batch: summary(samples.filter(s => s.mode === 'approved_extra_batch' && s.latency_ms != null).map(s => s.latency_ms)),
    },
    timeouts: samples.filter(s => s.latency_ms == null).length,
    pending_batch_leaked_to_kds: samples.some(s => s.visible_before_approve),
    samples, cleanup,
    result: ok.length === RUNS && all.p95_ms <= 3000 && !samples.some(s => s.visible_before_approve) ? 'PASS' : 'FAIL',
  };
  fs.writeFileSync(path.join(OUT_DIR, 'o1-kds-latency-result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ result: result.result, overall: all, timeouts: result.timeouts }, null, 2));
  await admin.dispose();
})().catch(e => { console.error(e); process.exit(1); });
