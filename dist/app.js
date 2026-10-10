'use strict';
const content = window.allianceContent;
const menuButton = document.querySelector('.menu-button');
const mobileMenu = document.getElementById('mobile-menu');
function closeMenu() { mobileMenu.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', '打开导航'); }
menuButton.addEventListener('click', () => { const open = menuButton.getAttribute('aria-expanded') === 'true'; if (open) closeMenu(); else { mobileMenu.hidden = false; menuButton.setAttribute('aria-expanded', 'true'); menuButton.setAttribute('aria-label', '关闭导航'); } });
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
const curriculum = document.getElementById('curriculum-list');
content.curriculum.forEach((module, index) => {
  const details = document.createElement('details'); details.className = 'curriculum-item';
  const summary = document.createElement('summary');
  const number = document.createElement('span'); number.className = 'module-number'; number.textContent = String(index + 1).padStart(2, '0');
  const title = document.createElement('span'); title.className = 'module-title'; title.textContent = module.title;
  const plus = document.createElement('span'); plus.className = 'module-plus'; plus.textContent = '＋'; plus.setAttribute('aria-hidden', 'true');
  summary.append(number, title, plus);
  const list = document.createElement('ul'); module.items.forEach(text => { const li = document.createElement('li'); li.textContent = text; list.append(li); });
  details.append(summary, list); curriculum.append(details);
});
const expandButton = document.getElementById('expand-curriculum');
function syncExpandLabel() { const expanded = [...curriculum.children].every(d => d.open); expandButton.setAttribute('aria-expanded', String(expanded)); expandButton.textContent = expanded ? '收起全部模块' : '展开全部模块'; }
expandButton.addEventListener('click', () => { const next = expandButton.getAttribute('aria-expanded') !== 'true'; [...curriculum.children].forEach(d => { d.open = next; }); syncExpandLabel(); });
[...curriculum.children].forEach(d => d.addEventListener('toggle', syncExpandLabel));
function wireTabs(tabs, onSelect) {
  function select(tab, focus = false) { tabs.forEach(t => { const active = t === tab; t.classList.toggle('active', active); t.setAttribute('aria-selected', String(active)); t.tabIndex = active ? 0 : -1; }); onSelect(tab); if (focus) tab.focus(); }
  tabs.forEach((tab, index) => { tab.addEventListener('click', () => select(tab)); tab.addEventListener('keydown', e => { let next; if (e.key === 'ArrowRight') next = (index + 1) % tabs.length; if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length; if (e.key === 'Home') next = 0; if (e.key === 'End') next = tabs.length - 1; if (next !== undefined) { e.preventDefault(); select(tabs[next], true); } }); });
}
const projectTabs = [...document.querySelectorAll('.project-tabs [role="tab"]')];
wireTabs(projectTabs, tab => { projectTabs.forEach(t => { document.getElementById(t.getAttribute('aria-controls')).hidden = t !== tab; }); });
const pathTabs = [...document.querySelectorAll('.path-option')];
wireTabs(pathTabs, tab => { const p = content.paths[tab.dataset.path]; document.getElementById('path-result').setAttribute('aria-labelledby', tab.id); document.getElementById('path-label').textContent = p.label; document.getElementById('path-title').textContent = p.title; document.getElementById('path-description').textContent = p.description; const link = document.getElementById('path-link'); link.href = p.href; link.textContent = p.button; });
const dialog = document.getElementById('project-dialog'); let lastTrigger = null;
document.addEventListener('click', e => { const trigger = e.target.closest('[data-detail]'); if (!trigger) return; const data = content.details[trigger.dataset.detail]; if (!data) return; lastTrigger = trigger; document.getElementById('dialog-kicker').textContent = data.kicker; document.getElementById('dialog-title').textContent = data.title; document.getElementById('dialog-description').textContent = data.description; document.getElementById('dialog-content').replaceChildren(...data.blocks.map(([title, text]) => { const block = document.createElement('div'); block.className = 'detail-block'; const h = document.createElement('h3'); h.textContent = title; const p = document.createElement('p'); p.textContent = text; block.append(h, p); return block; })); dialog.showModal(); });
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close()); document.querySelector('.dialog-done').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => { if (e.target !== dialog) return; const b = dialog.getBoundingClientRect(); if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) dialog.close(); });
dialog.addEventListener('close', () => lastTrigger?.focus());
