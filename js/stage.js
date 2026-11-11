// The bonsai stage. MindAR (mind-ar 1.2.5 + three 0.160.0, the same pins as the
// other NomAR apps) recognises the card once; its camera video then keeps running
// as the backdrop and the tree stands over it, like Ramen_Builder. Without a card
// (?demo=1) the camera is opened directly; without any camera (?preview=1) the
// tree stands in a warm studio backdrop.
//
// The four jobs are played here, on the tree itself:
//   prune  — swipe across the scissors to cut the extra branches,
//   wire   — trace the dotted line to coil wire on, then the part bends into shape,
//   water  — hold the watering can over the pot; the tree fills out,
//   unwire — tap each wire to unwind it.

import * as THREE from 'three';
import { buildTree } from './tree.js';
import { setupLook, roomLight } from './look.js';

const params = new URLSearchParams(location.search);
export const TARGET_SRC = params.get('target') || './targets.mind';
const D = Math.PI / 180;

// ------------------------------------------------------------------ tweens
const tweens = [];
export const EASE = {
  out: (t) => 1 - (1 - t) ** 3,
  io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  back: (t) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2,
  lin: (t) => t,
};
function tw(dur, ease, step, done, delay = 0){ const T = { t: -delay, dur, ease, step, done }; tweens.push(T); return T; }
function updateTweens(dt){
  for (let i = tweens.length - 1; i >= 0; i--){
    const T = tweens[i];
    T.t += dt;
    if (T.t < 0) continue;
    const k = Math.min(T.t / T.dur, 1);
    T.step(T.ease(k), k);
    if (k >= 1){ tweens.splice(i, 1); T.done?.(); }
  }
}

const R = {
  container: null, renderer: null, scene: null, camera: null, look: null, light: null, video: null, mindar: null,
  table: null, tree: null, shadow: null, can: null, drops: null, running: false, lastT: 0,
  insets: { top: 120, bottom: 150 }, mode: 'idle', cb: {}, marks: null, fx: null, g: null,
  fit: { target: new THREE.Vector3(0, 0.6, 0), dist: 5 },
  prune: null, wire: null, water: null, unwire: null, trail: [], down: null, spin: 0, turnTo: 0,
};
const v3 = new THREE.Vector3(), v3b = new THREE.Vector3();

// ------------------------------------------------------------------ screen helpers
function toScreen(v){
  v3.copy(v).project(R.camera);
  return { x: (v3.x * 0.5 + 0.5) * innerWidth, y: (-v3.y * 0.5 + 0.5) * innerHeight, z: v3.z };
}
function segDist(p, a, b){
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  let t = l2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return { d: Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)), t };
}
// nearest place on a screen polyline: { d, s } with s in 0..1 along it
function onPolyline(p, pts){
  let best = { d: Infinity, s: 0 };
  const n = pts.length - 1;
  for (let i = 0; i < n; i++){
    const r = segDist(p, pts[i], pts[i + 1]);
    if (r.d < best.d) best = { d: r.d, s: (i + r.t) / n };
  }
  return best;
}
const buzz = (ms) => { try { if (navigator.userActivation?.hasBeenActive !== false) navigator.vibrate?.(ms); } catch { /* none */ } };

// ------------------------------------------------------------------ scene
function buildStatic(){
  R.scene = new THREE.Scene();
  R.camera = new THREE.PerspectiveCamera(36, 1, 0.05, 60);
  R.table = new THREE.Group();
  R.scene.add(R.table);
  // a soft contact shadow under the pot, so the tree sits on something
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 6, 64, 64, 62);
  grd.addColorStop(0, 'rgba(20,12,6,.55)'); grd.addColorStop(0.6, 'rgba(20,12,6,.22)'); grd.addColorStop(1, 'rgba(20,12,6,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  R.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  R.shadow.renderOrder = -2;
  R.table.add(R.shadow);
  buildCan();
  buildDrops();
}

// A long-spouted watering can of beaten copper, with a fine rose for a gentle shower.
function buildCan(){
  const metal = new THREE.MeshStandardMaterial({ color: '#b56d3f', metalness: 0.75, roughness: 0.32 });
  const dark = new THREE.MeshStandardMaterial({ color: '#7a4526', metalness: 0.7, roughness: 0.4 });
  const can = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.3, 32), metal);
  can.add(body);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.025, 32), dark);
  lid.position.y = 0.16; can.add(lid);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.008, 6, 40), dark);
  band.rotation.x = Math.PI / 2; band.position.y = -0.1; can.add(band);
  const spoutCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.16, -0.08, 0), new THREE.Vector3(-0.36, 0.0, 0), new THREE.Vector3(-0.6, 0.16, 0), new THREE.Vector3(-0.74, 0.25, 0)]);
  can.add(new THREE.Mesh(new THREE.TubeGeometry(spoutCurve, 24, 0.022, 10), metal));
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.025, 0.07, 20), dark);
  rose.position.set(-0.77, 0.27, 0); rose.rotation.z = Math.PI / 2 - 0.55; can.add(rose);
  const handleCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.08, 0.17, 0), new THREE.Vector3(0.05, 0.36, 0), new THREE.Vector3(0.25, 0.3, 0), new THREE.Vector3(0.22, 0.02, 0)]);
  can.add(new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 24, 0.018, 8), dark));
  can.userData.rose = new THREE.Vector3(-0.8, 0.29, 0);
  can.visible = false;
  can.scale.setScalar(0.85);
  R.scene.add(can);
  R.can = can;
}
function buildDrops(){
  const geo = new THREE.SphereGeometry(0.012, 6, 4).scale(1, 2.6, 1);
  const mat = new THREE.MeshStandardMaterial({ color: '#d7ecf6', roughness: 0.08, metalness: 0, transparent: true, opacity: 0.85 });
  const N = 220;
  R.drops = new THREE.InstancedMesh(geo, mat, N);
  R.drops.frustumCulled = false;
  R.drops.userData.p = Array.from({ length: N }, () => ({ alive: false, p: new THREE.Vector3(), v: new THREE.Vector3() }));
  const z = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < N; i++) R.drops.setMatrixAt(i, z);
  R.scene.add(R.drops);
}

// ------------------------------------------------------------------ tree
export function plant(def){
  if (R.tree){ R.table.remove(R.tree.root); R.tree.dispose(); }
  const tree = buildTree(def);
  R.tree = tree;
  R.table.add(tree.root);
  R.table.rotation.y = 0; R.turnTo = 0;
  const box = tree.bounds();
  R.box = box;
  const pot = def.look.pot;
  R.shadow.scale.set(pot.w * 1.5, 1, pot.d * 1.7);
  R.shadow.position.y = -pot.h - 0.046;
  fitCamera();
  // the plant pops up out of the card
  tree.root.scale.setScalar(0.001);
  tw(0.7, EASE.back, (k) => { tree.root.scale.setScalar(Math.max(0.001, k)); });
  setMode('idle');
  return tree;
}

function fitCamera(){
  if (!R.box) return;
  const W = innerWidth, H = innerHeight;
  const top = R.insets.top, bottom = R.insets.bottom, availH = Math.max(160, H - top - bottom);
  const box = R.box;
  let rxz = 0;
  // fit the front view (a turned tree may brush the screen edges, which is fine)
  rxz = Math.max(Math.abs(box.min.x), Math.abs(box.max.x), Math.abs(box.min.z) * 0.6, Math.abs(box.max.z) * 0.6);
  const hb = box.max.y - box.min.y, wb = rxz * 2;
  const tan = Math.tan(R.camera.fov * D / 2);
  const aspect = W / H;
  const dV = (hb * H) / (availH * 0.94 * 2 * tan);
  const dW = wb / (1.0 * 2 * tan * aspect);
  const d = Math.max(dV, dW) + rxz * 0.15;
  const Hvis = 2 * d * tan;
  const cy = 1 - (2 * (top + availH / 2)) / H; // centre of the free band, in NDC
  const center = (box.min.y + box.max.y) / 2;
  R.fit.dist = d;
  R.fit.target.set(0, center - (cy * Hvis) / 2, 0);
  aimCamera();
}
function aimCamera(){
  const el = 9 * D, d = R.fit.dist;
  R.camera.position.set(0, R.fit.target.y + Math.sin(el) * d, Math.cos(el) * d);
  R.camera.lookAt(R.fit.target);
}
export function setInsets(top, bottom){ R.insets = { top, bottom }; fitCamera(); }
export function turn(){ R.turnTo += Math.PI / 2; const from = R.table.rotation.y, to = R.turnTo; tw(0.8, EASE.io, (k) => { R.table.rotation.y = from + (to - from) * k; if (R.tree) R.tree.dirty = true; }); }

// ------------------------------------------------------------------ modes
export function on(cbs){ Object.assign(R.cb, cbs); }
function emit(name, ...a){ R.cb[name]?.(...a); }

export function setMode(mode){
  R.mode = mode;
  R.marks && (R.marks.innerHTML = '');
  R.trail = [];
  R.down = null;
  const T = R.tree;
  if (!T) return;
  if (mode === 'prune'){
    R.prune = { left: T.extras.filter((b) => !b.cut), total: T.extras.length, finished: false };
    for (const b of T.extras){
      const m = document.createElement('div');
      m.className = 'mark cut';
      m.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="6.5" cy="17.5" r="3" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="17.5" cy="17.5" r="3" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M8.6 15.4L18 4M15.4 15.4L6 4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
      R.marks.appendChild(m);
      b.markEl = m;
    }
    emit('progress', 0, R.prune.total);
  } else if (mode === 'wire'){
    R.wire = { i: 0, list: T.wireTargets, busy: false, path: [] };
    emit('progress', 0, T.wireTargets.length);
    emit('wireTarget', T.wireTargets[0]);
  } else if (mode === 'water'){
    R.water = { k: 0, pouring: false, grab: false, tilt: 0 };
    R.can.visible = true;
    placeCanHome(true);
    emit('progress', 0, 1);
  } else if (mode === 'unwire'){
    R.unwire = { left: T.wireTargets.filter((W) => !W.wire.removed) };
    for (const W of T.wireTargets){
      const m = document.createElement('div');
      m.className = 'mark unwire';
      m.innerHTML = '<span></span>';
      R.marks.appendChild(m);
      W.markEl = m;
    }
    emit('progress', 0, T.wireTargets.length);
  } else if (mode === 'done'){
    R.can.visible = false;
    T.moss.visible = true;
    T.moss.children.forEach((m, i) => { const s = m.scale.clone(); m.scale.setScalar(0.001); tw(0.6, EASE.back, (k) => m.scale.set(s.x * k, 1, s.z * k), null, i * 0.03); });
  }
}

// ------------------------------------------------------------------ prune
function pruneSwipe(a, b){
  const P = R.prune, T = R.tree;
  if (!P || P.finished) return;
  for (const br of P.left.slice()){
    const m = toScreen(T.markerWorld(br, v3b));
    if (segDist(m, a, b).d < 36){
      T.cut(br);
      br.markEl?.classList.add('gone');
      P.left.splice(P.left.indexOf(br), 1);
      buzz(25);
      emit('cut', br.why);
      emit('progress', P.total - P.left.length, P.total);
    }
  }
  // the swipe also tidies any untidy growth it passes through
  for (const p of T.trimPads()){
    const s = toScreen(T.padWorld(p, v3b));
    if (segDist(s, a, b).d < 30) T.trimPad(p);
  }
  if (!P.left.length){
    P.finished = true;
    for (const p of T.trimPads()) T.trimPad(p);
    // the remaining foliage is thinned and shaped into neat pads
    const S = T.state;
    tw(1.0, EASE.io, (k) => { S.vis = 1 - 0.45 * k; S.padScale = 1 - 0.3 * k; T.dirty = true; }, () => {
      S.pruned = true; T.dirty = true;
      emit('stepDone', 'prune');
    }, 0.6);
  }
}

// ------------------------------------------------------------------ wire
function wireDrag(p, start){
  const Wi = R.wire, T = R.tree;
  if (!Wi || Wi.busy) return;
  const W = Wi.list[Wi.i];
  if (!W) return;
  const pts = Wi.path;
  if (!pts.length) return;
  const hit = onPolyline(p, pts);
  const prog = W.wire.progress;
  if (start){
    // start at the glowing end, or carry on from where the coil stopped
    if (hit.d > 56 || hit.s > prog + 0.2){ R.down.ignore = true; return; }
  }
  if (R.down?.ignore) return;
  if (hit.d < 70 && hit.s > prog && hit.s - prog < 0.3){
    T.setWire(W, hit.s);
    if (Math.floor(hit.s * 12) !== Math.floor(prog * 12)) buzz(6);
  }
  if (W.wire.progress > 0.94) completeWire(W);
}
function completeWire(W){
  const Wi = R.wire, T = R.tree;
  Wi.busy = true;
  T.setWire(W, 1);
  buzz(30);
  emit('wired', W);
  // the wired part bends into its styled shape; unwired branches settle a little with it
  const free = T.freeKeepers, n = Wi.list.length;
  const f0 = free.map((b) => b.bend), f1 = (Wi.i + 1) / n;
  const b0 = W.kind === 'trunk' ? W.T.bend : W.br.bend;
  tw(1.15, EASE.io, (k) => {
    T.setBend(W, b0 + (1 - b0) * k);
    free.forEach((b, j) => { b.bend = f0[j] + (f1 - f0[j]) * k; });
    T.dirty = true;
  }, () => {
    Wi.i++;
    Wi.busy = false;
    emit('progress', Wi.i, n);
    if (Wi.i >= n) emit('stepDone', 'wire');
    else emit('wireTarget', Wi.list[Wi.i]);
  }, 0.15);
}

// ------------------------------------------------------------------ water
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.75);
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function screenToPlane(x, y, out){
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, R.camera);
  return ray.ray.intersectPlane(plane, out);
}
function placeCanHome(jump){
  const pot = R.tree.def.look.pot;
  const home = new THREE.Vector3(Math.max(pot.w * 0.42, pot.w / 2 + 0.32), -Math.min(pot.h, 0.4) * 0.5, 0.95);
  if (jump){ R.can.position.copy(home).add(new THREE.Vector3(0.6, 0, 0)); }
  R.can.userData.home = home;
  const from = R.can.position.clone();
  tw(0.6, EASE.out, (k) => { R.can.position.lerpVectors(from, home, k); });
}
function canNear(p){
  const s = toScreen(R.can.position);
  return Math.hypot(p.x - s.x, p.y - s.y) < 110;
}
function updateWater(dt){
  const Wt = R.water, T = R.tree, can = R.can;
  if (!Wt || R.mode !== 'water') return;
  const pot = T.def.look.pot;
  const rose = can.userData.rose.clone().applyMatrix4(can.matrixWorld);
  const half = Math.max(pot.w, pot.d) / 2;
  const over = Wt.grab && Math.abs(rose.x) < half * 0.95 && rose.y > 0.05 && rose.y < 2.6;
  Wt.tilt += ((over ? 0.62 : 0) - Wt.tilt) * Math.min(1, dt * 7);
  can.rotation.z = Wt.tilt;
  Wt.pouring = over && Wt.tilt > 0.4;
  if (Wt.pouring && Wt.k < 1){
    // a gentle shower from the rose
    const P = R.drops.userData.p;
    let spawn = 5;
    const dir = new THREE.Vector3(-1, 0.4, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), can.rotation.z).normalize();
    for (const d of P){
      if (!spawn) break;
      if (d.alive) continue;
      d.alive = true; spawn--;
      d.p.copy(rose).add(new THREE.Vector3((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.08));
      d.v.copy(dir).multiplyScalar(0.7 + Math.random() * 0.4).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3 - 0.35));
    }
    Wt.k = Math.min(1, Wt.k + dt * 0.24);
    const g = Wt.k;
    const S = T.state;
    S.padScale = 0.7 + 0.32 * g;
    S.vis = 0.55 + 0.45 * g;
    T.setWet(Math.min(1, g * 1.6));
    T.dirty = true;
    emit('progress', g, 1);
    if (Wt.k >= 1){
      Wt.grab = false;
      emit('stepDone', 'water');
      after(0.5, () => { if (R.mode === 'water'){ placeCanHome(false); tw(0.4, EASE.lin, () => {}, () => { can.visible = false; }, 0.6); } });
    }
  }
}
function updateDrops(dt){
  const N = R.drops.count, P = R.drops.userData.p, m = new THREE.Matrix4(), z = new THREE.Matrix4().makeScale(0, 0, 0);
  const pot = R.tree?.def.look.pot;
  let any = false;
  for (let i = 0; i < N; i++){
    const d = P[i];
    if (!d.alive){ R.drops.setMatrixAt(i, z); continue; }
    any = true;
    d.v.y -= 6 * dt;
    d.p.addScaledVector(d.v, dt);
    const inPot = pot && Math.abs(d.p.x) < pot.w / 2 && Math.abs(d.p.z) < pot.d / 2;
    if ((inPot && d.p.y < 0.02) || d.p.y < -2.5) d.alive = false;
    m.makeTranslation(d.p.x, d.p.y, d.p.z);
    R.drops.setMatrixAt(i, d.alive ? m : z);
  }
  if (any || R.drops.userData.any) R.drops.instanceMatrix.needsUpdate = true;
  R.drops.userData.any = any;
}

// ------------------------------------------------------------------ unwire
function unwireTap(p){
  const U = R.unwire, T = R.tree;
  if (!U) return;
  let best = null, bd = 48;
  for (const W of U.left){
    const pts = T.targetPath(W, 12).map(toScreen);
    const h = onPolyline(p, pts);
    if (h.d < bd){ bd = h.d; best = W; }
  }
  if (!best) return;
  U.left.splice(U.left.indexOf(best), 1);
  best.wire.removed = true;
  best.markEl?.classList.add('gone');
  buzz(20);
  tw(0.75, EASE.io, (k) => T.setWire(best, 1 - k), () => {
    const n = T.wireTargets.length;
    emit('progress', n - U.left.length, n);
    if (!U.left.length) emit('stepDone', 'unwire');
  });
}

// ------------------------------------------------------------------ pointer
function local(ev){ return { x: ev.clientX, y: ev.clientY }; }
function onDown(ev){
  if (!R.running || !R.tree) return;
  const p = local(ev);
  R.down = { p, last: p, moved: false, ignore: false };
  if (R.mode === 'prune') R.trail = [{ ...p, t: performance.now() }];
  else if (R.mode === 'wire') wireDrag(p, true);
  else if (R.mode === 'water' && R.water && canNear(p)) { R.water.grab = true; R.water.off = null; }
  ev.target.setPointerCapture?.(ev.pointerId);
}
function onMove(ev){
  if (!R.down) return;
  const p = local(ev), a = R.down.last;
  if (Math.hypot(p.x - R.down.p.x, p.y - R.down.p.y) > 6) R.down.moved = true;
  if (R.mode === 'prune'){ R.trail.push({ ...p, t: performance.now() }); pruneSwipe(a, p); }
  else if (R.mode === 'wire') wireDrag(p, false);
  else if (R.mode === 'water' && R.water?.grab){
    const hit = screenToPlane(p.x, p.y - 40, v3b);
    if (hit){
      const pot = R.tree.def.look.pot;
      hit.x = Math.max(-pot.w * 0.4, Math.min(pot.w / 2 + 1.2, hit.x + 0.45));
      hit.y = Math.max(0.15, Math.min(R.box.max.y + 0.3, hit.y));
      R.can.position.copy(hit);
    }
  }
  R.down.last = p;
}
function onUp(ev){
  if (!R.down) return;
  const tap = !R.down.moved, p = local(ev);
  if (R.mode === 'unwire' && tap) unwireTap(p);
  if (R.mode === 'prune' && tap) pruneSwipe({ x: p.x, y: p.y - 30 }, { x: p.x, y: p.y + 30 });
  if (R.mode === 'water' && R.water){ R.water.grab = false; if (R.water.k < 1) placeCanHome(false); }
  R.down = null;
}

// ------------------------------------------------------------------ overlay drawing
function drawFx(now){
  const g = R.g, c = R.fx;
  if (!g) return;
  const dpr = Math.min(devicePixelRatio, 2);
  if (c.width !== Math.round(innerWidth * dpr) || c.height !== Math.round(innerHeight * dpr)){
    c.width = Math.round(innerWidth * dpr); c.height = Math.round(innerHeight * dpr);
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, innerWidth, innerHeight);
  g.lineCap = 'round'; g.lineJoin = 'round';
  // the swipe trail: a fading vermilion stroke
  if (R.mode === 'prune' && R.trail.length > 1){
    R.trail = R.trail.filter((q) => now - q.t < 260);
    for (let i = 1; i < R.trail.length; i++){
      const a = R.trail[i - 1], b = R.trail[i], age = (now - b.t) / 260;
      g.strokeStyle = `rgba(181,69,47,${0.85 * (1 - age)})`;
      g.lineWidth = 7 * (1 - age) + 1;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    }
  }
  // the wire guide: a dotted line from base to tip, a glowing start dot, the coil so far
  if (R.mode === 'wire' && R.wire && !R.wire.busy){
    const W = R.wire.list[R.wire.i];
    if (W){
      const pts = R.tree.targetPath(W, 24).map(toScreen);
      R.wire.path = pts;
      const prog = W.wire.progress;
      g.setLineDash([2, 11]);
      g.strokeStyle = 'rgba(28,18,10,.55)'; g.lineWidth = 9;
      g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.stroke();
      g.strokeStyle = '#fff8ec'; g.lineWidth = 5.5;
      g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.stroke();
      g.setLineDash([]);
      // finger target: where to drag next
      const at = Math.min(pts.length - 1, Math.round(prog * (pts.length - 1)));
      const q = pts[at], pulse = 0.5 + 0.5 * Math.sin(now / 220);
      g.fillStyle = `rgba(181,69,47,${0.25 + 0.2 * pulse})`;
      g.beginPath(); g.arc(q.x, q.y, 20 + pulse * 7, 0, 6.283); g.fill();
      g.fillStyle = '#b5452f'; g.strokeStyle = '#fff8ec'; g.lineWidth = 3;
      g.beginPath(); g.arc(q.x, q.y, 10, 0, 6.283); g.fill(); g.stroke();
      // arrow at the tip
      const e = pts[pts.length - 1], e0 = pts[pts.length - 3];
      const ang = Math.atan2(e.y - e0.y, e.x - e0.x);
      g.fillStyle = '#fff8ec'; g.strokeStyle = 'rgba(28,18,10,.55)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(e.x + Math.cos(ang) * 12, e.y + Math.sin(ang) * 12);
      g.lineTo(e.x + Math.cos(ang + 2.5) * 11, e.y + Math.sin(ang + 2.5) * 11);
      g.lineTo(e.x + Math.cos(ang - 2.5) * 11, e.y + Math.sin(ang - 2.5) * 11); g.closePath(); g.fill(); g.stroke();
    }
  }
  // watering: a ring around the can while it is waiting to be picked up
  if (R.mode === 'water' && R.water && !R.water.grab && R.water.k < 1 && R.can.visible){
    const s = toScreen(R.can.position), pulse = 0.5 + 0.5 * Math.sin(now / 240);
    g.strokeStyle = `rgba(255,248,236,${0.5 + 0.4 * pulse})`; g.lineWidth = 3; g.setLineDash([6, 8]);
    g.beginPath(); g.arc(s.x, s.y, 58 + pulse * 6, 0, 6.283); g.stroke(); g.setLineDash([]);
  }
}
function placeMarks(){
  const T = R.tree;
  if (!T) return;
  if (R.mode === 'prune'){
    for (const b of T.extras){
      if (!b.markEl || b.markEl.classList.contains('gone')) continue;
      const s = toScreen(T.markerWorld(b, v3b));
      b.markEl.style.transform = `translate(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px) translate(-50%,-50%)`;
    }
  } else if (R.mode === 'unwire'){
    for (const W of T.wireTargets){
      if (!W.markEl || W.markEl.classList.contains('gone')) continue;
      const pts = T.targetPath(W, 8);
      const s = toScreen(pts[4]);
      W.markEl.style.transform = `translate(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px) translate(-50%,-50%)`;
    }
  }
}

// ------------------------------------------------------------------ frame
function frame(){
  const now = performance.now();
  const dt = Math.min((now - R.lastT) / 1000, 0.25);
  R.lastT = now;
  updateTweens(dt);
  if (R.mode === 'done' || R.mode === 'idle'){
    R.table.rotation.y += dt * (R.mode === 'done' ? 0.25 : 0.0);
    if (R.mode === 'done' && R.tree) R.tree.dirty = true;
  }
  R.scene.updateMatrixWorld(true);
  if (R.tree){ R.tree.update(dt); }
  updateWater(dt);
  updateDrops(dt);
  R.light?.(R.video, now, dt);
  R.renderer.render(R.scene, R.camera);
  placeMarks();
  drawFx(now);
}

// ------------------------------------------------------------------ backends
function sizeRenderer(){
  R.renderer.setSize(innerWidth, innerHeight, false);
  R.camera.aspect = innerWidth / innerHeight;
  R.camera.updateProjectionMatrix();
  fitCamera();
}
function startStage(container, { marks, fx }){
  R.container = container;
  R.marks = marks; R.fx = fx; R.g = fx.getContext('2d');
  if (!R.renderer){
    R.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    R.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    R.look = setupLook(R.renderer, R.scene);
    R.light = roomLight(R.look, R.renderer);
    addEventListener('resize', () => { if (R.running) sizeRenderer(); });
  }
  const cv = R.renderer.domElement;
  cv.className = 'stage';
  container.appendChild(cv);
  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp);
  cv.addEventListener('pointercancel', onUp);
  R.running = true;
  sizeRenderer();
  R.lastT = performance.now();
  R.renderer.setAnimationLoop(frame);
}

async function cameraVideo(container){
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    const video = document.createElement('video');
    Object.assign(video, { srcObject: stream, playsInline: true, muted: true, autoplay: true });
    video.setAttribute('playsinline', '');
    video.className = 'feed';
    container.appendChild(video);
    await video.play();
    R.video = video;
  } catch { container.classList.add('preview'); }
}

// Recognition only: MindAR watches the camera until it sees the card, then its tracking stops.
// Its video keeps running as the AR backdrop, and the stage takes over.
export async function scan(container, { onStatus, onFound }){
  onStatus('Loading the card scanner…');
  const { MindARThree } = await import('mindar-image-three');
  const mindar = new MindARThree({
    container, imageTargetSrc: TARGET_SRC, uiScanning: 'no', uiLoading: 'no', uiError: 'no',
    filterMinCF: 0.001, filterBeta: 1000, warmupTolerance: 3, missTolerance: 10,
  });
  R.mindar = mindar;
  const anchor = mindar.addAnchor(0);
  let found = false;
  anchor.onTargetFound = () => {
    if (found) return;
    found = true;
    try { mindar.controller.stopProcessVideo(); } catch { /* fine */ }
    mindar.renderer.setAnimationLoop(null);
    mindar.renderer.domElement.style.display = 'none';
    R.video = mindar.video;
    R.video.classList.add('feed');
    onFound();
  };
  onStatus('Starting camera…');
  try { await mindar.start(); }
  catch (e){ try { mindar.stop(); } catch { /* never started */ } R.mindar = null; throw e || new Error('camera unavailable'); }
  mindar.renderer.setAnimationLoop(() => mindar.renderer.render(mindar.scene, mindar.camera));
  onStatus('Looking for the card…');
}
export function open(container, layers){ startStage(container, layers); }
export async function openDemo(container, layers){ await cameraVideo(container); startStage(container, layers); }
export function openPreview(container, layers){ container.classList.add('preview'); startStage(container, layers); }

export function stop(){
  R.running = false;
  try { R.renderer?.setAnimationLoop(null); } catch { /* gone */ }
  if (R.mindar){ try { R.mindar.stop(); } catch { /* already stopped */ } R.mindar = null; }
  R.container?.querySelectorAll('video').forEach((v) => v.srcObject?.getTracks?.().forEach((t) => t.stop()));
  if (R.container){ R.container.innerHTML = ''; R.container.classList.remove('preview'); }
  R.video = null;
}

// ------------------------------------------------------------------ photo
export async function snapshot(caption){
  const W = innerWidth, H = innerHeight, k = Math.min(2, devicePixelRatio);
  const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k);
  const g = c.getContext('2d');
  g.scale(k, k);
  if (R.video && R.video.videoWidth){
    const vw = R.video.videoWidth, vh = R.video.videoHeight, s = Math.max(W / vw, H / vh);
    g.drawImage(R.video, (W - vw * s) / 2, (H - vh * s) / 2, vw * s, vh * s);
  } else {
    const grd = g.createRadialGradient(W / 2, H * 0.38, 10, W / 2, H * 0.38, Math.max(W, H) * 0.8);
    grd.addColorStop(0, '#6b5238'); grd.addColorStop(0.7, '#2b1e13'); grd.addColorStop(1, '#1c120a');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
  }
  R.renderer.render(R.scene, R.camera);
  g.drawImage(R.renderer.domElement, 0, 0, W, H);
  if (caption){
    const pw = Math.min(W - 32, 360), ph = 64, x = (W - pw) / 2, y = H - ph - 24;
    g.fillStyle = 'rgba(246,237,219,.95)'; g.strokeStyle = '#8c7457'; g.lineWidth = 1;
    g.beginPath(); g.roundRect(x, y, pw, ph, 6); g.fill(); g.stroke();
    g.fillStyle = '#8f7a5e'; g.font = '10px ui-monospace,Consolas,monospace';
    g.fillText('MY BONSAI', x + 12, y + 18);
    g.fillStyle = '#2b1e13'; g.font = '900 20px "Zen Maru Gothic",sans-serif';
    g.fillText(caption.name, x + 12, y + 42);
    g.fillStyle = '#b5452f'; g.font = '700 13px "Zen Maru Gothic",sans-serif';
    g.fillText(caption.style, x + 12, y + 58);
  }
  return new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.9));
}

// ------------------------------------------------------------------ thumbnails
// Each card on the choosing screen shows its finished bonsai, rendered once here.
export async function thumbnails(defs, size = 300){
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
  const scene = new THREE.Scene();
  setupLook(renderer, scene);
  renderer.toneMappingExposure = 0.95;
  const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 60);
  const out = {};
  for (const def of defs){
    const tree = buildTree(def);
    tree.finish();
    const box = tree.bounds();
    tree.finish();
    scene.add(tree.root);
    tree.root.rotation.y = -0.25;
    const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
    const d = Math.max(sz.y, sz.x * 1.05) / (2 * Math.tan(15 * D)) * 1.04;
    cam.position.set(c.x, c.y + d * 0.16, d);
    cam.lookAt(c.x, c.y, 0);
    tree.root.updateMatrixWorld(true);
    tree.dirty = true; tree.update(0);
    renderer.render(scene, cam);
    out[def.id] = renderer.domElement.toDataURL('image/png');
    scene.remove(tree.root);
    tree.dispose();
    await new Promise((ok) => setTimeout(ok, 0));
  }
  renderer.dispose();
  renderer.forceContextLoss?.();
  return out;
}

buildStatic();
window.__stage = R;

// Delays that follow the animation clock (page timers can be throttled hard).
export function after(s, fn){ tw(s, EASE.lin, () => {}, fn); }
// Testing aid: advance the animation clock by `dt` seconds and draw one frame.
R.tick = (dt = 1 / 30) => { R.lastT -= dt * 1000; frame(); };
