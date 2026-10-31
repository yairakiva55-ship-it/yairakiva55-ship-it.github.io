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
page=f'''<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>כניסה</title><style>
body{{font-family:system-ui,"Segoe UI",Arial,sans-serif;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f6f8}}
form{{background:#fff;padding:28px 24px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);width:min(320px,88vw);text-align:center}}
h1{{font-size:20px;margin:0 0 16px}}input{{width:100%;box-sizing:border-box;font-size:17px;padding:11px;border:1px solid #ccc;border-radius:8px;margin-bottom:12px;text-align:center}}
button{{width:100%;font-size:17px;padding:11px;border:0;border-radius:8px;background:#1b4f9c;color:#fff;font-weight:600}}#e{{color:#b00020;font-size:14px;min-height:18px;margin-top:10px}}</style></head><body>
<form id="f"><h1>🔒 הזן קוד כניסה</h1><input id="p" type="password" autocomplete="off" autofocus placeholder="קוד"><button>כניסה</button><div id="e"></div></form>
<script>
const S="{b(salt)}",I="{b(iv)}",C="{b(ct)}",N={it};
const u=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function dec(pw){{const k0=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);
const k=await crypto.subtle.deriveKey({{name:'PBKDF2',salt:u(S),iterations:N,hash:'SHA-256'}},k0,{{name:'AES-GCM',length:256}},false,['decrypt']);
return new TextDecoder().decode(await crypto.subtle.decrypt({{name:'AES-GCM',iv:u(I)}},k,u(C)));}}
async function go(pw,save){{try{{const h=await dec(pw);document.open();document.write(h);document.close();}}catch(e){{document.getElementById('e').textContent='קוד שגוי';}}}}
document.getElementById('f').addEventListener('submit',ev=>{{ev.preventDefault();go(document.getElementById('p').value,true)}});
try{{localStorage.removeItem('obit_k')}}catch(e){{}}
</script></body></html>'''
open(out,'w',encoding='utf-8').write(page)
print('ok',len(page))
