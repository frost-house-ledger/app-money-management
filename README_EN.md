# app-money-management

Electron + React で作ったローカル家計簿アプリです。

## 機能

- 固定項目（`fee` / `income`）を月単位で登録・編集
- 例: `2026-04` で登録した固定項目は `2026-05`, `2026-06` ... に自動反映
- 日次項目（買い物など）を日付付きで登録
- 月次グラフに即時反映
- `fee` / `income` / `all` フィルタ
- 固定項目は JSON (`recurring-items.json`) に保存
- 日次項目と入力ログは SQLite (`ledger.sqlite`) に保存
- SQLite (`ledger.sqlite`) の `input_logs` テーブルに入力ログ保存
- JSON (`monthly-summary.json`) に月次集計を出力

## セットアップ

```bash
cd app
npm install
npm run dev
```

## データ保存先

Electron の `userData` 配下に保存されます。

- `ledger.sqlite`
- `recurring-items.json`
- `monthly-summary.json`
