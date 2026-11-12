# My Toolbox v1.1.3 — 文明の種 安全対策アップデート

**v1.1.2の再入場後の画面消失とセーブ上書きリスクへの対応版です。** 統合ゲームをiframeから独立したトップレベル画面に切り替え、ゲームセーブ読込失敗時には初期データによる自動上書きを禁止しました。

- 既存のGitHub PagesリポジトリへZIPの展開内容を更新（パス・公開URLは変更しない）
- 更新前に、可能ならツールボックスJSONと文明の種JSONの両方を保存
- 復元確認までゲームの旧JSON、独立版ゲーム、旧GitHubサイトの状態を消さない
- **設定 → データとバックアップ → データ救出** から読み取り専用の救出画面（`recovery.html`）へ移動可能。必要ならデータを書き出せます
- 同梱の [SAFE_GAME_FIX.md](SAFE_GAME_FIX.md) に技術変更と復旧時の注意があります

---

## 既にGitHub Pagesへ移行済みの場合

- **公開先のリポジトリは変更せず**、このZIPを展開した中身をリポジトリ直下に反映してください。
- 変更前にツールボックスのJSONバックアップと、独立公開中の**「文明の種」のゲーム内JSONバックアップを別々に保存**してください。
- 「文明の種」は「ゲーム」一覧に**通常のゲームカードとして追加**され、`games/civilization/` に同梱されています。起動するとPWA内の独立した全画面ページで開き、「ホームへ戻る」からPWAへ戻れます。
- 既存のルービックキューブやその他ゲームリンクはそのままです。
- **ゲームの進行データはツールボックスのJSONバックアップには入りません。** 必要に応じてゲーム専用JSONをゲーム内から読み込んでください。
- 今後のゲーム更新では `games/civilization/` 内のファイルを交換できますが、v1.1.3で追加した保存データ保護処理とホーム復帰ボタンを必ず維持してください。詳細は [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) を参照してください。
- ZIPをGitHubにそのまま置くのではなく、**展開済みのファイルとフォルダをアップロード**してください。バックアップJSONは公開リポジトリに入れないでください。

---

# My Toolbox v1.1.3 — 「文明の種」v0.6.0 統合版（GitHub Pages）

**既存のツールボックス機能・データ形式・画面デザインは維持しています。** 今回は「文明の種」をゲーム一覧の通常項目として追加し、独立ページ、キャッシュ、更新ガイドを同梱しました。

- 初めてNetlifyから移行する場合のみ `MIGRATION_GUIDE.md` を参照してください。既に移行済みなら今回の更新は `INTEGRATION_GUIDE.md` を参照してください。
- 新サイトでデータを自動的に引き継ぐことはできません。旧PWAの「設定 → バックアップを書き出す」で保存したJSONを、新PWAの「設定 → バックアップを読み込む」から復元します。
- バックアップJSONにはメモ・予定・写真などの個人情報が含まれます。**GitHubの公開リポジトリへ絶対にアップロードしないでください。**
- GitHub Pagesでの基本URLは `https://USERNAME.github.io/REPOSITORY/` です。
- ZIPはGitHubにそのまま置かず、**展開した中身をリポジトリの最上位へ配置**します。
- バックアップ確認とiPhone動作テストが済むまでNetlifyサイトと旧PWAは削除しないでください。

## ファイル構成

```
index.html
game-player.html
app.js
styles.css
sw.js
manifest.webmanifest
icons/
  apple-touch-icon.png
  icon-192.png
  icon-512.png
  icon-1024.png
games/
  civilization/
    index.html
    game.js
    style.css
    manifest.webmanifest
    icon-180.png
    icon-192.png
    icon-512.png
    README.md
.nojekyll
.gitignore
README.md
FEATURE_GUIDE.md
MIGRATION_GUIDE.md
INTEGRATION_GUIDE.md
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
