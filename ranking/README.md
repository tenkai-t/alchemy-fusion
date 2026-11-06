# アルケミー・フュージョン オンラインランキング用サーバー

ゲーム本体（GitHub Pages）とは別に、オンラインランキングの記録を集めるための
Cloudflare Worker + D1 です。

- Worker 名: `alchemy-fusion-ranking`
- 公開URL（予定）: https://alchemy-fusion-ranking.t-t14.workers.dev
- API: `GET /ranking?uuid=` / `POST /scores`

## セットアップ手順（Cloudflare ダッシュボード）

1. **D1 データベースを作成**
   - Cloudflare ダッシュボード → Storage & Databases → D1 → Create database
   - 名前: `alchemy-fusion-ranking-db`
   - 作成後、そのデータベースの Console で `schema.sql` の内容をすべて実行する
   - データベースの ID（database_id）を控える

2. **database_id を設定**
   - `wrangler.toml` の `database_id = "00000000-..."` を、手順1の ID に書き換える
     （ID を Muse に教えてもらえれば、こちらで書き換えて push します）

3. **Worker を作成して GitHub と連携（Workers Builds）**
   - Workers & Pages → Create → Worker → Import a repository（GitHub 連携）
   - リポジトリ: `tenkai-t/alchemy-fusion`、本番ブランチ: `main`
   - ルートディレクトリ: `ranking`
   - デプロイコマンド: `npx wrangler deploy`
   - Worker 名が `alchemy-fusion-ranking` になっていることを確認する

4. **確認**
   - https://alchemy-fusion-ranking.t-t14.workers.dev/ を開いて `ok` と表示されれば稼働中
   - ゲームの結果画面で、オンラインランキングが読み込めるようになります
