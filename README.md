# HouseLedger

ローカルファーストのパーソナルファイナンスアプリ — データはお使いの端末にのみ保存されます。

HouseLedger は Electron と React で作られた、軽量でプライバシー重視の家計管理アプリです。オフラインで動作し、デスクトップおよび Capacitor 経由の Android での日常利用を想定しています。

## デモ

[デモ動画](demo/video/HouseLedger-demo.mp4)

## 作った理由

- **シンプルかつ集中**: 日々の家計管理に必要なコア機能に絞り、余計な機能は持たせない設計です。
- **プライバシー重視**: データはデフォルトで端末内に保存され、クラウドアカウントは不要です。
- **高速**: ローカルストレージにより高速に動作し、オフラインでも利用できます。


## 機能（概要）

- **コア** — 日次エントリ、月次の固定項目、編集可能な履歴（差分表示）
- **分析** — 月次グラフ、カテゴリ別内訳、年次サマリー
- **同期** — Desktop と Android 間のオプション LAN 同期（クラウド不要）
- **マルチ通貨** — 為替レートに基づく複数通貨表示
- **多言語対応** — UI の多言語化とロケールに依存した書式設定


## 技術スタック

| コンポーネント | 用途 |
|---|---|
| Electron + React | デスクトップ UI とアプリフレームワーク |
| Vite | 開発サーバーとビルドツール |
| SQLite | ローカルのリレーショナルストレージ（台帳・アプリデータ） |
| Capacitor | Android 向けの WebView ラッパー |
| Node.js | ビルドスクリプトとローカル LAN 同期サーバ |

## セキュリティとプライバシー（詳細）

- 保存場所: データは Electron の user data ディレクトリに保存されます。一般的なパス:
	- Windows: `%APPDATA%/HouseLedger` または `%LOCALAPPDATA%/HouseLedger`
	- macOS: `~/Library/Application Support/HouseLedger`
	- Linux: `~/.config/HouseLedger`
- 送信されないもの: 台帳、トランザクション、カテゴリ、個人メモなどはデフォルトで外部に送信されません。
- LAN 同期の挙動: LAN 同期を有効にすると、同一ネットワーク上のデバイス間で直接データが送受信されます（第三者サーバーは介在しません）。
- テレメトリ: HouseLedger はデフォルトで使用状況やアカウント識別子の送信を行いません。
- 推奨: OS のディスク暗号化を有効にし、バックアップは安全に保管してください。将来的に暗号化バックアップを予定しています。

## LAN 同期（仕組み）

Desktop アプリは起動中に簡易な同期サーバーを立ち上げます。Android クライアントは同一 LAN 上から直接そのサーバーに接続してデータをやり取りします。

簡易図（ASCII）:

```
Android Device  <--HTTP-->  Desktop (HouseLedger sync server)
						 (Wi‑Fi/LAN)             (port 30303)
```

使い方:
1. Desktop アプリを起動（同期サーバーがポート `30303` で待ち受けます）
2. Android で: 設定 → LAN sync → `http://<DESKTOP-IP>:30303` を入力
3. 「Sync now」をタップ（または自動同期を有効にする）

注意:
- 同期は同一ネットワーク内でのみ動作します。
- Desktop を終了すると同期サーバーは停止します。
- データは直接デバイス間でやり取りされ、外部サーバーへは送られません。

## インストール（OS別・簡易）

- Windows: Releases からインストーラー（`HouseLedger-Setup-*.exe`）をダウンロードして実行
- macOS: 提供されている `.dmg` を使用するか、`npm run build:mac` でビルド
- Linux: AppImage を使うか、ソースからビルド。開発向け:

```bash
npm install
npm run build
```

開発（ローカル実行）:

```bash
npm install
npm run dev
```

## Android での利用（Capacitor）

1. Android Studio（SDK / Platform Tools 含む）をインストール
2. 依存関係をインストール: `npm install`
3. Web アセットを同期して Android Studio を開く: `npm run android:studio`

出力（デバッグ APK）: `android/app/build/outputs/apk/debug/houseledger-debug.apk`

## データ保存

アプリの全データはユーザーの app data フォルダにローカル保存されます。

| ファイル | 内容 |
|---|---|
| `ledger.sqlite` | 日次エントリと入力履歴 |
| `recurring-items.json` | 月次の固定項目 |

## ロードマップ

- 暗号化されたバックアップとオプトインのエンドツーエンド暗号化同期
- 為替レートのライブ管理（自動更新と手動オーバーライド）
- Android UI の改善とオフライン耐性強化
- より多くのロケールと言語の翻訳品質向上
- CSV 入出力の改善（マッピング、カテゴリ自動マッチング）
