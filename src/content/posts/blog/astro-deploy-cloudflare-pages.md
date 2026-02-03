---
title: 使用 Cloudflare Pages 自动部署 Astro 博客
published: 2025-12-12
description: Astro 博客部署教程，从 GitHub 仓库到 Cloudflare Pages 自动部署成功上线的完整流程
tags: [Cloudflare, 博客搭建]
category: 技术教程
draft: false
---

## 背景说明

之前的博客是部署在 `https://xiaowenmimimi.github.io`（GitHub Pages）上。

在重新搭建 Astro 博客时，我希望：

* 保持 **静态博客的简单性**
* 减少自维护 CI / 服务器的成本
* 获得更现代的 **自动构建 + 预览部署** 体验

最终选择了 [**Cloudflare Pages**](https://dash.cloudflare.com/) 作为新的部署平台。

---

## 为什么选择 Cloudflare Pages

* **原生支持 Git 仓库自动构建**（push 后自动拉取、安装依赖、构建并发布）
* 每次提交 / 分支都会生成独立预览地址，适合调主题、调样式
* 全球 CDN 分发，访问速度稳定
* 免费额度对个人博客非常友好
* 对 Astro 支持完善，基本无需额外适配

---

## 最终效果

完成本文全部步骤后，你将获得：

* 一个通过 **Cloudflare Pages 自动构建并部署** 的 Astro 博客
* 一个默认可访问的站点地址：

> https://your-project-name.pages.dev

* 后续只需 `git push`，即可自动更新线上博客

---

## 一、前置条件

在开始之前，请确保你已经准备好：

* 一个可以在本地成功运行 `pnpm build` (npm 使用 `npm run build` 命令) 的 Astro 项目
* 一个 GitHub 仓库（已 push 代码）
* 一个 Cloudflare 账号

:::tip[]
[Cloudflare Pages Functions 官网](https://www.cloudflare.com/zh-cn/)

[Cloudflare Pages 官方文档](https://developers.cloudflare.com/pages/)
:::

---

## 二、Astro 项目配置

### 1️⃣ astro.config.mjs 文件配置

如果 **使用 Cloudflare 提供的默认 `*.pages.dev` 域名**，可以保持配置非常简单：

```js title="astro.config.mjs" {4}
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://your-project-name.pages.dev",
  ...
});
```

> 如果暂时不确定最终域名，也可以先不写 `site`，不影响部署结果。

### 2️⃣ 构建输出目录

Astro 默认的构建输出目录是： `dist/`

Cloudflare Pages 会直接使用该目录作为站点发布内容，无需额外配置。

---

## 三、在 Cloudflare Pages 创建项目

### 1️⃣ 创建 Pages 项目

- 在 Cloudflare 控制台
- 左侧菜单：Workers 和 Pages
- 创建应用程序

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/cloudflare-pages-1.png)

- 选择 **Connect to Git**，并授权 GitHub

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/astro-deploy-cloudflare-pages-1.png)

- 选择底部的 **Get started**

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/cloudflare-pages-2.png)

### 2️⃣ 构建配置（关键步骤）

选择你的 Astro 博客仓库

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/astro-deploy-cloudflare-pages-2.png)

:::important[在 **Build settings** 中填写以下内容：]
| 配置项                    | 推荐值             |
| ---------------------- | --------------- |
| 框架预设       | Astro           |
| 构建命令          | `pnpm build` |
| 构建输出目录 | `dist`          |
:::
![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/astro-deploy-cloudflare-pages-3-2.png)

> 如果你的 Astro 项目结构比较特殊，可以再单独调整 Root directory。

### 3️⃣ 保存并首次部署

点击 **保存并部署**，Cloudflare Pages 会自动执行：

1. 拉取 GitHub 仓库代码
2. 安装依赖
3. 执行构建命令
4. 发布站点

部署完成后，你将看到一个类似下面的访问地址：

> https://fuwari-d9b.pages.dev

:::tip[**成功判断标准：**]
* 能正常打开上述地址
* 首页样式与静态资源（CSS/JS/图片）加载正常
* 刷新页面不会出现 404（纯静态多页面一般不会）
:::

---

## 四、日常更新流程

之后的日常使用流程非常简单：

```txt showLineNumbers=false
本地写文章 / 修改主题
        ↓
git commit && git push
        ↓
Cloudflare Pages 自动构建
        ↓
新版本博客自动上线
```

:::tip[**成功判断标准：**]
- Cloudflare Pages 的 Deploy 状态显示为 *Success*
- 重新打开站点能看到你本次提交带来的改动（标题/样式/文章内容等）
:::

**额外优势**

* 每个分支 / Pull Request 都会生成 **独立的预览地址**
* 非常适合调试主题样式或大改页面结构

:::warning[免费版限制]
* Cloudflare Pages 免费版：**每月 500 次构建**
* 对个人博客来说通常绰绰有余
:::

---

## 五、绑定独立域名（可选）

> 可以在博客稳定运行后再进行。

### 1️⃣ 添加自定义域名

路径：

打开需要配置的项目，进入设置页面，填写自定义域名

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/astro-deploy-cloudflare-pages-4-2.png)


### 2️⃣ DNS 配置

Cloudflare 会给出提示，一般是：

* 登录 DNS 提供商，添加对应的 CNAME 记录
* 添加一条 CNAME
* 指向 `your-project-name.pages.dev`
> 如果域名本身就在 Cloudflare，通常可以一键完成。

:::note[HTTPS]
* Cloudflare Pages 会自动签发 HTTPS 证书
* 无需手动申请或配置
:::