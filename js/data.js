// The eight trees. Each one is a real species grown as bonsai, paired with a
// classic bonsai style. Words are written for readers aged 8–14: one line about
// the tree, one line about the style and one true fact. Every claim is sourced in
// SOURCES.md. English names only (no Japanese script or style words).
//
// `look` drives the 3D build in js/tree.js: the style generator, foliage kind,
// colours and pot. Wire is copper on the conifers and aluminium on the
// broadleaf trees, as bonsai growers do.

export const TREES = [
  {
    id: 'black-pine', name: 'Japanese Black Pine', latin: 'Pinus thunbergii', style: 'Informal Upright',
    blurb: 'A tough pine that grows wild on Japan’s rocky coasts, standing up to salty sea wind.',
    styleLine: 'Informal upright: the trunk curves from side to side, but its top sits above the roots.',
    fact: 'Its long, stiff needles grow in pairs, and as the tree gets old its dark bark becomes rough and deeply cracked.',
    look: { style: 'informal', foliage: 'pine', leaf: '#3f5a2c', leaf2: '#7f9a4e', bark: '#6b5444', bark2: '#3d2e24', barkKind: 'plates',
      pot: { shape: 'rect', w: 1.55, d: 0.98, h: 0.27, color: '#7a6a5d', glaze: false }, wire: 'copper', seed: 11 },
  },
  {
    id: 'juniper', name: 'Chinese Juniper', latin: 'Juniperus chinensis', style: 'Cascade',
    blurb: 'An evergreen with tiny scale-like leaves that clings to cliffs and steep mountain slopes.',
    styleLine: 'Cascade: the trunk tumbles over the edge and its tip hangs below the bottom of the pot, like a tree on a cliff.',
    fact: 'A cascade tree needs a tall pot, so its long hanging trunk does not touch the table.',
    look: { style: 'cascade', foliage: 'juniper', leaf: '#3e6640', leaf2: '#86a85e', bark: '#8a5a3c', bark2: '#4a2e1e', barkKind: 'strings',
      pot: { shape: 'tall', w: 0.62, d: 0.62, h: 0.9, color: '#5e4a3c', glaze: false }, wire: 'copper', seed: 23 },
  },
  {
    id: 'cedar', name: 'Japanese Cedar', latin: 'Cryptomeria japonica', style: 'Formal Upright',
    blurb: 'A tall, straight evergreen. Despite its name it is not a true cedar: it belongs to the cypress family.',
    styleLine: 'Formal upright: a dead-straight trunk and a neat triangle of branches, getting shorter toward the top.',
    fact: 'A wild Japanese cedar on Yakushima island is thought to be more than 2,000 years old.',
    look: { style: 'formal', foliage: 'cedar', leaf: '#3b5e35', leaf2: '#7c9a52', bark: '#8b5e44', bark2: '#4e3326', barkKind: 'strings',
      pot: { shape: 'oval', w: 1.5, d: 0.92, h: 0.22, color: '#7d6555', glaze: false }, wire: 'copper', seed: 37 },
  },
  {
    id: 'maple', name: 'Japanese Maple', latin: 'Acer palmatum', style: 'Slanting',
    blurb: 'Famous for leaves shaped like a little hand, which turn fiery red and orange in autumn.',
    styleLine: 'Slanting: the whole trunk leans to one side, as if the tree grew toward the light.',
    fact: 'Its Latin name “palmatum” means “shaped like the palm of a hand”.',
    look: { style: 'slanting', foliage: 'palmate', leaf: '#b8402a', leaf2: '#e58a3a', bark: '#7c7462', bark2: '#4a4438', barkKind: 'smooth',
      pot: { shape: 'oval', w: 1.35, d: 0.86, h: 0.22, color: '#3f5f7a', glaze: true }, wire: 'aluminium', seed: 41 },
  },
  {
    id: 'zelkova', name: 'Japanese Zelkova', latin: 'Zelkova serrata', style: 'Broom',
    blurb: 'A cousin of the elm, with a straight trunk and lots of very fine twigs.',
    styleLine: 'Broom: the branches fan out from one point into a round crown, like an upside-down broom.',
    fact: 'Its Latin name “serrata” means “saw-toothed”, after the jagged edges of its leaves.',
    look: { style: 'broom', foliage: 'zelkova', leaf: '#4f7a34', leaf2: '#9cbf5a', bark: '#8a8476', bark2: '#59544a', barkKind: 'smooth',
      pot: { shape: 'oval', w: 1.6, d: 1.0, h: 0.16, color: '#d9ccb2', glaze: true }, wire: 'aluminium', seed: 53 },
  },
  {
    id: 'trident', name: 'Trident Maple', latin: 'Acer buergerianum', style: 'Root over Rock',
    blurb: 'A maple from China and Japan. Each leaf has three points, which is how it got its name.',
    styleLine: 'Root over rock: the roots grip a stone and climb down over it into the soil.',
    fact: 'Trident maple roots are strong and thicken fast, which makes it a favourite tree for root over rock.',
    look: { style: 'rock', foliage: 'trident', leaf: '#5b8436', leaf2: '#b5c763', bark: '#9a7f66', bark2: '#5e4a3a', barkKind: 'flakes',
      pot: { shape: 'rect', w: 1.42, d: 0.96, h: 0.2, color: '#5f8a7c', glaze: true }, wire: 'aluminium', seed: 67 },
  },
  {
    id: 'scots-pine', name: 'Scots Pine', latin: 'Pinus sylvestris', style: 'Literati',
    blurb: 'A pine from Europe and Asia. High up its trunk the bark turns a warm orange.',
    styleLine: 'Literati: a tall, thin, twisting trunk with only a few branches near the top.',
    fact: 'The literati style is named after Chinese scholars who painted and wrote poems about lonely, windswept trees.',
    look: { style: 'literati', foliage: 'scots', leaf: '#4c6b4a', leaf2: '#93ad7c', bark: '#b06a3e', bark2: '#5e3a26', barkKind: 'plates',
      pot: { shape: 'round', w: 0.62, d: 0.62, h: 0.2, color: '#8a6c55', glaze: false }, wire: 'copper', seed: 79 },
  },
  {
    id: 'apricot', name: 'Japanese Apricot', latin: 'Prunus mume', style: 'Twin Trunk',
    blurb: 'Its sweet-smelling blossoms, white, pink or red, open in the middle of winter, before any leaves appear.',
    styleLine: 'Twin trunk: two trunks, one big and one smaller, grow from the same roots.',
    fact: 'In English it is also called the Chinese plum, but it is really a close cousin of the apricot.',
    look: { style: 'twin', foliage: 'blossom', leaf: '#e58fa6', leaf2: '#fbd6df', bark: '#5d4a40', bark2: '#2f2520', barkKind: 'plates',
      pot: { shape: 'round', w: 1.05, d: 1.05, h: 0.3, color: '#33475c', glaze: true }, wire: 'aluminium', seed: 97 },
  },
];

export const BY_ID = Object.fromEntries(TREES.map((t, i) => [t.id, { ...t, n: i + 1 }]));

// The four steps, in order. Copy is short: it shows on a phone over the camera.
export const STEPS = [
  { id: 'prune', name: 'Prune', hint: 'Swipe your finger <b>down</b> across the <b>scissors</b> to cut the extra branches',
    done: 'Pruned! Only the best branches are left.',
    why: 'Pruning removes branches that grow too low, straight up, toward you, or at the same height as another.' },
  { id: 'wire', name: 'Wire', hint: 'Drag along the <b>dotted line</b> to coil wire around it. The branch will bend into shape',
    done: 'Wired! The branches are bent into place.',
    why: 'Wire holds a branch in its new shape while it grows. Growers use copper on pines and aluminium on maples.' },
  { id: 'water', name: 'Water', hint: 'Drag the <b>watering can</b> over the pot and hold it there to water',
    done: 'Watered! Look how the tree has grown.',
    why: 'Bonsai soil drains fast, so it is watered whenever the top starts to dry.' },
  { id: 'unwire', name: 'Unwire', hint: 'Tap each <b>wire</b> to unwind it before it cuts into the bark',
    done: 'All wires off! The branches keep their new shape.',
    why: 'Wire left on too long bites into the growing branch and leaves a scar.' },
];
