# My Toolbox：Netlify → GitHub Pages 移行・復元チェックリスト

作成日：2026-11-12 / 対象：My Toolbox v1.1.1 GitHub Pages移行対応版

**最重要：旧Netlifyサイト・旧ホーム画面PWAを削除しないこと。GitHubへはバックアップJSONをアップロードしないこと。**

## 0. 今回の移行で変わること／変わらないこと

- 公開先URLは `https://<GitHubユーザー名>.github.io/<リポジトリ名>/` になります（ユーザー名の部分は実際のアカウントに置き換える）。
- 画面や保存データ形式・全ツールの使い方は変えていません。アプリのバージョン表示は `1.1.1` のままです。
- URLが変わるので旧Netlify版の `localStorage` / `IndexedDB` はGitHub Pages版へ自動で移りません。
- 写真やメモなどの**ユーザーデータはGitHubには掲載しません**。GitHubに置くのはアプリの公開用ソースコードだけです。
- iPhoneのSafariで見たページと、ホーム画面から起動したWebアプリでは保存データが別になる場合があります。復元するのは「新しいホーム画面PWA」で、バックアップするのは「普段使っている旧ホーム画面PWA」です。

## Phase A：Netlify版からデータを保護する（これが終わるまで公開先を切り替えない）

- [ ] 普段利用している**Netlify版のホーム画面アイコン**からMy Toolboxを起動。
- [ ] 「設定 → バックアップを書き出す → 保存」をタップ。
- [ ] iPhoneの「ファイル」アプリの「ダウンロード」などで、`my-toolbox-backup-YYYY-MM-DD.json` が**実際に保存された**ことを確認。
- [ ] JSONファイルが0バイトでないこと、開き直してもファイルがあることを確認。できれば別の保管先にも複製。
- [ ] 旧アプリ内で、予定、TODOと買い物、メモ、リンク・アプリ・ゲーム登録、写真、時間割、毎日やることの内容と件数を控える。**写真が保存されている場合は特に枚数を確認**。
- [ ] 大きな写真コレクションでは、**現行バックアップが90MB超を拒否**する場合があります。エラーメッセージが出た、写真枚数が合わない、ファイルが見つからない場合は、作業を中断。元データが残っているNetlify版を保持する。

> 注意：バックアップには私的な写真・予定・メモが含まれます。**GitHubリポジトリ、GitHub Issue、公開Gist等には絶対にアップロードしないでください。** 復元にはiPhoneの「ファイル」アプリにあるJSONを使用します。

## Phase B：GitHub Pagesに新しいサイトを作る

- [ ] GitHubにサインインし、`New repository` で新しいリポジトリ（例：`my-toolbox`）を作成。
- [ ] GitHub FreeのPages利用を想定するため `Public` を選択。**個人データのJSONを入れない**。
- [ ] ZIP `MyToolbox-GitHubPages-v1.1.1.zip` を**解凍**する。
- [ ] 解凍した中身（`index.html`・`app.js`・`styles.css`・`sw.js`・`manifest.webmanifest`・`icons/`など）を、GitHubリポジトリの**ルート直下**にアップロード。ZIPファイル自体を置くのではない。
- [ ] `index.html` が `https://github.com/ユーザー名/my-toolbox/blob/main/index.html` の場所にあることを確認（`フォルダ/index.html` にしない）。
- [ ] リポジトリ `Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main → Folder: /(root) → Save` を選ぶ。
- [ ] Pages画面に表示される公開URLが `https://ユーザー名.github.io/リポジトリ名/` になっていることを確認。

**重要な注意：** このZIPの中には `.nojekyll` という空のファイルがあります。GitHub PagesでJekyll変換を避けるためのものです。`.gitignore` はバックアップの誤登録を防ぐ補助ですが、Web画面からの手動アップロードを完全に防ぐものではありません。

## Phase C：GitHub Pages版を事前にテスト（まだデータ復元しない）

- [ ] Safariで**公開URLの末尾の `/` を含むURL**を開き、画面が正常表示される。
- [ ] リンク・ゲーム・写真・時間割・カレンダーなど各画面に移動できる。
- [ ] アイコン・CSSが表示され、`404` ページになっていない。
- [ ] Safariの「共有 → ホーム画面に追加」で新しいPWAを登録（iOSのバージョンにより「Webアプリとして開く」をオン）。
- [ ] **既存Netlify版とは別のアイコン**として残し、区別できる名前（例：`Toolbox GitHub`）を付ける。
- [ ] 新しいホーム画面アイコンから起動し、独立したアプリ画面として開ける。
- [ ] テスト用のメモ等を作成、PWAを閉じて再起動し、残っていることを確認。これらは次の全データ復元で置き換わります。

## Phase D：データ復元（新しいホーム画面PWA内で行う）

- [ ] GitHub版**ホーム画面PWA**を開き、「設定 → バックアップを読み込む」を選択。
- [ ] Phase Aで作成した `my-toolbox-backup-YYYY-MM-DD.json` を「ファイル」から選択。
- [ ] 復元前のプレビューに表示された、予定・リンク・リスト・メモ・写真の件数が大きく欠けていないことを確認。
- [ ] **「全データを復元」** を選択。復元範囲選択によっては写真だけ、文字情報だけも可能だが、初回移行は全データを推奨。
- [ ] 「復元しました」の表示を確認し、再起動する。
- [ ] **メモ・TODOと買い物・予定・時間割・毎日やること（設定/履歴）・登録リンクとフォルダ・写真とアルバム・並び順・テーマ・ホーム設定**を確認する。
- [ ] 写真は数枚を開いてピンチとドラッグが動くか、画像が欠けていないか確かめる。
- [ ] 新PWAからも**もう一度バックアップを書き出し**、ファイル保存ができることを確認する。

### 途中で不具合があった場合

1. **旧Netlify版や旧アイコンを削除しない**。GitHub版でデータを初期化する前に、旧バックアップが安全なことを確認。
2. 画面が出ない場合は、公開URLのリポジトリ名・ファイル配置・Pagesの設定を確認。
3. データが空の場合は、新PWAに復元したか（Safariタブにだけ復元していないか）を確認。
4. 写真の復元が失敗した場合は、JSONファイルのサイズと写真の件数を確認。**旧PWAのデータを残したまま**相談する。

## Phase E：オフラインと通常操作の確認

- [ ] 一度**オンラインで**GitHub版を表示し、Service Workerが静的ファイルをキャッシュできる状態にする。
- [ ] iPhoneを機内モードにしたうえで、Wi-Fiもオフにする（機内モード後にWi-Fiがオンになっていないか確認）。
- [ ] GitHub版PWAを閉じて開き直し、ホーム・予定・メモ・写真が表示できることを確認。
- [ ] Wi-Fi／モバイル通信を元に戻す。
- [ ] 数日間、保存・再起動・画面切替・外部リンクやショートカット起動が正常なことを確認。
- [ ] 問題がないと判断できた段階で、初めてNetlifyサイトの停止と旧アイコンの整理を検討する。

> オフライン対応は**アプリ本体と端末内保存データ**に限られます。外部Web検索、Googleカレンダー登録、外部アプリの起動等は回線・OS・外部サービスに依存します。

## 更新するとき（今後の運用）

1. ChatGPTが生成した**GitHub Pages用ZIP**を解凍。
2. GitHubリポジトリで既存ファイルを置き換える（Web画面の `Add file → Upload files`、またはGitHub Desktopを利用）。
3. `index.html` のあるルートディレクトリを保持。README等の追加は問題なし。
4. 新しいバージョンの `sw.js` ではキャッシュ名を更新し、古いPWAキャッシュが新しいファイルの表示を妨げないようにする。
5. 公開後、iPhoneのPWAを再起動してバージョンと動作を確認。
6. 新しい保存機能が増えたときは、その都度バックアップの対応範囲も確認する。

GitHub FreeのPagesは**公開リポジトリ**で利用可能で、静的ファイルの公開に適しています。ただし、容量・帯域・ビルドには利用上限があるため無制限ではありません。

## 本版の技術上の対応

- `index.html` と静的参照は `./` 相対パス、`manifest.webmanifest` の `id` / `start_url` / `scope` も `./`。
- Service Workerの管理範囲を公開先サブディレクトリへ限定し、**同じ `username.github.io` のほかのGitHub Pagesプロジェクトには介入しない**。
- Cache Storageの削除対象も、**このPWAのパス固有の接頭辞**に限定。
- マニフェスト・アイコン・JS・CSSのオフライン用静的キャッシュを維持。
- ホーム画面用アイコンの更新ZIP生成処理で、キャッシュ版数が変わるよう修正し `.nojekyll` も同梱。
- `localStorage` のキー、IndexedDBのDB/ストア名、ユーザーデータ構造は**変更なし**。
- アプリ内の表示文字でNetlify向けになっていた公開手順をGitHub Pages向けに修正。それ以外の機能/UIは変更しない。

## 参考：公式資料

- GitHub Docs「Getting started with GitHub Pages」 https://docs.github.com/en/pages/getting-started-with-github-pages
- GitHub Docs「GitHub Pages limits」 https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- MDN「ServiceWorkerContainer.register」 https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register
- WebKit「Safari 17.0 Web Apps and Storage」 https://webkit.org/blog/14445/webkit-features-in-safari-17-0/
