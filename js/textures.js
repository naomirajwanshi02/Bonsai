// Canvas-painted textures: bark, foliage sprays, soil, rock and moss.
// Nothing is downloaded. Foliage sprays are painted with soft (anti-aliased)
// alpha edges and the material uses alpha-to-coverage, so leaves and needles
// have smooth outlines rather than jagged cut-out edges.

import * as THREE from 'three';

export function rng(seed){
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}
const cache = new Map();
function canvas(w, h){ const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function hexMix(a, b, t){
  const A = new THREE.Color(a), B = new THREE.Color(b);
  return '#' + A.lerp(B, t).getHexString();
}
function toTex(c, { repeat = false, srgb = true } = {}){
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 4;
  if (repeat){ t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.needsUpdate = true;
  return t;
}

// ------------------------------------------------------------------ bark
// Greyscale detail (multiplied by the species colour on the material), so one
// painting per kind serves every tree. Also used as the bump map.
export function barkTexture(kind){
  const key = 'bark:' + kind;
  if (cache.has(key)) return cache.get(key);
  const W = 256, H = 512, r = rng(kind.length * 977 + 3);
  const [c, g] = canvas(W, H);
  g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, W, H);
  // fine grain
  for (let i = 0; i < 2600; i++){
    const v = 150 + r() * 90 | 0;
    g.fillStyle = `rgba(${v},${v},${v},${0.25 + r() * 0.3})`;
    g.fillRect(r() * W, r() * H, 1 + r() * 2, 2 + r() * 8);
  }
  const wrap = (fn) => { for (const dx of [-W, 0, W]) fn(dx); };
  if (kind === 'plates'){
    // irregular plates separated by dark fissures (pines, old apricot)
    let y = 0;
    while (y < H){
      const ph = 28 + r() * 46;
      let x = r() * 30;
      while (x < W + 30){
        const pw = 26 + r() * 40;
        const v = 175 + r() * 70 | 0;
        wrap((dx) => {
          g.fillStyle = `rgb(${v},${v},${v})`;
          g.beginPath();
          g.moveTo(dx + x + 3 + r() * 4, y + 3);
          g.lineTo(dx + x + pw - 3, y + 2 + r() * 5);
          g.lineTo(dx + x + pw - 2 - r() * 5, y + ph - 3);
          g.lineTo(dx + x + 2, y + ph - 2 - r() * 6);
          g.closePath(); g.fill();
        });
        x += pw;
      }
      y += ph;
    }
    g.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 70; i++){
      g.strokeStyle = `rgba(40,40,40,${0.35 + r() * 0.4})`; g.lineWidth = 1 + r() * 2.5;
      const x0 = r() * W, y0 = r() * H;
      wrap((dx) => { g.beginPath(); g.moveTo(dx + x0, y0); g.bezierCurveTo(dx + x0 + 8, y0 + 20, dx + x0 - 8, y0 + 40, dx + x0 + r() * 6, y0 + 60); g.stroke(); });
    }
  } else if (kind === 'strings'){
    // long stringy vertical fibres (juniper, cedar)
    g.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 180; i++){
      const x0 = r() * W, v = 70 + r() * 90 | 0;
      g.strokeStyle = `rgba(${v},${v},${v},${0.35 + r() * 0.45})`; g.lineWidth = 0.8 + r() * 3;
      wrap((dx) => {
        g.beginPath(); g.moveTo(dx + x0, -10);
        let x = x0;
        for (let yy = 0; yy <= H + 10; yy += 32){ x += (r() - 0.5) * 9; g.lineTo(dx + x, yy); }
        g.stroke();
      });
    }
  } else if (kind === 'flakes'){
    // smooth with flaking patches (trident maple)
    for (let i = 0; i < 90; i++){
      const x0 = r() * W, y0 = r() * H, w = 10 + r() * 34, h = 14 + r() * 50, v = 150 + r() * 100 | 0;
      wrap((dx) => {
        g.fillStyle = `rgba(${v},${v},${v},0.8)`;
        g.beginPath(); g.ellipse(dx + x0, y0, w / 2, h / 2, (r() - 0.5) * 0.6, 0, 6.283); g.fill();
        g.strokeStyle = 'rgba(70,70,70,.45)'; g.lineWidth = 1; g.stroke();
      });
    }
  } else {
    // smooth bark with faint horizontal lenticels and soft streaks (maples, zelkova)
    g.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 120; i++){
      const x0 = r() * W, y0 = r() * H, v = 150 + r() * 70 | 0;
      g.strokeStyle = `rgba(${v},${v},${v},0.5)`; g.lineWidth = 1 + r() * 2;
      wrap((dx) => { g.beginPath(); g.moveTo(dx + x0, y0); g.lineTo(dx + x0 + 6 + r() * 10, y0 + (r() - 0.5) * 2); g.stroke(); });
    }
    for (let i = 0; i < 40; i++){
      const x0 = r() * W, v = 160 + r() * 60 | 0;
      g.strokeStyle = `rgba(${v},${v},${v},0.35)`; g.lineWidth = 4 + r() * 10;
      wrap((dx) => { g.beginPath(); g.moveTo(dx + x0, 0); g.lineTo(dx + x0 + (r() - 0.5) * 20, H); g.stroke(); });
    }
  }
  const tex = toTex(c, { repeat: true });
  cache.set(key, tex);
  return tex;
}

// ------------------------------------------------------------------ foliage sprays
// One 256² sprite per foliage kind. Pine and cedar sprays grow up from the
// bottom-centre (the card's pivot); leaves and blossom sit around the centre.
export function foliageTexture(kind, c1, c2){
  const key = `leaf:${kind}:${c1}:${c2}`;
  if (cache.has(key)) return cache.get(key);
  const S = 256, r = rng(kind.length * 131 + 7);
  const [c, g] = canvas(S, S);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const col = (t) => hexMix(c1, c2, Math.max(0, Math.min(1, t)));

  if (kind === 'pine' || kind === 'scots'){
    // a tuft: a short shoot with paired needles fanning up and out
    const long = kind === 'pine' ? 1 : 0.8;
    g.strokeStyle = '#6b5240'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(128, 250); g.lineTo(128, 150); g.stroke();
    for (let i = 0; i < 150; i++){
      const t = r();
      const y0 = 250 - t * 100;
      const a = -Math.PI / 2 + (r() - 0.5) * (2.6 - t * 1.2);
      const L = (70 + r() * 70) * long * (0.7 + t * 0.5);
      const x1 = 128 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L;
      g.strokeStyle = col(0.15 + r() * 0.5 + (1 - t) * 0.0);
      g.lineWidth = 1.6 + r() * 1.4;
      g.beginPath(); g.moveTo(128 + (r() - 0.5) * 6, y0);
      g.quadraticCurveTo((128 + x1) / 2 + (r() - 0.5) * 16, (y0 + y1) / 2, x1, y1); g.stroke();
      // lighter tip
      g.strokeStyle = col(0.75 + r() * 0.25); g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(x1 - Math.cos(a) * 10, y1 - Math.sin(a) * 10); g.lineTo(x1, y1); g.stroke();
    }
  } else if (kind === 'cedar'){
    // awl-shaped needles packed along upright fronds
    for (let f = 0; f < 7; f++){
      const x0 = 128 + (f - 3) * 22 + (r() - 0.5) * 10, lean = (f - 3) * 0.12;
      const top = 30 + r() * 40;
      g.strokeStyle = '#5c4632'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(128, 252); g.quadraticCurveTo(x0, 200, x0 + lean * 120, top); g.stroke();
      for (let y = 240; y > top; y -= 5){
        const t = (240 - y) / (240 - top);
        const xx = 128 + (x0 + lean * 120 - 128) * t;
        const w = 16 * (1 - t * 0.6);
        for (const s of [-1, 1]){
          g.strokeStyle = col(0.2 + r() * 0.45 + t * 0.3); g.lineWidth = 2.2;
          g.beginPath(); g.moveTo(xx, y); g.lineTo(xx + s * w * (0.6 + r() * 0.5), y - 7 - r() * 4); g.stroke();
        }
      }
    }
  } else if (kind === 'juniper'){
    // fine, feathery sprigs: thin forking stems packed with tiny needle-like leaves,
    // the lacy look of a well-kept juniper
    const sprig = (x, y, a, L, depth) => {
      const steps = Math.round(L / 4);
      let px = x, py = y;
      g.strokeStyle = '#5a4430'; g.lineWidth = Math.max(0.8, 2.2 - depth * 0.6);
      g.beginPath(); g.moveTo(px, py);
      const path = [];
      for (let i = 0; i < steps; i++){
        px += Math.cos(a) * 4; py += Math.sin(a) * 4;
        a += (r() - 0.5) * 0.22;
        g.lineTo(px, py); path.push([px, py, a, i / steps]);
      }
      g.stroke();
      for (const [qx, qy, qa, t] of path){
        for (const s of [-1, 1]){
          const la = qa + s * (0.7 + r() * 0.35), ll = (7 + r() * 5) * (1 - t * 0.45);
          g.strokeStyle = col(0.1 + r() * 0.55 + t * 0.35); g.lineWidth = 1.3 + r() * 0.7;
          g.beginPath(); g.moveTo(qx, qy); g.lineTo(qx + Math.cos(la) * ll, qy + Math.sin(la) * ll); g.stroke();
        }
        if (depth < 2 && t > 0.15 && t < 0.8 && r() < 0.16) sprig(qx, qy, qa + (r() < 0.5 ? -1 : 1) * (0.45 + r() * 0.4), L * 0.55, depth + 1);
      }
    };
    for (let i = 0; i < 7; i++) sprig(128 + (r() - 0.5) * 24, 250, -Math.PI / 2 + (r() - 0.5) * 1.7, 130 + r() * 80, 0);
  } else if (kind === 'blossom'){
    // ume blossom: round five-petal flowers and buds, a few on each card
    const flower = (x, y, R) => {
      for (let p = 0; p < 5; p++){
        const a = p / 5 * 6.283 + r();
        g.fillStyle = col(0.35 + r() * 0.6);
        g.beginPath(); g.ellipse(x + Math.cos(a) * R * 0.55, y + Math.sin(a) * R * 0.55, R * 0.55, R * 0.48, a, 0, 6.283); g.fill();
      }
      g.fillStyle = '#c4566e'; g.beginPath(); g.arc(x, y, R * 0.28, 0, 6.283); g.fill();
      g.strokeStyle = '#f2d36b'; g.lineWidth = 1.2;
      for (let k = 0; k < 10; k++){ const a = r() * 6.283; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * R * 0.5, y + Math.sin(a) * R * 0.5); g.stroke(); }
    };
    for (let i = 0; i < 6; i++) flower(48 + r() * 160, 48 + r() * 160, 20 + r() * 12);
    for (let i = 0; i < 6; i++){ g.fillStyle = '#c94f6c'; g.beginPath(); g.arc(30 + r() * 196, 30 + r() * 196, 6 + r() * 3, 0, 6.283); g.fill(); }
  } else {
    // broadleaf clusters: a handful of leaves of the species' shape on short stalks
    const leaf = (x, y, a, R) => {
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = col(0.15 + r() * 0.75);
      g.beginPath();
      if (kind === 'palmate'){
        // five (to seven) pointed lobes, deeply cut
        const lobes = 7;
        for (let k = 0; k <= lobes * 2; k++){
          const t = k / (lobes * 2), ang = -Math.PI * 0.95 + t * Math.PI * 1.9 - Math.PI / 2;
          const rad = k % 2 ? R * 0.32 : R * (k === lobes ? 1 : 0.62 + 0.38 * Math.sin(t * Math.PI));
          g.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
        }
      } else if (kind === 'trident'){
        // three forward lobes
        const pts = [[0, 0], [-0.55, -0.35], [-0.62, -0.62], [-0.28, -0.55], [0, -1], [0.28, -0.55], [0.62, -0.62], [0.55, -0.35]];
        pts.forEach(([px, py], k) => (k ? g.lineTo(px * R, py * R) : g.moveTo(px * R, py * R)));
      } else {
        // zelkova: narrow oval with a sharp tip and toothed edge
        const n = 26, h = R * 0.62;
        for (let k = 0; k <= n; k++){
          const ang = k / n * 6.283;
          const w = R * 0.3 * (k % 2 ? 1.12 : 1);
          g.lineTo(Math.sin(ang) * w, -h * (1 - Math.cos(ang)));
        }
      }
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(40,30,20,.25)'; g.lineWidth = 1; g.stroke();
      g.restore();
    };
    const n = kind === 'zelkova' ? 22 : 11;
    for (let i = 0; i < n; i++){
      const a = r() * 6.283, d = r() * 70;
      leaf(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, r() * 6.283, (kind === 'zelkova' ? 30 : 46) + r() * 16);
    }
  }
  const tex = toTex(c);
  tex.generateMipmaps = true;
  cache.set(key, tex);
  return tex;
}

// ------------------------------------------------------------------ soil, moss, rock
export function soilTexture(){
  if (cache.has('soil')) return cache.get('soil');
  const S = 256, r = rng(4242);
  const [c, g] = canvas(S, S);
  g.fillStyle = '#7b5d43'; g.fillRect(0, 0, S, S);
  // akadama-like granules: rounded crumbs in clay, pumice and lava tones
  const tones = ['#a37c55', '#8b6644', '#c2a27a', '#5a4434', '#b8b0a0', '#6e4a38'];
  for (let i = 0; i < 1500; i++){
    g.fillStyle = tones[(r() * tones.length) | 0];
    const x = r() * S, y = r() * S, R = 1.5 + r() * 3.2;
    for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]){ g.beginPath(); g.ellipse(x + dx, y + dy, R, R * (0.7 + r() * 0.3), r() * 3, 0, 6.283); g.fill(); }
  }
  const tex = toTex(c, { repeat: true });
  cache.set('soil', tex);
  return tex;
}

export function rockTexture(){
  if (cache.has('rock')) return cache.get('rock');
  const S = 256, r = rng(777);
  const [c, g] = canvas(S, S);
  g.fillStyle = '#9a958c'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++){
    const v = 100 + r() * 110 | 0;
    g.fillStyle = `rgba(${v},${v - 4},${v - 10},${0.3 + r() * 0.4})`;
    g.beginPath(); g.arc(r() * S, r() * S, 1 + r() * 6, 0, 6.283); g.fill();
  }
  g.strokeStyle = 'rgba(50,46,40,.5)';
  for (let i = 0; i < 26; i++){ g.lineWidth = 1 + r() * 2; g.beginPath(); g.moveTo(r() * S, r() * S); g.lineTo(r() * S, r() * S); g.stroke(); }
  const tex = toTex(c, { repeat: true });
  cache.set('rock', tex);
  return tex;
}

export function mossTexture(){
  if (cache.has('moss')) return cache.get('moss');
  const S = 128, r = rng(99);
  const [c, g] = canvas(S, S);
  const grd = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grd.addColorStop(0, 'rgba(110,140,60,1)'); grd.addColorStop(0.75, 'rgba(90,120,50,.9)'); grd.addColorStop(1, 'rgba(90,120,50,0)');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 500; i++){
    const a = r() * 6.283, d = Math.sqrt(r()) * 56;
    g.fillStyle = r() < 0.5 ? 'rgba(150,180,80,.7)' : 'rgba(60,90,40,.6)';
    g.beginPath(); g.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 1 + r() * 2, 0, 6.283); g.fill();
  }
  const tex = toTex(c);
  cache.set('moss', tex);
  return tex;
}
