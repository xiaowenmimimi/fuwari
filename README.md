# 🍥 Fuwari (Customized Version)

![Node.js >= 20](https://img.shields.io/badge/node.js-%3E%3D20-brightgreen)
![pnpm >= 9](https://img.shields.io/badge/pnpm-%3E%3D9-blue)

📖 README: [English](./docs/README.en.md) | [简体中文](./README.md)

基于 [Astro](https://astro.build) 构建的静态博客模板 [Fuwari](https://github.com/saicaca/fuwari) 的二次开发版本。

在保留原版流畅动画和简洁设计的基础上，集成了 **Bangumi 追番**、**Waline 评论**、**Umami 统计** 等实用功能。同时对 **UI 细节** 进行了深度优化。

[**🖥️ 预览我的博客**](https://blog.xhwen.cn)

## ✨ 新增功能

相比原版 Fuwari，本项目主要添加了以下特性：

- 📺 **Bangumi 追番页面**
  - 集成 Bangumi API，自动展示追番进度。
  - 支持番剧筛选、分页展示。
  - 详情页展示番剧封面、评分、简介等信息。

- 💬 **Waline 评论系统**
  - 内置 Waline 评论组件，支持文章页评论互动。
  - 支持暗色模式自动适配。
  - 可在 `src/config.ts` 中灵活配置服务端地址。

- 📊 **Umami 统计集成**
  - 内置 Umami 统计脚本，无需手动修改 HTML。
  - 支持页面 PV/UV 统计展示。
  - 自动处理路由切换时的统计上报（兼容 Swup）。

## 🛠️ 配置指南

本项目的所有配置项均位于 `src/config.ts` 文件中，且已包含详细的注释说明。

## 📝 Markdown 扩展语法

除了 Astro 默认支持的 Markdown 语法外，本项目扩展了链接卡片 `::link-card` 组件。

**语法：**

```markdown
::link-card{title="标题" url="链接地址" desc="描述(可选)" image="图片链接(可选)" badge="角标(可选)" target="打开方式 (`_blank`, `_self`，默认 `_blank`)(可选)"}
```

## 🚀 本地运行

1. 克隆仓库：
   ```bash
   git clone https://github.com/xiaowenmimimi/fuwari.git
   cd fuwari
   ```

2. 安装依赖：
   ```bash
   pnpm install
   ```

3. 启动开发服务器：
   ```bash
   pnpm dev
   ```

4. 构建生产版本：
   ```bash
   pnpm build
   ```

## ⚡ 常用命令

| 命令 | 说明 |
|:---|:---|
| `pnpm install` | 安装依赖 |
| `pnpm dev` | 启动本地开发服务器 (`localhost:4321`) |
| `pnpm build` | 构建生产版本到 `./dist/` |
| `pnpm preview` | 预览构建产物 |
| `pnpm new-post <filename>` | 创建新文章 |

## 🤝 致谢

- 原主题作者：[Saicaca/fuwari](https://github.com/saicaca/fuwari)
- Bangumi 功能参考：[Kasuha](https://kasuha.com/posts/fuwari-enhance-ep2/)

## 📄 许可协议

本项目遵循 [MIT License](./LICENSE) 开源协议，详细查看 LICENSE 文件。

最初 Fork 自 [saicaca/fuwari](https://github.com/saicaca/fuwari)，感谢原作者。
