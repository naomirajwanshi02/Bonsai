// Procedural bonsai. Each tree is built twice over in one mesh set:
//   raw   — a young nursery plant: extra branches (low, bar, front-facing, water
//           sprouts, a leader shooting up), branches pointing up, leggy growth;
//   final — the styled bonsai, following the design rules in RESEARCH.md: taper,
//           first branch about a third of the way up, branches alternating left,
//           right and back, none pointing at the viewer, flat foliage pads.
// The stage animates between them: cutting extras (prune), bending trunk and
// branches (wire, via morph targets and rotations), filling out pads (water).
//
// Units: about 1 = 25 cm. The pot's top is y = 0, the viewer looks from +z.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, barkTexture, foliageTexture, soilTexture, rockTexture, mossTexture } from './textures.js';

const D = Math.PI / 180;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const P = (a) => a.map(([x, y, z]) => V(x, y, z));
const lerp = (a, b, t) => a + (b - a) * t;

// ------------------------------------------------------------------ styles
// Trunk points (final and raw have the same count, so they morph), keeper branches
// (u = how far up the trunk, az = direction round the trunk: 0 right, 90 back,
// 180 left, -90 toward the viewer; el = elevation; len; wire = the player wires it).
const STYLES = {
  informal: () => ({
    trunks: [{ fin: P([[0, 0, 0], [0.06, 0.3, 0], [0.21, 0.58, 0.02], [0.17, 0.86, 0.05], [-0.04, 1.1, 0.03], [-0.13, 1.32, 0], [-0.07, 1.52, 0.02]]),
      r0: 0.155, r1: 0.03 }],
    branches: [
      { u: 0.3, az: 186, el: -14, len: 0.84, wire: true },
      { u: 0.4, az: -4, el: -18, len: 0.8, wire: true },
      { u: 0.5, az: 96, el: -6, len: 0.5 },
      { u: 0.62, az: 160, el: -8, len: 0.56, wire: true },
      { u: 0.72, az: 22, el: -4, len: 0.48 },
      { u: 0.82, az: 122, el: 0, len: 0.36 },
      { u: 0.9, az: -32, el: 4, len: 0.3 },
    ],
    crown: [{ t: 0, u: 1, off: [0, 0.05, 0], r: 0.3, h: 0.15 }, { t: 0, u: 0.95, off: [0.13, -0.03, 0.05], r: 0.2, h: 0.1 }],
  }),
  formal: () => {
    const az = [0, 180, 82, -24, 200, 112, 18, 160];
    return {
      trunks: [{ fin: P([[0, 0, 0], [0.005, 0.46, 0], [0, 0.92, 0.004], [0.004, 1.38, 0], [0, 1.86, 0]]), r0: 0.13, r1: 0.022 }],
      branches: az.map((a, i) => ({ u: 0.26 + i * 0.088, az: a, el: -14 + i * 1.8, len: 0.8 * (1 - i / 8 * 0.68), wire: i < 3 })),
      crown: [{ t: 0, u: 1, off: [0, 0.05, 0], r: 0.17, h: 0.2 }, { t: 0, u: 0.96, off: [0, -0.04, 0], r: 0.22, h: 0.12 }],
    };
  },
  slanting: () => ({
    trunks: [{
      fin: P([[0, 0, 0], [0.1, 0.3, 0], [0.25, 0.6, 0.02], [0.42, 0.88, 0], [0.55, 1.12, 0.02], [0.62, 1.32, 0]]),
      raw: P([[0, 0, 0], [0.02, 0.32, 0], [0.04, 0.64, 0.02], [0.03, 0.94, 0], [0.05, 1.22, 0.02], [0.04, 1.42, 0]]),
      r0: 0.13, r1: 0.026, wire: true }],
    branches: [
      { u: 0.32, az: 180, el: -6, len: 0.76, wire: true },
      { u: 0.42, az: 20, el: -20, len: 0.55, wire: true },
      { u: 0.55, az: 100, el: 0, len: 0.45 },
      { u: 0.66, az: 200, el: 4, len: 0.5, wire: true },
      { u: 0.78, az: -10, el: -6, len: 0.4 },
      { u: 0.88, az: 140, el: 8, len: 0.3 },
    ],
    crown: [{ t: 0, u: 1, off: [0.03, 0.05, 0], r: 0.27, h: 0.14 }],
  }),
  cascade: () => ({
    trunks: [{
      fin: P([[0, 0, 0], [0.04, 0.22, 0], [0.16, 0.38, 0.02], [0.36, 0.4, 0.04], [0.58, 0.22, 0.03], [0.72, -0.12, 0.02], [0.8, -0.5, 0], [0.82, -0.84, 0.02], [0.78, -1.06, 0]]),
      raw: P([[0, 0, 0], [0.02, 0.22, 0], [0.05, 0.44, 0.01], [0.06, 0.66, 0.02], [0.04, 0.88, 0.01], [0.02, 1.1, 0], [0.04, 1.3, 0.01], [0.03, 1.5, 0], [0.02, 1.68, 0]]),
      r0: 0.12, r1: 0.026, wire: true }],
    branches: [
      { u: 0.24, az: 150, el: 6, len: 0.34 },
      { u: 0.42, az: 70, el: -22, len: 0.42, wire: true },
      { u: 0.55, az: 125, el: -26, len: 0.4, wire: true },
      { u: 0.67, az: 40, el: -30, len: 0.34 },
      { u: 0.78, az: 135, el: -30, len: 0.32, wire: true },
      { u: 0.88, az: 70, el: -36, len: 0.26 },
    ],
    crown: [{ t: 0, u: 0.13, off: [-0.05, 0.13, 0], r: 0.27, h: 0.15 }, { t: 0, u: 1, off: [0, -0.06, 0.02], r: 0.2, h: 0.12 }],
    leaderU: 0.16,
  }),
  literati: () => ({
    trunks: [{
      fin: P([[0, 0, 0], [0.08, 0.3, 0], [-0.04, 0.62, 0.03], [0.1, 0.95, 0.02], [0.22, 1.25, 0], [0.14, 1.55, 0.03], [0.24, 1.82, 0], [0.34, 1.96, 0]]),
      raw: P([[0, 0, 0], [0.03, 0.3, 0], [0, 0.6, 0.01], [0.03, 0.9, 0], [0.05, 1.2, 0.01], [0.04, 1.48, 0], [0.06, 1.75, 0], [0.07, 1.98, 0]]),
      r0: 0.085, r1: 0.02, wire: true }],
    branches: [
      { u: 0.8, az: 170, el: -26, len: 0.56, wire: true },
      { u: 0.88, az: 20, el: -12, len: 0.42, wire: true },
      { u: 0.94, az: 110, el: -4, len: 0.28 },
    ],
    crown: [{ t: 0, u: 1, off: [0.04, 0.04, 0], r: 0.22, h: 0.1 }],
    moreExtras: [
      { u: 0.24, az: 0, el: 30, len: 0.5, why: 'hiding the bare trunk' }, { u: 0.38, az: 180, el: 34, len: 0.5, why: 'hiding the bare trunk' },
      { u: 0.54, az: 30, el: 26, len: 0.44, why: 'hiding the bare trunk' }, { u: 0.66, az: 205, el: 40, len: 0.4, why: 'hiding the bare trunk' },
    ],
  }),
  broom: () => {
    const branches = [];
    for (let i = 0; i < 9; i++){
      branches.push({ u: 0.8 + (i % 3) * 0.09, az: i * 40 + 12, el: 46 + (i % 3) * 6, elRaw: 80, len: 0.82 - (i % 3) * 0.08, wire: i % 3 === 0, twigs: 5, nub: true });
    }
    return {
      trunks: [{ fin: P([[0, 0, 0], [0, 0.26, 0], [0.01, 0.5, 0], [0, 0.74, 0]]), r0: 0.15, r1: 0.075, cap: true }],
      branches,
      crown: [{ t: 0, u: 1, off: [0, 0.74, 0], r: 0.42, h: 0.2 }, { t: 0, u: 1, off: [0.3, 0.6, 0.12], r: 0.26, h: 0.14 },
        { t: 0, u: 1, off: [-0.3, 0.62, -0.1], r: 0.26, h: 0.14 }],
    };
  },
  rock: () => ({
    rock: { y: 0.2, a: 0.37, b: 0.3 },
    trunks: [{ fin: P([[0, 0.46, 0], [0.08, 0.7, 0], [0.02, 0.95, 0.02], [-0.08, 1.2, 0], [-0.02, 1.42, 0.02]]), r0: 0.1, r1: 0.022 }],
    branches: [
      { u: 0.35, az: 170, el: -10, len: 0.6, wire: true },
      { u: 0.45, az: 10, el: -14, len: 0.55, wire: true },
      { u: 0.58, az: 100, el: 0, len: 0.38 },
      { u: 0.7, az: 200, el: 2, len: 0.42, wire: true },
      { u: 0.82, az: -20, el: 6, len: 0.32 },
    ],
    crown: [{ t: 0, u: 1, off: [0, 0.05, 0], r: 0.25, h: 0.13 }],
  }),
  twin: () => ({
    trunks: [
      { fin: P([[-0.06, 0, 0], [-0.1, 0.3, 0], [-0.02, 0.62, 0.02], [-0.12, 0.92, 0], [-0.06, 1.25, 0.02], [-0.1, 1.45, 0]]), r0: 0.13, r1: 0.025 },
      { fin: P([[0.05, 0, 0.02], [0.14, 0.25, 0.02], [0.26, 0.5, 0], [0.3, 0.75, 0.02], [0.38, 0.98, 0]]),
        raw: P([[0.05, 0, 0.02], [0.08, 0.26, 0.02], [0.1, 0.52, 0], [0.1, 0.78, 0.02], [0.12, 1.02, 0]]), r0: 0.085, r1: 0.02 },
    ],
    branches: [
      { t: 0, u: 0.35, az: 185, el: -8, len: 0.6, wire: true },
      { t: 0, u: 0.5, az: 100, el: 0, len: 0.4 },
      { t: 0, u: 0.64, az: 200, el: 4, len: 0.45, wire: true },
      { t: 0, u: 0.8, az: 60, el: 8, len: 0.32 },
      { t: 1, u: 0.5, az: 10, el: -10, len: 0.5, wire: true },
      { t: 1, u: 0.7, az: 92, el: 4, len: 0.32 },
      { t: 1, u: 0.84, az: -20, el: 8, len: 0.28 },
    ],
    crown: [{ t: 0, u: 1, off: [0, 0.04, 0], r: 0.22, h: 0.12 }, { t: 1, u: 1, off: [0.02, 0.04, 0], r: 0.17, h: 0.1 }],
  }),
};

// The usual faults a nursery plant has, which pruning removes (see RESEARCH.md §2).
function extrasFor(spec, r){
  const first = spec.branches[0];
  const lead = spec.leaderU ?? 0.985;
  const side = () => (r() < 0.5 ? 20 + r() * 40 : 140 + r() * 40);
  const E = [
    { u: 0.11, az: side(), el: 28, len: 0.36, why: 'growing too low on the trunk' },
    { u: first.u + 0.01, az: first.az + 180, el: 34, len: 0.44, t: first.t ?? 0, why: 'at the same height as another branch' },
    { u: 0.42, az: -90, el: 10, len: 0.44, why: 'pointing straight at you' },
    { u: 0.68, az: 60 + r() * 60, el: 70, len: 0.4, why: 'shooting straight up' },
    { u: lead, az: 0, el: 86, len: 0.36, why: 'a tall shoot spoiling the top' },
  ];
  return E.concat(spec.moreExtras || []);
}

// ------------------------------------------------------------------ geometry
// A tapered tube along a curve; `noise` keeps the bark lumpy and is shared by
// the raw and final builds, so the two match vertex for vertex for morphing.
function tubeData(curve, seg, radial, radius, noise, { cap = false, uvScale = 1 } = {}){
  const frames = curve.computeFrenetFrames(seg, false);
  const len = curve.getLength();
  const pos = [], nor = [], uv = [], idx = [];
  const p = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i <= seg; i++){
    const u = i / seg;
    curve.getPointAt(u, p);
    const N = frames.normals[i], B = frames.binormals[i], rr = radius(u);
    for (let j = 0; j <= radial; j++){
      const a = (j / radial) * Math.PI * 2;
      n.copy(N).multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a)).normalize();
      const k = noise ? 1 + noise[i * radial + (j % radial)] : 1;
      pos.push(p.x + n.x * rr * k, p.y + n.y * rr * k, p.z + n.z * rr * k);
      nor.push(n.x, n.y, n.z);
      uv.push(j / radial * 2 * uvScale, u * len * 2.2 * uvScale);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < radial; j++){
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  if (cap){
    const c = pos.length / 3, t = frames.tangents[seg];
    curve.getPointAt(1, p);
    p.addScaledVector(t, radius(1) * 0.5);
    pos.push(p.x, p.y, p.z); nor.push(t.x, t.y, t.z); uv.push(0.5, len * 2.2);
    const last = seg * (radial + 1);
    for (let j = 0; j < radial; j++) idx.push(last + j, c, last + j + 1);
  }
  return { pos, nor, uv, idx };
}
function geoOf(d){
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(d.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(d.nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(d.uv, 2));
  g.setIndex(d.idx);
  return g;
}
const curveOf = (pts) => new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);

function helixPoints(curve, radius, { from = 0, to = 0.92, pitch = 1, n = 140, phase = 0 }){
  // a frame carried along the curve at the very points sampled (parallel transport)
  const len = curve.getLength() * (to - from);
  const pts = [], p = new THREE.Vector3(), t = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3();
  let ang = 0;
  for (let i = 0; i <= n; i++){
    const s = from + (to - from) * (i / n);
    curve.getPointAt(s, p);
    curve.getTangentAt(s, t);
    if (i === 0){ N.set(0, 0, 1); if (Math.abs(t.z) > 0.9) N.set(1, 0, 0); }
    N.addScaledVector(t, -N.dot(t)).normalize();
    B.crossVectors(t, N);
    // wound at about 45 degrees, as growers apply it: one turn advances about one circumference
    const r = radius(s);
    if (i) ang += (len / n) / Math.max(r, 0.012) * pitch;
    const a = phase + ang;
    pts.push(p.clone().addScaledVector(N, Math.cos(a) * r).addScaledVector(B, Math.sin(a) * r));
  }
  return pts;
}

// A pine shoot's tuft: a brush of long, thin needles fanning up and out from one point,
// darker at the base and lighter at the tips. Built as real triangles, so it has depth.
function needleTuft(c1, c2, r, long = 1){
  const A = new THREE.Color(c1), B = new THREE.Color(c2), base = A.clone().multiplyScalar(0.55), stem = new THREE.Color('#5b4330');
  const pos = [], nor = [], col = [];
  const up = V(0, 1, 0), side = new THREE.Vector3(), n = new THREE.Vector3();
  const push = (p, c, nn) => { pos.push(p.x, p.y, p.z); col.push(c.r, c.g, c.b); nor.push(nn.x, nn.y, nn.z); };
  // the short woody shoot the needles grow from
  for (const [a, b] of [[V(-0.02, 0, 0), V(0.02, 0, 0)], [V(0, 0, -0.02), V(0, 0, 0.02)]]){
    const t = V(0, 0.32, 0);
    push(a, stem, up); push(b, stem, up); push(t, stem, up);
  }
  for (let i = 0; i < 46; i++){
    const polar = Math.min(1.75, Math.acos(1 - r() * 1.25) * 1.05), az = r() * Math.PI * 2;
    const d = V(Math.sin(polar) * Math.cos(az), Math.cos(polar), Math.sin(polar) * Math.sin(az));
    const L = (0.7 + r() * 0.35) * long;
    const o = V(0, 0.08 + r() * 0.22, 0);
    side.crossVectors(d, Math.abs(d.y) > 0.9 ? V(1, 0, 0) : up).normalize().multiplyScalar(0.016);
    const tip = o.clone().addScaledVector(d, L);
    tip.y -= 0.07 * L * Math.sin(polar);
    n.copy(d).multiplyScalar(0.4).add(V(0, 0.9, 0)).normalize();
    const tc = A.clone().lerp(B, 0.1 + r() * 0.55);
    push(o.clone().sub(side), base, n); push(o.clone().add(side), base, n); push(tip, tc, n);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

// ------------------------------------------------------------------ pot
function potShape(pot, inset = 0){
  const w = pot.w / 2 - inset, d = pot.d / 2 - inset;
  const s = new THREE.Shape();
  if (pot.shape === 'oval' || pot.shape === 'round'){
    s.absellipse(0, 0, w, d, 0, Math.PI * 2, false, 0);
  } else {
    const rr = Math.min(w, d) * (pot.shape === 'tall' ? 0.18 : 0.12);
    s.moveTo(-w + rr, -d); s.lineTo(w - rr, -d); s.quadraticCurveTo(w, -d, w, -d + rr);
    s.lineTo(w, d - rr); s.quadraticCurveTo(w, d, w - rr, d); s.lineTo(-w + rr, d);
    s.quadraticCurveTo(-w, d, -w, d - rr); s.lineTo(-w, -d + rr); s.quadraticCurveTo(-w, -d, -w + rr, -d);
  }
  return s;
}
function buildPot(pot, mats){
  const g = new THREE.Group();
  g.name = 'pot';
  const outer = potShape(pot);
  const bodyGeo = new THREE.ExtrudeGeometry(outer, { depth: pot.h - 0.03, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 3, curveSegments: 48 });
  bodyGeo.rotateX(-Math.PI / 2);
  bodyGeo.translate(0, -pot.h + 0.015, 0);
  // a tall cascade pot and round pots taper a little toward the foot
  if (pot.shape === 'tall' || pot.shape === 'round'){
    const a = bodyGeo.attributes.position;
    for (let i = 0; i < a.count; i++){
      const y = a.getY(i), k = 1 - 0.1 * THREE.MathUtils.clamp(-y / pot.h, 0, 1);
      a.setX(i, a.getX(i) * k); a.setZ(i, a.getZ(i) * k);
    }
    bodyGeo.computeVertexNormals();
  }
  g.add(new THREE.Mesh(bodyGeo, mats.pot));
  // the rim: a lip standing proud of the soil
  const ring = potShape(pot);
  ring.holes.push(potShape(pot, 0.045));
  const rimGeo = new THREE.ExtrudeGeometry(ring, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3, curveSegments: 48 });
  rimGeo.rotateX(-Math.PI / 2);
  rimGeo.translate(0, -0.012, 0);
  g.add(new THREE.Mesh(rimGeo, mats.pot));
  // a darker band under the rim, as on many bonsai pots
  const band = new THREE.Mesh(new THREE.ExtrudeGeometry(potShape(pot, -0.006), { depth: 0.012, bevelEnabled: false, curveSegments: 48 }).rotateX(-Math.PI / 2).translate(0, -0.07, 0), mats.potDark);
  g.add(band);
  // feet
  const foot = new THREE.BoxGeometry(0.11, 0.05, 0.08);
  const feet = pot.shape === 'round' ? [0, 1, 2].map((i) => [Math.cos(i * 2.094 + 1.57) * pot.w * 0.36, Math.sin(i * 2.094 + 1.57) * pot.d * 0.36])
    : [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => [x * pot.w * 0.36, z * pot.d * 0.32]);
  for (const [x, z] of feet){ const f = new THREE.Mesh(foot, mats.potDark); f.position.set(x, -pot.h - 0.02, z); g.add(f); }
  // soil
  // soil: a gently domed mound, as growers heap it, highest round the trunk
  const sa = pot.w / 2 - 0.045, sb = pot.d / 2 - 0.045;
  const round = pot.shape === 'oval' || pot.shape === 'round';
  const soilGeo = round ? new THREE.RingGeometry(0.001, 1, 56, 10) : new THREE.PlaneGeometry(2, 2, 24, 16);
  soilGeo.rotateX(-Math.PI / 2);
  const domeY = (x, z) => { const rho = round ? Math.hypot(x / sa, z / sb) : Math.max(Math.abs(x) / sa, Math.abs(z) / sb); return 0.055 * Math.max(0, 1 - rho * rho); };
  {
    const a = soilGeo.attributes.position;
    for (let i = 0; i < a.count; i++){
      let x = a.getX(i) * sa, z = a.getZ(i) * sb;
      if (!round){ const rr = Math.min(sa, sb) * 0.12, ax = Math.abs(x), az = Math.abs(z); if (ax > sa - rr && az > sb - rr){ const cx = sa - rr, cz = sb - rr, d = Math.hypot(ax - cx, az - cz); if (d > rr){ x = Math.sign(x) * (cx + (ax - cx) * rr / d); z = Math.sign(z) * (cz + (az - cz) * rr / d); } } }
      a.setXYZ(i, x, domeY(x, z), z);
    }
    soilGeo.computeVertexNormals();
  }
  const uv = soilGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3.2, uv.getY(i) * 3.2);
  const soil = new THREE.Mesh(soilGeo, mats.soil);
  soil.position.y = 0.012;
  soil.name = 'soil';
  g.add(soil);
  return { group: g, inner: potShape(pot, 0.06), domeY };
}

// ------------------------------------------------------------------ build
export function buildTree(def){
  const L = def.look;
  const spec = STYLES[L.style]();
  const r = rng(L.seed);
  const root = new THREE.Group();
  root.name = 'tree:' + def.id;

  // materials
  const barkMap = barkTexture(L.barkKind);
  const bark = new THREE.MeshStandardMaterial({ color: L.bark, map: barkMap, bumpMap: barkMap, bumpScale: 2.2, roughness: 0.92 });
  const barkTrunk = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, map: barkMap, bumpMap: barkMap, bumpScale: 2.4, roughness: 0.9 });
  // deadwood (jin and shari): bark stripped, bleached silver-white by sun and lime sulfur
  const deadMap = barkTexture('strings');
  const bone = new THREE.MeshStandardMaterial({ color: '#e4ddd0', map: deadMap, bumpMap: deadMap, bumpScale: 1.6, roughness: 0.75 });
  const DW = L.deadwood || {};
  const potColor = new THREE.Color(L.pot.color);
  const mats = {
    bark, barkTrunk, bone,
    pot: new THREE.MeshStandardMaterial({ color: potColor, roughness: L.pot.glaze ? 0.28 : 0.86, metalness: 0 }),
    potDark: new THREE.MeshStandardMaterial({ color: potColor.clone().multiplyScalar(0.72), roughness: L.pot.glaze ? 0.3 : 0.9 }),
    soil: new THREE.MeshStandardMaterial({ map: soilTexture(), roughness: 1, color: '#ffffff' }),
    wire: L.wire === 'copper'
      ? new THREE.MeshStandardMaterial({ color: '#c27a45', metalness: 0.85, roughness: 0.32 })
      : new THREE.MeshStandardMaterial({ color: '#cfd2d4', metalness: 0.8, roughness: 0.38 }),
  };
  // the trunk of Scots pine turns orange higher up: lighten the bark map toward the top
  const leafTex = foliageTexture(L.foliage, L.leaf, L.leaf2);
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.42, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.85, color: L.foliage === 'blossom' ? '#ffffff' : '#cfd6c8' });
  leafMat.onBeforeCompile = (sh) => {
    // light each foliage pad as one rounded mass: every spray takes the normal of the
    // pad's surface where it sits (aOut), so pads shade like domes, with no dark back faces
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aOut;')
      .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\n transformedNormal = normalize(normalMatrix * aOut);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>',
      '#include <normal_fragment_begin>\n normal = normalize(vNormal);');
  };
  // shadows from the sprays follow their painted outline, not the card square
  const leafDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: leafTex, alphaTest: 0.42, side: THREE.DoubleSide });

  // pot, soil, rock
  const pot = buildPot(L.pot, mats);
  root.add(pot.group);
  const soil = pot.group.getObjectByName('soil');
  let rockMesh = null;
  if (spec.rock){
    const g = new THREE.IcosahedronGeometry(1, 5);
    const a = g.attributes.position, rr = rng(L.seed + 5);
    const bumps = Array.from({ length: 9 }, () => [V(rr() - 0.5, rr() - 0.5, rr() - 0.5).normalize(), 0.05 + rr() * 0.07]);
    for (let i = 0; i < a.count; i++){
      const v = V(a.getX(i), a.getY(i), a.getZ(i));
      let k = 1;
      for (const [dir, h] of bumps) k += h * Math.max(0, v.dot(dir)) ** 3;
      v.multiplyScalar(k);
      a.setXYZ(i, v.x * spec.rock.a, v.y * spec.rock.b, v.z * spec.rock.a * 0.9);
    }
    g.computeVertexNormals();
    rockMesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: rockTexture(), color: '#b9b2a6', roughness: 0.95, bumpMap: rockTexture(), bumpScale: 3 }));
    rockMesh.position.y = spec.rock.y;
    root.add(rockMesh);
  }

  // trunks
  const trunks = spec.trunks.map((T, ti) => {
    const seg = 60, radial = 22;
    // bark ridges running up the trunk (fluting), strongest at the base, plus small lumps
    const ridge = Array.from({ length: radial }, () => (r() - 0.5) * 0.16);
    const sm = ridge.map((v, j) => (ridge[(j + radial - 1) % radial] + 2 * v + ridge[(j + 1) % radial]) / 4);
    const noise = [];
    // knobs and swellings along the trunk, leaning to one side then the other, as on an old tree
    const ph1 = r() * 6, ph2 = r() * 6, ph3 = r() * 6;
    for (let i = 0; i <= seg; i++) for (let j = 0; j < radial; j++){
      const a = (j / radial) * Math.PI * 2;
      const knob = 0.09 * Math.sin(i * 0.33 + ph1) * Math.max(0, Math.cos(a - ph3 - i * 0.05)) + 0.05 * Math.sin(i * 0.17 + ph2);
      noise.push(sm[j] * (1 - 0.6 * i / seg) + knob + (r() - 0.5) * 0.035);
    }
    const fin = curveOf(T.fin), raw = curveOf(T.raw || T.fin);
    const radius = (u) => T.r1 + (T.r0 - T.r1) * Math.pow(1 - u, 1.25) + T.r0 * 0.55 * Math.exp(-u * 16);
    const dF = tubeData(fin, seg, radial, radius, noise, { cap: T.cap ?? true });
    const dR = T.raw ? tubeData(raw, seg, radial, radius, noise, { cap: T.cap ?? true }) : null;
    // colour every vertex: living bark, or a bleached strip of shari twisting up the trunk
    const sh = ti === 0 ? DW.shari : null;
    const live = new THREE.Color(L.bark), dead = new THREE.Color('#fbf6ec'), tmpC = new THREE.Color();
    const cols = [];
    for (let v = 0; v < dF.pos.length / 3; v++){
      const i = Math.min(seg, Math.floor(v / (radial + 1))), u = i / seg;
      let k = 0;
      if (sh && v < (seg + 1) * (radial + 1) && u >= sh.from && u <= sh.to){
        const nx = dF.nor[v * 3], nz = dF.nor[v * 3 + 2];
        const phi = Math.atan2(nx, nz), centre = sh.angle * D + (u - sh.from) * sh.twist * Math.PI * 2;
        let dphi = phi - centre; dphi = Math.atan2(Math.sin(dphi), Math.cos(dphi));
        const ends = Math.min(1, (u - sh.from) / 0.08, (sh.to - u) / 0.12);
        const half = sh.width * Math.PI * Math.max(0, ends) * (0.8 + 0.2 * Math.sin(u * 23));
        k = THREE.MathUtils.smoothstep(half - Math.abs(dphi), -0.05, 0.12);
        if (k > 0){
          // stripped wood sits a little below the bark
          const s = 1 - 0.05 * k;
          for (const d of dR ? [dF, dR] : [dF]){ d.pos[v * 3] = d.pos[v * 3] - d.nor[v * 3] * radius(u) * 0.05 * k; d.pos[v * 3 + 1] -= d.nor[v * 3 + 1] * radius(u) * 0.05 * k; d.pos[v * 3 + 2] -= d.nor[v * 3 + 2] * radius(u) * 0.05 * k; }
          void s;
        }
      }
      // Scots pine bark turns orange higher up the trunk
      tmpC.copy(live);
      if (L.style === 'literati') tmpC.lerp(new THREE.Color('#c8743e'), THREE.MathUtils.smoothstep(u, 0.35, 0.8) * 0.8);
      tmpC.multiplyScalar(0.85 + 0.15 * Math.sin(u * 40 + v));
      tmpC.lerp(dead, k);
      cols.push(tmpC.r, tmpC.g, tmpC.b);
    }
    const geo = geoOf(dF);
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    if (T.raw){
      geo.morphAttributes.position = [new THREE.Float32BufferAttribute(dR.pos, 3)];
      geo.morphAttributes.normal = [new THREE.Float32BufferAttribute(dR.nor, 3)];
    }
    const mesh = new THREE.Mesh(geo, barkTrunk);
    if (T.raw) mesh.morphTargetInfluences = [1];
    root.add(mesh);
    // surface roots (nebari) spreading from the base into the soil
    if (!spec.rock){
      const n = 9, base = T.fin[0];
      for (let k = 0; k < n; k++){
        const a = (k / n) * Math.PI * 2 + r() * 0.45, R = T.r0 * (2.6 + r() * 1.8), w = (r() - 0.5) * 0.7;
        const at = (f, y) => V(base.x + Math.cos(a + w * f) * R * f, y, base.z + Math.sin(a + w * f) * R * f);
        const c = curveOf([V(base.x, 0.16, base.z), at(0.3, 0.075), at(0.65, 0.05), at(1, 0.01)]);
        const m = new THREE.Mesh(geoOf(tubeData(c, 14, 8, (u) => T.r0 * (0.58 - u * 0.5) * (k % 3 ? 0.8 : 1), null, { cap: true })), bark);
        root.add(m);
      }
    }
    return { def: T, fin, raw, radius, mesh, bend: T.raw ? 0 : 1, wire: null };
  });
  // roots over the rock, from the trunk base down its sides into the soil
  if (spec.rock){
    const R = spec.rock, c0 = spec.trunks[0].fin[0];
    for (let k = 0; k < 6; k++){
      const th = (k / 6) * Math.PI * 2 + 0.3 + r() * 0.4;
      const pts = [];
      for (let i = 0; i <= 8; i++){
        const ph = (i / 8) * 1.75 + 0.15;
        const x = Math.sin(ph) * Math.cos(th) * R.a * 1.06, y = R.y + Math.cos(ph) * R.b * 1.08, z = Math.sin(ph) * Math.sin(th) * R.a * 0.95;
        pts.push(V(x + (r() - 0.5) * 0.02, i === 0 ? c0.y : y, z));
      }
      pts.push(V(Math.cos(th) * R.a * 1.35, -0.01, Math.sin(th) * R.a * 1.2));
      const m = new THREE.Mesh(geoOf(tubeData(curveOf(pts), 30, 8, (u) => 0.05 * (1 - u * 0.6), null, { cap: true })), bark);
      root.add(m);
    }
  }

  const trunkPoint = (ti, u, out = new THREE.Vector3()) => {
    const T = trunks[ti];
    const a = T.raw.getPointAt(Math.min(u, 1)), b = T.fin.getPointAt(Math.min(u, 1));
    return out.copy(a).lerp(b, T.bend);
  };

  // jin: dead branches stripped of bark, kept as bleached silver stubs (conifers only)
  const jins = (DW.jin || []).map((J) => {
    const group = new THREE.Group();
    group.rotation.order = 'YZX';
    const L2 = J.len, s = r() < 0.5 ? -1 : 1;
    const c = curveOf(P([[-0.02, 0, 0], [L2 * 0.35, 0.03 * s, 0.05 * L2], [L2 * 0.7, -0.04 * s, -0.04 * L2], [L2, 0.06, 0.02 * s]]));
    const r0 = Math.min(trunks[0].radius(J.u) * 0.42, 0.045);
    const parts = [geoOf(tubeData(c, 14, 8, (u) => r0 * (1 - u * 0.88), null, { cap: true }))];
    // a forked tip, as weathered jin often has
    const p = c.getPointAt(0.68), end = p.clone().add(V(L2 * 0.28, 0.07, 0.05 * s));
    parts.push(geoOf(tubeData(curveOf([p, p.clone().lerp(end, 0.5).add(V(0, 0.02, 0)), end]), 6, 6, (u) => r0 * 0.4 * (1 - u * 0.85), null, { cap: true })));
    const mesh = new THREE.Mesh(mergeGeometries(parts), bone);
    parts.forEach((g) => g.dispose());
    group.add(mesh);
    root.add(group);
    return { group, J };
  });

  // pads: flat clouds of foliage cards
  const tuft = ['pine', 'scots', 'cedar', 'juniper'].includes(L.foliage);
  const density = { pine: 6, scots: 5.5, cedar: 8, juniper: 9.5, palmate: 6, trident: 6.5, zelkova: 7, blossom: 5.5 }[L.foliage];
  const cardSize = { pine: 0.23, scots: 0.2, cedar: 0.2, juniper: 0.17, palmate: 0.2, trident: 0.19, zelkova: 0.17, blossom: 0.2 }[L.foliage];
  const pads = [];
  const q = new THREE.Quaternion(), e = new THREE.Euler(), s3 = new THREE.Vector3();
  function makePad(host, local, R, H, { trim = false, extra = false } = {}){
    const n = Math.max(4, Math.round(density * R * R * 100));
    const cards = [];
    for (let i = 0; i < n; i++){
      const a = r() * Math.PI * 2, d = Math.sqrt(r());
      const x = Math.cos(a) * d * R, z = Math.sin(a) * d * R * 0.85;
      const y = H * (Math.sqrt(Math.max(0, 1 - d * d)) * (0.25 + r() * 0.75) - 0.3);
      if (tuft) e.set((r() - 0.5) * 0.5 + Math.sin(a) * d * 0.9, r() * Math.PI * 2, -Math.cos(a) * d * 0.9 + (r() - 0.5) * 0.5, 'YXZ');
      else e.set(-Math.PI / 2 + (r() - 0.5) * 2.0, r() * Math.PI * 2, (r() - 0.5) * 1.2, 'YXZ');
      q.setFromEuler(e);
      const sc = cardSize * (0.75 + r() * 0.5);
      const m = new THREE.Matrix4().compose(V(x, y, z), q.clone(), s3.set(sc, sc, sc));
      // outward normal of the pad dome at this spot, and a little occlusion deep inside it
      const out = V(x / R, (y / H) * 1.1 + 0.25, z / R).normalize();
      const shade = THREE.MathUtils.clamp(0.4 + 0.2 * ((y / H) + 0.3) + 0.26 * d + (r() - 0.5) * 0.16, 0.32, 0.9);
      cards.push({ m, th: r(), shade, out });
    }
    const pad = { host, local: local.clone(), R, H, cards, trim, extra, gone: false, fall: null, base: 1 };
    pads.push(pad);
    return pad;
  }

  // branches
  const branches = [];
  const extraSpecs = extrasFor(spec, r);
  const allSpecs = spec.branches.map((b) => ({ ...b, keep: true })).concat(extraSpecs.map((b) => ({ ...b, keep: false })));
  allSpecs.forEach((B, bi) => {
    const t = B.t ?? 0, T = trunks[t];
    const group = new THREE.Group();
    group.rotation.order = 'YZX';
    root.add(group);
    const len = B.len, side = r() < 0.5 ? -1 : 1;
    const trunkR = T.radius(B.u);
    const rb = Math.min(trunkR * (B.keep ? 0.62 : 0.5), 0.07);
    const pts = P([[-trunkR * 0.6, 0, 0], [len * 0.33, -0.04 * len, 0.05 * len * side], [len * 0.66, -0.05 * len, -0.04 * len * side], [len, 0.03 * len, 0.02 * len * side]]);
    const curve = curveOf(pts);
    // a swollen collar where the branch leaves the trunk, then a steady taper
    const radius = (u) => rb * (1 - u * 0.78) * (1 + 0.4 * Math.exp(-u * 12));
    const parts = [geoOf(tubeData(curve, 16, 9, radius, null, { cap: true, uvScale: 0.7 }))];
    const padsHere = [];
    const tipR = THREE.MathUtils.clamp(0.16 + len * 0.17, 0.17, 0.32) * (B.keep ? 1 : 0.85);
    padsHere.push(makePad(group, V(len + 0.02, 0.03, 0), tipR, tipR * (tuft ? 0.5 : 0.55), { extra: !B.keep }));
    // side twigs ending in smaller pads, alternating sides (ramification)
    const nt = B.twigs ?? (len > 0.45 ? 3 : 2);
    for (let k = 0; k < nt; k++){
      const s = 0.42 + (k / Math.max(1, nt)) * 0.48;
      const p = curve.getPointAt(s);
      const sgn = (k % 2 ? 1 : -1) * side;
      const th = (40 + r() * 25) * D;
      const tl = len * (0.24 + r() * 0.1) * (1 - s * 0.3);
      const end = p.clone().add(V(Math.cos(th) * tl * 0.6, 0.02 + r() * 0.03, Math.sin(th) * tl * sgn));
      const tc = curveOf([p, p.clone().lerp(end, 0.5).add(V(0, -0.01, 0)), end]);
      const tr = radius(s) * 0.55;
      parts.push(geoOf(tubeData(tc, 6, 6, (u) => tr * (1 - u * 0.7), null, { cap: true, uvScale: 0.5 })));
      if (B.keep || k === 0) padsHere.push(makePad(group, end, tipR * 0.68, tipR * 0.42, { extra: !B.keep }));
    }
    // leggy, untidy growth on the raw plant, removed by pruning
    if (B.keep){
      padsHere.push(makePad(group, curve.getPointAt(0.32).add(V(0, -0.06, 0.02)), 0.13, 0.1, { trim: true }));
      padsHere.push(makePad(group, V(len + 0.14, 0.14, 0.03 * side), 0.12, 0.12, { trim: true }));
    }
    const geo = mergeGeometries(parts);
    parts.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(geo, bark);
    group.add(mesh);
    const elRaw = B.elRaw ?? (B.keep ? B.el + (B.wire ? 46 : 20) + r() * 8 : B.el);
    const azRaw = B.keep ? B.az + (B.wire ? (r() - 0.5) * 36 : 0) : B.az;
    const br = { i: bi, spec: B, keep: B.keep, why: B.why, t, u: B.u, az: B.az, el: B.el, azRaw, elRaw, len, rb, curve, radius,
      group, mesh, pads: padsHere, bend: 0, cut: false, fall: null, wire: null };
    // the scissors sit near the base of an extra branch
    br.marker = curve.getPointAt(0.72);
    branches.push(br);
  });
  // crown pads hang off the trunk tops
  for (const c of spec.crown){
    makePad({ trunk: c.t, u: c.u }, V(...c.off), c.r, c.h);
  }
  // A few leggy shoots at the apex too
  makePad({ trunk: 0, u: 1 }, V(0.02, 0.24, 0), 0.13, 0.14, { trim: true });

  // foliage: one instanced mesh for every card on the tree
  // Pines get real 3D needle tufts: a brush of single needles fanning out from each shoot.
  // Every other tree gets sprays built from three crossed layers, so they have volume from
  // any side instead of looking like flat cards.
  const needles = L.foliage === 'pine' || L.foliage === 'scots';
  let cardGeo;
  if (needles) cardGeo = needleTuft(L.leaf, L.leaf2, rng(L.seed + 3), L.foliage === 'pine' ? 1 : 0.8);
  else {
    const layers = [0, 1, 2].map((k) => { const p = new THREE.PlaneGeometry(1, 1); if (tuft) p.translate(0, 0.42, 0); p.rotateY((k * Math.PI) / 3); return p; });
    cardGeo = mergeGeometries(layers);
    layers.forEach((p) => p.dispose());
  }
  const total = pads.reduce((n, p) => n + p.cards.length, 0);
  {
    const outs = new Float32Array(total * 3);
    let k = 0;
    for (const p of pads) for (const c of p.cards){ outs.set([c.out.x, c.out.y, c.out.z], k * 3); k++; }
    cardGeo.setAttribute('aOut', new THREE.InstancedBufferAttribute(outs, 3));
  }
  const needleMat = needles ? new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.7 }) : null;
  if (needleMat) needleMat.onBeforeCompile = leafMat.onBeforeCompile;
  const foliage = new THREE.InstancedMesh(cardGeo, needleMat || leafMat, total);
  foliage.frustumCulled = false;
  foliage.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  if (!needles) foliage.customDepthMaterial = leafDepth;
  foliage.castShadow = true;
  foliage.receiveShadow = true;
  {
    const col = new THREE.Color();
    let k = 0;
    for (const p of pads) for (const c of p.cards){ foliage.setColorAt(k++, col.setScalar(c.shade)); }
  }
  root.add(foliage);
  // a dense, darker core inside every pad, so pads read as solid masses with depth
  // (apricot blossom stays airy and has none)
  let cores = null;
  if (L.foliage !== 'blossom'){
    const cg = new THREE.IcosahedronGeometry(1, 3);
    const a = cg.attributes.position, cr = rng(L.seed + 9);
    for (let i = 0; i < a.count; i++){ const v = V(a.getX(i), a.getY(i), a.getZ(i)); v.multiplyScalar(1 + (cr() - 0.5) * 0.22); a.setXYZ(i, v.x, v.y, v.z); }
    cg.computeVertexNormals();
    const coreMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(L.leaf).multiplyScalar(0.55), roughness: 0.95 });
    cores = new THREE.InstancedMesh(cg, coreMat, pads.length);
    cores.frustumCulled = false;
    cores.castShadow = true;
    cores.receiveShadow = true;
    cores.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    root.add(cores);
  }

  // ------------------------------------------------------------------ wiring
  // Each tree is shaped its own way (look.wiring), as growers would:
  //   trace       — coil wire on by following the branch, then it bends
  //   pull        — the coil goes on with a tap, then you pull the tip down to its place
  //   circle      — wind the wire on by circling the trunk (or tie roots round the rock)
  //   circle+pull — wind it on, then pull the trunk over the edge (cascade)
  //   guy         — a guy wire from the tip to a hook on the pot pulls the part into place
  const WI = L.wiring || { branches: 'trace', coilOff: 'unwind' };
  const wireR = 0.0075;
  const wireTargets = [];
  const tmpObj = new THREE.Object3D();
  tmpObj.rotation.order = 'YZX';
  // where a part's tip sits at bend k, in the tree's own space
  function tipTree(W, k, out = new THREE.Vector3()){
    if (W.kind === 'trunk') return out.copy(W.T.raw.getPointAt(0.9)).lerp(W.T.fin.getPointAt(0.9), k);
    const b = W.br;
    trunkPoint(b.t, b.u, tmpObj.position);
    tmpObj.rotation.set(0, lerp(b.azRaw, b.az, k) * D, lerp(b.elRaw, b.el, k) * D);
    tmpObj.updateMatrix();
    return out.copy(b.curve.getPointAt(0.9)).applyMatrix4(tmpObj.matrix);
  }
  function makeGuy(W){
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 1, 6, 1).translate(0, 0.5, 0), mats.wire);
    const hook = new THREE.Group();
    const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.07, 8), mats.wire);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 6, 18), mats.wire);
    ring.position.y = 0.045;
    hook.add(peg, ring);
    line.visible = false; hook.visible = false;
    line.castShadow = true;
    root.add(line, hook);
    W.guy = { line, hook, on: false, fall: 0, pos: new THREE.Vector3() };
  }
  // the hook goes on the rim of the pot, on the side the part is pulled toward
  function hookFor(tip){
    const p = L.pot, dir = V(tip.x, 0, tip.z);
    if (dir.lengthSq() < 1e-4) dir.set(1, 0, 0);
    dir.normalize();
    const k = (p.shape === 'oval' || p.shape === 'round')
      ? 1 / Math.sqrt((dir.x / (p.w / 2)) ** 2 + (dir.z / (p.d / 2)) ** 2)
      : Math.min((p.w / 2) / Math.max(Math.abs(dir.x), 1e-3), (p.d / 2) / Math.max(Math.abs(dir.z), 1e-3));
    return dir.multiplyScalar(k * 0.9).setY(0.04);
  }
  function coilOn(W, curveF, curveR, rad, n, parent, phase){
    const hf = helixPoints(curveF, rad, { from: W.kind === 'trunk' ? 0.05 : 0.12, to: W.kind === 'trunk' ? 0.9 : 0.94, pitch: 1.05, n, phase });
    const g = new THREE.TubeGeometry(curveOf(hf), n, W.kind === 'trunk' ? wireR * 1.3 : wireR, 6, false);
    if (curveR){
      const hr = helixPoints(curveR, rad, { from: 0.05, to: 0.9, pitch: 1.05, n, phase });
      const gr = new THREE.TubeGeometry(curveOf(hr), n, wireR * 1.3, 6, false);
      g.morphAttributes.position = [gr.attributes.position];
      g.morphAttributes.normal = [gr.attributes.normal];
    }
    const m = new THREE.Mesh(g, mats.wire);
    if (curveR) m.morphTargetInfluences = [1];
    m.geometry.setDrawRange(0, 0);
    m.frustumCulled = false;
    m.castShadow = true;
    parent.add(m);
    W.wire = { mesh: m, segs: n, radial: 6, progress: 0, removed: false };
  }
  if (WI.trunk){
    const T = trunks[WI.trunkIndex ?? 0];
    const W = { kind: 'trunk', T, method: WI.trunk, name: trunks.length > 1 ? 'the small trunk' : 'the trunk' };
    if (WI.trunk === 'guy') makeGuy(W);
    else {
      coilOn(W, T.fin, T.raw, (u) => (T.def.r1 + (T.def.r0 - T.def.r1) * Math.pow(1 - u, 1.25)) * 0.9 + wireR, 220, root, 0);
      T.wire = W.wire;
    }
    W.unwire = WI.trunk === 'guy' ? 'release' : WI.coilOff;
    wireTargets.push(W);
  }
  if (WI.ties && spec.rock){
    // three bands of wire round the rock hold the young roots against it
    const R = spec.rock, ties = [];
    for (const dy of [-0.06, 0.08, 0.2]){
      const y = R.y + dy, rx = R.a * Math.sqrt(Math.max(0.05, 1 - (dy / R.b) ** 2)) * 1.17;
      const pts = [];
      for (let i = 0; i < 48; i++){ const a = (i / 48) * Math.PI * 2 + Math.PI / 2; pts.push(V(Math.cos(a) * rx, y + Math.sin(a * 3) * 0.01, Math.sin(a) * rx * 0.92)); }
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 96, 0.009, 6, true);
      const m = new THREE.Mesh(g, mats.wire);
      m.geometry.setDrawRange(0, 0);
      m.castShadow = true;
      root.add(m);
      ties.push({ mesh: m, y, rx, fall: null, cut: false });
    }
    const W = { kind: 'tie', method: 'circle', unwire: 'cut', ties, name: 'the roots', wire: { progress: 0, segs: 96, radial: 6, removed: false } };
    wireTargets.push(W);
  }
  if (WI.branches){
    for (const br of branches){
      if (!br.keep || !br.spec.wire) continue;
      const W = { kind: 'branch', br, method: WI.branches, name: 'a branch' };
      if (WI.branches === 'guy') makeGuy(W);
      else coilOn(W, br.curve, null, (u) => br.radius(u) * 0.72 + wireR, 120, br.group, r() * 6);
      br.wire = W.wire || null;
      W.unwire = WI.branches === 'guy' ? 'release' : WI.coilOff;
      wireTargets.push(W);
    }
  }
  // hooks sit where each guy wire will pull its part, with every trunk already shaped
  {
    const saveT = trunks.map((T) => T.bend);
    trunks.forEach((T) => { T.bend = 1; });
    for (const W of wireTargets) if (W.guy){ W.guy.pos.copy(hookFor(tipTree(W, 1))); W.guy.hook.position.copy(W.guy.pos); }
    trunks.forEach((T, i) => { T.bend = saveT[i]; });
  }
  // keepers without wire still need a little shaping; they follow the wired ones
  const freeKeepers = branches.filter((b) => b.keep && !wireTargets.some((W) => W.br === b));

  // moss: appears on the soil when the bonsai is finished
  const mossGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const mossMat = new THREE.MeshStandardMaterial({ map: mossTexture(), transparent: true, depthWrite: false, roughness: 1 });
  const moss = new THREE.Group();
  {
    const shape = pot.inner, pts = shape.getPoints(64), box = new THREE.Box2().setFromPoints(pts);
    const inside = (x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++){ if ((pts[i].y > y) !== (pts[j].y > y) && x < (pts[j].x - pts[i].x) * (y - pts[i].y) / (pts[j].y - pts[i].y) + pts[i].x) c = !c; } return c; };
    for (let i = 0, tries = 0; i < 70 && tries < 900; tries++){
      const x = lerp(box.min.x, box.max.x, r()), y = lerp(box.min.y, box.max.y, r());
      if (!inside(x, y)) continue;
      const m = new THREE.Mesh(mossGeo, mossMat);
      const s = 0.12 + r() * 0.16;
      m.position.set(x, pot.domeY(x, -y) + 0.016 + i * 0.0002, -y);
      m.scale.set(s, 1, s * (0.7 + r() * 0.4));
      m.rotation.y = r() * 6;
      moss.add(m); i++;
    }
  }
  moss.visible = false;
  root.add(moss);

  // ------------------------------------------------------------------ state
  const tree = {
    def, root, trunks, branches, pads, wireTargets, foliage, soil, moss, mats, spec, rock: rockMesh,
    extras: branches.filter((b) => !b.keep), keepers: branches.filter((b) => b.keep),
    state: { vis: 1, padScale: 1, pruned: false },
    dirty: true,
  };

  const tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), coreM = new THREE.Matrix4();
  const m4 = new THREE.Matrix4(), padM = new THREE.Matrix4(), rootInv = new THREE.Matrix4(), tmp = new THREE.Vector3(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  function place(){
    for (const T of trunks){
      if (T.mesh.morphTargetInfluences) T.mesh.morphTargetInfluences[0] = 1 - T.bend;
      if (T.wire) T.wire.mesh.morphTargetInfluences[0] = 1 - T.bend;
    }
    for (const b of branches){
      if (b.fall) continue;
      trunkPoint(b.t, b.u, b.group.position);
      b.group.rotation.set(0, lerp(b.azRaw, b.az, b.bend) * D, lerp(b.elRaw, b.el, b.bend) * D);
    }
    for (const j of jins){ trunkPoint(0, j.J.u, j.group.position); j.group.rotation.set(0, j.J.az * D, j.J.el * D); }
    // guy wires run from the part's tip to their hook on the pot
    for (const W of wireTargets){
      const G = W.guy;
      if (!G) continue;
      G.line.visible = G.on && G.fall < 1;
      if (!G.line.visible) continue;
      const a = tipTree(W, W.kind === 'trunk' ? W.T.bend : W.br.bend, tmp2);
      const dir = tmp3.copy(G.pos).sub(a);
      const len = dir.length();
      G.line.position.copy(a);
      G.line.quaternion.setFromUnitVectors(UP, dir.normalize());
      G.line.scale.set(1, len * (1 - G.fall), 1);
    }
  }
  tree.update = (dt = 0) => {
    let moving = false;
    for (const b of branches){
      if (!b.fall) continue;
      const F = b.fall;
      F.t += dt; moving = true;
      F.v.y -= 3.4 * dt;
      b.group.position.addScaledVector(F.v, dt);
      b.group.rotation.x += F.w * dt; b.group.rotation.z -= F.w * 0.6 * dt;
      const s = Math.max(0.001, 1 - Math.max(0, F.t - 0.7) / 0.6);
      b.group.scale.setScalar(s);
      if (F.t > 1.3){ b.group.visible = false; b.pads.forEach((p) => { p.gone = true; }); b.fall = null; b.done = true; }
    }
    for (const p of pads){
      if (!p.fall) continue;
      p.fall.t += dt; moving = true;
      p.fall.v.y -= 3 * dt;
      p.fall.off.addScaledVector(p.fall.v, dt);
      if (p.fall.t > 1.1){ p.gone = true; p.fall = null; }
    }
    for (const W of wireTargets){
      if (W.guy && W.guy.falling){ W.guy.fall = Math.min(1, W.guy.fall + dt * 1.8); moving = true; if (W.guy.fall >= 1){ W.guy.falling = false; W.guy.line.visible = false; } }
      for (const T of W.ties || []){
        if (!T.fall) continue;
        T.fall.t += dt; moving = true;
        T.mesh.position.y -= dt * (0.4 + T.fall.t * 3);
        T.mesh.scale.setScalar(Math.max(0.01, 1 - T.fall.t * 0.6));
        if (T.fall.t > 1){ T.mesh.visible = false; T.fall = null; }
      }
    }
    if (!tree.dirty && !moving) return;
    tree.dirty = false;
    place();
    root.updateMatrixWorld(true);
    rootInv.copy(root.matrixWorld).invert();
    let k = 0;
    const S = tree.state;
    for (const p of pads){
      // where the pad sits, in the tree's own space
      if (p.host.trunk !== undefined){
        trunkPoint(p.host.trunk, p.host.u, tmp).add(p.local);
      } else {
        tmp.copy(p.local).applyMatrix4(p.host.matrixWorld).applyMatrix4(rootInv);
      }
      let sc = p.extra ? 1 : S.padScale;
      if (p.fall){ tmp.add(p.fall.off); sc *= Math.max(0.05, 1 - p.fall.t * 0.8); }
      if (p.host.scale) sc *= p.host.scale.x;
      padM.makeScale(sc, sc, sc).setPosition(tmp);
      const hide = p.gone || (p.trim && S.pruned && !p.fall);
      if (cores){
        const cs = hide || p.trim ? 0 : sc * (p.extra ? 1 : 0.55 + 0.45 * S.vis);
        coreM.makeScale(p.R * 0.56 * cs, p.H * 0.5 * cs, p.R * 0.48 * cs).setPosition(tmp.x, tmp.y - p.H * 0.12 * cs, tmp.z);
        cores.setMatrixAt(pads.indexOf(p), cs ? coreM : ZERO);
      }
      for (const c of p.cards){
        const show = !hide && (p.extra || p.trim || c.th <= S.vis);
        foliage.setMatrixAt(k++, show ? m4.multiplyMatrices(padM, c.m) : ZERO);
      }
    }
    foliage.instanceMatrix.needsUpdate = true;
    if (cores) cores.instanceMatrix.needsUpdate = true;
  };

  // ------------------------------------------------------------------ actions
  tree.cut = (b) => {
    if (b.cut) return;
    b.cut = true;
    b.fall = { t: 0, v: V((r() - 0.5) * 0.6, 0.4, 0.5 + r() * 0.3), w: (r() - 0.5) * 6 };
    tree.dirty = true;
  };
  tree.trimPad = (p) => {
    if (p.gone || p.fall) return;
    p.fall = { t: 0, v: V((r() - 0.5) * 0.5, 0.3, 0.4), off: V(0, 0, 0) };
  };
  tree.trimPads = () => pads.filter((p) => p.trim && !p.gone && !p.fall);
  tree.padWorld = (p, out = new THREE.Vector3()) => {
    if (p.host.trunk !== undefined) return trunkPoint(p.host.trunk, p.host.u, out).add(p.local).applyMatrix4(root.matrixWorld);
    return out.copy(p.local).applyMatrix4(p.host.matrixWorld);
  };
  tree.markerWorld = (b, out = new THREE.Vector3()) => out.copy(b.marker).applyMatrix4(b.group.matrixWorld);
  // points along a wired part, base to tip, in world space (for the dotted guide)
  tree.targetPath = (W, n = 16) => {
    const out = [];
    if (W.kind === 'trunk'){
      for (let i = 0; i <= n; i++){
        const u = 0.05 + 0.85 * (i / n);
        const a = W.T.raw.getPointAt(u), b = W.T.fin.getPointAt(u);
        out.push(a.lerp(b, W.T.bend).applyMatrix4(root.matrixWorld));
      }
    } else {
      for (let i = 0; i <= n; i++) out.push(W.br.curve.getPointAt(0.06 + 0.88 * (i / n)).applyMatrix4(W.br.group.matrixWorld));
    }
    return out;
  };
  tree.setBend = (W, k) => {
    if (W.kind === 'trunk') W.T.bend = k; else W.br.bend = k;
    tree.dirty = true;
  };
  tree.setWire = (W, k) => {
    const w = W.wire;
    if (!w) return;
    w.progress = k;
    if (W.ties){
      // the three bands go on one after another
      W.ties.forEach((T, i) => { const f = THREE.MathUtils.clamp(k * 3 - i, 0, 1); T.mesh.geometry.setDrawRange(0, Math.floor(f * w.segs) * w.radial * 6); });
    } else w.mesh.geometry.setDrawRange(0, Math.floor(k * w.segs) * w.radial * 6);
  };
  tree.tipWorld = (W, k, out = new THREE.Vector3()) => tipTree(W, k, out).applyMatrix4(root.matrixWorld);
  tree.hookWorld = (W, out = new THREE.Vector3()) => out.copy(W.guy.pos).applyMatrix4(root.matrixWorld);
  tree.bendOf = (W) => (W.kind === 'trunk' ? W.T.bend : W.kind === 'branch' ? W.br.bend : 1);
  // the middle of a part (where to circle round it)
  tree.centerWorld = (W, out = new THREE.Vector3()) => {
    if (W.kind === 'tie') return out.set(0, spec.rock.y + 0.08, 0).applyMatrix4(root.matrixWorld);
    if (W.kind === 'trunk') return trunkPoint(trunks.indexOf(W.T), 0.42, out).applyMatrix4(root.matrixWorld);
    return out.copy(W.br.curve.getPointAt(0.5)).applyMatrix4(W.br.group.matrixWorld);
  };
  // the front of the next band still on the rock
  tree.tieWorld = (W, out = new THREE.Vector3()) => {
    const T = W.ties.find((t) => !t.cut);
    return T ? out.set(0, T.y, T.rx * 0.92).applyMatrix4(root.matrixWorld) : null;
  };
  tree.cutTie = (W) => {
    const T = W.ties.find((t) => !t.cut);
    if (!T) return true;
    T.cut = true; T.fall = { t: 0 };
    return W.ties.every((t) => t.cut);
  };
  tree.showGuy = (W, on) => { W.guy.on = on; W.guy.hook.visible = on || W.guy.hook.visible; tree.dirty = true; };
  tree.releaseGuy = (W) => { W.guy.falling = true; W.guy.fall = 0.001; W.guy.hook.visible = false; tree.dirty = true; };
  // the wire cutters take a third of the coil off, from the tip down; returns where the piece was
  tree.snip = (W) => {
    const w = W.wire, from = w.progress, to = Math.max(0, Math.round((from - 1 / 3) * 3) / 3);
    const path = tree.targetPath(W, 12);
    const at = path[Math.round(((from + to) / 2) * 12)];
    tree.setWire(W, to < 0.02 ? 0 : to);
    return { at, done: to < 0.02 };
  };
  tree.snipPoint = (W, out = new THREE.Vector3()) => {
    const path = tree.targetPath(W, 12);
    return out.copy(path[Math.round(Math.max(0, W.wire.progress - 1 / 6) * 12)]);
  };
  tree.freeKeepers = freeKeepers;
  tree.setWet = (k) => { mats.soil.color.setRGB(1 - 0.42 * k, 1 - 0.46 * k, 1 - 0.5 * k); };

  // the finished bonsai, straight away (for the cards on the choosing screen)
  tree.finish = () => {
    for (const b of branches){ if (!b.keep){ b.cut = true; b.done = true; b.group.visible = false; b.pads.forEach((p) => { p.gone = true; }); } else b.bend = 1; }
    for (const T of trunks) T.bend = 1;
    for (const W of wireTargets){ tree.setWire(W, 0); if (W.guy){ W.guy.on = false; W.guy.hook.visible = false; } }
    Object.assign(tree.state, { vis: 1, padScale: 1, pruned: true });
    moss.visible = true;
    tree.dirty = true;
    tree.update(0);
  };

  // bounds covering both the raw plant and the bonsai, so the camera never has to move
  tree.bounds = () => {
    const box = new THREE.Box3();
    box.expandByPoint(V(-L.pot.w / 2, -L.pot.h - 0.05, -L.pot.d / 2)).expandByPoint(V(L.pot.w / 2, 0.05, L.pot.d / 2));
    const save = branches.map((b) => b.bend), saveT = trunks.map((T) => T.bend);
    for (const k of [0, 1]){
      branches.forEach((b) => { b.bend = k; });
      trunks.forEach((T) => { T.bend = T.def.raw ? k : 1; });
      place();
      root.updateMatrixWorld(true);
      rootInv.copy(root.matrixWorld).invert();
      for (const T of trunks) for (let i = 0; i <= 10; i++) box.expandByPoint(trunkPoint(trunks.indexOf(T), i / 10, tmp));
      for (const p of pads){
        if (p.host.trunk !== undefined) trunkPoint(p.host.trunk, p.host.u, tmp).add(p.local);
        else tmp.copy(p.local).applyMatrix4(p.host.matrixWorld).applyMatrix4(rootInv);
        box.expandByPoint(tmp.clone().addScalar(p.R)).expandByPoint(tmp.clone().addScalar(-p.R));
      }
    }
    branches.forEach((b, i) => { b.bend = save[i]; });
    trunks.forEach((T, i) => { T.bend = saveT[i]; });
    tree.dirty = true;
    return box;
  };

  tree.dispose = () => {
    root.traverse((o) => { if (o.geometry && o.geometry !== mossGeo) o.geometry.dispose(); });
    mossGeo.dispose(); cardGeo.dispose();
    Object.values(mats).forEach((m) => m.dispose());
    leafMat.dispose(); mossMat.dispose(); needleMat?.dispose();
    rockMesh?.material.dispose();
    leafDepth.dispose();
    if (cores){ cores.geometry.dispose(); cores.material.dispose(); }
  };

  // everything casts and catches soft shadows (the stage turns the shadow map on)
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    o.receiveShadow = true;
    o.castShadow = !moss.children.includes(o) && o !== soil;
  });

  tree.update(0);
  return tree;
}
