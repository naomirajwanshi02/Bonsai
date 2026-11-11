// Test helper pasted into the page: plays a tree through every step using the same
// pointer events a finger makes. Returns a log of what happened.
window.AP = (() => {
  const S = () => window.__stage;
  const run = (s) => { for (let i = 0; i < s * 10; i++) S().tick(0.1); };
  const c = () => document.querySelector('canvas.stage');
  const ev = (t, q) => c().dispatchEvent(new PointerEvent(t, { clientX: q.x, clientY: q.y, pointerId: 1, bubbles: true }));
  const scr = (v) => { const p = v.clone().project(S().camera); return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight }; };
  const tap = (q) => { ev('pointerdown', q); ev('pointerup', q); };
  const drag = (pts) => { ev('pointerdown', pts[0]); pts.forEach((q) => { ev('pointermove', q); S().tick(0.02); }); ev('pointerup', pts[pts.length - 1]); };
  const log = [];
  function prune(){
    for (const b of S().prune.left.slice()) tap(scr(S().tree.markerWorld(b)));
    log.push('prune left ' + S().prune.left.length);
    run(4.5);
  }
  function wire(){
    let guard = 0;
    while (S().mode === 'wire' && S().wire.i < S().wire.list.length && guard++ < 40){
      const W = S().wire.list[S().wire.i], ph = S().wire.phase, T = S().tree;
      log.push(`${W.kind}/${W.method}:${ph}`);
      if (S().wire.busy){ run(0.5); continue; }
      if (ph === 'trace'){ S().tick(0.02); drag(T.targetPath(W, 24).map(scr)); }
      else if (ph === 'tap'){ tap(scr(T.targetPath(W, 16)[8])); run(1); }
      else if (ph === 'circle'){
        const ctr = scr(T.centerWorld(W)), pts = [];
        for (let i = 0; i <= 80; i++){ const a = (i / 80) * Math.PI * 2 * 3.3; pts.push({ x: ctr.x + Math.cos(a) * 60, y: ctr.y + Math.sin(a) * 60 }); }
        drag(pts);
      } else if (ph === 'hold'){
        const q = scr(T.centerWorld(W));
        ev('pointerdown', q); run(3.6); ev('pointerup', q);
      } else if (ph === 'pull'){
        const pts = [];
        for (let i = 0; i <= 20; i++){ const k = T.bendOf(W) + (1 - T.bendOf(W)) * (i / 20); pts.push(scr(T.tipWorld(W, k))); }
        drag(pts);
      }
      run(1.4);
    }
    run(3);
  }
  function water(){
    const s0 = scr(S().can.position);
    ev('pointerdown', s0);
    for (let i = 1; i <= 10; i++){ ev('pointermove', { x: s0.x + (innerWidth * 0.6 - s0.x) * i / 10, y: s0.y + (innerHeight * 0.42 - s0.y) * i / 10 }); S().tick(0.05); }
    run(5); ev('pointerup', { x: 10, y: 10 }); run(3.5);
  }
  const markAt = (W) => { const m = W.markEl; if (!m) return null; const r = m.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
  function unwire(){
    let guard = 0;
    while (S().mode === 'unwire' && S().unwire.left.length && guard++ < 30){
      S().tick(0.05);
      const W = S().unwire.left[0];
      const q = markAt(W);
      log.push(`off ${W.unwire}`);
      if (q) tap(q);
      run(1.2);
    }
    run(4);
  }
  return { run, prune, wire, water, unwire, log, all(){ run(2.5); prune(); wire(); water(); unwire(); return [S().mode, window.__bonsai.S.phase, log.join(' | ')]; } };
})();
'ready';
