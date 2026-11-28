import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getTeamPortfoliosCollection, getTeamPortfolioPartsCollection } from '../../../../../lib/mongodb';

// Public — opens a portfolio uploaded in Admin → Team. Every upload gets a new
// id, so a URL's content never changes and can be cached for good.
//
// A file in one part is served as-is. A larger one is too big for a single
// Vercel response (4.5MB), so a tiny page is served instead that downloads the
// parts (/api/team/portfolio/<id>/<n>), joins them and shows the portfolio in
// place at this same address.
//
// Hardening for uploaded pages:
//
// WHY THE SANDBOX — an uploaded page is arbitrary HTML and JavaScript served
// from this site's own origin. Served plainly, its scripts run *as this site*
// and could call /api/admin/* with a signed-in admin's session cookie. The CSP
// `sandbox` directive (without allow-same-origin) gives the page an opaque
// origin: no cookies, no same-origin access, while its scripts, links and
// pop-ups still work. Because of that opaque origin, the loader's fetches of
// the parts are cross-origin, so the parts route sends Access-Control-Allow-Origin.
//
// WHY THE SHIM — an opaque origin has no localStorage/sessionStorage; touching
// them throws. Portfolio pages use localStorage for their light/dark toggle,
// some without a try/catch, which would stop their script dead. STORAGE_SHIM
// runs first and swaps in an in-memory store; the only loss is that the theme
// choice isn't remembered between visits.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE = 'public, max-age=31536000, immutable';
const STORAGE_SHIM = `<script>(function(){function m(){var d={};return{getItem:function(k){return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[k]=String(v)},removeItem:function(k){delete d[k]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}['localStorage','sessionStorage'].forEach(function(n){try{window[n].getItem('x')}catch(e){try{Object.defineProperty(window,n,{value:m(),configurable:true})}catch(_){}}})})();<\/script>`;
const SANDBOX = 'sandbox allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-downloads allow-top-navigation-by-user-activation';

/** Put the shim first: right after <head>, else after <html>, else at the top. */
function withShim(html) {
    const head = html.match(/<head[^>]*>/i);
    if (head) return html.replace(head[0], `${head[0]}${STORAGE_SHIM}`);
    const root = html.match(/<html[^>]*>/i);
    if (root) return html.replace(root[0], `${root[0]}${STORAGE_SHIM}`);
    return STORAGE_SHIM + html;
}
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function loaderPage(id, parts, name) {
    const title = escapeHtml(name.replace(/\.html?$/i, '').replace(/[_-]+/g, ' '));
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>html,body{margin:0;height:100%;background:#fff}body{display:grid;place-items:center;font:500 15px/1.5 system-ui,-apple-system,sans-serif;color:#64748b}
.l{display:flex;flex-direction:column;align-items:center;gap:14px}.s{width:34px;height:34px;border-radius:50%;border:3px solid #fde2dd;border-top-color:#e2544c;animation:r .8s linear infinite}@keyframes r{to{transform:rotate(360deg)}}</style></head>
${STORAGE_SHIM}<body><div class="l"><div class="s"></div><p id="m">Opening portfolio…</p></div><script>
(async function(){try{var u='/api/team/portfolio/${id}/';var bufs=await Promise.all(Array.from({length:${parts}},function(_,i){return fetch(u+i).then(function(r){if(!r.ok)throw new Error(r.status);return r.arrayBuffer()})}));
var html=new TextDecoder('utf-8').decode(await new Blob(bufs).arrayBuffer());var sh=${JSON.stringify(STORAGE_SHIM).replace(/<\//g, '<\\/')};var hm=html.match(/<head[^>]*>/i);html=hm?html.replace(hm[0],hm[0]+sh):sh+html;document.open();document.write(html);document.close();}
catch(e){document.querySelector('.s').style.display='none';document.getElementById('m').textContent='This portfolio could not be loaded. Please refresh the page.';}})();
</script></body></html>`;
}

export async function GET(request, { params }) {
    let id;
    try { id = new ObjectId(params.id); } catch { return new NextResponse('Not found', { status: 404 }); }
    try {
        const files = await getTeamPortfoliosCollection();
        const file = await files.findOne({ _id: id, complete: true }, { projection: { name: 1, parts: 1 } });
        if (!file) return new NextResponse('Not found', { status: 404 });
        const headers = {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': CACHE,
            'Content-Security-Policy': SANDBOX,
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'no-referrer',
        };
        if (file.parts === 1) {
            const parts = await getTeamPortfolioPartsCollection();
            const part = await parts.findOne({ fileId: id, n: 0 }, { projection: { data: 1 } });
            if (!part?.data) return new NextResponse('Not found', { status: 404 });
            const html = Buffer.from(part.data.buffer ?? part.data).toString('utf8');
            return new NextResponse(withShim(html), { status: 200, headers });
        }
        return new NextResponse(loaderPage(String(id), file.parts, file.name || 'Portfolio'), { status: 200, headers });
    } catch (error) {
        console.error('[team/portfolio] failed:', error);
        return new NextResponse('Server error', { status: 500 });
    }
}
