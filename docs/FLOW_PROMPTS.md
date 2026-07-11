# Google Flow — video prompts

静止画は `public/stills/` にあります。Flow で **Image to Video** し、できた MP4 を `public/videos/` に下のファイル名で置いてください。置くとサイトが自動で動画を使います。

## Files

| Still | Output video | Role |
| --- | --- | --- |
| `stills/hero-dragon.png` | `videos/hero-dragon.mp4` | Hero loop |
| `stills/scrub-cranes-walk.png` | `videos/scrub-cranes.mp4` | Scroll scrub (Craft) |
| `stills/still-horse.png` | `videos/still-horse.mp4` | Scroll scrub (Still) |
| `stills/gallery-koi.png` | `videos/gallery-koi.mp4` | Gallery loop |
| `stills/gallery-tiger.png` | `videos/gallery-tiger.mp4` | Gallery loop |

推奨: 16:9、6–8 秒、動きはゆっくり・連続（スクラブ向き）。

---

## 1. Hero — `hero-dragon.mp4`

**Start frame:** `hero-dragon.png`

```text
Sumi-e ink wash animation. The serpentine dragon slowly undulates through the mist, body coiling like living brushstrokes. Soft fog drifts horizontally across the mountains. Tiny birds drift in the distance. Subtle ink bleed and paper texture. Slow cinematic loop, no camera shake, no text, no modern elements. Calm, continuous motion suitable for seamless looping.
```

---

## 2. Craft scrub — `scrub-cranes.mp4`

**Start frame:** `scrub-cranes-walk.png`

```text
Sumi-e ink wash animation for scroll scrubbing. Cranes lift off from the misty lake — wings beat, water ripples, reeds sway. On the right, a scholar with a staff walks slowly toward the birds. Soft fog drifts between mountain layers. Continuous forward motion from stillness to flight. No cuts, no text, no dragon, steady camera, high temporal consistency.
```

---

## 3. Still scrub — `still-horse.mp4`

**Start frame:** `still-horse.png`

```text
Sumi-e ink wash animation. A black ink horse gallops through mountain mist, mane and tail flowing as dry-brush strokes, ink splatters trailing behind. Soft fog drifts. Continuous gallop cycle, side profile, no text, no camera cuts. Motion should scrub cleanly from start to finish.
```

---

## Optional extras

### Koi — from `gallery-koi.png`

```text
Sumi-e koi leaping from dark ink water, splash strokes expanding, ripples spreading, then settling. Continuous leap motion, no text.
```

### Tiger — from `gallery-tiger.png`

```text
Sumi-e tiger walking along a misty mountain ridge among pines. Slow deliberate steps, fog drifting, continuous walk cycle, no text.
```

---

## After export

1. Save MP4s into `public/videos/` with the exact names above.
2. Run `npm run dev` and scroll — Craft / Still sections scrub with GSAP.
3. Hero loops automatically when `hero-dragon.mp4` is present.
