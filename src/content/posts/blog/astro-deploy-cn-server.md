---
title: GitHub Actions 自动部署 Astro 博客到服务器
published: 2025-12-18
description: 使用 Nginx + GitHub Actions 实现每次 git push main 后，项目自动构建并把最新的静态产物部署到服务器，通过 Nginx 对外提供访问。
tags: [GitHub, 博客搭建]
category: 技术教程
draft: false
---

## 背景说明

在当前的个人博客 / 静态站点部署实践中，**Cloudflare Pages** 提供了非常友好的体验：

* 原生 GitHub 集成，自动构建与发布
* 全球 CDN 分发
* 几乎零运维成本

但在**中国大陆网络环境**下，访问 Cloudflare Pages 往往存在以下现实问题：

* 跨境网络 RTT 高、稳定性不可控
* 首次访问 TTFB 偏大
* 不同运营商访问体验差异明显

另一方面，完全放弃 Cloudflare Pages、迁移到国内云平台也并非理想方案：

* 丢失 Cloudflare Pages 的自动化优势
* 运维与 CI 成本上升
* 海外访问体验下降

**因此，一个我认为更务实的目标是：**

> **保留 Cloudflare Pages 作为海外入口，**
> 
> **同时增加一台国内服务器作为国内访问入口，**
> 
> **并通过自动化部署保证两端内容一致。**

:::important[DNS 国内 / 海外分流方案]
[**阿里云 DNS + Cloudflare Pages 实现国内 / 海外分流**](/posts/blog/dns-geo-split-aliyun-cloudflare/)
:::

:::tip[未采用的方案]
曾在网上搜索解决方案，评估通过 DNS SaaS 或 Cloudflare Workers 路由分流的方式，对网站解析 IP 进行优选以提升可用性与访问速度。

但在 Cloudflare Pages 场景下：

* **SaaS 解析优选**依赖固定源站 IP，而 Pages 属于“边缘即源站”，解析结果不可控，长期稳定性不足；
* **Workers 路由分流** 只能在请求到达 Cloudflare 后生效，无法消除中国大陆访问 Cloudflare 的跨境链路瓶颈。

上述方案在一定程度上可以提升可用性，但均**无法解决国内访问 Cloudflare 的根本网络问题**。

最终选择引入一个**物理上位于国内的访问入口**，并通过自动化手段降低维护成本。
:::

---

## 一、方案概述

### 方案目标

* **提供一个国内访问更稳定的静态入口**
* **保留 Cloudflare Pages 的自动化部署与海外访问优势**
* **通过 GitHub Actions 实现全自动部署**
* **所有部署过程完全自动化**
* **任一入口失败不影响另一侧**

### 整体架构说明

```txt showLineNumbers=false
GitHub Repository
        │
        │ git push main
        ▼
GitHub Actions（CI）
        │
        ├─ 安装依赖
        ├─ 构建静态产物（dist/）
        ├─ 上传到国内服务器（rsync）
        └─ 原子切换线上目录
                 │
                 ▼
            Nginx 静态站点
```

同时，Cloudflare Pages 继续监听同一 GitHub 仓库，并由 Cloudflare 平台独立完成构建与发布流程。

国内服务器的部署流程由 GitHub Actions 单独负责，两条部署链路相互独立、互不依赖，仅共享同一份源代码。

* Cloudflare Pages 仍然监听同一个仓库
* 使用 Cloudflare 的自动构建与发布
* 两端使用 同一份代码、同一份构建逻辑

---

## 二、服务器部署设计

### 目录结构（版本化发布）

```bash showLineNumbers=false
/var/www/my-site/
├── releases/                    # 每个部署版本都有一个独立目录
│   ├── 20251217093001/
│   ├── 20251218084512/
│   └── ...
└── current -> releases/20251218084512
```

创建并授权：

```bash showLineNumbers=false
mkdir -p /var/www/my-site/releases/
chown -R deploy:deploy  /var/www/my-site/
```

> `deploy` 为推荐的部署用户（可用 root，但不建议）

设计原则：

* 每个部署版本都有一个独立的目录，方便回滚与审计。
* 使用软链接进行原子切换，确保切换过程中网站始终可用。
* 构建失败不影响当前线上版本，可快速回滚。

### Nginx 配置示例

> 说明：
> 
> 本节示例使用 HTTP（80 端口）仅用于验证自动化部署链路是否正常。
> 
> 实际生产环境中，建议后续启用 HTTPS（443），并将 80 端口仅用于跳转。

```nginx
<!-- /etc/nginx/conf.d/my-site.conf -->
server {
    listen 80;
    server_name cn.blog.xhwen.cn;       # 域名

    root /var/www/my-site/current;
    index index.html;

    # 静态站：优先找文件/目录，找不到就 404
    location / {
        try_files $uri $uri/ $uri/index.html =404;
    }

    # gzip（只压文本）
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain text/css text/xml
        application/json application/javascript application/xml
        application/rss+xml image/svg+xml;

    # 静态资源缓存
    location ~* \.(?:css|js|mjs|map|jpg|jpeg|png|gif|webp|svg|ico|woff2|woff|ttf)$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        access_log off;
        try_files $uri =404;
    }
}
```

测试并加载：

```bash showLineNumbers=false
nginx -t
nginx -s reload
```

服务器仅用于**静态文件托管**，不参与构建过程。

---

## 三、GitHub 仓库配置（关键）

### 1. 配置 SSH Key（用于部署）

:::important[在**本地**生成部署用密钥：]
```bash  showLineNumbers=false
ssh-keygen -t ed25519 -C "github-actions-deploy"
```

* 私钥：用于 GitHub Actions
* 公钥`.pub`：放到服务器

**把公钥加入服务器：**

```bash  showLineNumbers=false
cat id_ed25519.pub >> ~/.ssh/authorized_keys
```
:::

### 2. GitHub Secrets 配置

:::important[项目配置]
**项目仓库 → Settings → Secrets and variables → Actions → Repository secrets → New repository secret**

> 本文示例使用 Repository secrets，
> 
> 以保证部署流程简洁、可直接自动执行。
> 
> 若在团队或生产场景中，可进一步引入 Environment secrets 与审批机制。

新增以下 Secrets：

| 名称                    | 说明             |
| ---------------------- | --------------- |
| `CN_HOST`       | 国内服务器 IP 或域名 |
| `CN_USER`          | SSH 用户名（如 `deploy`） |
| `CN_SSH_PRIVATE_KEY` | **私钥完整内容**（含 BEGIN/END） |
:::
![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/astro-deploy-cn-server-1.png)

---

## 四、GitHub Actions 自动部署配置

在项目下新建文件：`.github/workflows/deploy-cn-server.yml`

GitHub 会自动识别该路径下的 workflow 文件。

**完整配置**

> 安装依赖以及打包部署使用的是 `pnpm`

```yaml
<!-- .github/workflows/deploy-cn-server.yml -->
# Workflow 名称，会显示在 GitHub Actions 页面
name: Deploy to CN Server (Nginx)

# 触发条件
on:
  # 当 main 分支有 push 时自动触发
  push:
    branches: [ main ]

  # 允许在 GitHub Actions 页面手动触发
  workflow_dispatch:

jobs:
  deploy:
    # 使用 GitHub 提供的 Ubuntu Runner
    runs-on: ubuntu-latest

    steps:
      # =========================
      # 1. 拉取仓库代码
      # =========================
      - name: Checkout code
        uses: actions/checkout@v4
        # 作用：
        # - 将当前仓库代码拉到 Runner 本地
        # - 后续 build、rsync 都基于这份代码

      # =========================
      # 2. 安装 pnpm
      # =========================
      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      # =========================
      # 3. 安装 Node.js
      # =========================
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
        # 作用：
        # - 使用稳定的 Node.js 版本
        # - 启用 pnpm 缓存，加快后续构建速度

      # =========================
      # 4. 安装项目依赖
      # =========================
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        # --frozen-lockfile：
        # - 确保依赖版本严格与 pnpm-lock.yaml 一致
        # - 防止 CI 中隐式升级依赖

      # =========================
      # 5. 构建 Astro 项目
      # =========================
      - name: Build project
        run: pnpm build
        # 输出结果：
        # - 构建完成后生成 dist/ 目录
        # - dist/ 即最终需要部署到服务器的静态文件

      # =========================
      # 6. 配置 SSH 环境
      # =========================
      - name: Setup SSH
        run: |
          # 创建 SSH 目录
          mkdir -p ~/.ssh

          # 写入私钥（来自 GitHub Secrets）
          echo "${{ secrets.CN_SSH_PRIVATE_KEY }}" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519

          # 将服务器加入 known_hosts，避免首次连接交互确认
          ssh-keyscan -H ${{ secrets.CN_HOST }} >> ~/.ssh/known_hosts
        # 作用：
        # - 让 Runner 可以无交互地 SSH 登录服务器
        # - 私钥通过 GitHub Secrets 安全注入

      # =========================
      # 7. 上传构建产物到服务器
      # =========================
      - name: Upload dist to server
        run: |
          # 使用时间戳作为版本号
          TS=$(date +%Y%m%d%H%M%S)
          echo "RELEASE_TS=$TS" >> $GITHUB_ENV

          # 在服务器上创建新版本目录
          ssh ${{ secrets.CN_USER }}@${{ secrets.CN_HOST }} \
            "mkdir -p /var/www/my-site/releases/$TS"

          # 使用 rsync 上传 dist/ 内容
          rsync -az --delete ./dist/ \
            ${{ secrets.CN_USER }}@${{ secrets.CN_HOST }}:/var/www/my-site/releases/$TS/
        # rsync 参数说明：
        # -a：保留文件权限、时间等
        # -z：压缩传输，减少网络开销
        # --delete：保证目标目录与 dist/ 完全一致

      # =========================
      # 8. 原子切换 current 软链接
      # =========================
      - name: Switch current symlink
        run: |
          ssh ${{ secrets.CN_USER }}@${{ secrets.CN_HOST }} "\
            # 将 current 指向最新版本（原子操作）
            ln -sfn /var/www/my-site/releases/${{ env.RELEASE_TS }} /var/www/my-site/current && \
            # 清理旧版本（保留最近 5 个）
            ls -1dt /var/www/my-site/releases/* | tail -n +6 | xargs -r rm -rf \
          "
        # 作用：
        # - ln -sfn：原子切换，不会出现“半更新”状态
        # - 自动清理旧版本，避免磁盘无限增长

```

---

## 五、发布流程

**日常发布**

* 推送 `main` 分支代码到 GitHub 仓库。
* GitHub Actions 自动触发构建与部署。

```bash showLineNumbers=false
git add .
git commit -m "update content"
git push origin main
```

**回滚方式**

服务器执行：

```bash showLineNumbers=false
ln -sfn /var/www/my-site/releases/<旧版本> /var/www/my-site/current
```

---

## 六、常见问题与排查

### 1. Actions 连接不上服务器

* 检查：

  * IP 是否正确
  * SSH 端口是否是 22（非 22 需改命令）
  * 私钥是否完整粘贴

### 2. 页面 404 / 没更新

* 确认：

  * Nginx root 指向 current
  * dist/ 是否包含 index.html
  * 是否缓存浏览器（强刷）
