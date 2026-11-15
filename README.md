# laura06919-max.github.io

My portfolio. Hand-written HTML/CSS/JS, no framework, no build step.

```
index.html                  story-scroll homepage (chapters 00–05)
work/*.html                 one page per case study
assets/css/site.css         shared tokens + components
assets/css/datahacks.css    DataHacks page theme (portal's Nether tokens)
assets/js/site.js           story rail, reveal-on-scroll, art book, clock
assets/js/datahacks.js      Dyno, screen hotspots, stickers, props
assets/img/                 images (art/, datahacks/, datahacks-screens/)
```

**Adding a chapter to the story rail:** give any section a `data-chapter="Label"` attribute. The rail builds itself.

Preview locally: `python3 -m http.server` in this folder, then open http://localhost:8000.
