# usage: python3 encrypt_site.py <input.html> <password> <out.html>
import sys,os,base64,re,html as H
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
src,pw,out=sys.argv[1:4]
doc=open(src,encoding='utf-8').read()
i=doc.find('<!DOCTYPE html><html lang')
if i>0:
    doc=doc[i:]; j=doc.rfind('</html>',0,len(doc)-20); doc=doc[:j+7] if j>0 else doc
salt=os.urandom(16);iv=os.urandom(12);it=250000
key=PBKDF2HMAC(hashes.SHA256(),32,salt,it).derive(pw.encode())
ct=AESGCM(key).encrypt(iv,doc.encode('utf-8'),None)
b=lambda x:base64.b64encode(x).decode()
from urllib.parse import quote
ICON=quote('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect width="180" height="180" rx="40" fill="#1c1c1e"/><text x="90" y="122" font-size="96" text-anchor="middle">🕯️</text></svg>')
page=f'''<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="מודעות אבל"><meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="theme-color" content="#f2f2f7">
<link rel="apple-touch-icon" href="data:image/svg+xml,{ICON}"><link rel="icon" href="data:image/svg+xml,{ICON}">
<title>מודעות אבל</title><style>
body{{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",system-ui,sans-serif;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f2f2f7;-webkit-font-smoothing:antialiased}}
form{{background:#fff;padding:30px 22px 24px;border-radius:20px;width:min(340px,86vw);text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.06)}}
.ic{{width:64px;height:64px;border-radius:15px;background:linear-gradient(160deg,#3a3a3c,#1c1c1e);display:grid;place-content:center;margin:0 auto 14px;font-size:30px;color:#fff}}
h1{{font-size:22px;font-weight:700;margin:0 0 4px}}p{{color:rgba(60,60,67,.6);font-size:14px;margin:0 0 18px}}
input{{width:100%;box-sizing:border-box;font-size:17px;padding:12px;border:0;border-radius:12px;margin-bottom:12px;text-align:center;background:rgba(118,118,128,.12);-webkit-appearance:none;font-family:inherit}}
button{{width:100%;font-size:17px;padding:13px;border:0;border-radius:14px;background:#007aff;color:#fff;font-weight:600;font-family:inherit}}input:focus{{outline:none;box-shadow:0 0 0 3px rgba(0,122,255,.35)}}#e{{color:#ff3b30;font-size:14px;min-height:18px;margin-top:10px}}
@media (prefers-color-scheme:dark){{body{{background:#000}}form{{background:#1c1c1e;color:#fff}}p{{color:rgba(235,235,245,.6)}}input{{background:rgba(118,118,128,.24);color:#fff}}}}</style></head><body>
<form id="f"><div class="ic">🕯️</div><h1>מודעות אבל</h1><p>הזן קוד כניסה</p><input id="p" type="password" autocomplete="off" autofocus placeholder="קוד"><button>כניסה</button><div id="e"></div></form>
<script>
let S="{b(salt)}",I="{b(iv)}",C="{b(ct)}",N={it};
const fresh=fetch(location.pathname+'?nc='+Date.now(),{{cache:'no-store'}}).then(r=>r.text()).then(t=>{{const g=k=>(t.match(new RegExp('[ ,]'+k+'="([A-Za-z0-9+/=]+)"'))||[])[1];const s2=g('S'),i2=g('I'),c2=g('C');if(s2&&i2&&c2){{S=s2;I=i2;C=c2;}}}}).catch(()=>{{}});
const u=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function dec(pw){{const k0=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);
const k=await crypto.subtle.deriveKey({{name:'PBKDF2',salt:u(S),iterations:N,hash:'SHA-256'}},k0,{{name:'AES-GCM',length:256}},false,['decrypt']);
return new TextDecoder().decode(await crypto.subtle.decrypt({{name:'AES-GCM',iv:u(I)}},k,u(C)));}}
async function go(pw,save){{try{{await fresh;const h=await dec(pw);document.open();document.write(h);document.close();}}catch(e){{document.getElementById('e').textContent='קוד שגוי';}}}}
document.getElementById('f').addEventListener('submit',ev=>{{ev.preventDefault();go(document.getElementById('p').value,true)}});
try{{localStorage.removeItem('obit_k')}}catch(e){{}}
</script></body></html>'''
open(out,'w',encoding='utf-8').write(page)
print('ok',len(page))
