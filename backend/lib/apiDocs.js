// The human-readable API documentation page (/api/docs). It renders itself from /api/v1/openapi.json, so it can never be out of date.
export const docsHtml = () => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MEDIA 1313 API</title>
<style>
:root{--bg:#0b0b0d;--panel:#131316;--line:#26262b;--txt:#ececf0;--mut:#9a9aa6;--red:#d21f26;--get:#10b981;--post:#3b82f6;--put:#f59e0b;--del:#ef4444}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font:15px/1.55 Inter,system-ui,sans-serif}a{color:#fff}
header{padding:28px 20px;border-bottom:1px solid var(--line);position:sticky;top:0;background:rgba(11,11,13,.95);backdrop-filter:blur(8px);z-index:5}
.wrap{max-width:980px;margin:0 auto;padding:0 20px}h1{margin:0;font-size:24px}h1 span{color:var(--red)}h2{margin:36px 0 12px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut)}
.bar{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-top:10px;color:var(--mut);font-size:13px}.bar input{background:#0e0e11;border:1px solid var(--line);border-radius:8px;color:#fff;padding:8px 10px;min-width:260px}
code,pre{font-family:ui-monospace,Menlo,monospace;font-size:13px}pre{background:#09090b;border:1px solid var(--line);border-radius:10px;padding:14px;overflow:auto;margin:8px 0}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;margin:10px 0}.card>summary{list-style:none;cursor:pointer;display:flex;gap:12px;align-items:center;padding:14px 16px}.card[open]>summary{border-bottom:1px solid var(--line)}
.m{font:700 12px ui-monospace,monospace;padding:3px 8px;border-radius:6px;color:#000;min-width:58px;text-align:center}.GET{background:var(--get)}.POST{background:var(--post)}.PUT{background:var(--put)}.DELETE{background:var(--del)}
.path{font-family:ui-monospace,monospace;font-size:14px}.sum{color:var(--mut);margin-left:auto;font-size:13px;text-align:right}.body{padding:14px 16px}
table{width:100%;border-collapse:collapse;margin:8px 0;font-size:13px}td,th{padding:6px 8px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--mut);font-weight:600}
input.p,textarea.b{background:#0e0e11;border:1px solid var(--line);border-radius:6px;color:#fff;padding:6px 8px;width:100%;font:13px ui-monospace,monospace}textarea.b{min-height:90px}
button{background:#fff;color:#000;border:0;border-radius:8px;padding:8px 14px;font-weight:600;cursor:pointer}button.t{background:#26262b;color:#fff}.tabs{display:flex;gap:6px;margin-top:8px}.tabs button{padding:6px 12px}.tabs .on{background:#fff;color:#000}
.res{margin-top:10px;max-height:380px;overflow:auto}.st{font:600 12px ui-monospace,monospace;margin-top:8px}.lock{color:var(--put);font-size:12px}
</style></head><body>
<header><div class="wrap"><h1>MEDIA <span>1313</span> public API</h1>
<div class="bar"><span>Base URL: <code id="base"></code></span><span>Version <code id="ver"></code></span><a href="/api/v1/openapi.json">OpenAPI JSON</a>
<label>API key (if required): <input id="key" placeholder="m13_…" autocomplete="off"></label></div></div></header>
<main class="wrap"><div id="intro"></div><h2>Quick start</h2><div class="tabs" id="tabs"></div><pre id="snip"></pre><div id="eps"></div></main>
<script>
const $=(s,e=document)=>e.querySelector(s),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const key=()=>$('#key').value.trim();
fetch('/api/v1/openapi.json').then(r=>r.json()).then(spec=>{
  const base=spec.servers[0].url;$('#base').textContent=base+'/api/v1';$('#ver').textContent=spec.info.version;
  $('#intro').innerHTML='<p style="color:var(--mut);white-space:pre-line;margin-top:20px">'+esc(spec.info.description.replace(/\\*\\*/g,'').replace(/\`/g,''))+'</p>';
  const S={curl:'curl '+base+'/api/v1/articles?per_page=5\\n\\n# with an API key:\\ncurl -H "X-API-Key: YOUR_KEY" '+base+'/api/v1/live',
   javascript:'const res = await fetch("'+base+'/api/v1/articles?category=local&per_page=10");\\nconst { data, meta, links } = await res.json();\\nconsole.log(data[0].title, meta.total);',
   swift:'let url = URL(string: "'+base+'/api/v1/articles?per_page=10")!\\nvar req = URLRequest(url: url)\\n// req.setValue("YOUR_KEY", forHTTPHeaderField: "X-API-Key")\\nlet (data, _) = try await URLSession.shared.data(for: req)\\nstruct Page: Decodable { let data: [Article] }  // Article: id, slug, title, excerpt, image, url, published_at …\\nlet page = try JSONDecoder().decode(Page.self, from: data)',
   kotlin:'val req = Request.Builder()\\n  .url("'+base+'/api/v1/live")\\n  // .header("X-API-Key", "YOUR_KEY")\\n  .build()\\nOkHttpClient().newCall(req).execute().use { println(it.body!!.string()) }'};
  const tabs=$('#tabs');let cur='curl';const show=()=>{$('#snip').textContent=S[cur];[...tabs.children].forEach(b=>b.className=b.dataset.k===cur?'on':'t')};
  Object.keys(S).forEach(k=>{const b=document.createElement('button');b.textContent=k==='javascript'?'JavaScript':k[0].toUpperCase()+k.slice(1);b.dataset.k=k;b.onclick=()=>{cur=k;show()};tabs.appendChild(b)});show();
  const by={};for(const [p,ops] of Object.entries(spec.paths))for(const [m,op] of Object.entries(ops))(by[op.tags[0]]??=[]).push({p,m:m.toUpperCase(),op});
  const out=$('#eps');
  for(const tag of spec.tags.map(t=>t.name)){ if(!by[tag])continue; out.insertAdjacentHTML('beforeend','<h2>'+tag+'</h2>');
    for(const {p,m,op} of by[tag]){
      const d=document.createElement('details');d.className='card';
      const ps=(op.parameters||[]);
      d.innerHTML='<summary><span class="m '+m+'">'+m+'</span><span class="path">'+esc(p)+'</span>'+(op.security?'<span class="lock">🔒 sign-in</span>':'')+'<span class="sum">'+esc(op.summary)+'</span></summary><div class="body">'+(op.description?'<p style="margin-top:0">'+esc(op.description).replace(/\\\`([^\\\`]+)\\\`/g,'<code>$1</code>')+'</p>':'')+
      (ps.length?'<table><tr><th>Parameter</th><th>In</th><th>Description</th><th>Try it</th></tr>'+ps.map((x,i)=>'<tr><td><code>'+x.name+'</code></td><td>'+x.in+'</td><td>'+esc(x.description||'')+'</td><td><input class="p" data-i="'+i+'" placeholder="'+(x.schema.default??'')+'"></td></tr>').join('')+'</table>':'')+
      (op.requestBody?'<div>Request body (JSON)</div><textarea class="b">'+esc(JSON.stringify(op.requestBody.content['application/json'].schema.example,null,2))+'</textarea>':'')+
      (op.security?'<div style="margin-top:8px">Bearer token: <input class="p tok" placeholder="token from /auth/login" style="max-width:420px"></div>':'')+
      '<p><button>Send request</button></p><div class="st"></div><pre class="res" hidden></pre></div>';
      d.querySelector('button').onclick=async()=>{
        let url=base+p;const q=new URLSearchParams();
        d.querySelectorAll('input.p[data-i]').forEach(inp=>{const x=ps[inp.dataset.i];if(!inp.value)return;if(x.in==='path')url=url.replace('{'+x.name+'}',encodeURIComponent(inp.value));else q.set(x.name,inp.value)});
        if(/\\{/.test(url)){$('.st',d).textContent='Fill in the path parameter first.';return}
        const h={};if(key())h['X-API-Key']=key();const tk=$('.tok',d);if(tk&&tk.value)h.Authorization='Bearer '+tk.value;
        const init={method:m,headers:h};const bd=$('textarea.b',d);if(bd){init.body=bd.value;h['Content-Type']='application/json'}
        const full=url+(q.toString()?'?'+q:'');const t0=performance.now();
        try{const r=await fetch(full,init);const txt=await r.text();let pretty=txt;try{pretty=JSON.stringify(JSON.parse(txt),null,2)}catch{}
          $('.st',d).textContent=m+' '+full.replace(base,'')+'  →  '+r.status+' ('+Math.round(performance.now()-t0)+' ms)';const pre=$('.res',d);pre.hidden=false;pre.textContent=pretty.slice(0,20000)}
        catch(e){$('.st',d).textContent='Request failed: '+e.message}};
      out.appendChild(d)}}
});
</script></body></html>`;
