# Android アプリ（USB インストール）

真っ白だった原因は、Capacitor WebView と PWA Service Worker の相性です。Android ビルドでは SW を無効化済みです。

## USB で入れる（推奨）

1. スマホで **開発者向けオプション** → **USB デバッグ** を ON  
   （設定 → 端末情報 → ビルド番号を7回タップで開発者向けが開く）
2. USB ケーブルで PC に接続。スマホに「このコンピュータを許可しますか？」が出たら **許可**
3. PC で:
   ```bash
   npm run android:install
   ```
4. 自動でインストール＆起動します

APK 単体の場所:
- `release/sansui-debug.apk`
- `sansui-debug.apk`（プロジェクト直下）

USB が見えないときだけ確認:
```bash
node scripts/adb-install.mjs
```

## 再ビルドだけ

```bash
npm run android:apk
```

## 中身

- 表紙: 山水スクロール
- Visit → 墨流し
