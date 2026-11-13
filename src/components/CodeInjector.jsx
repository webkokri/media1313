import { useEffect } from 'react';
import { api } from '../api.jsx';

// Re-create nodes so <script> tags actually run when added with JavaScript.
function live(node) {
  if (node.nodeType !== 1 || node.tagName !== 'SCRIPT') return node.cloneNode(true);
  const s = document.createElement('script');
  for (const a of node.attributes) s.setAttribute(a.name, a.value);
  s.text = node.textContent; return s;
}
function add(html, where) {
  if (!html || !html.trim()) return;
  const t = document.createElement('template'); t.innerHTML = html;
  const nodes = [...t.content.childNodes].filter((n) => !(n.nodeType === 1 && n.tagName === 'SCRIPT' && n.getAttribute('src') && document.querySelector(`script[src="${CSS.escape ? n.getAttribute('src').replace(/"/g, '\\"') : n.getAttribute('src')}"]`))).map(live);
  if (where === 'head') nodes.forEach((n) => document.head.appendChild(n));
  else if (where === 'bodyStart') nodes.reverse().forEach((n) => document.body.insertBefore(n, document.body.firstChild));
  else nodes.forEach((n) => document.body.appendChild(n));
}

/** Header / footer code from Admin → Code injection. Pages the server renders already contain it (marked by a meta tag);
 *  pages served as plain files (e.g. the home page) get it added here, straight from the API — so changes show up on the next page load, no rebuild. */
export default function CodeInjector() {
  useEffect(() => {
    if (window.parent !== window || window.__m1313Code) return;     // not inside the editors' preview frames, and only once per page load
    window.__m1313Code = true;
    api.get('/site-code').then((c) => {
      if (!c?.enabled || document.querySelector('meta[name="m1313-code"]')) return;
      add(c.head, 'head'); add(c.bodyStart, 'bodyStart'); add(c.footer, 'footer');
    }).catch(() => {});
  }, []);
  return null;
}
