// Bonsai Garden: scan the card → welcome → how to play → choose one of eight trees →
// prune, wire, water, unwire on the young plant → the finished bonsai.
//
// ?demo=1     skip the card
// ?preview=1  no camera at all: the tree stands in a lit studio
// ?tree=<id>  jump straight to that tree

import { TREES, BY_ID, STEPS } from './data.js';
import * as Stage from './stage.js';

const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);
const S = { phase: 'perm', tree: null, step: -1, thumbs: null };
const layers = () => ({ marks: $('marks'), fx: $('fx') });

const overlay = (id, on) => $(id).classList.toggle('on', on);
const show = (id) => document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id));
let toastT = 0;
function toast(html, ms = 3200){
  const t = $('toast'); t.innerHTML = html; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms);
}
const buzz = (ms) => { try { if (navigator.userActivation?.hasBeenActive !== false) navigator.vibrate?.(ms); } catch { /* none */ } };

// ------------------------------------------------------------ 0 · camera permission
async function cameraGranted(){
  try { return (await navigator.permissions?.query({ name: 'camera' }))?.state === 'granted'; } catch { return false; }
}
async function openPerm(){
  if (await cameraGranted()) return openScan();
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia){
    $('permStatus').textContent = 'This browser cannot use the camera here. Open the page over https in Safari or Chrome.';
    $('permBtn').disabled = true;
  }
  show('perm');
}
async function askCamera(){
  $('permBtn').disabled = true;
  $('permStatus').textContent = 'Waiting for you to tap “Allow”…';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    stream.getTracks().forEach((t) => t.stop());
    show(null); openScan();
  } catch (err) {
    $('permStatus').textContent = err?.name === 'NotAllowedError'
      ? 'The camera was blocked. Allow the camera for this site in your browser, then tap Allow camera again.'
      : 'The camera did not start. Close other apps that use the camera and try again.';
  } finally { $('permBtn').disabled = false; }
}

// ------------------------------------------------------------ 1 · card
async function openScan(){
  S.phase = 'scan';
  show(null); overlay('guide', true);
  $('scanRetry').hidden = true;
  try {
    await Stage.scan($('ar'), { onStatus: (t) => { $('scanStatus').textContent = t; }, onFound });
  } catch (err) {
    const msg = String(err?.message || err?.name || err || '');
    $('scanStatus').textContent = /mind|fetch|404/i.test(msg) ? `Could not load the card data (${msg}).`
      : 'Camera not available. Allow camera access for this site, then tap Try again.';
    $('scanRetry').hidden = false;
  }
}
function onFound(){
  if (S.phase !== 'scan') return;
  S.phase = 'intro';
  overlay('guide', false);
  buzz(40);
  Stage.open($('ar'), layers());
  overlay('found', true);
  setTimeout(() => { overlay('found', false); show('intro'); }, 1300);
}

// ------------------------------------------------------------ 2–4 · welcome, how to, choose
async function openPick(){
  show('pick');
  const box = $('cards');
  if (!box.children.length){
    TREES.forEach((t, i) => {
      const b = document.createElement('button');
      b.className = 'tcard'; b.setAttribute('role', 'option'); b.dataset.id = t.id;
      b.innerHTML = `<span class="num">${String(i + 1).padStart(2, '0')}</span><span class="thumb"><img alt=""><span class="spin"></span></span><b>${t.name}</b><small>${t.style}</small><i>${t.latin}</i>`;
      b.addEventListener('click', () => choose(t.id));
      box.appendChild(b);
    });
  }
  if (!S.thumbs){
    S.thumbs = await Stage.thumbnails(TREES);
    box.querySelectorAll('.tcard').forEach((b) => { const img = b.querySelector('img'); img.src = S.thumbs[b.dataset.id]; img.classList.add('ready'); });
  }
}

function choose(id){
  const t = BY_ID[id];
  S.tree = t;
  document.querySelectorAll('.tcard').forEach((c) => c.setAttribute('aria-selected', c.dataset.id === id));
  buzz(15);
  setTimeout(() => startWork(t), 220);
}

// ------------------------------------------------------------ 5 · the workbench
function buildPills(){
  const icons = [...document.querySelectorAll('#howto .steps .ico')].map((e) => e.innerHTML);
  $('pills').innerHTML = STEPS.map((s, i) => `<div class="pill" data-i="${i}"><span class="ico">${icons[i]}</span>${s.name}</div>`).join('');
}
function measure(){
  const top = $('hudTop').getBoundingClientRect().bottom + 8;
  const fin = document.body.classList.contains('finished');
  const bottomEl = fin ? $('finishCard') : $('hudBottom');
  const bottom = innerHeight - bottomEl.getBoundingClientRect().top + 8;
  Stage.setInsets(top, bottom);
}
function startWork(t){
  S.phase = 'work';
  S.tree = t;
  show(null);
  document.body.classList.remove('finished');
  overlay('finish', false);
  overlay('hud', true);
  $('ncFig').textContent = `Fig. ${String(t.n).padStart(2, '0')}`;
  $('ncStyle').textContent = t.style;
  $('ncName').textContent = t.name;
  $('ncLatin').textContent = t.latin;
  $('ncBlurb').textContent = t.blurb;
  buildPills();
  measure();
  Stage.plant(t);
  requestAnimationFrame(measure);
  $('hint').innerHTML = 'This young plant is <b>not a bonsai yet</b>. Let’s shape it!';
  S.step = -1;
  Stage.after(1.8, () => { if (S.phase === 'work' && S.tree === t) nextStep(); });
}
function nextStep(){
  S.step++;
  if (S.step >= STEPS.length) return finish();
  const s = STEPS[S.step];
  document.querySelectorAll('.pill').forEach((p, i) => { p.classList.toggle('on', i === S.step); p.classList.toggle('done', i < S.step); });
  $('sbFig').textContent = `Step ${S.step + 1} of ${STEPS.length} · ${s.name}`;
  $('meter').style.width = '0%';
  $('hint').innerHTML = s.hint;
  Stage.setMode(s.id);
}
Stage.on({
  progress(n, total){
    $('meter').style.width = `${Math.round((n / total) * 100)}%`;
    $('sbCount').textContent = total > 1 ? `${n} / ${total}` : `${Math.round(n * 100)}%`;
  },
  cut(why){ if (why) $('hint').innerHTML = `Snip! That branch was <b>${why}</b>.`; },
  wireTarget(W, phase){ if (S.step === 1) $('hint').innerHTML = wireHint(W, phase); },
  unwireTarget(W){ if (S.step === 3 && W) $('hint').innerHTML = UNWIRE_HINT[W.unwire]; },
  stepDone(id){
    const s = STEPS.find((x) => x.id === id);
    $('sdTitle').textContent = s.done.split('!')[0] + '!';
    $('sdText').textContent = s.why;
    $('stepdone').classList.remove('on'); void $('stepdone').offsetWidth; overlay('stepdone', true);
    buzz(40);
    Stage.after(2, () => { overlay('stepdone', false); if (S.phase === 'work') nextStep(); });
  },
});

// What to do for each wiring method, in a child's words. The metal is named, because
// growers choose it on purpose: copper for the conifers, aluminium for the broadleaf trees.
function wireHint(W, phase){
  const metal = S.tree?.look.wire === 'copper' ? 'copper' : 'aluminium';
  if (W.kind === 'tie') return 'Circle your finger round the <b>rock</b> to tie the roots down with wire';
  if (phase === 'trace') return `Drag along the <b>dotted line</b> to coil ${metal} wire round <b>${W.name}</b>`;
  if (phase === 'tap') return `Tap <b>${W.name}</b> to coil ${metal} wire round it`;
  if (phase === 'circle') return `Circle your finger round <b>${W.name}</b> to wind ${metal} wire on`;
  if (W.guy) return `Pull the <b>red dot</b> into the ring: a guy wire to the pot will hold ${W.name} there`;
  if (W.kind === 'trunk' && S.tree?.style === 'Cascade') return 'Now pull the <b>red dot</b> down into the ring to bend the trunk over the edge';
  return `Now pull the <b>red dot</b> into the ring to bend ${W.name} into shape`;
}
const UNWIRE_HINT = {
  unwind: 'Tap the <b>red button</b> on each wire and it spins off',
  snip: 'Tap the <b>cutters</b> to snip the wire off, a piece at a time',
  release: 'Tap the <b>hook</b> on the pot to untie each guy wire',
  cut: 'Tap the <b>scissors</b> to cut each band of wire round the rock',
};

// ------------------------------------------------------------ 6 · finished
function finish(){
  S.phase = 'done';
  const t = S.tree;
  document.querySelectorAll('.pill').forEach((p) => { p.classList.remove('on'); p.classList.add('done'); });
  Stage.setMode('done');
  $('hint').innerHTML = 'Moss is growing on the soil. Your bonsai is complete!';
  $('fnFig').textContent = `Fig. ${String(t.n).padStart(2, '0')}`;
  $('fnName').textContent = t.name;
  $('fnStyle').textContent = t.style;
  $('fnStyleLine').textContent = t.styleLine;
  $('fnFact').textContent = t.fact;
  document.body.classList.add('finished');
  overlay('finish', true);
  measure();
}
let photoUrl = null;
async function takePhoto(){
  const t = S.tree;
  $('flash').classList.remove('on'); void $('flash').offsetWidth; $('flash').classList.add('on');
  const blob = await Stage.snapshot({ name: t.name, style: t.style });
  if (!blob) return;
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = URL.createObjectURL(blob);
  $('photoImg').src = photoUrl;
  $('photoName').textContent = t.name;
  $('saveBtn').href = photoUrl;
  $('saveBtn').download = `bonsai-${t.id}.jpg`;
  const file = new File([blob], `bonsai-${t.id}.jpg`, { type: 'image/jpeg' });
  $('shareBtn').hidden = !navigator.canShare?.({ files: [file] });
  $('shareBtn').onclick = () => navigator.share({ files: [file], title: `My ${t.name} bonsai` }).catch(() => {});
  show('photo');
}
// Leave the workbench and go back to the welcome screen (the camera stays on)
function exitHome(){
  S.phase = 'intro';
  S.step = -1;
  overlay('hud', false); overlay('finish', false); overlay('stepdone', false);
  document.body.classList.remove('finished');
  Stage.setMode('idle');
  Stage.clear();
  show('intro');
}
function backToPick(){
  S.phase = 'pick';
  overlay('hud', false); overlay('finish', false);
  document.body.classList.remove('finished');
  Stage.setMode('idle');
  openPick();
}

// ------------------------------------------------------------ wiring
$('permBtn').addEventListener('click', askCamera);
$('scanRetry').addEventListener('click', openScan);
$('scanSkip').addEventListener('click', () => { Stage.stop(); overlay('guide', false); S.phase = 'intro'; Stage.openDemo($('ar'), layers()); show('intro'); });
$('toHowto').addEventListener('click', () => show('howto'));
$('toPick').addEventListener('click', openPick);
$('closeBtn').addEventListener('click', () => { $('exitName').textContent = S.tree ? S.tree.name : ''; show('exit'); });
$('keepBtn').addEventListener('click', () => show(null));
$('exitBtn').addEventListener('click', exitHome);
$('turnBtn').addEventListener('click', () => Stage.turn());
$('factBtn').addEventListener('click', () => { const t = S.tree; if (t) toast(`<span class="cap">Did you know?</span><br>${t.fact}`, 6000); });
$('photoBtn').addEventListener('click', takePhoto);
$('againBtn').addEventListener('click', backToPick);
$('photoBack').addEventListener('click', () => show(null));
$('errBtn').addEventListener('click', () => { $('err').hidden = true; location.reload(); });
addEventListener('resize', () => { if (S.phase === 'work' || S.phase === 'done') measure(); });

const fromTracker = (s) => /mind-?ar/i.test(String(s));
addEventListener('error', (e) => { const s = e.error?.stack || e.message; if (fromTracker(s + e.filename)) return; $('errText').textContent = String(s); $('err').hidden = false; });
addEventListener('unhandledrejection', (e) => { const s = e.reason?.stack || e.reason; if (fromTracker(s)) return; $('errText').textContent = String(s); $('err').hidden = false; });

window.__bonsai = { S, Stage, choose };

if (q.has('preview')){ Stage.openPreview($('ar'), layers()); if (BY_ID[q.get('tree')]) startWork(BY_ID[q.get('tree')]); else show('intro'); }
else if (q.has('demo')){ Stage.openDemo($('ar'), layers()).then(() => { if (BY_ID[q.get('tree')]) startWork(BY_ID[q.get('tree')]); }); if (!BY_ID[q.get('tree')]) show('intro'); }
else openPerm();
