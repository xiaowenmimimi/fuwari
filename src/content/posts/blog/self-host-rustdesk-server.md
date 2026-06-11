---
title: RustDesk 自建服务器部署流程
published: 2026-06-11
description: 记录使用 Docker Compose 自建 RustDesk Server OSS 的完整流程，包括端口放行、服务启动、客户端配置和常见排查。
tags: [RustDesk]
category: 技术教程
draft: false
---

# 背景说明

之前用过的几款远程控制软件，连接卡顿经常掉线，免费版限制也越来越多。

后来了解到 RustDesk，开源、类似 TeamViewer 和向日葵，支持 Windows、macOS、Linux、Android、iOS。且支持自建服务器，遂记录下部署流程。

::github{repo="rustdesk/rustdesk"}

:::note[RustDesk 官方文档]
> ::link-card{title="RustDesk 官方文档" url="https://rustdesk.com/docs/zh-cn/" desc="从 TeamViewer、向日葵切换到 RustDesk，享受安全可靠的远程桌面体验，使用您自己的自建服务器。" image="https://image.xhwen.cn/blog/rustdesk-seeklogo.webp" badge="RustDesk"}
:::

:::warning[安全提醒]
- RustDesk 是远程桌面工具，请仅用于自己的设备，或在对方明确知情并授权的情况下使用。
- 如果有陌生人通过电话、聊天软件、短信等方式要求你安装 RustDesk，并要求你提供远程控制权限，请不要继续操作，应立即挂断电话或停止沟通。远程控制软件可能被诈骗分子用于窃取钱财、验证码、账号信息或其他隐私数据。
- 本文仅记录个人自建 RustDesk Server 的部署流程，不涉及任何未经授权的远程控制用途。
:::

---

# 准备工作

## 服务器配置

使用的是一台普通云服务器：

- 系统：Ubuntu 24.04 LTS
- CPU：1 核起步
- 内存：1GB 起步
- 带宽：建议 5Mbps 以上
- 域名：可选，推荐绑定一个域名

> 个人使用远程连接几台设备，1 核 1G 的服务器基本够用。如果经常走中继，带宽比 CPU 和内存更重要。

服务器需要提前安装好 Docker 和 Docker Compose。不同系统安装方式不一样，这里不展开，建议以 Docker 官方文档为准。

## 服务说明

RustDesk Server OSS 主要包含两个服务：

- `hbbs`：ID 服务器，负责设备注册、心跳、打洞和连接协调
- `hbbr`：中继服务器，当两端无法直连时提供流量中继

正常情况下，RustDesk 会优先尝试直连；如果直连失败，才会走中继服务器。

## 放行端口

需要在云服务器安全组和系统防火墙中放行端口。只配置其中一个是不够的。

| 端口 | 协议 | 用途 |
|---|---|---|
| 21115 | TCP | NAT 类型检测 |
| 21116 | TCP / UDP | ID 注册、心跳、打洞和连接服务 |
| 21117 | TCP | 中继服务 |
| 21118 | TCP | Web 客户端 |
| 21119 | TCP | Web 客户端 |

如果只是普通桌面客户端连接，重点放行 `21115/tcp`、`21116/tcp`、`21116/udp`、`21117/tcp`。

如果不需要 Web 客户端支持，可以不开放 `21118` 和 `21119`。

---

# RustDesk Server 部署

## 新建部署目录

```bash showLineNumbers=false
mkdir -p /opt/rustdesk-server
cd /opt/rustdesk-server
```

## 创建 `docker-compose.yml`

```bash showLineNumbers=false
vim /opt/rustdesk-server/docker-compose.yml
```

写入下面内容：

```yaml
<!-- /opt/rustdesk-server/docker-compose.yml -->
services:
  hbbs:
    container_name: hbbs
    image: rustdesk/rustdesk-server:latest
    command: hbbs
    volumes:
      - ./data:/root
    network_mode: "host"
    depends_on:
      - hbbr
    restart: unless-stopped

  hbbr:
    container_name: hbbr
    image: rustdesk/rustdesk-server:latest
    command: hbbr
    volumes:
      - ./data:/root
    network_mode: "host"
    restart: unless-stopped
```

几个关键配置说明：

- `rustdesk/rustdesk-server:latest`：RustDesk Server OSS 镜像
- `command: hbbs`：启动 ID 服务
- `command: hbbr`：启动中继服务
- `./data:/root`：把密钥和数据持久化到本地 `data` 目录
- `network_mode: "host"`：使用宿主机网络，适合 Linux 服务器，能减少端口映射和客户端 IP 识别问题
- `restart: unless-stopped`：容器异常退出后自动重启

## 启动服务

在 `/opt/rustdesk-server` 目录下执行：

```bash showLineNumbers=false
docker compose up -d
```

查看容器状态：

```bash showLineNumbers=false
docker ps
```

正常情况下可以看到两个容器：

- `hbbs`：RustDesk ID 服务器
- `hbbr`：RustDesk 中继服务器

也可以查看日志确认服务是否正常启动：

```bash showLineNumbers=false
docker logs hbbs
docker logs hbbr
```

## 查看 RustDesk Server 公钥

RustDesk Server 首次启动后，会在 `/opt/rustdesk-server/data` 目录生成密钥文件。

```bash showLineNumbers=false
ls -la /opt/rustdesk-server/data
```

重点关注下面两个文件：

- `id_ed25519`：私钥，不要泄露
- `id_ed25519.pub`：公钥，需要填写到 RustDesk 客户端

查看公钥：

```bash showLineNumbers=false
cat /opt/rustdesk-server/data/id_ed25519.pub
```

复制输出内容，后面客户端配置会用到。

:::warning
`data` 目录里保存了服务器密钥。不要随便删除，否则服务器 Key 会变化，所有已经配置过的客户端都需要重新填写 Key。
:::

---

# 客户端配置

## 安装 RustDesk 客户端

在控制端和被控设备上都安装 RustDesk 客户端。

> ::link-card{title="RustDesk 客户端下载" url="https://github.com/rustdesk/rustdesk/releases" desc="GitHub 项目上发布的最新版本 RustDesk 客户端，注意防范诈骗！" image="https://image.xhwen.cn/blog/rustdesk-seeklogo.webp" badge="RustDesk"}

## 配置自建服务器

打开 RustDesk，进入：

```text showLineNumbers=false
设置 → 网络 → ID/中继服务器
```

填写内容如下：

| 项目 | 值 |
|---|---|
| ID 服务器 | 服务器 IP 或域名 |
| 中继服务器 | 可留空，或填写服务器 IP / 域名 |
| API 服务器 | 留空，OSS 版本一般不需要 |
| Key | `id_ed25519.pub` 的内容 |

![self-host-rustdesk-server-1.webp](https://image.xhwen.cn/blog/self-host-rustdesk-server/self-host-rustdesk-server-1.webp)

如果使用默认端口，`ID 服务器` 可以直接填写域名或 IP，例如：`rustdesk.example.com`

也可以显式指定端口：`rustdesk.example.com:21116`

两台设备都需要配置相同的自建服务器信息。

---

# 测试连接

建议准备两台设备测试，例如：

- 电脑 A：控制端
- 电脑 B：被控设备

两台设备都配置完成后，在电脑 A 上输入电脑 B 的 RustDesk ID，尝试发起连接。

![self-host-rustdesk-server-2.webp](https://image.xhwen.cn/blog/self-host-rustdesk-server/self-host-rustdesk-server-2.webp)

如果可以正常弹出连接请求，说明 `hbbs` 基本工作正常。

> ![self-host-rustdesk-server-3.webp](https://image.xhwen.cn/blog/self-host-rustdesk-server/self-host-rustdesk-server-3.webp)

---

# 常见排查

如果客户端无法连接，可以按下面顺序排查：

1. 确认 `hbbs` 和 `hbbr` 容器是否都在运行。

```bash showLineNumbers=false
docker ps
```

2. 查看服务日志是否有异常。

```bash showLineNumbers=false
docker logs hbbs
docker logs hbbr
```

3. 检查云服务器安全组是否放行端口。

重点确认 `21116/tcp`、`21116/udp`、`21117/tcp` 是否开放。

4. 检查客户端 Key 是否填写正确。

客户端里的 Key 应该和服务器 `/opt/rustdesk-server/data/id_ed25519.pub` 内容一致。

5. 确认两端客户端都配置了同一台自建服务器。

只配置其中一台设备是不够的，控制端和被控端都需要使用同一套服务器配置。

---

# 升级和备份

升级前建议先备份 `data` 目录：

```bash showLineNumbers=false
tar -czf rustdesk-server-data-backup.tar.gz /opt/rustdesk-server/data
```

升级镜像：

```bash showLineNumbers=false
cd /opt/rustdesk-server
docker compose pull
docker compose up -d
```

升级后再查看容器状态和日志：

```bash showLineNumbers=false
docker ps
docker logs hbbs
docker logs hbbr
```