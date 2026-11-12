# My Toolbox v1.1.1 — GitHub Pages 移行対応版

**Netlify版の機能・データ形式・画面デザインは維持しています。** 変更点はGitHub Pagesへの移行に必要な公開・キャッシュ処理と、公開方法に関する説明です。

- **先に `MIGRATION_GUIDE.md` を読み、旧PWAからJSONバックアップを取得してください。**
- 新サイトでデータを自動的に引き継ぐことはできません。旧PWAの「設定 → バックアップを書き出す」で保存したJSONを、新PWAの「設定 → バックアップを読み込む」から復元します。
- バックアップJSONにはメモ・予定・写真などの個人情報が含まれます。**GitHubの公開リポジトリへ絶対にアップロードしないでください。**
- GitHub Pagesでの基本URLは `https://USERNAME.github.io/REPOSITORY/` です。
- ZIPはGitHubにそのまま置かず、**展開した中身をリポジトリの最上位へ配置**します。
- バックアップ確認とiPhone動作テストが済むまでNetlifyサイトと旧PWAは削除しないでください。

## ファイル構成

```
index.html
app.js
styles.css
sw.js
manifest.webmanifest
icons/
  apple-touch-icon.png
  icon-192.png
  icon-512.png
  icon-1024.png
.nojekyll
.gitignore
README.md
FEATURE_GUIDE.md
MIGRATION_GUIDE.md
```

`manifest.webmanifest` の `start_url` / `scope` と、各リソース参照・Service Worker登録は相対パスです。リポジトリが `my-toolbox` 以外の名前でも原則変更不要です。

## GitHub Pagesでの更新

サイトのリポジトリで `Settings → Pages → Build and deployment → Deploy from a branch → main / (root)` を選択し、公開URLから起動してください。更新時は同じリポジトリのHTML/CSS/JS/画像ファイルを置き換えます。詳細は `MIGRATION_GUIDE.md` を参照。

「設定 → アプリのカスタマイズ → ホーム画面用のサイト更新ZIPを作成」は引き続き利用できます。生成したZIPは**解凍してGitHubリポジトリに反映**します。iOSの古いアイコンキャッシュが残る場合は、バックアップ後にホーム画面へ追加し直してください。

## 保存領域

- 文字・設定: `localStorage` の `my-toolbox-data-v1`
- 写真・サムネイル: IndexedDB `my-toolbox-photos-v1` の `photos` ストア
- オフライン画面: Service Worker の Cache Storage（端末データの本体ではありません）

JSONバックアップには写真の画像データも含みます。ただし現行の書き出しには**90MB上限**があり、多数の写真が入っている場合は書き出せないことがあります。その場合、旧アプリは削除せず、追加の移行方法を検討してください。

## 制限

静的サイトのため、閉じたPWAへの時刻指定Push通知やクラウド自動同期は実装していません。リンクごとの外部ブラウザ指定もiOS側で起動制限があります。**移行でこの制限は変わりません。**

既存の使い方は `FEATURE_GUIDE.md`、段階的な移行・照合チェックは `MIGRATION_GUIDE.md` に記載しています。
