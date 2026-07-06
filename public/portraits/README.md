# Leader portraits

Each leader ships with an **original, generated portrait** — a stylized
heraldic bust in house colors (`<leaderId>.svg` here, wired up via the
`portrait` field in `src/imperium/data/leaders.ts`). These are original
*interpretations*, not depictions of any copyrighted character art, so nothing
licensed lives in this repo. Regenerate them any time with:

```
node tools/gen-portraits.mjs
```

## Using your own art instead

If you own the physical game and want the real faces (or any other image), just
replace a leader's portrait:

1. Drop an image in this folder, e.g. `paul.jpg` (square works best; it's shown
   cropped to a rounded square). Any format Vite serves from `public/` works:
   `.jpg`, `.png`, `.webp`, `.svg`.
2. Point the leader at it in `src/imperium/data/leaders.ts` by editing the
   `portrait` path (from the site root — the `public/` folder is the root):

   ```ts
   paulAtreides: {
     id: 'paulAtreides',
     name: 'Paul Atreides',
     portrait: '/portraits/paul.jpg', // <- your file
     // ...
   },
   ```

3. Repeat per leader; mix and match freely. Remove the `portrait` field entirely
   to fall back to the code-drawn cameo in `LeaderPortrait.tsx`.

## Notes

- Paths are root-relative (`/portraits/…`), not `./` or `src/…`.
- Keep files reasonably small; they load wherever a leader appears.
- Don't commit copyrighted art to a public repository — that art is yours to use
  locally, not to redistribute.
