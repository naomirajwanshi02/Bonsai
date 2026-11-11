// The six trees. Each one is a real species grown as bonsai, paired with a
// classic bonsai style. Three are modelled on the reference renders supplied for
// this project (the black pine, the deadwood juniper and the driftwood yew).
// Words are written for readers aged 8–14: one line about the tree, one about the
// style and one true fact, each sourced in SOURCES.md. English names only.
//
// `look` drives the 3D build in js/tree.js: the style generator, foliage kind,
// colours and pot. `wiring` is how this tree is shaped (every tree differently):
//   trace — drag up the trunk: the wire coils on and the trunk curves as it goes
//   guy   — drag the trunk's tip to a hook: a guy wire pulls it into its slant
//   lift  — tap a drooping branch to wire it, then drag it up into place
//   swing — drag a branch sideways: it swings out to open the crown
//   ties  — circle the rock: wire bands pull the roots tight against it
//   hold  — press and hold the small trunk: it twists away from the big one
// Copper wire goes on the conifers and aluminium on the broadleaf trees.

export const TREES = [
  {
    id: 'black-pine', name: 'Japanese Black Pine', latin: 'Pinus thunbergii', style: 'Informal Upright',
    blurb: 'A tough pine that grows wild on Japan’s rocky coasts, standing up to salty sea wind.',
    styleLine: 'Informal upright: the trunk curves from side to side, but its top sits above the roots.',
    fact: 'Its long, stiff needles grow in pairs, and as the tree gets old its dark bark becomes rough and deeply cracked.',
    look: { style: 'informal', foliage: 'pine', leaf: '#2f5a24', leaf2: '#6f9a44', bark: '#5e4a3c', bark2: '#3d2e24', barkKind: 'plates',
      pot: { shape: 'rect', w: 1.5, d: 0.95, h: 0.3, color: '#7e3f2a', glaze: false, lip: true }, wire: 'copper', seed: 11,
      wiring: { trunk: 'trace', coilOff: 'snip' } },
  },
  {
    id: 'juniper', name: 'Chinese Juniper', latin: 'Juniperus chinensis', style: 'Slanting',
    blurb: 'An evergreen with tiny needle-like and scale-like leaves that clings to cliffs and steep mountain slopes.',
    styleLine: 'Slanting: the trunk leaves the soil at an angle, and its top sits off to one side of the roots.',
    fact: 'Its bare white deadwood is painted with lime sulfur, which bleaches it and protects it from rot.',
    look: { style: 'slant', foliage: 'juniper', leaf: '#2c5a2a', leaf2: '#6a9a48', bark: '#7a3e26', bark2: '#4a2e1e', barkKind: 'strings',
      pot: { shape: 'bowl', w: 1.0, d: 1.0, h: 0.6, color: '#5b4433', glaze: false }, wire: 'copper', seed: 23,
      wiring: { trunk: 'guy' },
      deadwood: { shari: { from: 0.03, to: 0.85, width: 0.24, angle: 20, twist: 1.1 },
        jin: [{ u: 0.22, az: -10, el: -12, len: 0.6 }, { u: 0.36, az: 20, el: 4, len: 0.5 }, { u: 0.5, az: -30, el: 18, len: 0.32 }, { u: 0.08, az: 30, el: 30, len: 0.22 }] } },
  },
  {
    id: 'yew', name: 'Japanese Yew', latin: 'Taxus cuspidata', style: 'Driftwood',
    blurb: 'A slow-growing evergreen with soft, flat, dark green needles, from the cool forests of Japan, Korea and north-east China.',
    styleLine: 'Driftwood: most of the trunk is bare, bleached wood, and one living strip of bark winds up it to feed the tree.',
    fact: 'Every part of a yew is poisonous except the soft red cup around its seed, so look, but never nibble!',
    look: { style: 'driftwood', foliage: 'yew', leaf: '#2a4a26', leaf2: '#5f8a3c', bark: '#3e2f27', bark2: '#2f2520', barkKind: 'smooth',
      pot: { shape: 'slab', w: 1.7, d: 1.05, h: 0.09, color: '#48484c', glaze: false }, wire: 'copper', seed: 31,
      wiring: { branches: 'lift', coilOff: 'unwind' },
      deadwood: { shari: { from: 0.0, to: 0.88, width: 0.93, angle: 0, twist: 0.12 },
        jin: [{ u: 0.06, az: 10, el: 8, len: 0.55, thick: 2.2 }, { u: 0.5, az: 200, el: 25, len: 0.25 }] } },
  },
  {
    id: 'maple', name: 'Japanese Maple', latin: 'Acer palmatum', style: 'Broom',
    blurb: 'Famous for leaves shaped like a little hand, which turn fiery red and orange in autumn.',
    styleLine: 'Broom: the branches fan out from one point into a round crown, like an upside-down broom.',
    fact: 'Its Latin name “palmatum” means “shaped like the palm of a hand”.',
    look: { style: 'broom', foliage: 'palmate', leaf: '#b33a24', leaf2: '#e5863a', bark: '#7c7462', bark2: '#4a4438', barkKind: 'smooth',
      pot: { shape: 'oval', w: 1.55, d: 0.98, h: 0.17, color: '#d9ccb2', glaze: true }, wire: 'aluminium', seed: 41,
      wiring: { branches: 'swing', coilOff: 'snip' } },
  },
  {
    id: 'trident', name: 'Trident Maple', latin: 'Acer buergerianum', style: 'Root over Rock',
    blurb: 'A maple from China and Japan. Each leaf has three points, which is how it got its name.',
    styleLine: 'Root over rock: the roots grip a stone and climb down over it into the soil.',
    fact: 'Trident maple roots are strong and thicken fast, which makes it a favourite tree for root over rock.',
    look: { style: 'rock', foliage: 'trident', leaf: '#4f7c2e', leaf2: '#a9c25c', bark: '#9a7f66', bark2: '#5e4a3a', barkKind: 'flakes',
      pot: { shape: 'rect', w: 1.42, d: 0.96, h: 0.2, color: '#5f8a7c', glaze: true }, wire: 'aluminium', seed: 67,
      wiring: { ties: true } },
  },
  {
    id: 'apricot', name: 'Japanese Apricot', latin: 'Prunus mume', style: 'Twin Trunk',
    blurb: 'Its sweet-smelling blossoms, white, pink or red, open in the middle of winter, before any leaves appear.',
    styleLine: 'Twin trunk: two trunks, one big and one smaller, grow from the same roots.',
    fact: 'In English it is also called the Chinese plum, but it is really a close cousin of the apricot.',
    look: { style: 'twin', foliage: 'blossom', leaf: '#e58fa6', leaf2: '#fbd6df', bark: '#4d3c33', bark2: '#2f2520', barkKind: 'plates',
      pot: { shape: 'round', w: 1.05, d: 1.05, h: 0.3, color: '#33475c', glaze: true }, wire: 'aluminium', seed: 97,
      wiring: { trunk: 'hold', trunkIndex: 1, coilOff: 'unwind' },
      deadwood: {} },
  },
];

export const BY_ID = Object.fromEntries(TREES.map((t, i) => [t.id, { ...t, n: i + 1 }]));

// The four steps, in order. Copy is short: it shows on a phone over the camera.
export const STEPS = [
  { id: 'prune', name: 'Prune', hint: '<b>Tap</b> each pair of scissors to cut off the extra branches',
    done: 'Pruned! Only the best branches are left.',
    why: 'Pruning removes branches that grow too low, straight up, toward you, or at the same height as another.' },
  { id: 'wire', name: 'Wire', hint: 'Follow the guide on the tree to wire it into shape',
    done: 'Wired! The branches are bent into place.',
    why: 'Wire holds a branch in its new shape while it grows. Growers use copper on pines and aluminium on maples.' },
  { id: 'water', name: 'Water', hint: '<b>Drag</b> the watering can over the pot and <b>hold</b> it there to water',
    done: 'Watered! Look how the tree has grown.',
    why: 'Bonsai soil drains fast, so it is watered whenever the top starts to dry.' },
  { id: 'unwire', name: 'Unwire', hint: 'Tap the red markers to take the wire off before it cuts into the bark',
    done: 'All wires off! The branches keep their new shape.',
    why: 'Wire left on too long bites into the growing branch and leaves a scar.' },
];
