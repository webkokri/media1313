// Small allow-list sanitizers for text typed in the builder. (Only signed-in editors can write this content.)
const TEXT_TAGS = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'A', 'UL', 'OL', 'LI', 'SPAN', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'SMALL']);
const safeUrl = (u) => /^(https?:|mailto:|tel:|\/|#)/i.test(String(u).trim());

function walk(node, allow) {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === 3) continue;
    if (child.nodeType !== 1) { child.remove(); continue; }
    if (!allow.has(child.tagName)) { // keep the text, drop the tag
      walk(child, allow);
      while (child.firstChild) child.parentNode.insertBefore(child.firstChild, child);
      child.remove(); continue;
    }
    for (const a of [...child.attributes]) {
      const keep = child.tagName === 'A' && (a.name === 'href' || a.name === 'target' || a.name === 'rel');
      if (!keep || (a.name === 'href' && !safeUrl(a.value))) child.removeAttribute(a.name);
    }
    if (child.tagName === 'A' && child.getAttribute('target') === '_blank') child.setAttribute('rel', 'noopener noreferrer');
    walk(child, allow);
  }
}
export function cleanHtml(html) {
  if (typeof DOMParser === 'undefined') return '';
  const doc = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html');
  walk(doc.body, TEXT_TAGS);
  return doc.body.innerHTML;
}
/** For the "Custom HTML" widget: removes scripts, event handlers and javascript: links, keeps everything else. */
export function cleanCustomHtml(html) {
  if (typeof DOMParser === 'undefined') return '';
  const doc = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html');
  doc.body.querySelectorAll('script,object,embed,link,meta,base').forEach((n) => n.remove());
  doc.body.querySelectorAll('*').forEach((n) => {
    for (const a of [...n.attributes]) {
      if (/^on/i.test(a.name) || ((a.name === 'href' || a.name === 'src' || a.name === 'action') && /^\s*javascript:/i.test(a.value))) n.removeAttribute(a.name);
    }
  });
  return doc.body.innerHTML;
}
