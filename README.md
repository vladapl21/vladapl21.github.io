# vladapl21.github.io

My personal site: experience and projects laid out on a 3D chessboard. Each white piece opens a section, and the gold boxes are a detection-style overlay computed from the 3D scene.

Live at https://vladapl21.github.io/

## Editing

All of the text lives in `js/content.js`. Each entry is one white piece: change its `title`, `bullets`, `links` and so on there, and the board, the side panel and the plain page all update.

| File | What it does |
| --- | --- |
| `js/content.js` | Every word on the site, plus which piece each section sits on |
| `js/main.js` | Index, side panel, plain page, address-bar routing |
| `js/board.js` | 3D scene, camera, clicking pieces, detection boxes |
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

GitHub Pages serves the `main` branch as it is. Push to `main` and the site updates.

## Notes

- `#plain` in the address bar shows everything as an ordinary page. Browsers without WebGL get that page automatically.
- Colours are UCLA blue (`#2774AE`) and gold (`#FFD100`). The site does not use UCLA logos.
- Fonts are Sofia Sans and Sofia Sans Extra Condensed (SIL Open Font License), served from `fonts/`.
