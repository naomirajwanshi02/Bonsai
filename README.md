# 🌳 Bonsai Garden: a scan-to-play WebAR bonsai game

Point your phone at the printed **Bonsai card**. When the card is recognised the bonsai
garden opens over your camera. Choose one of eight trees, get its young nursery plant,
and turn it into a bonsai in four jobs: **prune**, **wire**, **water** and **unwire**.
Made for ages 8–14.

**Play it live:** https://naomirajwanshi02.github.io/Bonsai/ (open it on your phone, then point it at the card)
**Play locally:** `http://localhost:8125/`
**Without the card:** `?demo=1` · **Without any camera:** `?preview=1` · **Straight to a tree:** `?preview=1&tree=juniper`
**The card to scan:** [`target.png`](target.png)

## How it plays

1. **Camera permission.** A plain first screen asks for the camera.
2. **Scan.** MindAR image tracking watches the back camera until it sees the card. Its
   tracking then stops, and the camera video stays on as the backdrop.
3. **Welcome.** What bonsai is, in two sentences.
4. **How to play.** The four jobs, with their icons.
5. **Choose a tree.** Eight cards, each showing the bonsai that tree becomes.
6. **The workbench.** The young plant pops up over the camera. The step bar at the bottom
   shows the four jobs:
   - **Prune.** Red scissors mark the branches a grower would remove. Tap them to cut.
     Each cut says why: too low on the trunk, at the same height as another branch,
     pointing straight at you, shooting straight up, or a tall shoot spoiling the top.
     Pruning also tidies the leggy growth into neat foliage pads.
   - **Wire.** Every tree is wired its own way (see the table below). Wire goes on at about
     45° like real bonsai wire: copper on the pines and juniper, aluminium on the broadleaf trees.
   - **Water.** Drag the copper watering can over the pot and hold it there. A gentle shower
     falls, the soil darkens and the tree fills out.
   - **Unwire.** Every wire still on the tree glows. Tap its red button (marked **Tap**) and
     that whole wire comes off: the button goes at once, then the wire unwinds, is snipped
     off piece by piece, is untied from its hook, or the bands round the rock are cut. The
     shape stays.
7. **Finished.** Moss grows on the soil, the tree turns slowly and a card shows a fact.
   **Take a photo** saves the camera picture with your bonsai and a caption.

The **×** at the top right asks before leaving: *Keep growing*, or *Exit to home* (back to
the welcome screen).

## How each tree is wired and unwired

| Tree | Wiring | Taking it off |
|---|---|---|
| Japanese Black Pine | Drag along the dotted line on each branch; the coil follows your finger and the branch bends down | Tap each coil and it spins off |
| Chinese Juniper | Circle your finger round the trunk to wind the wire on, then pull its tip down over the edge of the tall pot | Snip with the cutters, a piece at a time |
| Japanese Cedar | Tap a branch to coil the wire on, then pull its tip down to level | Tap each coil and it spins off |
| Japanese Maple | A guy wire from the trunk to a hook on the pot pulls the trunk into its slant; branches are traced | Untie the hook, then snip the branch wire |
| Japanese Zelkova | Guy wires from three branches to hooks on the pot spread the broom | Untie each hook |
| Trident Maple | Circle the rock to tie the roots down with three bands, then tap and pull the branches | Cut each band, then unwind the branches |
| Scots Pine | Circle the trunk to wind the wire on and it twists into its literati curve; tap and pull the top branches | Snip with the cutters |
| Japanese Apricot | A guy wire pulls the small trunk away from the big one; branches are traced | Untie the hook, then unwind the branches |

## The eight trees

| # | Tree | Latin name | Style |
|---|---|---|---|
| 01 | Japanese Black Pine | *Pinus thunbergii* | Informal Upright |
| 02 | Chinese Juniper | *Juniperus chinensis* | Cascade |
| 03 | Japanese Cedar | *Cryptomeria japonica* | Formal Upright |
| 04 | Japanese Maple | *Acer palmatum* | Slanting |
| 05 | Japanese Zelkova | *Zelkova serrata* | Broom |
| 06 | Trident Maple | *Acer buergerianum* | Root over Rock |
| 07 | Scots Pine | *Pinus sylvestris* | Literati |
| 08 | Japanese Apricot | *Prunus mume* | Twin Trunk |

All names are in English; the app has no Japanese script. Every fact is sourced in
[SOURCES.md](SOURCES.md). The design rules the trees follow are summarised in
[RESEARCH.md](RESEARCH.md).

## How the trees are made

No 3D model files are downloaded: every tree is built in the browser (`js/tree.js`).

- **Trunk:** a tapered tube along a curve, flaring into surface roots at the base, with
  lumpy bark painted on a canvas (plates for pines, strings for juniper and cedar, smooth
  for maples and zelkova, flakes for trident maple).
- **Raw and styled shapes:** each tree is built as both a young plant and a finished
  bonsai with the same mesh. The trunk morphs between them; branches rotate from pointing
  up to their styled angle.
- **Foliage pads:** domed clouds of painted sprays (needle tufts, scale-leaf fronds, maple
  and zelkova leaves, apricot blossom) around a dense darker core. Every spray takes the
  normal of the dome where it sits, so each pad shades like a rounded mass, with smooth
  anti-aliased edges.
- **Pine needles:** the two pines grow real 3D needle tufts, brushes of single needles
  fanning out from each shoot, instead of flat pictures. The other trees use sprays built
  from three crossed layers, so they have volume from any side.
- **Deadwood:** the juniper and Scots pine have shari (a bleached strip of bare wood
  twisting up the trunk) and all three conifers carry jin (bare silver dead branches), as
  growers create on old conifers. Broadleaf trees have none: on them it looks false.
- **Moss and roots:** the soil is heaped into a mound that turns to moss when the tree is
  finished, with nine surface roots spreading into it.
- **Shadows:** the key light casts soft shadows. Branches shade the trunk, pads shade
  each other and the soil, and an invisible floor catches the tree’s shadow under the pot,
  so in AR it falls on your real table.
- **Pots:** rectangular, oval, round and a tall cascade pot, glazed or unglazed, with a
  rim, a band and feet, and akadama-style soil.
- **Light:** filmic tone mapping and a soft studio environment; in AR the exposure and
  tint follow the room seen by the camera.

## The card

The card is the painted Japanese black pine (`assets/illustration.png`) on a sepia plate
with rulers and a seal. It is only the image the tracker looks for. The 3D trees follow the
research, not the painting. To rebuild it, run the server and open
`tools/make-target.html?build=1` (it saves `target.png` and `targets.mind`).

## Files

| File | What it does |
|---|---|
| `index.html` | All screens and the HUD |
| `css/app.css`, `css/anatomy-sepia.css` | The Noh Masks design system on the Anatomy sepia tokens |
| `js/app.js` | Screen flow and the four steps |
| `js/stage.js` | Camera backdrop, card scan, 3D stage, gestures, watering can, photo, card thumbnails |
| `js/tree.js` | The procedural bonsai (raw plant → bonsai) |
| `js/textures.js` | Canvas-painted bark, foliage, soil, rock and moss |
| `js/data.js` | The eight trees and the step texts |
| `js/look.js` | Lighting and room light |
| `tools/serve.ps1` | Tiny local server (no Node or Python needed) |
| `tools/make-target.html` | Builds and compiles the card |
| `tools/autoplay.js` | Test aid: plays a tree through every step with simulated taps and drags |

## Run it

```
powershell -ExecutionPolicy Bypass -File tools/serve.ps1
```

Then open `http://localhost:8125/?preview=1`. The camera needs https on a phone
(GitHub Pages provides it).

## The Anatomy look

The interface uses the [Anatomy](https://github.com/wheresryan22/anatomy) skill (MIT) in
the sepia theme shared by Ramen_Builder, Noh_Masks and Pagoda: paper plates, Zen Maru Gothic
and vermilion accents (without the small corner captions, to keep the screen clear).

Built with [MindAR](https://github.com/hiukim/mind-ar-js) 1.2.5 and
[three.js](https://threejs.org) 0.160.0.
