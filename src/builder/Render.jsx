import { WidgetBody } from './widgets.jsx';
import { buildCss } from './css.js';

const wrap = (node, base, editor, extra = {}) => ({
  className: [`pb-${node.id}`, base, node.s.cssClass, !editor && node.s.anim && node.s.anim !== 'none' ? `pb-anim pb-anim--${node.s.anim}` : ''].filter(Boolean).join(' '),
  id: node.s.cssId || undefined, 'data-pb-id': node.id, 'data-pb-type': node.type, ...extra,
});

/** Draws a page tree. `editor` adds the data hooks + placeholders the builder canvas needs. */
export function PageRender({ tree, editor = false }) {
  return (
    <>
      <style>{buildCss(tree, { editor })}</style>
      <div className={`pb-page ${editor ? 'pb-edit' : ''}`}>
        {tree.sections.map((sec) => (
          <section key={sec.id} {...wrap(sec, `pb-section pb-${sec.s.layout === 'full' ? 'full' : 'boxed'}`, editor)}>
            <div className="pb-in pb-row">
              {sec.cols.map((col) => (
                <div key={col.id} {...wrap(col, 'pb-col', editor)}>
                  {col.widgets.map((w) => <div key={w.id} {...wrap(w, `pb-widget pb-w-${w.type}`, editor)}><WidgetBody node={w} editor={editor} /></div>)}
                  {editor && col.widgets.length === 0 && <div className="pb-empty-col" data-pb-empty="1">Drag a widget here</div>}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
