import json, math, importlib
import numpy as np
C = 32
CIDADES = [('porto', 'cena_porto', 'Porto da Baía', 'mc_21'), ('fornalha', 'cena_fornalha', 'Cidade-fornalha', 'mc_22'),
           ('eco', 'cena_eco', 'Cidade do Eco', 'mc_23'), ('kitsune', 'cena_kitsune', 'Capital Kitsune', 'mc_24')]
def corta(pl, gates, r, closed):
    pts = list(pl) + ([pl[0]] if closed else [])
    walls, doors = [], []
    for a, b in zip(pts, pts[1:]):
        a, b = np.array(a, float), np.array(b, float); ln = np.linalg.norm(b - a)
        if ln < 1e-6: continue
        u = (b - a) / ln; cuts = []
        for g in gates:
            g = np.array(g, float); t = np.dot(g - a, u); dd = np.linalg.norm(a + u * t - g)
            if dd < r:
                h = math.sqrt(r * r - dd * dd); c0, c1 = max(0, t - h), min(ln, t + h)
                if c1 > c0: cuts.append((c0, c1))
        cuts.sort(); t0 = 0
        for c0, c1 in cuts:
            if c0 > t0: walls.append((a + u * t0, a + u * c0))
            doors.append((a + u * c0, a + u * c1)); t0 = max(t0, c1)
        if t0 < ln: walls.append((a + u * t0, b))
    return walls, doors
out = []
for mod, cid, nome, mc in CIDADES:
    m = importlib.import_module(mod)
    segs = []
    for pl, closed, gates, r in m.MUROS:
        w, d = corta(pl, gates, r, closed)
        segs += [dict(k='wall', p=[round(float(v) * C, 1) for v in (*s[0], *s[1])]) for s in w]
        segs += [dict(k='door', p=[round(float(v) * C, 1) for v in (*s[0], *s[1])], open=True) for s in d]
    lug = [dict(n=n, x=round(x * C), y=round(y * C), t=t) for n, x, y, t in m.LUGARES]
    out.append(dict(mod=mod, id=cid, nome=nome, mc=mc, W=m.W, H=m.H, segs=segs, lug=lug))
    print(mod, len(segs), sum(s['k'] == 'door' for s in segs), len(lug))
json.dump(out, open('cenas_in.json', 'w'), ensure_ascii=False)
