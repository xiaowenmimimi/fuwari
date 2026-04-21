# 🍥 Fuwari (Customized Version)

![Node.js >= 20](https://img.shields.io/badge/node.js-%3E%3D20-brightgreen)
![pnpm >= 9](https://img.shields.io/badge/pnpm-%3E%3D9-blue)

📖 README: [English](./README.en.md) | [简体中文](../README.md)

A customized version of the static blog template [Fuwari](https://github.com/saicaca/fuwari) built with [Astro](https://astro.build).

While retaining the original smooth animations and clean design, this version integrates practical features such as **Bangumi Tracking**, **Waline Comments**, **Umami Analytics**, etc. At the same time, the **UI details** have been deeply optimized.

[**🖥️ Preview My Blog**](https://blog.xhwen.cn)

## ✨ New Features

Compared to the original Fuwari, this project mainly adds the following features:

- 📺 **Bangumi Tracking Page**
  - Integrated Bangumi API to automatically display viewing progress.
  - Supports anime filtering and pagination.
  - Detail page displays anime cover, rating, summary, and other information.

- 💬 **Waline Comment System**
  - Built-in Waline comment component, supporting comment interaction on post pages.
  - Supports automatic dark mode adaptation.
  - Flexible server address configuration in `src/config.ts`.

- 📊 **Umami Analytics Integration**
  - Built-in Umami analytics script, no need to manually modify HTML.
  - Supports page PV/UV statistics display.
  - Automatically handles statistics reporting when switching routes (compatible with Swup).

## 🛠️ Configuration Guide

All configuration items for this project are located in the `src/config.ts` file and include detailed explanatory comments.

## 📝 Markdown Extended Syntax

In addition to the Markdown syntax supported by Astro by default, this project extends the `::link-card` component.

**Syntax:**

```markdown
::link-card{title="Title" url="Link URL" desc="Description(Optional)" image="Image URL(Optional)" badge="Badge(Optional)" target="Target (`_blank`, `_self`, default `_blank`)(Optional)"}
```

## 🚀 Running Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/xiaowenmimimi/fuwari.git
   cd fuwari
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```

4. Build the production version:
   ```bash
   pnpm build
   ```

## ⚡ Common Commands

| Command | Description |
|:---|:---|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start local development server (`localhost:4321`) |
| `pnpm build` | Build production site to `./dist/` |
| `pnpm preview` | Preview build output |
| `pnpm new-post <filename>` | Create a new post |

## 🤝 Acknowledgements

- Original Theme Author: [Saicaca/fuwari](https://github.com/saicaca/fuwari)
- Bangumi Feature Reference: [Kasuha](https://kasuha.com/posts/fuwari-enhance-ep2/)

## 📄 License

This project follows the [MIT License](./LICENSE) open source protocol. See the LICENSE file for details.

Originally forked from [saicaca/fuwari](https://github.com/saicaca/fuwari), thanks to the original author.
