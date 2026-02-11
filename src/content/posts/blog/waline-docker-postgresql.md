---
title: 搭建 Waline 评论系统
published: 2026-01-14
description: 使用 Docker + PostgreSQL 在自建服务器搭建 Waline 评论系统。
tags: [Waline, 博客搭建]
category: 技术教程
draft: false
---

## 一、背景与整体架构说明

### 1.评论系统目标

- **无需登录即可评论**（匿名）
- 与博客前端部署方式解耦
- 数据可控，可长期维护
- 能在低配置服务器上稳定运行


### 2.最终方案选择

> **Docker 部署 Waline + PostgreSQL 数据库 + 独立评论域名**

[Waline 官方文档](https://waline.js.org/guide/)

:::note[为什么选择 Waline + PostgreSQL（而不是 Twikoo / Mongo）]
**1. 为什么选择 Waline**

Waline 的定位非常明确：**为自建博客服务的轻量评论系统**。

它的关键特性正好命中需求：

- 官方支持自建
- 前后端完全解耦
- 原生支持匿名评论
- Node.js 架构，资源占用可控
- 社区成熟、长期维护

**2. 为什么数据库选 PostgreSQL**

在低配置服务器上，数据库选择尤为重要：

| 数据库 | 是否推荐 | 原因 |
|----|----|----|
| PostgreSQL | 强烈推荐 | 内存可控、稳定、并发友好 |
| MySQL | 可选 | 同样稳定，但 PG 在复杂查询上更强 |
| SQLite | 仅低流量 | 并发写入能力有限 |
| MongoDB | 不推荐同机 | 常驻内存大，低配置机器容易吃紧 |

**结论**：  
如果数据库和 Waline 在同一台服务器上 —— PostgreSQL 是最稳妥的选择。
:::

---

## 二、整体系统架构

```text  showLineNumbers=false
浏览器用户 ────▶  example.com
                Astro / Fuwari
                      │
                      ▼
              comment.example.com
                      │
                      ▼
                Nginx (HTTPS)
                      │
                      ▼
             Docker: Waline Server
                      │
                      ▼
              Docker: PostgreSQL
```

---

## 三、安装 Docker（阿里云镜像）

**安装 Docker（阿里云镜像）**

```bash showLineNumbers=false wrap=false
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
    "https://docker.m.daocloud.io",
    "https://xxxxxx.mirror.aliyuncs.com"
  ],
  "dns": ["223.5.5.5", "114.114.114.114"]
}
EOF
```

> **说明：**
> - `registry-mirrors`：配置阿里云镜像加速器（你提供的地址）
> - `dns`：避免某些环境下拉镜像时的 DNS 抖动（加了更稳）
> - `docker.m.daocloud.io`：DaoCloud 镜像加速器，拉取官方镜像更快。

```bash showLineNumbers=false
systemctl daemon-reload
systemctl restart docker
```

---

## 四、Docker 部署 PostgreSQL + Waline Server

运行目录：/opt/waline/

- `docker-compose.yml`

- `.env`

数据目录：`/data/`

- PostgreSQL 数据：`/data/postgres`

### 创建目录

```bash showLineNumbers=false
mkdir -p /opt/waline
mkdir -p /data/postgres
cd /opt/waline
```

### 用 .env 管理敏感信息

在 `/opt/waline/.env`

```bash showLineNumbers=false
vim /opt/waline/.env
```

写入：

```bash
<!-- /opt/waline/.env -->
# PostgreSQL 数据库名/用户/密码
POSTGRES_DB=waline
POSTGRES_USER=waline
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# Waline ：博客站点名称/允许的域名（逗号分隔）
SITE_NAME=My Blog
ALLOWED_ORIGINS=https://blog.example.com,https://cn.blog.example.com,https://comment.example.com

# 评论系统域名
COMMENT_SERVER_URL=https://comment.example.com
```

> **优点：**
> - `docker-compose.yml` 不用写明文密码
> - 换密码、换域名直接改 `.env`

### docker-compose.yml（PostgreSQL + Waline Server）

在 `/opt/waline` 目录下创建 `docker-compose.yml`：

```bash showLineNumbers=false
vim /opt/waline/docker-compose.yml
```

写入（PostgreSQL + Waline）：

```yaml
<!-- /opt/waline/docker-compose.yml -->
version: "3.9"

services:
  postgres:
    # 镜像：使用 DaoCloud 镜像加速，避免拉取缓慢
    image: postgres:17.6
    container_name: waline-postgres
    restart: always
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      TZ: Asia/Shanghai
    volumes:
      - /data/postgres:/var/lib/postgresql/data
    # 安全建议：如果不需要外部访问 PG，可以不映射端口
    # ports:
    #   - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  waline:
    image: lizheming/waline:latest
    container_name: waline
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      TZ: Asia/Shanghai
      SITE_NAME: ${SITE_NAME}
      # === 数据库配置（PostgreSQL）===
      PG_HOST: postgres      # 关键：同 compose 内用服务名互通
      PG_PORT: 5432
      PG_DB: ${POSTGRES_DB}
      PG_USER: ${POSTGRES_USER}
      PG_PASSWORD: ${POSTGRES_PASSWORD}

      # === 跨域白名单（国内/海外博客域名都要写）===
      ALLOWED_ORIGINS: "${ALLOWED_ORIGINS}"

      # === 新评论通知邮件（可选）===
      # SMTP（二选一：SMTP_SERVICE 或 SMTP_HOST/SMTP_PORT）
      # SMTP_SERVICE: "QQ"  # 若服务商在 Waline 支持列表里，可用此项（更省事）
      # SMTP_HOST: "smtp.qq.com"
      # SMTP_PORT: "465"
      # SMTP_SECURE: "true"

      # SMTP_USER: "xxx@qq.com"
      # SMTP_PASS: "这里填SMTP授权码/客户端专用密码"
      # SITE_URL: "网站地址，用于在消息中显示"
      # SENDER_NAME: "自定义发送邮件的发件人"
      # SENDER_EMAIL: "自定义发送邮件的发件人邮箱"
      # AUTHOR_EMAIL: "站长邮箱（关键：用于新评论通知的收件人）"

      # === 低配置服务器建议限制 Node 堆内存，避免 OOM ===
      NODE_OPTIONS: "--max-old-space-size=256"

    ports:
      - "8360:8360"

    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

**说明：**
- `DB_HOST: postgres`：这里不是 `127.0.0.1`，而是 compose 内部网络的服务名。
- `depends_on + healthcheck`：确保 PostgreSQL 就绪后再启动 Waline，减少“启动时连不上数据库”的假故障。
- PG 的 `ports` 可注释掉：让数据库只在 Docker 内部可见，更安全。
- `NODE_OPTIONS`：低配置服务器强烈建议加。

### 启动服务

在 `/opt/waline/` 目录执行：

```bash showLineNumbers=false
cd /opt/waline
docker compose up -d
```

查看状态：

```bash showLineNumbers=false
docker compose ps
```

查看日志（用于排错错误）：

```bash showLineNumbers=false
docker logs -f waline
docker logs -f waline-postgres
```

常用命令：

```bash showLineNumbers=false
# 停止
docker compose down

# 重启
docker compose restart

# 更新镜像并重建（升级）
docker compose pull
docker compose up -d
```

### PostgreSQL 初始化

> **重要说明**  
> 使用 PostgreSQL作为 Waline 存储时，**需要手动初始化表结构**。  

:::note[]
[Waline 文档 PostgreSQL 数据库说明](https://waline.js.org/guide/database.html#postgresql)
:::

1. 进入 PostgreSQL 容器

假设数据库容器名为 `waline-postgres`：

```bash showLineNumbers=false
docker exec -it waline-postgres psql -U waline -d waline
```

成功后会进入 PostgreSQL 交互界面：

```bash showLineNumbers=false
waline=#
```

2. 初始化数据库表

Waline v3 默认表结构：

```sql
CREATE SEQUENCE wl_comment_seq;

CREATE TABLE wl_comment (
  id int check (id > 0) NOT NULL DEFAULT NEXTVAL ('wl_comment_seq'),
  user_id int DEFAULT NULL,
  comment text,
  insertedAt timestamp(0) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip varchar(100) DEFAULT '',
  link varchar(255) DEFAULT NULL,
  mail varchar(255) DEFAULT NULL,
  nick varchar(255) DEFAULT NULL,
  pid int DEFAULT NULL,
  rid int DEFAULT NULL,
  sticky numeric DEFAULT NULL,
  status varchar(50) NOT NULL DEFAULT '',
  "like" int DEFAULT NULL,
  ua text,
  url varchar(255) DEFAULT NULL,
  createdAt timestamp(0) without time zone NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp(0) without time zone NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);


CREATE SEQUENCE wl_counter_seq;

CREATE TABLE wl_counter (
  id int check (id > 0) NOT NULL DEFAULT NEXTVAL ('wl_counter_seq'),
  time int DEFAULT NULL,
  reaction0 int DEFAULT NULL,
  reaction1 int DEFAULT NULL,
  reaction2 int DEFAULT NULL,
  reaction3 int DEFAULT NULL,
  reaction4 int DEFAULT NULL,
  reaction5 int DEFAULT NULL,
  reaction6 int DEFAULT NULL,
  reaction7 int DEFAULT NULL,
  reaction8 int DEFAULT NULL,
  url varchar(255) NOT NULL DEFAULT '',
  createdAt timestamp(0) without time zone NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp(0) without time zone NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);


CREATE SEQUENCE wl_users_seq;

CREATE TABLE wl_users (
  id int check (id > 0) NOT NULL DEFAULT NEXTVAL ('wl_users_seq'),
  display_name varchar(255) NOT NULL DEFAULT '',
  email varchar(255) NOT NULL DEFAULT '',
  password varchar(255) NOT NULL DEFAULT '',
  type varchar(50) NOT NULL DEFAULT '',
  label varchar(255) DEFAULT NULL,
  url varchar(255) DEFAULT NULL,
  avatar varchar(255) DEFAULT NULL,
  github varchar(255) DEFAULT NULL,
  twitter varchar(255) DEFAULT NULL,
  facebook varchar(255) DEFAULT NULL,
  google varchar(255) DEFAULT NULL,
  weibo varchar(255) DEFAULT NULL,
  qq varchar(255) DEFAULT NULL,
  oidc varchar(255) DEFAULT NULL,
  "2fa" varchar(32) DEFAULT NULL,
  createdAt timestamp(0) without time zone NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp(0) without time zone NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
```

执行完成后，可以检查表是否存在：

```sql showLineNumbers=false
\dt
```

正常情况下应看到：

```text showLineNumbers=false
 wl_comments | wl_counters | wl_users
```

---

## 五、Nginx 反代到子域（HTTPS）

目标

- 外网访问 `https://comment.example.com`
- Nginx 转发到本机 `http://127.0.0.1:8360`

示例配置：

```nginx
# /etc/nginx/conf.d/comment.example.com.conf
server {
  # 80 强制跳转到 443
  listen 80;
  server_name comment.example.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name comment.example.com;

  # ssl证书
  ssl_certificate     /path/fullchain.pem;
  ssl_certificate_key /path/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:8360;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;

    proxy_http_version 1.1;
    proxy_set_header Connection "";
  }
}
```

检查并重载 Nginx：

```bash showLineNumbers=false
nginx -t
nginx -s reload
```

此时访问应可打开：`https://comment.example.com`

---

## 六、配置 Waline 客户端

1. 在浏览器访问注册页

```text  showLineNumbers=false
https://comment.example.com/ui/register
```

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/waline-docker-postgresql-1.png)

2. 注册账号（首次初始化）

- 第一个成功注册的账号会自动成为管理员
- 注册完成后，即可登录后台

```text  showLineNumbers=false
https://comment.example.com/ui
```

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/waline-docker-postgresql-2.png)