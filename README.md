# 山水

**墨絵で読む、昔の教え。**

雲に竜、池に鯉、尾根に虎——  
絵を眺めながら、ことわざと教えがゆっくり立ち上がるサイトです。

<br />

<p align="center">
  <img src="docs/readme-media/01-hero.gif" alt="ヒーロー：山水と竜" width="720" />
</p>

<p align="center"><em>雲に乗れば、人も竜になれる。</em></p>

---

## 体験の流れ

### 1. 教えを辿る

スクロールするたびに、墨の景色とことわざが重なります。

<p align="center">
  <img src="docs/readme-media/02-scroll-teachings.gif" alt="スクロールで教えが現れる" width="720" />
</p>

| 絵 | 教え |
| --- | --- |
| 竜 | **登竜門** — 雲に乗れば、人も竜になれる |
| 鶴 | **鶴は千年** — あわてないことが長く生きる秘訣 |
| 鯉 | **鯉の滝登り** — あきらめなければ竜になる |
| 虎 | **虎は千里を行く** — 本当の強さは静かにある |
| 馬 | **急がば回れ** — 回り道が、いちばんの近道 |

### 2. 絵が呼吸する

鯉や虎の映像は、再生し終わると消え、間をおいてふわりと戻ってきます。

<p align="center">
  <img src="docs/readme-media/03-gallery-koi.gif" alt="鯉の絵が消えて浮かび上がる" width="720" />
</p>

### 3. 墨を流す

さいごに、指で墨を流して自分の模様をつくれます。  
百聞は一見に如かず——触れてみて、はじめてわかる。

<p align="center">
  <img src="docs/readme-media/04-suminagashi.gif" alt="墨流しゲーム" width="720" />
</p>

---

## 起動

```bash
npm install
npm run dev
```

ブラウザで [http://localhost:5173/](http://localhost:5173/) を開く。

- 表紙＝スクロール体験（教えと絵）
- **墨流し**＝指で模様をつくる
- **← 山水へ戻る**＝表紙に戻る

---

## 技術メモ

- Vite + React + TypeScript
- GSAP / Lenis（スクロール演出）
- Three.js（墨流し・流体）
- Capacitor（Android APK 可）

動画・静止画は `public/videos/` と `public/stills/`。  
差し替え手順は `docs/FLOW_PROMPTS.md`。

README 用の GIF を撮り直す場合:

```bash
npm run dev
# 別ターミナル
node scripts/capture-readme-gifs.mjs
```

---

<p align="center">
  <strong>絵は教え、教えは絵。</strong><br />
  <sub>© 2026 山水</sub>
</p>
