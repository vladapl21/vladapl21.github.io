# vladapl21.github.io

My personal site: experience and projects laid out on a chessboard that stands on a coffee table in a living room. Half the pieces, white and black, open a section; the gold boxes around them are a detection-style overlay computed from the 3D scene. Left alone, the page cycles pop-up labels through the sections, and the camera drifts back home a few seconds after you stop dragging it.

Live at https://vladplyushchenko.netlify.app/ (also still served by GitHub Pages at https://vladapl21.github.io/)

## Editing

All of the text lives in `js/content.js`. Each entry sits on one piece, named by colour and starting square (`side: 'black', from: 'd8'` is the black queen). Change its `title`, `bullets`, `links` and so on there, and the board, the side panel and the plain page all update. To move a section to a different piece, change `side` and `from`.

| File | What it does |
| --- | --- |
| `js/content.js` | Every word on the site, plus which piece each section sits on |
| `js/main.js` | Index, side panel, plain page, address-bar routing |
| `js/board.js` | 3D scene, camera, clicking pieces, detection boxes, idle pop-ups |
| `js/room.js` | The living room: table, sofa, window, shelves, lamp, and the easter eggs |
| `js/chess.js` | The starting position |
| `js/pieces.js` | Chess piece shapes, generated in code |
| `css/site.css` | All styling |
| `vendor/three.js` | three.js, bundled so the site needs no CDN |

## Running it locally

There is no build step. Serve the folder and open it:

```
python -m http.server 8000
```

Then go to http://localhost:8000. Opening `index.html` straight from disk will not work, because browsers block JavaScript modules on `file://`.

## Deploying

There is nothing to build. GitHub Pages serves the `main` branch as it is, and `netlify.toml` tells Netlify to do the same (publish the repo root, no build command). Once the repo is linked to a Netlify site, every push to `main` updates both.

## Easter eggs

The room is dark on purpose, with one lamp on the board. Drag around to find: a UCLA banner over the back of the sofa, eggs Benedict, an ace-king of spades with poker chips, a dartboard, skis in the corner, a badminton racket and shuttlecock, a model racing car, a bowl of golf balls, a chess clock, and the moon in the window. They are all built in `js/room.js`.

## Notes

- `#plain` in the address bar shows everything as an ordinary page. Browsers without WebGL get that page automatically.
- Colours are UCLA blue (`#2774AE`) and gold (`#FFD100`). The banner spells the name in a plain serif; the site does not use UCLA's logos.
- Fonts are Sofia Sans and Sofia Sans Extra Condensed (SIL Open Font License), served from `fonts/`.
