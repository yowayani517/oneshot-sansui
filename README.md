# SANSUI — Ink & Dragon

Scroll-driven ink-wash site inspired by [oneshot-sakura](https://oneshot-sakura.vercel.app), themed around sumi-e dragons and animals.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173/

- **Cover:** scroll experience (山水)
- **Visit** (nav or footer) → **墨流し** game (drag to flow ink)
- **← 山水へ戻る** returns to the cover


## Assets

Stills live in `public/stills/`. Drop Google Flow MP4s into `public/videos/` using the names in `docs/FLOW_PROMPTS.md`.

| Section | Still | Video (Flow) |
| --- | --- | --- |
| Hero | `hero-dragon.png` | `hero-dragon.mp4` |
| Craft scrub | `scrub-cranes-walk.png` | `scrub-cranes.mp4` |
| Gallery | `gallery-koi.png`, `gallery-tiger.png` | optional |
| Still scrub | `still-horse.png` | `still-horse.mp4` |
