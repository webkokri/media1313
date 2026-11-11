// Small, safe Markdown → HTML for article bodies (so apps can render a story without a Markdown library).
// Supports: paragraphs, ## / ### headings, > quotes, - lists, ![images](url), **bold**, *italic*, [links](url). HTML in the source is escaped.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function markdownToHtml(md, origin = '') {
  const abs = (u) => (u.startsWith('/') ? origin + u : u);
  const okUrl = (u) => /^(https?:\/\/|\/|mailto:|tel:)/i.test(u);
  const inline = (t) => esc(t)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, url) => { const u = url.replace(/&amp;/g, '&'); return okUrl(u) ? `<a href="${esc(abs(u))}">${text}</a>` : text; });
  return String(md || '').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean).map((b) => {
    const img = b.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (img && okUrl(img[2])) return `<figure><img src="${esc(abs(img[2]))}" alt="${esc(img[1])}">${img[1] ? `<figcaption>${esc(img[1])}</figcaption>` : ''}</figure>`;
    if (b.startsWith('### ')) return `<h3>${inline(b.slice(4))}</h3>`;
    if (/^##? /.test(b)) return `<h2>${inline(b.replace(/^#+\s/, ''))}</h2>`;
    if (b.startsWith('>')) return `<blockquote>${inline(b.replace(/^>\s?/gm, '').replace(/\n/g, ' '))}</blockquote>`;
    if (/^[-*] /.test(b)) return `<ul>${b.split('\n').map((l) => `<li>${inline(l.replace(/^[-*] /, ''))}</li>`).join('')}</ul>`;
    return `<p>${inline(b).replace(/\n/g, '<br>')}</p>`;
  }).join('\n');
}
