---
title: 部署 Umami 服务统计博客的访客数、浏览量
published: 2026-01-08
description: 在 CentOS 7.9 服务器上，使用 Docker + docker-compose 部署 Umami 统计服务的过程，并通过 Nginx 反向代理启用 HTTPS，用于博客的访客数、浏览量与文章访问统计。
tags: [博客搭建, Umami, Nginx]
category: 技术教程
draft: false
---

## 方案说明

为了给博客增加 **文章浏览量与访客统计功能**，同时保持对数据的可控性，我选择在自己的服务器上部署 **Umami** 作为统计方案。

本文记录的是一次部署实践，适用于：

- CentOS 7.9
- Nginx 反向代理
- 静态博客（Astro / Fuwari）
- 自建统计服务

:::tip[为什么选择自建 Umami，而不是第三方统计？]
**第一，数据掌控感更强。**
自建 Umami 意味着统计数据完全保存在自己的服务器上，不依赖任何第三方平台，也不需要把访客数据交给外部服务。这种“数据在自己手里”的感觉，会更安心一些。

**第二，隐私友好。**
Umami 默认不使用 Cookie，也不会收集多余的个人信息，对访客更友好，也更符合我对博客“轻量、克制”的期待。

**第三，可控且可扩展。**
作为自建服务，如果以后想把统计数据接入博客侧边栏，或者在文章页展示阅读次数，都可以按自己的需求来做，而不是受限于第三方平台的展示方式。

自建 Umami 不是为了“更专业”，而是为了让博客整体保持一种**简单、可控、不过度依赖外部服务**的状态。
:::

### 实现目标

部署完成后，可以实现以下功能：

- **访客数（UV）**
- **总浏览量（PV）**
- **各页面 / 文章浏览量**
- **可视化后台统计面板**

### 架构说明

- 浏览器访问你的博客页面（Cloudflare Pages 或 Nginx 静态站点都行）
- 页面里嵌入 Umami 的统计脚本：`https://analytics.example.com/script.js`
- 脚本会把 PV/UV 等数据上报到你自建的 Umami 服务
- Umami 后台面板也通过 `https://analytics.example.com` 访问

```text showLineNumbers=false
浏览器
  ↓（加载博客页面）
博客站点（Astro / Fuwari）
  ↓（加载统计脚本）
https://analytics.example.com/script.js
  ↓
Nginx（反向代理，HTTPS）
  ↓
Docker 容器（Umami）
  ↓
Docker 容器（PostgreSQL）                  
```

---

## 使用 Docker 部署 Umami 统计服务（Nginx + HTTPS）

### 服务器环境

- 操作系统：CentOS 7.9
- Web Server：Nginx 1.20.x
- 容器：Docker + docker-compose
- 数据库：PostgreSQL ≥ 12（建议 14/15）

### 域名与访问方式

建议为 Umami 单独使用一个子域名，例如：`analytics.example.com`

该域名通过 Nginx 反向代理访问 Umami 服务，同时启用 HTTPS。

DNS 添加一条 A 记录指向服务器公网 IP。

> 建议 Umami 用独立子域名：
> - 不和博客站点混在一起
> - Nginx 配置更清晰
> - 后续可以单独加访问控制/防护策略

### 安装 Docker 与 docker-compose

**安装 Docker（阿里云镜像）**

```bash showLineNumbers=false
yum install -y yum-utils
yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
yum install -y docker-ce-20.10.24 docker-ce-cli-20.10.24 containerd.io
```

**启动并设置开机自启**

```bash showLineNumbers=false
systemctl start docker
systemctl is-enabled docker
docker -v
```

**配置阿里云 Docker 镜像加速器**

进入阿里云控制台：**容器镜像服务 ACR → 镜像工具 → 镜像加速器**

会给你一个专属地址，形如：`https://xxxxxx.mirror.aliyuncs.com`

> [阿里云官方镜像加速](https://help.aliyun.com/zh/acr/user-guide/accelerate-the-pulls-of-docker-official-images)

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/deploy-umami-with-docker-0.png)

```bash showLineNumbers=false
mkdir -p /etc/docker

cat >/etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": [
    "https://xxxxxx.mirror.aliyuncs.com"
  ],
  "dns": ["223.5.5.5", "114.114.114.114"]
}
EOF
```

> **说明：**
> - `registry-mirrors`：配置阿里云镜像加速器（你提供的地址）
> - `dns`：避免某些环境下拉镜像时的 DNS 抖动（加了更稳）

```bash showLineNumbers=false
systemctl daemon-reload
systemctl restart docker
```

**安装 compose 插件**

```bash showLineNumbers=false
yum install -y docker-compose-plugin
```

**验证**

```bash showLineNumbers=false
docker compose version
```

### 创建 Umami 部署目录（关键：数据持久化与可维护性）

建议单独放在 `/opt/umami`（清晰、好管理）：

```bash showLineNumbers=false
mkdir -p /opt/umami
cd /opt/umami
```

建议再建两个子目录，用于持久化数据与备份：

```bash showLineNumbers=false
mkdir -p postgres backups
```

- `postgres/`：PostgreSQL 数据卷（容器重启/更新不会丢数据）
- `backups/`：手动导出 SQL 备份文件（升级前强烈建议备份）

### 编写 docker-compose.yml

在 `/opt/umami` 目录下创建 `docker-compose.yml`：

```bash showLineNumbers=false
vim /opt/umami/docker-compose.yml
```

填入（**推荐 PostgreSQL 15 阿里云镜像 + Umami 官方镜像**）：

```yaml
<!-- /opt/umami/docker-compose.yml -->
version: "3.9"

services:
  db:
    image: m.daocloud.io/docker.io/library/postgres:15
    container_name: umami-db
    restart: unless-stopped
    environment:
      # 数据库名/用户/密码：你可以改，但要和下面 Umami 的 DATABASE_URL 对应
      POSTGRES_DB: umami
      POSTGRES_USER: umami
      POSTGRES_PASSWORD: "CHANGE_ME_STRONG_PASSWORD"
    volumes:
      # 关键：持久化数据库数据，否则容器删除/重建会丢数据
      - ./postgres:/var/lib/postgresql/data
    healthcheck:
      # 让 Umami 等数据库健康后再启动（减少首次启动时的报错概率）
      test: ["CMD-SHELL", "pg_isready -U umami -d umami"]
      interval: 10s
      timeout: 5s
      retries: 5

  umami:
    # 官方文档示例给出了预构建镜像拉取方式（含 postgresql 支持）:contentReference[oaicite:1]{index=1}
    # 你可以用官方推荐的 registry 域名：
    image: docker.umami.is/umami-software/umami:postgresql-latest
    # 也可以用 Docker Hub 的镜像标签（如果你拉取更顺手）:contentReference[oaicite:2]{index=2}
    # image: umamisoftware/umami:postgresql-latest

    container_name: umami
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy

    environment:
      # 关键：连接的是 compose 网络内的 db 服务（host 写 db，不是 127.0.0.1）
      DATABASE_URL: "postgresql://umami:CHANGE_ME_STRONG_PASSWORD@db:5432/umami"

      # 关键：用于加密会话/令牌。必须随机且足够长。:contentReference[oaicite:3]{index=3}
      APP_SECRET: "CHANGE_ME_RANDOM_SECRET"

      # 建议填写你对外访问的完整 URL（含 https）
      APP_URL: "https://analytics.example.com"

    ports:
      # 关键：只绑定到 127.0.0.1，避免 Umami 端口直接暴露公网
      # 外部访问统一走 Nginx 反向代理 + HTTPS
      - "127.0.0.1:3000:3000"
```

**必须改的值**

1. `POSTGRES_PASSWORD` 与 `DATABASE_URL` 里的密码：

- `CHANGE_ME_STRONG_PASSWORD` → 改成强密码（建议 16+ 位，含大小写/数字/符号）

2. `APP_SECRET`：会话加密密钥（建议随机、足够长）

- `CHANGE_ME_RANDOM_SECRET` → 用随机值替换（至少 32 字节）

3. `APP_URL`：对外访问的完整 URL（含 https）

- `https://analytics.example.com` → 改成你实际的域名

生成随机密钥（复制输出替换进去）：

```bash showLineNumbers=false
openssl rand -base64 32
```

:::tip[为什么要 127.0.0.1:3000:3000]
Umami 本体没必要直接暴露公网；公网只开放 80/443 给 Nginx，安全面会小很多。
:::

---

### 启动 Umami

在 `/opt/umami` 目录下执行：

```bash showLineNumbers=false
cd /opt/umami
docker compose up -d
```

查看容器状态：

```bash showLineNumbers=false
docker compose ps
```

**本机验证 Umami 是否已启动：**

> 因为我们只绑定到 127.0.0.1，所以在服务器本机验证：

```bash showLineNumbers=false
curl -I http://127.0.0.1:3000
```

看到 `200/302` 一类响应，说明 Umami 服务已在本机可用。

### 配置 Nginx 反向代理

创建站点配置文件（推荐独立文件，便于管理）：

```bash showLineNumbers=false
vim /etc/nginx/conf.d/umami.conf
```

写入：

```nginx
<!--/etc/nginx/conf.d/umami.conf-->
server {
    # 80 强制跳转到 443
    listen 80;
    server_name analytics.example.com;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl http2;
    server_name analytics.example.com;

    # ssl证书
    ssl_certificate     /etc/nginx/ssl/analytics.example.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/analytics.example.com/privkey.pem;

    # 反代到本机 Umami（只在 127.0.0.1:3000 监听）
    location / {
        proxy_pass http://127.0.0.1:3000;

        # 这些 header 很关键：让 Umami 识别真实域名、访客 IP、协议
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 可选：减少一些代理相关的小问题
        proxy_http_version 1.1;
        proxy_buffering off;
    }
}
```

检查并重载 Nginx：

```bash showLineNumbers=false
nginx -t
nginx -s reload
```

此时访问（HTTP）应可打开：`https://analytics.example.com`

### 首次登录 Umami 后台（默认账号）

访问：

- https://analytics.example.com

默认管理员账号通常是：

- admin
- umami

> 强烈建议：第一次登录后立刻修改密码（Settings / Profile 里改）。

### 在 Umami 后台添加站点 & 获取统计脚本

1. 后台创建 Website（站点）

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/deploy-umami-with-docker-1.png)

2. 填你的博客域名（例如 `blog.example.com`）

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/deploy-umami-with-docker-2.png)

3. 保存后得到一段脚本，形如：

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/deploy-umami-with-docker-3.png)

```html showLineNumbers=false
<script async defer data-website-id="YOUR_WEBSITE_ID" src="https://analytics.example.com/script.js"></script>
```

把脚本加到博客全局布局（例如 Layout 的 <head> 或 <body> 底部）。

> 之后访问博客任意页面，Umami 会记录：
> - PV/UV
> - Top pages
> - 每个页面（URL）的访问量

### 验证是否统计成功

**浏览器 Network 验证**

打开博客页面 → F12 → Network，检查是否请求了：

- `https://analytics.example.com/script.js`
- `https://analytics.example.com/api/send` 或类似上报接口（版本可能略有不同）

**Umami 后台验证**

进入 Dashboard 看实时数据是否增长（PV/Visitors）。

---

## 备份与升级

### 备份 PostgreSQL

在 `/opt/umami` 下执行：

```bash showLineNumbers=false
cd /opt/umami
# 导出 SQL 到本地 backups 目录
docker compose exec -T db pg_dump -U umami umami > backups/umami-$(date +%F-%H%M).sql
```

### 升级 Umami 版本

拉最新镜像并重启：

```bash showLineNumbers=false
docker compose pull
docker compose up -d
```

> 如果升级后异常：可以用备份 SQL 恢复数据库，然后回退镜像版本。

### 回滚步骤（简化版）

```bash showLineNumbers=false
# 停掉服务
docker compose down

# 启动数据库容器
docker compose up -d db

# 恢复数据库
cat backups/umami-2026-01-08-1430.sql | docker compose exec -T db psql -U umami umami

# 再启动全部
docker compose up -d
```