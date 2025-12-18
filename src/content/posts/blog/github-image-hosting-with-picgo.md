---
title: PicGo + GitHub + Cloudflare 搭建图床
published: 2025-12-05
updated: 2025-12-09
description: 搭建 PicGo + GitHub 图床，并通过 Cloudflare 实现全站 CDN 加速
image: ''
tags: [图床, 博客搭建]
category: 技术教程
draft: false
lang: zh_CN
---

# 使用 PicGo + GitHub + Cloudflare 搭建稳定图床

搭建图床方案：

- **PicGo v2.4.0**  
- **GitHub 图床仓库（Public）**  
- **Cloudflare CDN（通过 Cloudflare Pages Functions 实现加速）**  

:::note[搭建图床的作用]
从零搭建这套系统，让博客 Markdown 能直接插入 CDN 外链图片，提高写作效率与站点加载速度。
:::

---

## 一、使用到的技术栈

| 组件 | 版本 | 用途 |
|------|--------|----------------|
| **PicGo** | v2.4.0 | 本地上传图片到 GitHub |
| **GitHub** | 2025 平台 / Token Classic API | 存储图片文件 |
| **Cloudflare Pages** | 免费版 | 提供静态代理并加速 GitHub 图片 |

---

## 二、图床整体架构说明

本图床采用 GitHub 作为存储源，PicGo 作为上传工具，并通过 Cloudflare 为图片提供 CDN 加速。

:::note[流程示意：]
本地图片 → PicGo 上传 → GitHub 仓库 → Cloudflare CDN → 博客外链
:::

最终 Markdown 图片链接示例：

```markdown wrap=false showLineNumbers=false
![示例图片](https://你的域名/gh/<用户名>/<仓库名>/<分支名>/<图片路径>/<文件名>)
```

---

## 三、准备 GitHub 仓库（图床后台）
登录 [GitHub](https://github.com)

新建一个公开仓库（必须 Public 才能被 CDN 加速）

```txt
设置：
名称：myImage
描述：用于博客图床的静态资源仓库

记录下：
<用户名>
<仓库名>
<分支名>

✔ 示例
用户名：xiaowenmimimi
仓库名：myImage
分支名：main
```

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/github-image-hosting-with-picgo-1.png)

---

## 四、生成 GitHub Fine-grained Token

### 1. 打开 Token 创建入口

- GitHub → 右上角头像 → **Settings**  
- 左侧菜单 → **Developer settings**  
- 选择：**Personal access tokens → Fine-grained tokens**  
- 点击右侧按钮：**Generate new token**

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/github-image-hosting-with-picgo-2.png)

### 2. 配置 Token 基本信息

- **Token name**：PicGoUploadToken  
- **Expiration**：建议设置较长时间（安全起见可设置 90 天或 1 年）。  
- **Resource owner**：选择你的 GitHub 账号  
- **Repository access**：选择 **Only select repositories**，并勾选你的图床仓库（例如 `myImage`）

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/github-image-hosting-with-picgo-3.png)

### 3. 配置权限（最关键）

:::important[关键]
找到 Permissions 区域，在 Repository permissions 中 **只启用两个权限**：

| 权限项 | 选择 |
|--------|------|
| **Contents** | Read and write |
| **Metadata** | Read-only（默认即可） |
:::

> PicGo 上传图片只需要写入仓库内容，不需要其他敏感权限。

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/github-image-hosting-with-picgo-4.png)

### 4. 生成 Token

滚动到页面底部 → 点击 **Generate token**

GitHub 会生成一段以 `github_pat_` 开头的 Token（生成后复制，只显示一次），例如：
> github_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

---

## 五、安装 PicGo 并配置 GitHub 图床
[PicGo 下载（官方 GitHub Releases）](https://github.com/Molunerfinn/picgo/releases)
使用版本：PicGo v2.4.0

打开 PicGo → 左侧“图床设置” → “GitHub”

填写以下内容：

| 字段 | 内容 |
|--------|------|
| **图床配置名** | 填写内容 |
| **仓库名** | <用户名>/<仓库名> 例如 xiaowenmimimi/myImage |
| **分支名** | main |
| **Token** | 你的 GitHub Token |
| **存储路径** | img/blog/（可自定义） |
| **自定义域名** | https://myimage-9r1.pages.dev/gh/xiaowenmimimi/myImage/main （Cloudflare CDN 生成的地址） |

---

## 六、配置 Cloudflare CDN 加速

:::note[]
在使用 Cloudflare 实现对 GitHub 图床的 CDN 加速之前，需要了解 Cloudflare 提供的 Pages Functions —— 这是 Cloudflare Pages 内置的无服务器（Serverless）函数，用于编写 API、反向代理、重写请求等逻辑，非常适合作为 GitHub 文件的中转加速层。

> [Cloudflare Pages Functions 官网](https://www.cloudflare.com/zh-cn/)
>
> [Cloudflare Pages 官方文档](https://developers.cloudflare.com/pages/)
:::

**Cloudflare Pages Functions 特点**：
1. 支持边缘节点执行（比传统服务器更快）
2. 免费额度充足（每日 100,000 次请求）
3. 适合 GitHub 静态文件的代理加速
4. 无需自己的服务器、无需备案

### 1. 新建 Cloudflare Pages 项目

- 在 Cloudflare 控制台：
- 左侧菜单：Workers 和 Pages
- 创建应用程序

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/cloudflare-pages-1.png)

- 选择 Connect GitHub

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/cloudflare-pages-2-2.png)

- 选择底部的 Get started

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/cloudflare-pages-2.png)

- 导入现有 GitHub 仓库
- 绑定一个仓库（我这里绑定的是刚刚新建在 GitHub 的 myImage 仓库）

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/cloudflare-pages-3.png)

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/cloudflare-pages-4.png)

- 维持默认配置后，保存并部署

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/cloudflare-pages-5.png)

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/cloudflare-pages-6.png)

### 2. 创建静态代理 Functions

:::important[GitHub 仓库文件配置]
在绑定的仓库根目录下创建`/functions/gh`文件夹，文件夹下创建文件`[[path]].js`，填入以下内容：
:::

```js wrap=false
<!-- /functions/gh/[[path]].js -->
export async function onRequest(context) {
  // [[path]] 对应的参数名就是 path，这里会是一个数组
  const segments = context.params.path || [];
  const path = segments.join("/");

  // 组装成 GitHub Raw 地址
  const url = `https://raw.githubusercontent.com/${path}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000"
    },
    status: res.status
  });
}
```

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/cloudflare-pages-7.png)

:::tip[]
Cloudflare 会自动缓存资源。
:::

### 3. 部署 Cloudflare Pages

部署完成后 Cloudflare 会生成默认域名，例如：

> https://your-project.pages.dev

:::tip[配置使用自定义域名（可选）]
例如：

> https://img.xhwen.cn

只需添加 CNAME 解析到 Cloudflare Pages。

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/cloudflare-pages-8.png)
:::

### 4. 最终 CDN URL 格式

将图片从 GitHub 映射到 Cloudflare：

> https://myimage-9r1.pages.dev/gh/<用户名>/<仓库名>/<分支名>/<路径>/<图片文件名>

```txt wrap=false showLineNumbers=false
https://myimage-9r1.pages.dev/gh/xiaowenmimimi/myImage/main/img/blog/sample_pictures.jpg
```

:::note[PicGo 配置修改]
在 PicGo 的 GitHub 图床设置中，将 自定义域名 修改为：

> https://myimage-9r1.pages.dev/gh/<用户名>/<仓库名>/<分支名>


例如：

> https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main

PicGo 上传后生成的 URL 自动使用 Cloudflare CDN 链接。
:::

---

## 七、测试上传图片

- 拖一张图片进 PicGo

- 上传成功后，PicGo 会返回 CDN 链接

- 在浏览器打开检查是否正常显示

---

## Astro 博客中的示例截图

这里是写作过程中的一个界面：

![示例图片](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/sample_pictures.jpg)
:::tip[]
Fuwari 本身支持响应式图片布局，因此无需额外适配。
:::