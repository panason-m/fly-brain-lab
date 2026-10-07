"""Build Fly Brain Lab: merges src/deck.html into src/shell.html and writes dist/.
Usage: python build.py"""
import re, sys, os
D = os.path.dirname(os.path.abspath(__file__))
deck = open(os.path.join(D, 'src', 'deck.html'), encoding='utf-8').read()
shell = open(os.path.join(D, 'src', 'shell.html'), encoding='utf-8').read()

style = re.search(r'<style>(.*?)</style>', deck, re.S).group(1)
sprite = re.search(r'(<!-- icon sprite -->\s*<svg width="0".*?</svg>\n)', deck, re.S).group(1)
body = re.search(r'(<div class="viewport">.*)<script>', deck, re.S).group(1)
js = re.search(r'<script>(.*)</script>', deck, re.S).group(1)

# --- extra icons
extra = '''  <symbol id="i-car" viewBox="0 0 48 48"><path d="M6 30v-6l5-9h22l7 9h2v6"/><path d="M6 30h36"/><circle cx="14" cy="32" r="4"/><circle cx="34" cy="32" r="4"/><path d="M12 24h28"/></symbol>
  <symbol id="i-knife" viewBox="0 0 48 48"><path d="M8 40 34 8c4 2 6 6 4 10L18 38"/><path d="M8 40l6 2 4-4"/></symbol>
  <symbol id="i-saber" viewBox="0 0 48 48"><path d="M10 42 36 8M38 42 12 8"/><path d="M6 38l8 8M42 38l-8 8"/></symbol>
  <symbol id="i-play" viewBox="0 0 48 48"><rect x="4" y="8" width="40" height="32" rx="6"/><path d="M20 17v14l12-7z"/></symbol>
</svg>
'''
sprite = sprite.rstrip()
assert sprite.endswith('</svg>')
sprite = sprite[:-len('</svg>')] + extra

# --- new slides after the "Watch" slide
new_slides = '''
      <section class="slide" data-part="Part 3 · Demonstrations">
        <p class="eyebrow">September 2026 · the internet meets the connectome</p>
        <h2>The fly brain went viral</h2>
        <div class="cases3">
          <a class="cz" href="https://x.com/_lyraaaa_/status/2097527368919470162" target="_blank" rel="noopener"><svg class="ico m"><use href="#i-saber"/></svg><div><h3>Beat Saber</h3><p>@_lyraaaa_ · ~22 M views</p></div></a>
          <a class="cz" href="https://x.com/alright_mark/status/2098085928489177142" target="_blank" rel="noopener"><svg class="ico b"><use href="#i-car"/></svg><div><h3>Parallel parking</h3><p>@alright_mark · ~1.5 M views</p></div></a>
          <a class="cz" href="https://x.com/oozn/status/2098508072670912833" target="_blank" rel="noopener"><svg class="ico w"><use href="#i-knife"/></svg><div><h3>Doner kebab</h3><p>@oozn</p></div></a>
          <a class="cz" href="https://github.com/shovon/malecns-v1-dinosaur-game" target="_blank" rel="noopener"><svg class="ico g"><use href="#i-walk"/></svg><div><h3>Chrome Dino</h3><p>shovon · open source</p></div></a>
          <a class="cz" href="https://x.com/evnsnclr/status/2095975490708291948" target="_blank" rel="noopener"><svg class="ico p"><use href="#i-cube"/></svg><div><h3>Minecraft</h3><p>full 166 k-neuron brain</p></div></a>
          <a class="cz" href="https://x.com/a_apanasik/status/2097096600556371996" target="_blank" rel="noopener"><svg class="ico w"><use href="#i-fight"/></svg><div><h3>Doom</h3><p>Andrei Apanasik</p></div></a>
        </div>
        <p class="note" style="margin-top:auto">Links open the original posts. Views as reported by Know Your Meme and 404 Media.</p>
      </section>

      <section class="slide" data-part="Part 3 · Demonstrations">
        <p class="eyebrow">Our version · Fly Brain Arcade</p>
        <h2>Watch a fly circuit learn, live</h2>
        <div class="tiles t4" style="margin-top:44px">
          <a class="tile tl-link" href="#arcade-dino"><svg class="ico g"><use href="#i-walk"/></svg><h3>Fly Runner</h3><p>LC10 → AOTU → DN → leg</p><span class="tag g">Play →</span></a>
          <a class="tile tl-link" href="#arcade-park"><svg class="ico b"><use href="#i-car"/></svg><h3>Parallel Parking</h3><p>position + distance → turn &amp; brake</p><span class="tag b">Play →</span></a>
          <a class="tile tl-link" href="#arcade-kebab"><svg class="ico w"><use href="#i-knife"/></svg><h3>Doner Kebab</h3><p>colour → Kenyon cells → MBON</p><span class="tag w">Play →</span></a>
          <a class="tile tl-link" href="#arcade-saber"><svg class="ico m"><use href="#i-saber"/></svg><h3>Rhythm Slicer</h3><p>colour × depth → DN L/R</p><span class="tag m">Play →</span></a>
        </div>
        <div class="flow" style="grid-template-columns:1fr 50px 1fr 50px 1fr;margin-top:56px">
          <div class="node mu"><h3>Naive</h3><span class="n">never acts</span></div><div class="arrow" style="margin-bottom:0"></div>
          <div class="node w"><h3>Mistake</h3><span class="n">credit to active synapses</span></div><div class="arrow" style="margin-bottom:0"></div>
          <div class="node g"><h3>Skilled</h3><span class="n">in minutes</span></div>
        </div>
      </section>
'''
# learning-rule infographic slide, reused from the Engine view so both stay in sync
_i = shell.index('<div class="lr-eq">'); _j = shell.index('<div class="lr-flow">', _i)
_j = shell.index('</div>\n    </div>', _j) + len('</div>')
lr_html = shell[_i:_j]
lr_slide = ('''
      <section class="slide lr lr-slide" data-part="Part 3 · Demonstrations">
        <p class="eyebrow">How the arcade flies learn · same rules as the Engine tab</p>
        <h2>Three learning rules, one idea</h2>
        ''' + lr_html + '''
      </section>
''')
_i = shell.index('<div class="card2 lc" id="lr-concepts"'); _i = shell.index('</h3>', _i) + len('</h3>')
_j = shell.index('<div class="card2" style="margin-top:20px">\n      <h3>Circuits in the arcade</h3>')
lc_html = shell[_i:_j].rstrip()
assert lc_html.endswith('</div>'); lc_html = lc_html[:-len('</div>')]
lc_slide = ('''
      <section class="slide lc lc-slide" data-part="Part 3 · Demonstrations">
        <p class="eyebrow">The ideas behind the rules</p>
        <h2>The idea: three-factor learning</h2>
        ''' + lc_html + '''
        <p class="cite">Hebb 1949 · Rosenblatt 1958 · Widrow &amp; Hoff 1960 · Rescorla &amp; Wagner 1972 · Schultz, Dayan &amp; Montague, Science 1997 · Izhikevich, Cereb. Cortex 2007 · Frémaux &amp; Gerstner, Front. Neural Circuits 2016 · Hige et al., Neuron 2015 · Aso &amp; Rubin, eLife 2016</p>
      </section>
''')
new_slides = new_slides + lc_slide + lr_slide
marker = '<p class="eyebrow">Case 3 · Eon Systems'
i = body.index(marker)
j = body.index('</section>', i) + len('</section>')
body = body[:j] + '\n' + new_slides + body[j:]
body = body.replace('<span class="count" id="count">1 / 33</span>', '<span class="count" id="count">1 / 35</span>')
body = body.replace('35 slides', '35 slides')

style += '''
.cases3{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:44px}
a.cz{display:grid;grid-template-columns:80px 1fr;gap:20px;align-items:center;padding:26px;border:1px solid var(--line);border-radius:8px;background:var(--panel);text-decoration:none;color:var(--fg);transition:border-color .2s}
a.cz:hover{border-color:var(--female)}
a.cz .ico{font-size:72px}
a.cz h3{font-family:var(--display);font-size:32px;font-weight:600}
a.cz p{font-family:var(--mono);font-size:18px;color:var(--muted);margin-top:6px}
a.tl-link{text-decoration:none;color:var(--fg);transition:border-color .2s, transform .2s}
a.tl-link:hover{border-color:var(--brain);transform:translateY(-3px)}
.lr-slide .lr-eq{font-size:24px;margin:16px 0 18px;padding:12px 18px}
.lr-slide .lr-eq small{font-size:15px}
.lr-slide .lr-grid{gap:22px}
.lr-slide .lr-card{padding:16px 18px;gap:8px}
.lr-slide .lr-card figcaption b{font-size:24px}
.lr-slide .lr-card figcaption small{font-size:14px}
.lr-slide .lr-card figcaption .tag{width:34px;height:34px;font-size:18px}
.lr-slide .lr-card svg{max-height:300px}
.lr-slide .lr-card p{font-size:17px;line-height:1.4}
.lr-slide .lr-flow{margin-top:16px;gap:10px}
.lr-slide .lr-flow div{font-size:18px;padding:8px 16px}
.lc-slide .lc-lead{font-size:19px;line-height:1.4;margin:10px 0 12px;max-width:1380px;color:var(--muted)}
.lc-slide .lc-lead b{color:var(--fg)}
.lc-slide .lc-top{gap:30px}
.lc-slide .lc-fig{padding:6px}
.lc-slide .lc-fig svg{max-height:250px;margin:0 auto}
.lc-slide .lc-time{gap:9px}
.lc-slide .lc-time li{grid-template-columns:96px 1fr;font-size:16px;line-height:1.3}
.lc-slide .lc-time b{font-size:16px}
.lc-slide .lc-map{gap:16px;margin-top:12px}
.lc-slide .lc-map div{font-size:14px;line-height:1.38;padding:10px 14px;background:var(--panel)}
.lc-slide .lc-map b{font-size:20px}
.lc-slide .lc-bp{font-size:15px;line-height:1.4;margin-top:10px!important;padding:8px 14px;color:#c5cfdc;background:var(--panel)}
.lc-slide .cite{padding-top:6px;font-size:13px}
'''

# --- scope deck CSS under #view-talk
def scope(css):
    out=[];i=0;n=len(css)
    while i<n:
        # skip whitespace/comments
        m=re.match(r'\s+|/\*.*?\*/',css[i:],re.S)
        if m: i+=m.end(); continue
        k=css.index('{',i); sel=css[i:k].strip()
        # find matching brace
        depth=0;e=k
        while True:
            if css[e]=='{':depth+=1
            elif css[e]=='}':
                depth-=1
                if depth==0:break
            e+=1
        inner=css[k+1:e]; i=e+1
        if sel.startswith('@media'):
            out.append(sel+'{'+scope(inner)+'}')
            continue
        if sel.startswith('@'):
            out.append(sel+'{'+inner+'}');continue
        parts=[p.strip() for p in sel.split(',')]
        if any(p in(':root','html','body') or p.startswith(':root') for p in parts):
            continue  # tokens and globals come from the app shell
        if parts[0].startswith('.ico'):
            continue
        out.append(','.join('#view-talk '+p for p in parts)+'{'+inner+'}')
    return '\n'.join(out)
deck_css = scope(style)

# --- deck JS tweaks
js = js.replace("document.addEventListener('keydown',e=>{", "document.addEventListener('keydown',e=>{\n    if(document.getElementById('view-talk').hidden)return;")
js = js.replace("addEventListener('resize',fit); fit(); show(i);", "addEventListener('resize',fit); fit(); show(i);\n  window.Deck={fit:()=>{fit();show(i);}};")
assert "window.Deck" in js and "view-talk" in js

out = shell.replace('{{DECK_CSS}}', deck_css).replace('{{SPRITE}}', sprite).replace('{{DECK_BODY}}', body).replace('{{DECK_JS}}', js)
# standalone document for opening locally / static hosting
k = out.index('</style>') + len('</style>')
doc = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
       + out[:k] + '\n</head>\n<body>\n' + out[k:] + '\n</body>\n</html>\n')
os.makedirs(os.path.join(D, 'dist'), exist_ok=True)
open(os.path.join(D, 'dist', 'index.html'), 'w', encoding='utf-8').write(doc)
import shutil
for f in ('core.js', 'app.js', 'fly3d.js', 'scene3d.js'):
    shutil.copy(os.path.join(D, 'src', f), os.path.join(D, 'dist', f))
for f in ('three.min.js', 'GLTFLoader.js', 'fly3d.json', 'fly_mesh.json', 'doner_model.json', 'knife_model.json', 'LICENSE-three.txt'):
    shutil.copy(os.path.join(D, 'src', 'assets', f), os.path.join(D, 'dist', f))
print('built dist/ (%d bytes)' % len(doc))
