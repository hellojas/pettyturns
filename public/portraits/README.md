# Leader portraits (owner-supplied)

Drop your own leader art in this folder to give each leader a real face on the
player boards, the lobby, and the game header. **No portrait art ships with this
repo** — the game's character art is copyrighted, so the UI draws an original
generated cameo (a bust silhouette in house colors + the leader's monogram)
whenever a leader has no image set.

## How to add your own

1. Put an image in this folder, e.g. `paul.jpg` (square works best; it's shown
   cropped to a rounded square). Anything Vite serves from `public/` is fine:
   `.jpg`, `.png`, `.webp`, `.svg`.
2. Point the leader at it in `src/imperium/data/leaders.ts` by setting the
   optional `portrait` field to the path **from the site root** (the `public/`
   folder is the root at build time):

   ```ts
   paulAtreides: {
     id: 'paulAtreides',
     name: 'Paul Atreides',
     portrait: '/portraits/paul.jpg', // <- add this line
     signetGains: { drawCards: 1 },
     // ...
   },
   ```

3. Repeat per leader. Leaders with no `portrait` keep the generated cameo, so
   you can mix and match.

## Notes

- Paths are root-relative (`/portraits/…`), not `./` or `src/…`.
- Keep files reasonably small; they're loaded eagerly wherever a leader appears.
- This folder and any images you add are yours — do not commit copyrighted art
  to a public repository.
