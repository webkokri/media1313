import { BREAKPOINTS } from './schema.js';

// Turns the page tree into a stylesheet. Each element gets class  pb-<id>.  Responsive values (key, key_t, key_m) become media queries.
const DEV = ['d', 't', 'm'];
const FONT = { sans: "'Inter', system-ui, sans-serif", cond: "'Barlow Condensed', 'Arial Narrow', sans-serif", serif: "'Source Serif 4', Georgia, serif" };
const SHADOW = { sm: '0 1px 3px rgba(0,0,0,.18)', md: '0 6px 18px rgba(0,0,0,.2)', lg: '0 16px 40px rgba(0,0,0,.28)' };
const has = (v) => v !== undefined && v !== null && v !== '';
const px = (v) => (has(v) ? `${v}px` : null);
// Smart responsive defaults: unless an editor sets a tablet / phone value, big type shrinks and grids use fewer columns.
const SCALE = { t: 0.85, m: 0.6 };
function fluid(s, key, dev, floor) {
  if (dev === 'd') return s[key];
  if (has(s[`${key}_${dev}`])) return s[`${key}_${dev}`];
  if (dev === 'm' && has(s[`${key}_t`])) return s[`${key}_t`];
  const base = +s[key]; return !has(s[key]) || base <= floor ? s[key] : Math.max(floor, Math.round(base * SCALE[dev]));
}
function cols(s, dev, tabletMax, mobileMax, key = 'columns') {
  const base = has(s[key]) ? +s[key] : 3;
  if (dev === 'd') return base;
  if (dev === 't') return has(s[`${key}_t`]) ? +s[`${key}_t`] : Math.min(base, tabletMax);
  if (has(s[`${key}_m`])) return +s[`${key}_m`];
  return Math.min(has(s[`${key}_t`]) ? +s[`${key}_t`] : base, mobileMax);
}
const rgba = (hex, a) => { const m = /^#([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return hex; const n = parseInt(m[1], 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
export const val = (s, key, dev) => (dev === 'm' ? s[`${key}_m`] ?? s[`${key}_t`] ?? s[key] : dev === 't' ? s[`${key}_t`] ?? s[key] : s[key]);

function common(s, v) {
  const d = {};
  for (const [pre, prop] of [['m', 'margin'], ['p', 'padding']]) for (const [k, side] of [['t', 'top'], ['r', 'right'], ['b', 'bottom'], ['l', 'left']]) { const x = v(pre + k); if (has(x)) d[`${prop}-${side}`] = px(x); }
  if (s.bg) d['background-color'] = s.bg;
  if (s.bgImage) { d['background-image'] = `url("${String(s.bgImage).replace(/"/g, '%22')}")`; d['background-size'] = s.bgSize || 'cover'; d['background-position'] = 'center'; d['background-repeat'] = 'no-repeat'; }
  if (has(s.radius) && +s.radius) d['border-radius'] = px(s.radius);
  if (+s.borderWidth) { d['border'] = `${s.borderWidth}px solid ${s.borderColor || '#e3e2dd'}`; }
  if (SHADOW[s.shadow]) d['box-shadow'] = SHADOW[s.shadow];
  return d;
}

// [selectorSuffix, declarations] pairs for one element at one device
function rules(node, dev, ctx) {
  const s = node.s || {}; const v = (k) => val(s, k, dev); const out = [['', common(s, v)]];
  const num = (k, d) => (has(v(k)) ? +v(k) : d);
  if (node.type === 'section') {
    const o = {}; if (has(v('minHeight')) && +v('minHeight')) { o['min-height'] = px(v('minHeight')); o.display = 'flex'; o['flex-direction'] = 'column'; o['justify-content'] = 'center'; }
    if (s.overlay) { o['background-image'] = `linear-gradient(${rgba(s.overlay, (has(s.overlayAlpha) ? +s.overlayAlpha : 55) / 100)}, ${rgba(s.overlay, (has(s.overlayAlpha) ? +s.overlayAlpha : 55) / 100)})${s.bgImage ? `, url("${s.bgImage}")` : ''}`; if (s.bgImage) { o['background-size'] = `auto, ${s.bgSize || 'cover'}`; o['background-position'] = 'center'; o['background-repeat'] = 'no-repeat'; } }
    out[0][1] = { ...out[0][1], ...o };
    const r = { gap: px(s.gap ?? 24), 'align-items': s.valign || 'stretch' };
    if (s.layout !== 'full') r['max-width'] = px(s.maxWidth || 1200);
    const stack = (dev === 't' && s.stack === 'tablet') || (dev === 'm' && s.stack !== 'never') || (dev === 't' && false);
    r['flex-direction'] = stack ? 'column' : 'row';
    out.push([' > .pb-in', r]);
  } else if (node.type === 'column') {
    const n = ctx.siblings, gap = +ctx.gap || 0; const w = num('width', 100);
    const own = has(s[`width_${dev}`]) || dev === 'd';
    const stacked = (dev === 'm' && ctx.stack !== 'never') || (dev === 't' && ctx.stack === 'tablet');
    out[0][1] = { ...out[0][1], flex: stacked && !own ? '0 0 auto' : `0 0 calc((100% - ${(n - 1) * gap}px) * ${+(w / 100).toFixed(4)})`, 'max-width': '100%', width: stacked && !own ? '100%' : null, 'justify-content': s.valign || 'flex-start', gap: px(s.gap ?? 16) };
  } else {
    const I = (d) => out.push([' .pb-in', d]); const W = (d) => { out[0][1] = { ...out[0][1], ...d }; };
    switch (node.type) {
      case 'heading': W({ 'text-align': v('align') }); I({ 'font-size': px(fluid(s, 'size', dev, 28)), 'font-family': FONT[s.font] || FONT.cond, 'font-weight': s.weight, color: s.color || 'inherit', 'line-height': has(s.lineHeight) ? s.lineHeight : 1.05, 'letter-spacing': has(s.letter) ? px(s.letter) : null, 'text-transform': s.transform || null, margin: 0 }); break;
      case 'text': W({ 'text-align': v('align') }); I({ 'font-size': px(v('size')), 'font-family': FONT[s.font] || FONT.sans, color: s.color || 'inherit', 'line-height': has(s.lineHeight) ? s.lineHeight : 1.6, 'max-width': +s.maxWidth ? px(s.maxWidth) : null, margin: v('align') === 'center' ? '0 auto' : v('align') === 'right' ? '0 0 0 auto' : null }); break;
      case 'image': W({ 'text-align': v('align') }); I({ width: has(v('width')) ? `${v('width')}%` : '100%', display: 'inline-block' }); out.push([' .pb-in img', { width: '100%', display: 'block', 'aspect-ratio': s.aspect && s.aspect !== 'auto' ? s.aspect : null, 'object-fit': s.aspect && s.aspect !== 'auto' ? 'cover' : null, 'border-radius': px(s.imgRadius) }]); break;
      case 'button': W({ 'text-align': v('align') }); if (s.full) I({ display: 'flex', width: '100%' }); if (has(s.btnRadius)) I({ 'border-radius': px(s.btnRadius) }); break;
      case 'spacer': I({ height: px(v('height')) }); break;
      case 'divider': W({ 'text-align': s.align }); I({ 'border-top': `${s.weight || 2}px ${s.line || 'solid'} ${s.color || '#e3e2dd'}`, width: `${s.width ?? 100}%`, margin: s.align === 'center' ? '0 auto' : s.align === 'right' ? '0 0 0 auto' : '0' }); break;
      case 'video': case 'player': I({ 'aspect-ratio': s.aspect || '16/9', 'border-radius': px(s.vidRadius), overflow: 'hidden', position: 'relative', background: '#000' }); break;
      case 'gallery': I({ display: 'grid', 'grid-template-columns': `repeat(${num('columns', 3)}, minmax(0,1fr))`, gap: px(s.gap ?? 12) }); out.push([' .pb-in img', { width: '100%', display: 'block', 'aspect-ratio': s.aspect || '4/3', 'object-fit': 'cover', 'border-radius': px(s.imgRadius) }]); break;
      case 'hero': W({ 'text-align': v('align') }); I({ 'min-height': px(dev === 'm' && !has(s.minHeight_m) && !has(s.minHeight_t) ? Math.min(+s.minHeight || 460, 380) : v('minHeight')) }); out.push([' .pb-hero-title', { 'font-size': px(fluid(s, 'titleSize', dev, 34)) }]); break;
      case 'iconbox': W({ 'text-align': v('align'), color: s.color || null }); out.push([' .pb-ib-icon', { 'font-size': px(s.iconSize) }], [' .pb-ib-title', { 'font-size': px(s.titleSize) }]); break;
      case 'iconlist': I({ 'font-size': px(s.size), color: s.color || null, gap: px(s.gap) }); out.push([' .pb-il-icon', { color: s.iconColor }]); break;
      case 'counter': W({ 'text-align': v('align') }); out.push([' .pb-ct-num', { 'font-size': px(fluid(s, 'size', dev, 40)), color: s.color || null }]); break;
      case 'accordion': W({ color: s.color || null }); break;
      case 'testimonial': W({ 'text-align': v('align'), color: s.color || null }); out.push([' .pb-tm-quote', { 'font-size': px(s.size) }]); break;
      case 'newsletter': W({ 'text-align': v('align'), color: s.color || null }); break;
      case 'articles': out.push([' .pb-grid', { 'grid-template-columns': s.layout === 'list' ? '1fr' : `repeat(${cols(s, dev, 2, 1)}, minmax(0,1fr))`, gap: px(s.gap ?? 28) }]); break;
      case 'shows': case 'podcasts': case 'videos': out.push([' .pb-grid', { 'grid-template-columns': `repeat(${cols(s, dev, 2, 1)}, minmax(0,1fr))` }]); break;
      default: break;
    }
  }
  return out;
}

const text = (decls) => Object.entries(decls).filter(([, x]) => has(x)).map(([k, x]) => `${k}:${x}`).join(';');

export function buildCss(tree, { editor = false } = {}) {
  const per = { d: [], t: [], m: [] };
  const emit = (node, ctx) => {
    const sel = (suffix) => `.pb-${node.id}${suffix}`;
    let prev = null;
    for (const dev of DEV) {
      const rs = rules(node, dev, ctx);
      const flat = new Map(); for (const [suf, d] of rs) for (const [k, x] of Object.entries(d)) if (has(x)) flat.set(`${suf}|${k}`, x);
      const bySel = {};
      for (const [key, x] of flat) { if (prev && prev.get(key) === x) continue; const [suf, k] = key.split('|'); (bySel[suf] ||= {})[k] = x; }
      // properties that existed on a larger screen but are absent now must be reset
      if (prev) for (const key of prev.keys()) if (!flat.has(key)) { const [suf, k] = key.split('|'); (bySel[suf] ||= {})[k] = 'revert-layer'; }
      for (const [suf, d] of Object.entries(bySel)) { const t = text(d); if (t) per[dev].push(`${sel(suf)}{${t}}`); }
      prev = flat;
    }
    const s = node.s || {};
    const hide = editor ? 'opacity:.28;outline:1px dashed #94a3b8' : 'display:none!important';
    if (s.hideD) per.d.push(`@media (min-width:${BREAKPOINTS.tablet + 1}px){${sel('')}{${hide}}}`);
    if (s.hideT) per.d.push(`@media (min-width:${BREAKPOINTS.mobile + 1}px) and (max-width:${BREAKPOINTS.tablet}px){${sel('')}{${hide}}}`);
    if (s.hideM) per.d.push(`@media (max-width:${BREAKPOINTS.mobile}px){${sel('')}{${hide}}}`);
  };
  for (const sec of tree.sections) {
    emit(sec, {});
    for (const col of sec.cols) {
      emit(col, { siblings: sec.cols.length, gap: sec.s.gap ?? 24, stack: sec.s.stack || 'mobile' });
      for (const w of col.widgets) emit(w, {});
    }
  }
  return `${per.d.join('\n')}\n@media (max-width:${BREAKPOINTS.tablet}px){\n${per.t.join('\n')}\n}\n@media (max-width:${BREAKPOINTS.mobile}px){\n${per.m.join('\n')}\n}`;
}
