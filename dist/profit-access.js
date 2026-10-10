'use strict';
(() => {
  const host = document.getElementById('settlement');
  const gate = host.innerHTML;
  let expiryTimer;
  function lock() { clearTimeout(expiryTimer); host.innerHTML = gate; wireGate(); }
  function show(data) {
    if (!data.html || !data.orders) throw new Error('访问入口暂未就绪，请稍后重试。');
    host.innerHTML = data.html;
    const order = host.querySelector('#order-type');
    const amount = host.querySelector('#order-amount');
    const refund = host.querySelector('#refund-amount');
    function calculate() {
      const a = Number(amount.value), r = Number(refund.value);
      const valid = amount.value.trim() !== '' && refund.value.trim() !== '' && Number.isFinite(a) && Number.isFinite(r) && a >= 0 && r >= 0 && r <= a && a <= 1000000000;
      host.querySelector('#calc-error').hidden = valid; host.querySelector('#calc-results').hidden = !valid;
      if (!valid) { host.querySelector('#calc-error').textContent = '请填写有效金额：到账与退款不得为负，退款不得超过到账金额。'; return; }
      const cents = Math.round(a * 100) - Math.round(r * 100), rate = data.orders[order.value].rate;
      const commission = Math.round(cents * rate / 100);
      const format = value => (value / 100).toLocaleString('zh-CN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
      host.querySelector('#commission-value').textContent = format(commission);
      host.querySelector('#retained-value').textContent = format(cents - commission);
      host.querySelector('#commission-rate').textContent = rate + '%';
    }
    order.addEventListener('change', () => { amount.value = data.orders[order.value].amount; refund.value = 0; calculate(); });
    amount.addEventListener('input', calculate); refund.addEventListener('input', calculate); calculate();
    host.querySelector('#profit-lock').addEventListener('click', async () => {
      lock();
      try { await fetch('/api/profit/logout', {method: 'POST', credentials: 'same-origin'}); } catch {}
    });
    expiryTimer = setTimeout(lock, 86400000);
  }
  function wireGate() {
    const form = host.querySelector('form');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const button = form.querySelector('button'), input = form.querySelector('input'), status = form.querySelector('[role="status"]');
      button.disabled = true; button.textContent = '正在打开…'; status.textContent = '';
      try {
        const result = await fetch('/api/profit', {method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({password: input.value})});
        input.value = '';
        const data = await result.json();
        if (!result.ok) throw new Error(data.error || '暂时无法打开，请重试。');
        show(data);
      } catch (error) { status.textContent = error.message === 'Failed to fetch' ? '网络暂时不可用，请稍后重试。' : error.message; input.focus(); }
      finally { button.disabled = false; button.textContent = '解锁查看'; }
    });
  }
  wireGate();
  async function restore() {
    try { const result = await fetch('/api/profit', {cache: 'no-store', credentials: 'same-origin'}); if (result.ok) show(await result.json()); } catch {}
  }
  restore();
  window.addEventListener('pagehide', lock);
  window.addEventListener('pageshow', event => { if (event.persisted) restore(); });
})();
