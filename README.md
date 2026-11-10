# Pare

**広告ではなく、出典で選べる美容医療へ。**
料金を知って、見積もりを比べて、記録を残す。

DevFest GDGoC Japan Hackathon 2026（大阪会場・医療・福祉）チーム Doshisha Duo（Haru、Naoto）の提出作品です。

- 公開URL：https://keika-881007565837.asia-northeast1.run.app/
- ログイン不要。スマホのブラウザで開くとそのまま使えます（ホーム画面に追加も可）

## できること

| 機能 | 内容 | Gemini |
| --- | --- | --- |
| ① 料金の目安を調べる | 153施術の公開料金を、出典と確認日つきで3つの価格帯に分けて表示。複数施術の合計の目安と予算の位置、カウンセリングで聞くことをコピー | 使わない |
| ② 見積もりを比べる | 見積書を撮ると、同意のうえで Gemini が項目と金額を読み取る。合計の食い違いを検査し、6院分まで同じ形で並べる。良し悪しの判定はしない | 使う |
| ③ 施術後の変化を記録する | 受診を急ぐ9つのサインに先に答え、痛み・腫れ・内出血と写真を端末の中だけに記録。抜糸・検診の予定と、出典つきの変化の目安を表示。毎晩21時の記録予定をカレンダーへ追加。医師に伝えるメモ／相談文を作る | 相談文・確認リストで使う |

診断はしません。医師やクリニックを評価しません。広告料・紹介料は受け取りません。

## Google の技術

- **Cloud Run**（サービス名 `keika`、asia-northeast1）：Node.js 22 / Express のアプリ本体。同意の確認、1日の回数制限、Gemini への中継、出力の検査を行う。写真も文章も保存しない
- **Vertex AI の Gemini**（`gemini-3.5-flash`、Google Gen AI SDK `@google/genai`）：画像と文章を同時に入力し、JSON の構造化出力で受け取る。Cloud Run のサービスアカウントで認証し、**API キーは使わない**

Gemini を使うのは次の3か所だけです（`server.js`、`lib/analyze.js`）。

| API | 役割 |
| --- | --- |
| `POST /api/estimate` | 見積書の写真から項目と金額を読み取る |
| `POST /api/prep` | 選んだ施術と公開の指針から、医師に確かめることを質問の文章にする |
| `POST /api/analyze` | 本人が入力した記録（任意で前回と今日の写真2枚）を、医師に伝える相談文に整える |

価格や回復の目安など医療に関わる数字は Gemini に作らせず、出典のある固定データ（`public/research.js`、`public/catalog.js`）から表示します。Gemini の出力は、診断にあたる言葉・入力にない症状・入力に紛れ込んだ指示がないかをアプリ側で検査し、あれば表示しません。

## 構成

```
スマホのブラウザ（記録と写真は端末の中だけ。送る写真は縮小し、位置情報を除く）
  │ 同意したあと、見積書の読み取り・確認リスト・相談文に必要な内容だけを送信
  ▼
Cloud Run（Node.js 22 / Express、asia-northeast1）
  │ 同意の確認／回数制限／出力の検査（保存なし）
  │ サービスアカウントで認証（API キーなし）
  ▼
Vertex AI の Gemini（gemini-3.5-flash、画像＋文章、構造化出力）
```

データベースとログインはありません。

## ファイル

```
server.js          Express のサーバー（API 3つ、同意と回数の確認）
lib/analyze.js     Gemini への指示、構造化出力の形、出力の検査
public/            画面（index.html、app.js、styles.css）と固定データ
  research.js      施術ごとの価格帯と出典URL（182件、41院グループ、2026-11-08確認）
  catalog.js       153施術の一覧と回復の目安の出典
  model/           経過の見本写真（Gemini で生成した架空の人物。「AI生成のモデル経過」と表示）
test/api.test.js   自動テスト（Gemini を使わずに API と検査を確かめる）
Dockerfile、deploy.sh  Cloud Run への公開
```

## 動かし方

```bash
npm install
npm test                                   # 自動テスト15件
gcloud auth application-default login
GOOGLE_CLOUD_PROJECT=<プロジェクトID> npm start
```

Cloud Run への公開：

```bash
bash deploy.sh <プロジェクトID>
```

モデルは環境変数 `GEMINI_MODEL`、1日の上限は `DAILY_MAX` で変えられます。

## データについて

- 料金：各クリニック・公立病院の公式料金ページに掲載された金額の幅を3つの価格帯に分けたもの。支払額の統計や、料金の良し悪しを示すものではありません
- 回復の目安：施術を直接扱う中立な出典があるのは25施術、施術全般の説明のみが31施術、出典が見つからなかったのが97施術。出典のない時期は空欄のまま表示します
- 見本の写真：Gemini で生成した架空の人物です。見本の見積書も架空のものです。実在の人物の写真、クリニックの症例写真、SNS の画像は使っていません

## ライセンス

MIT License（`LICENSE`）
