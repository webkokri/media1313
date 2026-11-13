import { useState } from 'react';
import { adminApi } from './adminApi.js';
import MediaPicker from './MediaPicker.jsx';
import { Badge, Empty, Page, Status, confirmAction, useLoad, useToast } from './ui.jsx';

const EMPTY = {
  shows: { title: '', type: 'RADIO', genre: '', host: '', when: '', description: '', image: '', bg: '#2A3550', active: true },
  videos: { title: '', show: '', url: '', poster: '', dur: '', active: true },
};

function Field({ label, children, hint }) { return <div><label className="ad-label">{label}</label>{children}{hint && <p className="ad-muted" style={{ marginTop: 4 }}>{hint}</p>}</div>; }

function Manager({ kind }) {
  const isShow = kind === 'shows';
  const s = useLoad(() => adminApi.get(`/${kind}`), [kind]);
  const toast = useToast();
  const [form, setForm] = useState(null);                 // the item being added / edited
  const [pick, setPick] = useState(null);                 // 'image' | 'poster'
  const [busy, setBusy] = useState(false);
  const [showNames, setShowNames] = useState([]);
  const items = s.data?.items || [];
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const open = async (item) => {
    setForm(item ? { ...EMPTY[kind], ...item } : { ...EMPTY[kind] });
    if (!isShow) { try { setShowNames((await adminApi.get('/shows')).items.map((x) => x.title)); } catch { /* optional */ } }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const apply = (r) => { s.reload?.(); return r; };
  const save = async () => {
    setBusy(true);
    try { form.id ? await adminApi.put(`/${kind}/${form.id}`, form) : await adminApi.post(`/${kind}`, form); toast(form.id ? 'Saved — live on the site now' : 'Added — live on the site now'); setForm(null); apply(); }
    catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const remove = async (it) => { if (!confirmAction(`Delete “${it.title}”?`)) return; try { await adminApi.del(`/${kind}/${it.id}`); toast('Deleted'); apply(); } catch (e) { toast(e.message, 'error'); } };
  const toggle = async (it) => { try { await adminApi.put(`/${kind}/${it.id}`, { ...it, active: !it.active }); apply(); } catch (e) { toast(e.message, 'error'); } };
  const move = async (i, d) => {
    const ids = items.map((x) => x.id); const j = i + d; if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try { await adminApi.put(`/${kind}/order`, { ids }); apply(); } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <Page title={isShow ? 'Shows' : 'Videos'} sub={isShow ? 'Radio, TV and podcast programmes. Anything you add or change appears on the website straight away.' : 'Videos shown on the home page and News. Add an HLS (.m3u8), MP4 or YouTube link and visitors can play it on the site.'}
      actions={<button className="ad-btn ad-primary" onClick={() => open(null)}>+ Add {isShow ? 'show' : 'video'}</button>}>
      {form && (
        <section className="ad-panel">
          <h2>{form.id ? `Edit ${isShow ? 'show' : 'video'}` : `New ${isShow ? 'show' : 'video'}`}</h2>
          <div className="ab-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            <Field label="Title"><input className="ad-input" value={form.title} onChange={set('title')} autoFocus /></Field>
            {isShow ? <>
              <Field label="Type"><select className="ad-input" value={form.type} onChange={set('type')}><option value="RADIO">Radio show</option><option value="TV">TV show</option><option value="PODCAST">Podcast</option></select></Field>
              <Field label="Genre"><input className="ad-input" value={form.genre} onChange={set('genre')} placeholder="News, Music, Talk…" /></Field>
              <Field label="Host"><input className="ad-input" value={form.host} onChange={set('host')} /></Field>
              <Field label="When it airs"><input className="ad-input" value={form.when} onChange={set('when')} placeholder="Weekdays 6 – 9 AM" /></Field>
              <Field label="Card colour (if no image)"><input className="ad-input" type="color" value={form.bg || '#2A3550'} onChange={set('bg')} style={{ padding: 2, height: 40 }} /></Field>
            </> : <>
              <Field label="Show (optional)"><input className="ad-input" list="vd-shows" value={form.show} onChange={set('show')} placeholder="Which show is it from?" /><datalist id="vd-shows">{showNames.map((n) => <option key={n} value={n} />)}</datalist></Field>
              <Field label="Video link" hint="HLS (.m3u8), MP4/WebM or a YouTube link — must start with https://"><input className="ad-input" value={form.url} onChange={set('url')} placeholder="https://…/video.m3u8" /></Field>
              <Field label="Length"><input className="ad-input" value={form.dur} onChange={set('dur')} placeholder="5:12" /></Field>
            </>}
          </div>
          {isShow && <Field label="Description"><textarea className="ad-input" rows={3} value={form.description} onChange={set('description')} /></Field>}
          <label className="ad-label">{isShow ? 'Image' : 'Thumbnail'}</label>
          <div className="ab-key" style={{ alignItems: 'center' }}>
            {(isShow ? form.image : form.poster) && <img src={isShow ? form.image : form.poster} alt="" style={{ height: 56, borderRadius: 6 }} />}
            <button className="ad-btn" type="button" onClick={() => setPick(isShow ? 'image' : 'poster')}>{(isShow ? form.image : form.poster) ? 'Change' : 'Choose from media library'}</button>
            {(isShow ? form.image : form.poster) && <button className="ad-btn ghost" type="button" onClick={() => setForm({ ...form, [isShow ? 'image' : 'poster']: '' })}>Remove</button>}
          </div>
          <label className="ab-check"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Show on the website</label>
          <div className="ad-actions" style={{ marginTop: 16 }}>
            <button className="ad-btn ad-primary" disabled={busy || !form.title.trim()} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
            <button className="ad-btn ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </section>
      )}
      <Status state={s} />
      {s.data && (items.length === 0 ? <Empty>Nothing here yet — add your first {isShow ? 'show' : 'video'}.</Empty> : (
        <section className="ad-panel" style={{ padding: 0 }}>
          {items.map((it, i) => (
            <div key={it.id} className="ad-row" style={{ alignItems: 'center', opacity: it.active ? 1 : 0.55 }}>
              {(isShow ? it.image : it.poster) ? <img src={isShow ? it.image : it.poster} alt="" style={{ width: 72, height: 44, objectFit: 'cover', borderRadius: 6, flex: 'none' }} /> : <span style={{ width: 72, height: 44, borderRadius: 6, flex: 'none', background: isShow ? it.bg : '#23262d' }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{it.title}</strong> {isShow && <Badge>{it.type}</Badge>} {!it.active && <Badge kind="warn">hidden</Badge>}
                <p className="ad-muted ad-clip">{isShow ? [it.genre, it.host && `with ${it.host}`, it.when].filter(Boolean).join(' · ') : [it.show, it.dur, it.url ? 'playable' : 'no video link yet'].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="ad-actions" style={{ flex: 'none' }}>
                <button className="ad-btn sm ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                <button className="ad-btn sm ghost" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}>↓</button>
                <button className="ad-btn sm ghost" onClick={() => toggle(it)}>{it.active ? 'Hide' : 'Show'}</button>
                <button className="ad-btn sm" onClick={() => open(it)}>Edit</button>
                <button className="ad-btn sm ghost danger" onClick={() => remove(it)}>Delete</button>
              </div>
            </div>
          ))}
        </section>
      ))}
      {pick && <MediaPicker onClose={() => setPick(null)} onPick={(m) => { setForm({ ...form, [pick]: m.url }); setPick(null); }} />}
    </Page>
  );
}
export const ShowsManager = () => <Manager kind="shows" />;
export const VideosManager = () => <Manager kind="videos" />;
