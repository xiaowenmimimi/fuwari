---
title: PicGo + GitHub + jsDelivr 搭建图床
published: 2025-12-06
updated: 2025-12-08
description: 搭建 PicGo + GitHub 图床，并通过 jsDelivr 实现全站 CDN 加速
image: ''
tags: [图床, 博客搭建]
category: 技术教程
draft: false
lang: zh_CN
---

# 使用 PicGo + GitHub + jsDelivr 搭建稳定图床

搭建图床方案：

- **PicGo v2.4.0**  
- **GitHub 图床仓库（Public）**  
- **jsDelivr CDN**  

:::note[搭建图床的原因]
从零搭建这套系统，让博客 Markdown 能直接插入 CDN 外链图片，提高写作效率与站点加载速度。
:::

---

## 一、使用到的技术栈

| 组件 | 版本 | 用途 |
|------|--------|----------------|
| **PicGo** | v2.4.0 | 本地上传图片到 GitHub |
| **GitHub** | 2025 平台 / Token Classic API | 存储图片文件 |
| **jsDelivr** | 2025 稳定版 | 加速 GitHub 静态资源 |

---

## 二、图床整体架构说明

本图床采用 GitHub 作为存储源，PicGo 作为上传工具，并通过 jsDelivr 为图片提供 CDN 加速。

:::note[流程示意：]
本地图片 → PicGo 上传 → GitHub 仓库 → jsDelivr CDN → 博客外链
:::

最终 Markdown 图片链接示例：

```markdown
![示例图片](https://cdn.jsdelivr.net/gh/<用户名>/<仓库名>/<文件夹名>/<图片文件名>)
```

---

## 三、准备 GitHub 仓库（图床后台）
登录 [GitHub](https://github.com)

新建一个公开仓库（必须 Public 才能被 CDN 加速）

```tex
设置：
名称：myImage
描述：用于博客图床的静态资源仓库

记录下：
<用户名>
<仓库名>

✔ 示例
用户名：xiaowenmimimi
仓库名：myImage
```

![](https://cdn.jsdelivr.net/gh/xiaowenmimimi/myImage/img/blog/github-image-hosting-with-picgo-1.png)

---

## 四、生成 GitHub Fine-grained Token

### 1. 打开 Token 创建入口

- GitHub → 右上角头像 → **Settings**  
- 左侧菜单 → **Developer settings**  
- 选择：**Personal access tokens → Fine-grained tokens**  
- 点击右侧按钮：**Generate new token**

![](https://cdn.jsdelivr.net/gh/xiaowenmimimi/myImage/img/blog/github-image-hosting-with-picgo-2.png)

### 2. 配置 Token 基本信息

- **Token name**：PicGoUploadToken  
- **Expiration**：建议设置较长时间（安全起见可设置 90 天或 1 年）。  
- **Resource owner**：选择你的 GitHub 账号  
- **Repository access**：选择 **Only select repositories**，并勾选你的图床仓库（例如 `myImage`）

![](https://cdn.jsdelivr.net/gh/xiaowenmimimi/myImage/img/blog/github-image-hosting-with-picgo-3.png)

### 3. 配置权限（最关键）

:::important[关键]
找到 Permissions 区域，在 Repository permissions 中 **只启用两个权限**：

| 权限项 | 选择 |
|--------|------|
| **Contents** | Read and write |
| **Metadata** | Read-only（默认即可） |
:::

> PicGo 上传图片只需要写入仓库内容，不需要其他敏感权限。

![](https://cdn.jsdelivr.net/gh/xiaowenmimimi/myImage/img/blog/github-image-hosting-with-picgo-4.png)

### 4. 生成 Token

滚动到页面底部 → 点击 **Generate token**

GitHub 会生成一段以 `github_pat_` 开头的 Token（生成后复制，只显示一次），例如：
>github_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

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
| **自定义域名** | https://cdn.jsdelivr.net/gh/xiaowenmimimi/myImage/ |

---

## 六、配置 jsDelivr CDN 加速
:::note[]
GitHub 原始链接速度较慢，不适合作为图片外链，因此使用 jsDelivr 加速。
:::

CDN URL 格式：

示例填写到 PicGo 的 自定义域名：
```url
https://cdn.jsdelivr.net/gh/<用户名>/<仓库名>/
```

PicGo 上传后，最终图片 URL 将类似：

```url
https://cdn.jsdelivr.net/gh/xiaowenmimimi/myImage/img/blog/sample_pictures.jpg
```

---

## 七、测试上传图片

- 拖一张图片进 PicGo

- 上传成功后，PicGo 会返回 CDN 链接

- 在浏览器打开检查是否正常显示

---

## Astro 博客中的示例截图

这里是写作过程中的一个界面：

![示例图片](https://cdn.jsdelivr.net/gh/xiaowenmimimi/myImage/img/blog/sample_pictures.jpg)
:::tip[]
Fuwari 本身支持响应式图片布局，因此无需额外适配。
:::