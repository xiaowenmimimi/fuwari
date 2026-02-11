---
title: Uptime Kuma 部署与使用指南
published: 2026-02-11
description: Uptime Kuma 是一款轻量、开源的可用性监控工具，支持 HTTP(s)、TCP、Ping、Push 等多种监控方式，并内置告警通知系统。
tags: [Uptime Kuma]
category: 技术教程
draft: false
---

## Uptime Kuma 的核心作用

:::note[]
**Uptime Kuma** 是一款开源、自托管的服务可用性监控工具，用于监控，本质上是一个 **“持续自动检测 + 失败通知”系统**。
::github{repo="louislam/uptime-kuma"}
:::

1. 可用性监控（Uptime Monitoring）

2. 延迟与稳定性监控

3. 故障自动通知

4. 状态页展示（Status Page）

> 适合博客、SaaS、小型服务对外展示稳定性。

---

## 部署方式一：Docker 部署（推荐）

:::note[Docker 部署优点]
* 一行命令启动
* 升级、迁移方便
* 环境隔离，不污染系统
:::

### 1. 创建目录

```bash showLineNumbers=false
mkdir -p /opt/uptime-kuma
cd /opt/uptime-kuma
```

### 2. 创建 docker-compose.yml

在 `/opt/uptime-kuma` 目录下创建 `docker-compose.yml`：

```bash showLineNumbers=false
vim /opt/uptime-kuma/docker-compose.yml
```

```yaml
<!-- /opt/uptime-kuma/docker-compose.yml -->
services:
  uptime-kuma:
    image: louislam/uptime-kuma:1
    container_name: uptime-kuma
    restart: unless-stopped
    ports:
      - "3001:3001"
    volumes:
      - ./data:/app/data
```

### 3. 启动容器

```bash showLineNumbers=false
docker-compose up -d
```

### 4. 访问控制台

```text showLineNumbers=false
http://服务器IP:3001
```

> 首次访问需要创建管理员账号，数据将持久化存储在 `./data` 目录中。

---

## 部署方式二：本地部署（Node.js 方式）

:::note[本地部署适合人群]
* 不使用 Docker
* 希望更细粒度控制进程
:::

### 1. 环境准备

Uptime Kuma 基于 Node.js 运行，需要先安装 Node.js。

* [下载 Node.js 安装包](https://nodejs.org/zh-cn/download)
* 安装 Node.js：根据操作系统执行安装包

```bash showLineNumbers=false
node -v   # >= 20.4
```

### 2. 下载 Uptime Kuma 源码

```bash showLineNumbers=false
git clone https://github.com/louislam/uptime-kuma.git
cd uptime-kuma
```

### 3. 启动 Uptime Kuma

```bash showLineNumbers=false
npm run setup # 安装依赖
node server/server.js   # 启动服务
```

```text showLineNumbers=false  title="访问控制台"
http://localhost:3001
```

### 4.（推荐）使用 PM2 守护进程

```bash showLineNumbers=false  wrap=false
npm install pm2 -g && pm2 install pm2-logrotate   # 全局安装 pm2，并加日志轮转（避免日志无限长）。
pm2 start server/server.js --name uptime-kuma   # 用 pm2 启动并命名进程，之后就算关掉当前终端，服务也能继续跑。
pm2 monit    # 查看当前进程状态/日志（类似监控面板）。
pm2 startup && pm2 save    # 设置开机自启，并保存当前进程列表（重启机器后自动恢复运行）。
```

---

## 使用 Nginx + 域名反代

避免直接暴露端口，使用域名访问，例如 `uptime-kuma.example.com`。

配置 Nginx 示例：

```nginx
# /etc/nginx/conf.d/uptime-kuma.example.com.conf
server {
    # 80 强制跳转到 443
    listen 80;
    server_name uptime-kuma.example.com;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl http2;
    server_name uptime-kuma.example.com;

    # ssl 证书
    ssl_certificate     /etc/nginx/ssl/uptime-kuma.example.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/uptime-kuma.example.com/privkey.pem; 

    location / {
        proxy_pass http://127.0.0.1:3001;
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

---

## 监控项配置

### 1. 网站可用性监控

* HTTP(s) Monitor
* 示例：`https://blog.example.com`

> 如果你有 **国内 / 国外 DNS 分流**，请分别创建监控项，避免因为 DNS 解析延迟导致的监控异常。

### 2. API 监控

* 类型：HTTP(s)
* 建议使用**轻量接口**
* 避免使用慢查询接口作为健康检查

### 3. 推荐参数

| 参数   | 建议值   |
| ---- | ----- |
| 检查间隔 | 60 秒  |
| 重试   | 1～2 次 |
| 心跳重试间隔   | 20～48 秒 |
| 超时   | 5～8 秒 |
| 失败判定 | 连续失败  |

---

## 告警通知（邮件）

### 邮件告警的工作原理

Uptime Kuma 通过 **SMTP 协议** 发送邮件。

流程如下：

``` showLineNumbers=false
服务异常
    ↓
Uptime Kuma 触发告警
    ↓
连接 SMTP 服务器
    ↓
发送邮件到指定收件人
```

前期准备：

* 一个可用的邮箱账号（推荐使用专门的告警邮箱）
* SMTP 服务器地址
* SMTP 端口
* 授权码（不是登录密码）

### 在 Uptime Kuma 中配置邮件通知

进入通知设置：

后台 → 设置 → 通知 → 设置 → 选择：Email (SMTP)

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/uptime-kuma-deploy-1.png)

参数填写说明，以 QQ 邮箱为例：

| 参数         | 示例                                | 说明         |
| ---------- | --------------------------------- | ---------- |
| 主机名  | smtp.qq.com                       | SMTP 服务器   |
| 端口  | 465                               | SSL 端口     |
| 安全性     | 开启                                | 465 端口必须开启 |
| 用户名   | `your@qq.com` | 邮箱账号       |
| 密码   | 授权码                               | 不是登录密码     |
| 发信人 | `your@qq.com` | 发件人        |
| 收信人   | `your@qq.com` | 收件人        |
| 邮件主题   | [Uptime Kuma] {{ name }} - {{ status }}                | 可自定义       |
| 正文   | 服务：{{ name }} 状态：{{ status }} 通知的消息：{{ msg }} | 可自定义       |

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/uptime-kuma-deploy-2-2.png)

> 授权码获取方式（以 QQ 邮箱为例）
> 1. 登录 QQ 邮箱
> 2. 进入设置 → 账户
> 3. 开启 “SMTP 服务”
> 4. 生成授权码
> 5. 将授权码填入 Uptime Kuma 的 Password 字段

:::tip[测试邮件是否可用]
在通知页面点击：**测试**

如果成功会提示：**Sent Successfully**

并收到一封测试邮件。
:::

### 告警触发逻辑说明

邮件并不是“只要失败就发”。

默认逻辑：

```
连续失败 X 次 → 发送 Down 通知
恢复正常 → 发送 Up 通知
```

建议设置：

| 参数                | 建议     |
| ----------------- | ------ |
| 重试次数          | 1~2    |
| 心跳重试间隔  | 连续失败   |
| 重复发送通知的间隔次数   | 0 |

---

## Uptime Kuma 状态页

状态页是 Uptime Kuma 内置的一项功能，用于：

> 将指定监控项的运行状态以公开页面的形式展示出来。

典型用途：

- 对外展示博客 / API 是否在线
- 向用户说明服务状态
- 公布历史宕机记录
- 增强服务透明度

例如官方示例：[https://status.kuma.pet/](https://status.kuma.pet/)

### 工作原理

```
监控项运行状态
        ↓
Uptime Kuma 记录状态
        ↓
状态页读取监控数据
        ↓
公开展示当前状态与历史记录
```

> 状态页不会直接执行检测，而是展示现有监控数据。

### 如何创建一个状态页

1. 登录 Uptime Kuma 后台

2. 创建状态页

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/uptime-kuma-deploy-3.png)

3. 配置状态页说明

| 项目            | 作用                         |
| ------------- | -------------------------- |
| 路径（Slug）      | 决定访问 URL，例如 `/status/blog` |
| 标题            | 页面顶部显示的名称                  |
| 描述            | 页面说明文字，支持 Markdown         |
| 刷新间隔          | 页面自动刷新时间（默认 300 秒）         |
| 添加分组          | 给监控项分类展示，让页面更清晰            |
| 添加监控项         | 选择哪些 Monitor 显示在状态页        |
| 创建事件          | 发布维护公告或故障说明                |
| 显示 Powered By | 是否显示 Uptime Kuma 标识        |
| 显示证书有效期       | 展示 HTTPS 证书剩余天数            |

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/uptime-kuma-deploy-4.png)

**效果示例**

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/uptime-kuma-deploy-5.png)