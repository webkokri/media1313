// Page-builder schema: what elements exist, what settings each has, and helpers to edit the page tree.
//
// Tree:  { sections: [ { id, type:'section', s:{…}, cols:[ { id, type:'column', s:{…}, widgets:[ { id, type, s:{…} } ] } ] } ] }
// Responsive settings are stored as  key  (desktop),  key_t  (tablet),  key_m  (mobile).

export const uid = () => `e${Math.random().toString(36).slice(2, 8)}`;
export const BREAKPOINTS = { tablet: 1024, mobile: 640 };

/* ---------------------------------------------------------------- controls ---------------------------------------------------------------- */
const C = {
  text: (key, label, o = {}) => ({ key, label, type: 'text', ...o }),
  area: (key, label, o = {}) => ({ key, label, type: 'textarea', ...o }),
  range: (key, label, min, max, o = {}) => ({ key, label, type: 'range', min, max, step: 1, ...o }),
  select: (key, label, options, o = {}) => ({ key, label, type: 'select', options, ...o }),
  color: (key, label, o = {}) => ({ key, label, type: 'color', ...o }),
  image: (key, label, o = {}) => ({ key, label, type: 'image', ...o }),
  link: (key, label, o = {}) => ({ key, label, type: 'link', ...o }),
  swit: (key, label, o = {}) => ({ key, label, type: 'switch', ...o }),
  align: (key = 'align', label = 'Alignment', o = {}) => ({ key, label, type: 'align', responsive: true, ...o }),
  head: (label) => ({ type: 'heading', label }),
  rep: (key, label, fields, blank, o = {}) => ({ key, label, type: 'repeater', fields, blank, ...o }),
};
const opts = (...a) => a.map((v) => (Array.isArray(v) ? v : [v, v]));
const WEIGHTS = opts(['400', 'Regular'], ['500', 'Medium'], ['600', 'Semi-bold'], ['700', 'Bold'], ['800', 'Extra-bold']);
const FONTS = opts(['sans', 'Body (Inter)'], ['cond', 'Display (Barlow Condensed)'], ['serif', 'Serif (Source Serif)']);

/* controls shared by sections, columns and widgets */
export const COMMON_STYLE = [
  C.head('Background'), C.color('bg', 'Background colour'), C.image('bgImage', 'Background image'),
  C.select('bgSize', 'Image fit', opts(['cover', 'Cover'], ['contain', 'Contain'], ['auto', 'Original size'])),
  C.head('Border & shadow'), C.range('radius', 'Corner radius', 0, 80, { unit: 'px' }), C.range('borderWidth', 'Border width', 0, 12, { unit: 'px' }), C.color('borderColor', 'Border colour'),
  C.select('shadow', 'Shadow', opts(['none', 'None'], ['sm', 'Small'], ['md', 'Medium'], ['lg', 'Large'])),
];
export const COMMON_ADVANCED = [
  { type: 'spacing', key: 'm', label: 'Margin (px)', responsive: true }, { type: 'spacing', key: 'p', label: 'Padding (px)', responsive: true },
  C.head('Responsive'), C.swit('hideD', 'Hide on desktop'), C.swit('hideT', 'Hide on tablet'), C.swit('hideM', 'Hide on mobile'),
  C.head('Motion & attributes'), C.select('anim', 'Entrance animation', opts(['none', 'None'], ['fade', 'Fade in'], ['up', 'Fade up'], ['zoom', 'Zoom in'])),
  C.text('cssId', 'Element ID'), C.text('cssClass', 'CSS classes'),
];

/* ---------------------------------------------------------------- widgets ---------------------------------------------------------------- */
// Dynamic widgets read the site's content (news, schedule, shows…) so they stay up to date automatically.
export const WIDGETS = {
  heading: { label: 'Heading', icon: 'H', cat: 'Basic', defaults: { text: 'Add your heading', tag: 'h2', size: 40, weight: '800', font: 'cond', align: 'left' },
    content: [C.area('text', 'Title', { rows: 2 }), C.select('tag', 'HTML tag', opts('h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div')), C.link('link', 'Link')],
    style: [C.align(), C.range('size', 'Size', 12, 140, { unit: 'px', responsive: true }), C.select('font', 'Font', FONTS), C.select('weight', 'Weight', WEIGHTS), C.color('color', 'Text colour'), C.range('lineHeight', 'Line height', 0.8, 2, { step: 0.05 }), C.range('letter', 'Letter spacing', -2, 12, { unit: 'px', step: 0.5 }), C.select('transform', 'Transform', opts(['none', 'Normal'], ['uppercase', 'UPPERCASE']))] },
  text: { label: 'Text', icon: '¶', cat: 'Basic', defaults: { html: '<p>Click here to edit this text. Write about your show, your newsroom or anything you like.</p>', size: 17, align: 'left' },
    content: [C.area('html', 'Text (HTML allowed: b, i, a, ul, ol, p)', { rows: 8 })],
    style: [C.align(), C.range('size', 'Size', 10, 60, { unit: 'px', responsive: true }), C.select('font', 'Font', FONTS), C.color('color', 'Text colour'), C.range('lineHeight', 'Line height', 1, 2.4, { step: 0.05 }), C.range('maxWidth', 'Max width', 0, 1200, { unit: 'px' })] },
  image: { label: 'Image', icon: '🖼', cat: 'Basic', defaults: { src: '', alt: '', width: 100, align: 'center', aspect: 'auto' },
    content: [C.image('src', 'Choose image'), C.text('alt', 'Alt text'), C.text('caption', 'Caption'), C.link('link', 'Link')],
    style: [C.align(), C.range('width', 'Width', 5, 100, { unit: '%', responsive: true }), C.select('aspect', 'Shape', opts(['auto', 'Original'], ['16/9', '16:9'], ['4/3', '4:3'], ['1/1', 'Square'], ['3/2', '3:2'])), C.range('imgRadius', 'Corner radius', 0, 80, { unit: 'px' })] },
  button: { label: 'Button', icon: '▭', cat: 'Basic', defaults: { text: 'Click here', link: '/', variant: 'red', size: 'md', align: 'left', icon: 'none' },
    content: [C.text('text', 'Text'), C.link('link', 'Link'), C.swit('newTab', 'Open in new tab'), C.select('icon', 'Icon', opts(['none', 'None'], ['play', 'Play'], ['arrow', 'Arrow']))],
    style: [C.align(), C.select('variant', 'Style', opts(['red', 'Red'], ['ink', 'Dark'], ['amber', 'Amber'], ['white', 'White'], ['outline', 'Outline'])), C.select('size', 'Size', opts(['sm', 'Small'], ['md', 'Medium'], ['lg', 'Large'])), C.swit('full', 'Full width'), C.range('btnRadius', 'Corner radius', 0, 60, { unit: 'px' })] },
  spacer: { label: 'Spacer', icon: '↕', cat: 'Basic', defaults: { height: 40 }, content: [C.range('height', 'Height', 0, 400, { unit: 'px', responsive: true })], style: [] },
  divider: { label: 'Divider', icon: '—', cat: 'Basic', defaults: { line: 'solid', weight: 2, color: '#e3e2dd', width: 100, align: 'center' },
    content: [C.select('line', 'Style', opts('solid', 'dashed', 'dotted', 'double'))], style: [C.range('weight', 'Weight', 1, 12, { unit: 'px' }), C.color('color', 'Colour'), C.range('width', 'Width', 5, 100, { unit: '%' }), C.align()] },
  video: { label: 'Video', icon: '▶', cat: 'Media', defaults: { url: '', poster: '', aspect: '16/9' },
    content: [C.text('url', 'Video link (HLS .m3u8, MP4, YouTube or Vimeo)'), C.image('poster', 'Poster image'), C.swit('autoplay', 'Autoplay (muted)')],
    style: [C.select('aspect', 'Aspect ratio', opts(['16/9', '16:9'], ['21/9', '21:9'], ['4/3', '4:3'], ['1/1', 'Square'])), C.range('vidRadius', 'Corner radius', 0, 60, { unit: 'px' })] },
  gallery: { label: 'Image gallery', icon: '▦', cat: 'Media', defaults: { images: [], columns: 3, gap: 12, aspect: '4/3' },
    content: [C.rep('images', 'Images', [C.image('src', 'Image'), C.text('alt', 'Alt text')], { src: '', alt: '' })],
    style: [C.range('columns', 'Columns', 1, 6, { responsive: true }), C.range('gap', 'Gap', 0, 40, { unit: 'px' }), C.select('aspect', 'Shape', opts(['4/3', '4:3'], ['1/1', 'Square'], ['16/9', '16:9'], ['3/4', 'Portrait'])), C.range('imgRadius', 'Corner radius', 0, 40, { unit: 'px' })] },
  hero: { label: 'Hero banner', icon: '◧', cat: 'General', defaults: { eyebrow: 'MEDIA 1313', title: 'Your headline goes here', subtitle: 'A short line that tells people why they should keep watching, listening or reading.', btn1Text: 'Watch live', btn1Link: '/live', btn2Text: 'Latest news', btn2Link: '/news', bgImage: '', overlay: 55, align: 'left', minHeight: 460, titleSize: 64 },
    content: [C.text('eyebrow', 'Small label'), C.area('title', 'Headline', { rows: 2 }), C.area('subtitle', 'Subtitle', { rows: 3 }), C.text('btn1Text', 'Button 1 text'), C.link('btn1Link', 'Button 1 link'), C.text('btn2Text', 'Button 2 text'), C.link('btn2Link', 'Button 2 link'), C.image('bgImage', 'Background image')],
    style: [C.align(), C.range('overlay', 'Dark overlay', 0, 90, { unit: '%' }), C.range('minHeight', 'Height', 200, 900, { unit: 'px', responsive: true }), C.range('titleSize', 'Headline size', 24, 140, { unit: 'px', responsive: true })] },
  iconbox: { label: 'Icon box', icon: '★', cat: 'General', defaults: { icon: '📺', title: 'Feature title', text: 'Describe the feature in a sentence or two.', align: 'center', iconSize: 44 },
    content: [C.text('icon', 'Icon (emoji or letter)'), C.text('title', 'Title'), C.area('text', 'Description', { rows: 3 }), C.link('link', 'Link')],
    style: [C.align(), C.range('iconSize', 'Icon size', 16, 120, { unit: 'px' }), C.range('titleSize', 'Title size', 14, 60, { unit: 'px' }), C.color('color', 'Text colour')] },
  iconlist: { label: 'Icon list', icon: '☰', cat: 'General', defaults: { items: [{ icon: '✓', text: 'First item' }, { icon: '✓', text: 'Second item' }, { icon: '✓', text: 'Third item' }], iconColor: '#d21f26', size: 17, gap: 10 },
    content: [C.rep('items', 'Items', [C.text('icon', 'Icon'), C.text('text', 'Text')], { icon: '✓', text: 'New item' })],
    style: [C.color('iconColor', 'Icon colour'), C.range('size', 'Text size', 12, 40, { unit: 'px' }), C.range('gap', 'Row gap', 0, 40, { unit: 'px' }), C.color('color', 'Text colour')] },
  counter: { label: 'Counter', icon: '#', cat: 'General', defaults: { number: 100, prefix: '', suffix: '+', label: 'Shows on air', size: 64, align: 'center' },
    content: [C.range('number', 'Number', 0, 1000000, {}), C.text('prefix', 'Prefix'), C.text('suffix', 'Suffix'), C.text('label', 'Label')],
    style: [C.align(), C.range('size', 'Number size', 20, 160, { unit: 'px', responsive: true }), C.color('color', 'Number colour')] },
  accordion: { label: 'Accordion / FAQ', icon: '≡', cat: 'General', defaults: { items: [{ title: 'A question people ask', body: 'The answer goes here.' }, { title: 'Another question', body: 'Another answer.' }], openFirst: true },
    content: [C.rep('items', 'Items', [C.text('title', 'Question'), C.area('body', 'Answer')], { title: 'New question', body: '' }), C.swit('openFirst', 'Open the first item')], style: [C.color('color', 'Text colour')] },
  testimonial: { label: 'Testimonial', icon: '❝', cat: 'General', defaults: { quote: 'The best way to start my day. News I can trust.', name: 'Viewer name', role: 'Community member', image: '', align: 'center' },
    content: [C.area('quote', 'Quote'), C.text('name', 'Name'), C.text('role', 'Role'), C.image('image', 'Photo')], style: [C.align(), C.color('color', 'Text colour'), C.range('size', 'Quote size', 14, 48, { unit: 'px' })] },
  html: { label: 'Custom HTML', icon: '</>', cat: 'General', defaults: { code: '<p>Custom HTML</p>' }, content: [C.area('code', 'HTML code (scripts are removed)', { rows: 10, mono: true })], style: [] },
  // ---- live data ----
  ticker: { label: 'Breaking ticker', icon: '⚡', cat: 'Live data', defaults: {}, content: [C.text('label', 'Label (default: BREAKING)')], style: [], note: 'Scrolls a random pick of your latest published stories (new pick each page load). A headline typed under Site content is shown first.' },
  player: { label: 'Live TV player', icon: '📡', cat: 'Live data', defaults: { aspect: '16/9' }, content: [C.text('url', 'Stream link (leave empty to use the site’s Live TV player)'), C.image('poster', 'Poster image')], style: [C.select('aspect', 'Aspect ratio', opts(['16/9', '16:9'], ['21/9', '21:9'], ['4/3', '4:3'])), C.range('vidRadius', 'Corner radius', 0, 60, { unit: 'px' })], note: 'The HLS link is set under Site content → Live TV player.' },
  share: { label: 'Share buttons', icon: '↗', cat: 'General', defaults: { label: 'Share', align: 'left' }, content: [C.text('label', 'Label (empty = none)')], style: [C.align('align', 'Alignment', { responsive: false })], note: 'Shares the page it is on. Choose which networks show under Site content → Social media & sharing.' },
  radio: { label: 'Radio player', icon: '📻', cat: 'Live data', defaults: { title: '1313 Radio', style: 'card' }, content: [C.text('title', 'Title'), C.select('style', 'Style', opts(['card', 'Card'], ['button', 'Play button only']))], style: [C.align()], note: 'Plays the live stream link set under Site content → Banner & radio stream.' },
  onair: { label: 'On air now', icon: '◉', cat: 'Live data', defaults: { channel: 'tv' }, content: [C.select('channel', 'Channel', opts(['tv', 'TV'], ['radio', 'Radio']))], style: [] },
  schedule: { label: 'Schedule', icon: '🗓', cat: 'Live data', defaults: { channel: 'tv', day: 'weekday', rows: 6 }, content: [C.select('channel', 'Channel', opts(['tv', 'TV'], ['radio', 'Radio'])), C.select('day', 'Days', opts(['weekday', 'Weekdays'], ['weekend', 'Weekends'])), C.range('rows', 'Rows to show', 1, 20)], style: [] },
  articles: { label: 'News articles', icon: '📰', cat: 'Live data', defaults: { heading: 'Latest news', category: 'All', count: 6, columns: 3, layout: 'grid', showImage: true, showExcerpt: false, showMeta: true, linkText: 'All news' },
    content: [C.text('heading', 'Heading'), C.select('category', 'Category', [], { dynamic: 'categories' }), C.range('count', 'Number of articles', 1, 24), C.select('layout', 'Layout', opts(['grid', 'Grid'], ['list', 'List'])), C.swit('showImage', 'Show image'), C.swit('showExcerpt', 'Show excerpt'), C.swit('showMeta', 'Show date'), C.text('linkText', '“View all” link text (empty = none)')],
    style: [C.range('columns', 'Columns', 1, 4, { responsive: true }), C.range('gap', 'Gap', 8, 60, { unit: 'px' })] },
  shows: { label: 'Shows grid', icon: '🎬', cat: 'Live data', defaults: { type: 'All', columns: 4 }, content: [C.select('type', 'Show', opts(['All', 'All'], ['TV', 'TV'], ['RADIO', 'Radio'], ['PODCAST', 'Podcasts']))], style: [C.range('columns', 'Columns', 1, 6, { responsive: true })] },
  podcasts: { label: 'Podcasts', icon: '🎙', cat: 'Live data', defaults: { columns: 3, count: 3 }, content: [C.range('count', 'How many', 1, 12)], style: [C.range('columns', 'Columns', 1, 6, { responsive: true })] },
  videos: { label: 'Video cards', icon: '🎞', cat: 'Live data', defaults: { columns: 4, count: 4 }, content: [C.range('count', 'How many', 1, 12)], style: [C.range('columns', 'Columns', 1, 6, { responsive: true })] },
  newsletter: { label: 'Newsletter signup', icon: '✉', cat: 'Forms', defaults: { title: 'The 1313 Briefing', text: 'Top stories, what’s on TV tonight and what’s playing on radio — in your inbox every morning.', button: 'Subscribe', placeholder: 'Your email address', align: 'left' },
    content: [C.text('title', 'Title'), C.area('text', 'Text'), C.text('placeholder', 'Placeholder'), C.text('button', 'Button text')], style: [C.align(), C.color('color', 'Text colour')] },
  contact: { label: 'Contact form', icon: '☎', cat: 'Forms', defaults: { button: 'Send message' }, content: [C.text('button', 'Button text')], style: [] },
};
export const WIDGET_CATS = ['Basic', 'Media', 'General', 'Live data', 'Forms'];

export const SECTION = {
  label: 'Section',
  content: [C.select('layout', 'Content width', opts(['boxed', 'Boxed'], ['full', 'Full width'])), C.range('maxWidth', 'Boxed width', 600, 1600, { unit: 'px' }), C.range('minHeight', 'Min height', 0, 1000, { unit: 'px', responsive: true }), C.select('valign', 'Vertical align', opts(['stretch', 'Stretch'], ['flex-start', 'Top'], ['center', 'Middle'], ['flex-end', 'Bottom'])), C.range('gap', 'Gap between columns', 0, 100, { unit: 'px' }), C.select('stack', 'Stack columns on', opts(['mobile', 'Mobile'], ['tablet', 'Tablet and mobile'], ['never', 'Never']))],
  style: [...COMMON_STYLE.slice(0, 3), C.head('Overlay'), C.color('overlay', 'Background overlay colour'), C.range('overlayAlpha', 'Overlay strength', 0, 100, { unit: '%' }), ...COMMON_STYLE.slice(3)],
  defaults: { layout: 'boxed', maxWidth: 1200, gap: 24, valign: 'stretch', stack: 'mobile', pt: 48, pb: 48 },
};
export const COLUMN = {
  label: 'Column',
  content: [C.range('width', 'Width', 8, 100, { unit: '%', responsive: true }), C.select('valign', 'Vertical align', opts(['flex-start', 'Top'], ['center', 'Middle'], ['flex-end', 'Bottom'])), C.range('gap', 'Space between widgets', 0, 80, { unit: 'px' })],
  style: COMMON_STYLE, defaults: { width: 100, gap: 16, valign: 'flex-start' },
};
export const settingsSpec = (node) => {
  if (node.type === 'section') return { content: SECTION.content, style: SECTION.style, advanced: COMMON_ADVANCED, label: 'Section' };
  if (node.type === 'column') return { content: COLUMN.content, style: COLUMN.style, advanced: COMMON_ADVANCED, label: 'Column' };
  const w = WIDGETS[node.type]; return { content: w.content, style: [...w.style, ...(w.style.length ? [] : []), ...COMMON_STYLE], advanced: COMMON_ADVANCED, label: w.label, note: w.note };
};

/* ---------------------------------------------------------------- tree helpers ---------------------------------------------------------------- */
const clone = (x) => JSON.parse(JSON.stringify(x));
export const newWidget = (type, s = {}) => ({ id: uid(), type, s: { ...clone(WIDGETS[type].defaults), ...s } });
export const newColumn = (width = 100, widgets = []) => ({ id: uid(), type: 'column', s: { ...COLUMN.defaults, width }, widgets });
export const newSection = (widths = [100], s = {}) => ({ id: uid(), type: 'section', s: { ...SECTION.defaults, ...s }, cols: widths.map((w) => newColumn(w)) });
export const STRUCTURES = [[100], [50, 50], [33.33, 33.33, 33.33], [25, 25, 25, 25], [33.33, 66.67], [66.67, 33.33], [25, 50, 25]];

export function withNewIds(node) { const n = clone(node); const re = (x) => { x.id = uid(); (x.cols || []).forEach(re); (x.widgets || []).forEach(re); }; re(n); return n; }

/** Locate a node: returns { node, kind, parent, list, index } (list = the array that contains it). */
export function find(tree, id) {
  for (const [si, sec] of tree.sections.entries()) {
    if (sec.id === id) return { node: sec, kind: 'section', parent: null, list: tree.sections, index: si };
    for (const [ci, col] of sec.cols.entries()) {
      if (col.id === id) return { node: col, kind: 'column', parent: sec, list: sec.cols, index: ci };
      for (const [wi, w] of col.widgets.entries()) if (w.id === id) return { node: w, kind: 'widget', parent: col, list: col.widgets, index: wi };
    }
  }
  return null;
}
/** All edits take the tree and return a NEW tree. */
export const edit = (tree, fn) => { const t = clone(tree); fn(t); return t; };
export const patchSettings = (tree, id, patch) => edit(tree, (t) => { const f = find(t, id); if (f) f.node.s = { ...f.node.s, ...patch }; });
export const removeNode = (tree, id) => edit(tree, (t) => { const f = find(t, id); if (f) f.list.splice(f.index, 1); });
export const duplicateNode = (tree, id) => { let nid = null; const t = edit(tree, (x) => { const f = find(x, id); if (f) { const c = withNewIds(f.node); nid = c.id; f.list.splice(f.index + 1, 0, c); } }); return [t, nid]; };
export function insertNode(tree, parentId, index, node) { // parentId null → a section at root; section id → column; column id → widget
  return edit(tree, (t) => {
    if (parentId == null) t.sections.splice(index, 0, node);
    else { const p = find(t, parentId); if (p) (p.kind === 'section' ? p.node.cols : p.node.widgets).splice(index, 0, node); }
  });
}
export function moveNode(tree, id, parentId, index) {
  return edit(tree, (t) => {
    const f = find(t, id); if (!f) return;
    // don't drop a node inside itself
    if (parentId && find({ sections: [f.node].filter((n) => n.type === 'section') }, parentId)) return;
    f.list.splice(f.index, 1);
    let i = index; const p = parentId == null ? null : find(t, parentId);
    const target = parentId == null ? t.sections : p ? (p.kind === 'section' ? p.node.cols : p.node.widgets) : null;
    if (!target) return;
    if (target === f.list && f.index < index) i -= 1;
    target.splice(Math.max(0, Math.min(i, target.length)), 0, f.node);
  });
}
export const isEmpty = (tree) => !tree.sections.length;

/* ---------------------------------------------------------------- templates ---------------------------------------------------------------- */
const sec = (widths, s, ...colWidgets) => { const x = newSection(widths, s); colWidgets.forEach((ws, i) => { x.cols[i].widgets = ws; }); return x; };
export const TEMPLATES = {
  hero: { label: 'Hero', build: () => sec([100], { pt: 0, pb: 0, layout: 'full' }, [newWidget('hero')]) },
  features: { label: 'Three features', build: () => sec([33.33, 33.33, 33.33], {}, [newWidget('iconbox', { icon: '📺' , title: 'Watch live' })], [newWidget('iconbox', { icon: '📻', title: 'Listen live' })], [newWidget('iconbox', { icon: '📰', title: 'Read the news' })]) },
  split: { label: 'Text + image', build: () => sec([50, 50], { valign: 'center' }, [newWidget('heading', { text: 'About our newsroom' }), newWidget('text'), newWidget('button', { text: 'Learn more', link: '/about' })], [newWidget('image', { width: 100 })]) },
  cta: { label: 'Call to action', build: () => sec([100], { bg: '#0e1014', pt: 72, pb: 72 }, [newWidget('heading', { text: 'Don’t miss a moment', align: 'center', color: '#ffffff', size: 48 }), newWidget('text', { html: '<p>Join the 1313 community and get the day’s top stories first.</p>', align: 'center', color: '#c9ccd3' }), newWidget('button', { text: 'Create a free account', link: '/signin', align: 'center' })]) },
  news: { label: 'Latest news', build: () => sec([100], {}, [newWidget('articles')]) },
  newsletter: { label: 'Newsletter band', build: () => sec([100], { bg: '#d21f26', pt: 56, pb: 56 }, [newWidget('newsletter', { color: '#ffffff' })]) },
  live: { label: 'Live TV + on air', build: () => sec([66.67, 33.33], { bg: '#0e1014', pt: 40, pb: 40 }, [newWidget('player')], [newWidget('onair', { channel: 'tv' })]) },
};
export const PAGE_TEMPLATES = {
  blank: { label: 'Blank page', desc: 'Start from scratch.', build: () => ({ sections: [] }) },
  landing: { label: 'Landing page', desc: 'Hero, three features and a call to action.', build: () => ({ sections: [TEMPLATES.hero.build(), TEMPLATES.features.build(), TEMPLATES.cta.build()] }) },
  home: { label: 'Home page starter', desc: 'Live player, news, video, podcasts and newsletter — all live data.', build: () => ({ sections: [
    sec([100], { pt: 0, pb: 0, layout: 'full' }, [newWidget('ticker')]), TEMPLATES.live.build(), TEMPLATES.news.build(),
    sec([100], {}, [newWidget('heading', { text: 'Watch', size: 32 }), newWidget('videos')]),
    sec([100], { bg: '#f4f3ef' }, [newWidget('heading', { text: 'Listen', size: 32 }), newWidget('podcasts')]),
    TEMPLATES.newsletter.build()] }) },
};

/* human labels for the navigator */
export const labelOf = (n) => (n.type === 'section' ? 'Section' : n.type === 'column' ? 'Column' : WIDGETS[n.type]?.label || n.type);
export const previewText = (n) => { const s = n.s || {}; const v = s.text || s.title || s.heading || s.html || s.quote || s.number || ''; return String(v).replace(/<[^>]+>/g, '').slice(0, 28); };

/* Starting points for the site's built-in pages, so any of them can be opened in the builder ("Edit with page builder").
   They use live-data widgets, so the content keeps following your site content until you change it. */
const heroSec = (title, sub, extra = {}) => sec([100], { pt: 0, pb: 0, layout: 'full' }, [newWidget('hero', { eyebrow: 'MEDIA 1313', title, subtitle: sub, minHeight: 320, titleSize: 64, btn1Text: '', btn2Text: '', ...extra })]);
const titleSec = (t, sub) => sec([100], { pt: 48, pb: 8 }, [newWidget('heading', { text: t, size: 56, font: 'cond' }), ...(sub ? [newWidget('text', { html: `<p>${sub}</p>`, color: '#3d4047' })] : [])]);
export const BUILTIN_PAGES = {
  home: { title: 'Home', build: () => PAGE_TEMPLATES.home.build() },
  news: { title: 'News', build: () => ({ sections: [titleSec('News'), sec([100], { pt: 16 }, [newWidget('articles', { heading: '', count: 12, columns: 3, showExcerpt: true, linkText: '' })]), TEMPLATES.newsletter.build()] }) },
  tv: { title: 'TV', build: () => ({ sections: [heroSec('1313 TV', 'News, originals, sports and documentaries — live and on demand.', { btn1Text: 'Watch live', btn1Link: '/live' }), TEMPLATES.live.build(), sec([100], {}, [newWidget('heading', { text: 'TV shows', size: 36 }), newWidget('shows', { type: 'TV' })]), sec([100], { pt: 0 }, [newWidget('heading', { text: 'Watch', size: 36 }), newWidget('videos')])] }) },
  radio: { title: 'Radio', build: () => ({ sections: [heroSec('1313 Radio', 'News, talk and music, around the clock.', { btn1Text: 'Listen live', btn1Link: '/live' }), sec([50, 50], {}, [newWidget('heading', { text: 'On air now', size: 36 }), newWidget('onair', { channel: 'radio' })], [newWidget('heading', { text: 'Today on radio', size: 36 }), newWidget('schedule', { channel: 'radio' })]), sec([100], {}, [newWidget('heading', { text: 'Radio shows', size: 36 }), newWidget('shows', { type: 'RADIO' })])] }) },
  shows: { title: 'Shows', build: () => ({ sections: [titleSec('Shows', 'Every program on 1313 TV, 1313 Radio and our podcasts.'), sec([100], { pt: 16 }, [newWidget('shows', { type: 'All', columns: 4 })])] }) },
  podcasts: { title: 'Podcasts', build: () => ({ sections: [titleSec('Podcasts'), sec([100], { pt: 16 }, [newWidget('podcasts', { count: 12, columns: 3 })]), TEMPLATES.newsletter.build()] }) },
  schedule: { title: 'Schedule', build: () => ({ sections: [titleSec('Schedule', 'What’s on 1313 TV and 1313 Radio.'), sec([50, 50], { pt: 16 }, [newWidget('heading', { text: 'TV', size: 32 }), newWidget('schedule', { channel: 'tv', rows: 12 })], [newWidget('heading', { text: 'Radio', size: 32 }), newWidget('schedule', { channel: 'radio', rows: 12 })])] }) },
  sports: { title: 'Sports', build: () => ({ sections: [titleSec('Sports'), sec([100], { pt: 16 }, [newWidget('articles', { heading: 'Latest', count: 6, linkText: '' })]), sec([100], {}, [newWidget('heading', { text: 'Highlights', size: 36 }), newWidget('videos')])] }) },
  live: { title: 'Live', build: () => ({ sections: [sec([66.67, 33.33], { bg: '#0e1014', pt: 32, pb: 48 }, [newWidget('player')], [newWidget('onair', { channel: 'tv' }), newWidget('schedule', { channel: 'tv', rows: 6 })])] }) },
  about: { title: 'About', build: () => ({ sections: [heroSec('One newsroom. TV, radio and news in one place.', '[Mission statement: who MEDIA 1313 serves and what it stands for.]'), TEMPLATES.features.build(), sec([100], { pt: 32 }, [newWidget('heading', { text: 'Contact the newsroom', size: 40 }), newWidget('contact')])] }) },
};

/** Site-content blocks that feed a widget (editable right inside the builder under "Data for this widget"). */
export const WIDGET_DATA = {
  share: ['SOCIAL'], ticker: ['SITE'], radio: ['SITE', 'NOW_ON_RADIO'], player: ['PLAYER'], schedule: ['SCHEDULE'], shows: ['SHOWS'], podcasts: ['PODCASTS'], videos: ['VIDEOS'],
  onair: (s) => (s.channel === 'radio' ? ['NOW_ON_RADIO', 'RADIO_UP_NEXT'] : ['NOW_ON_TV', 'TV_UP_NEXT']),
  contact: ['CONTACT_TOPICS'],
};
export const dataKeysOf = (node) => { const d = WIDGET_DATA[node?.type]; return typeof d === 'function' ? d(node.s) : d || []; };
/** Clicking the site header / footer in the canvas opens these blocks. */
export const CHROME_BLOCKS = { NAV: ['NAV', 'CHROME'], CHROME: ['CHROME', 'NAV'], FOOTER_COLS: ['FOOTER_COLS', 'CHROME'], SITE: ['SITE'] };
