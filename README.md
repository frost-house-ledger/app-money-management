# 家計簿アプリ

Electron + React で作成したローカル家計簿アプリです。データはすべて手元に保存されます。クラウド・アカウント不要。

## 機能

- **月次固定項目** — 家賃・給与など一度登録すれば以降の月に自動反映
- **日次項目** — 日々の支出を日付・カテゴリ・メモ付きで記録
- **グラフ** — 月次棒グラフ＋折れ線、カテゴリ内訳（円グラフ・積み上げ棒）
- **複数通貨対応** — JPY・NZD・EUR 等、リアルタイム為替レートで表示換算
- **操作履歴** — 追加・更新・削除をすべて記録、更新前→後の差分も表示
- **年次サマリー** — 年間収支の俯瞰ビュー
- **多言語対応** — 日本語 / 英語 / ドイツ語

## インストール

[Releases](../../releases) から `AMM-Setup-x64.exe`（64bit）または `AMM-Setup-ia32.exe`（32bit）をダウンロードして実行してください。


## 開発環境のセットアップ

```bash
npm install
npm run dev
```

## Androidで使う（Capacitor）

このプロジェクトは **React Native ではなく**、React (Web) を Capacitor で Android アプリ化して動かします。

1. Android Studio（SDK/Platform Tools含む）をインストール
2. 依存関係をインストール

```bash
npm install
```

3. APK を CLI で作る

```bash
npm run android:apk:debug
```

生成先: `android/app/build/outputs/apk/debug/app-money-management-debug.apk`


## Desktop / Android 同期（同一LAN） ※現在、検証中

Desktop 版は起動中に同期サーバーを自動で起動します（ポート `30303`）。

1. Desktop 版を起動する
2. Android 版を起動して「設定 > LAN同期」を開く
3. `Desktop URL` に `http://<DesktopのIP>:30303` を入力
4. 「今すぐ同期」で手動同期
5. 必要なら「同一LAN内で1分ごとに自動同期」をON

例: `http://192.168.1.10:30303`

補足:
- 同期は同一ネットワーク内でのみ動作します
- Desktop を閉じると同期サーバーは停止します

## データ保存先

OS の userData フォルダに自動保存されます（アプリ内には含まれません）。

| ファイル | 内容 |
|---|---|
| `ledger.sqlite` | 日次データ・操作履歴 |
| `recurring-items.json` | 月次固定項目 |
