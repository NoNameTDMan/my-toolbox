# My Toolbox v1.1.5 / 文明の種 v0.6.1

ベース: ユーザー実機確認済み My Toolbox v1.1.4 AutoLoadFix

変更:
- `games/civilization/game.js`: 生産バランス型自動配置、自動購入アルゴリズムを追加。既存のセーブ保護処理は維持。
- `games/civilization/index.html`: ゲーム表示バージョンとキャッシュ用クエリを更新。ホーム復帰ボタンは維持。
- `sw.js`: My Toolbox専用キャッシュバージョンを更新。別GitHub Pagesリポジトリのキャッシュには触れない。
- ゲーム内README更新。

変更しないもの:
- セーブキー、セーブスキーマ、IndexedDBタイムアウト、正常セーブ予備コピー、失敗時の上書き防止。
- My Toolbox本体のapp.js、ゲーム一覧、ホーム復帰リンク、他のデータ。

検証:
- Node.jsによるgame.js / sw.jsの構文検証。
- Chromiumでの自動操作テストはローカルHTTPアクセスが環境により遮断され未完了。
- iPhone PWAでの再入場・セーブ・オフライン動作は更新後に確認してください。

更新前にゲームのJSONセーブを書き出してください。
