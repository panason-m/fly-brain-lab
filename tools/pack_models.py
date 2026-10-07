"""Pack the Sketchfab .glb models in src/assets into web-ready JSON files.

    python tools/pack_models.py

- Doner machine (sketchfabweeklychallenge_food_doner_kebap.glb, CC BY 4.0, Bob/MeBob):
  textures re-encoded as JPEG (base colour + normal 1024 px, others 512 px), meat triangles
  detected from the texture atlas (brown pixels) and stored as `meatTris`.
- Knife (electric_doner_kebab_knife.glb, CC BY 4.0, Dzclaboratory): packed as is.

Outputs: src/assets/doner_model.json, src/assets/knife_model.json  (then run: python build.py)
"""
import base64, io, json, os, struct
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, 'src', 'assets')


def read_glb(path):
    b = open(path, 'rb').read()
    L = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + L])
    BL = struct.unpack('<I', b[20 + L:24 + L])[0]
    return j, b[20 + L + 8:20 + L + 8 + BL]


def view(j, B, i):
    bv = j['bufferViews'][i]; o = bv.get('byteOffset', 0)
    return B[o:o + bv['byteLength']]


def accessor(j, B, i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]
    o = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    n = {'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'SCALAR': 1}[a['type']]
    dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16}[a['componentType']]
    r = np.frombuffer(B, dt, a['count'] * n, o)
    return r.reshape(a['count'], n) if n > 1 else r


def write_glb(j, B, new_images, path):
    img_views = [im['bufferView'] for im in j['images']]
    nb = bytearray(); views = []
    for i, bv in enumerate(j['bufferViews']):
        while len(nb) % 4: nb.append(0)
        data = new_images[img_views.index(i)] if i in img_views else view(j, B, i)
        v = dict(bv); v['byteOffset'] = len(nb); v['byteLength'] = len(data); nb += data; views.append(v)
    while len(nb) % 4: nb.append(0)
    j = dict(j); j['bufferViews'] = views; j['buffers'] = [{'byteLength': len(nb)}]
    for im in j['images']: im['mimeType'] = 'image/jpeg'
    js = json.dumps(j, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    return (b'glTF' + struct.pack('<II', 2, 12 + 8 + len(js) + 8 + len(nb)) + struct.pack('<I', len(js)) + b'JSON' + js
            + struct.pack('<I', len(nb)) + b'BIN\x00' + bytes(nb))


def write_glb_noimg(j, B, drop_views):
    """Rebuild a glb without the given buffer views (image data); remap bufferView indices."""
    keep = [i for i in range(len(j['bufferViews'])) if i not in drop_views]
    remap = {old: new for new, old in enumerate(keep)}
    nb = bytearray(); views = []
    for i in keep:
        while len(nb) % 4: nb.append(0)
        data = view(j, B, i); v = dict(j['bufferViews'][i]); v['byteOffset'] = len(nb); v['byteLength'] = len(data); nb += data; views.append(v)
    while len(nb) % 4: nb.append(0)
    j['bufferViews'] = views; j['buffers'] = [{'byteLength': len(nb)}]
    for a in j['accessors']:
        if 'bufferView' in a: a['bufferView'] = remap[a['bufferView']]
    js = json.dumps(j, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    return (b'glTF' + struct.pack('<II', 2, 12 + 8 + len(js) + 8 + len(nb)) + struct.pack('<I', len(js)) + b'JSON' + js
            + struct.pack('<I', len(nb)) + b'BIN\x00' + bytes(nb))


def pack_doner():
    src = os.path.join(A, 'sketchfabweeklychallenge_food_doner_kebap.glb')
    j, B = read_glb(src)
    mat = j['materials'][0]
    base_idx = j['textures'][mat['pbrMetallicRoughness']['baseColorTexture']['index']]['source']
    normal_idx = j['textures'][mat['normalTexture']['index']]['source']
    imgs = []
    for i, im in enumerate(j['images']):
        I = Image.open(io.BytesIO(view(j, B, im['bufferView']))).convert('RGB')
        size = 1024 if i in (base_idx, normal_idx) else 512
        out = io.BytesIO(); I.resize((size, size), Image.LANCZOS).save(out, 'JPEG', quality=90 if i == normal_idx else 86)
        imgs.append(out.getvalue())
    # meat triangles: texture under the triangle is brown
    tex = np.asarray(Image.open(io.BytesIO(view(j, B, j['images'][base_idx]['bufferView']))).convert('RGB')).astype(int)
    H, W, _ = tex.shape
    p = j['meshes'][0]['primitives'][0]
    UV = accessor(j, B, p['attributes']['TEXCOORD_0']); I3 = accessor(j, B, p['indices']).reshape(-1, 3)
    meat = []
    for t, (a, b, c) in enumerate(I3):
        hits = 0
        for w in ((1/3, 1/3, 1/3), (.6, .2, .2), (.2, .6, .2), (.2, .2, .6)):
            u, v = w[0] * UV[a] + w[1] * UV[b] + w[2] * UV[c]
            px = tex[min(H - 1, max(0, int(v * H))), min(W - 1, max(0, int(u * W)))]
            hits += px[0] - px[2] > 40 and px[0] > 80
        if hits >= 3: meat.append(t)
    # Textures travel separately as data: URIs (hosted pages may block the blob: URLs that
    # embedded glTF images need), so strip them from the glb.
    names = {base_idx: 'map', normal_idx: 'normalMap'}
    orm = j['textures'][mat['pbrMetallicRoughness']['metallicRoughnessTexture']['index']]['source']
    names[orm] = 'orm'
    if 'emissiveTexture' in mat: names[j['textures'][mat['emissiveTexture']['index']]['source']] = 'emissiveMap'
    tex_uris = {names[i]: 'data:image/jpeg;base64,' + base64.b64encode(d).decode() for i, d in enumerate(imgs) if i in names}
    j2 = json.loads(json.dumps(j))
    m2 = j2['materials'][0]
    for k in ('normalTexture', 'occlusionTexture', 'emissiveTexture'): m2.pop(k, None)
    for k in ('baseColorTexture', 'metallicRoughnessTexture'): m2.get('pbrMetallicRoughness', {}).pop(k, None)
    img_views = {im['bufferView'] for im in j2['images']}
    for k in ('images', 'textures', 'samplers'): j2.pop(k, None)
    glb = write_glb_noimg(j2, B, img_views)
    out = {'title': '#SketchfabWeeklyChallenge Food Döner Kebap', 'author': 'Bob (MeBob)',
           'source': 'https://sketchfab.com/3d-models/sketchfabweeklychallenge-food-doner-kebap-cb7d6cae048c4ba4b3d6bae84ab0f723',
           'license': 'CC BY 4.0', 'modified': 'textures re-encoded as JPEG (1024/512 px) and stored as data URIs; packed as base64 glb; meat recoloured live in the app',
           'meatTris': meat, 'textures': tex_uris, 'glb_b64': base64.b64encode(glb).decode()}
    json.dump(out, open(os.path.join(A, 'doner_model.json'), 'w'))
    print(f'doner_model.json: {len(glb)/1e6:.2f} MB glb, {len(meat)} meat triangles of {len(I3)}')


def pack_knife():
    b = open(os.path.join(A, 'electric_doner_kebab_knife.glb'), 'rb').read()
    out = {'title': 'Electric Doner Kebab Knife', 'author': 'Dzclaboratory',
           'source': 'https://sketchfab.com/3d-models/electric-doner-kebab-knife-f63da6c4922148eeb81dedc81addf141',
           'license': 'CC BY 4.0', 'modified': 'packed as base64 glb', 'glb_b64': base64.b64encode(b).decode()}
    json.dump(out, open(os.path.join(A, 'knife_model.json'), 'w'))
    print(f'knife_model.json: {len(b)/1e6:.2f} MB glb')


if __name__ == '__main__':
    pack_doner(); pack_knife()
