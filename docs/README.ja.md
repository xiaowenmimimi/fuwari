# 🍥 Fuwari (Customized Version)

![Node.js >= 20](https://img.shields.io/badge/node.js-%3E%3D20-brightgreen)
![pnpm >= 9](https://img.shields.io/badge/pnpm-%3E%3D9-blue)

📖 README: [English](./README.en.md) | [简体中文](../README.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [Indonesia](./README.id.md) | [한국어](./README.ko.md) | [ภาษาไทย](./README.th.md) | [Tiếng Việt](./README.vi.md)

[Astro](https://astro.build) で構築された静的ブログテンプレート [Fuwari](https://github.com/saicaca/fuwari) のカスタマイズバージョンです。

オリジナルの滑らかなアニメーションとシンプルなデザインを維持しつつ、**Bangumi 追番**、**Waline コメント**、**Umami アナリティクス** などの実用的な機能を統合しました。同時に、**UI の詳細** も大幅に最適化されています。

[**🖥️ ブログのプレビュー**](https://blog.xhwen.cn)

## ✨ 新機能

オリジナルの Fuwari と比較して、このプロジェクトでは主に以下の機能が追加されています：

- 📺 **Bangumi 追番ページ**
  - Bangumi API を統合し、視聴進捗を自動的に表示します。
  - アニメのフィルタリングやページネーション表示をサポート。
  - 詳細ページでは、アニメのカバー画像、評価、概要などの情報を表示します。

- 💬 **Waline コメントシステム**
  - Waline コメントコンポーネントを内蔵し、記事ページでのコメントインタラクションをサポートします。
  - ダークモードの自動適応をサポート。
  - `src/config.ts` でサーバーアドレスを柔軟に設定できます。

- 📊 **Umami アナリティクス統合**
  - Umami 統計スクリプトを内蔵しており、HTML を手動で変更する必要はありません。
  - ページの PV/UV 統計表示をサポート。
  - ルーティング切り替え時の統計レポートを自動的に処理します（Swup 互換）。

## 🛠️ 設定ガイド

このプロジェクトのすべての設定項目は `src/config.ts` ファイルにあり、詳細なコメント説明が含まれています。

## 📝 Markdown 拡張構文

Astro がデフォルトでサポートしている Markdown 構文に加えて、このプロジェクトではリンクカード `::link-card` コンポーネントを拡張しました。

**構文：**

```markdown
::link-card{title="タイトル" url="リンクURL" desc="説明(オプション)" image="画像リンク(オプション)" badge="バッジ(オプション)" target="開き方 (`_blank`, `_self`, デフォルトは `_blank`)(オプション)"}
```

## 🚀 ローカルでの実行

1. リポジトリをクローン：
   ```bash
   git clone https://github.com/xiaowenmimimi/fuwari.git
   cd fuwari
   ```

2. 依存関係をインストール：
   ```bash
   pnpm install
   ```

3. 開発サーバーを起動：
   ```bash
   pnpm dev
   ```

4. 本番バージョンをビルド：
   ```bash
   pnpm build
   ```

## ⚡ よく使うコマンド

| コマンド | 説明 |
|:---|:---|
| `pnpm install` | 依存関係をインストール |
| `pnpm dev` | ローカル開発サーバーを起動 (`localhost:4321`) |
| `pnpm build` | 本番サイトを `./dist/` にビルド |
| `pnpm preview` | ビルド成果物をプレビュー |
| `pnpm new-post <filename>` | 新しい記事を作成 |

## 🤝 謝辞

- オリジナルテーマ作者：[Saicaca/fuwari](https://github.com/saicaca/fuwari)
- Bangumi 機能参考：[Kasuha](https://kasuha.com/posts/fuwari-enhance-ep2/)

## 📄 ライセンス

このプロジェクトは [MIT License](./LICENSE) オープンソースプロトコルに従っています。詳細は LICENSE ファイルをご覧ください。

[saicaca/fuwari](https://github.com/saicaca/fuwari) からフォークされました。原作者に感謝します。
