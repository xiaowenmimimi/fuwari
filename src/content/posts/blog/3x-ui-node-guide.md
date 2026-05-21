---
title: 记录 3x-ui 面板部署与网络协议学习笔记
published: 2026-05-18
description: 记录 3x-ui 面板部署与网络协议学习笔记的过程，包括面板安装、配置思路。
tags: [3x-ui, 代理节点]
category: 技术备忘录
draft: false
encrypted: true
passwordHint: "门何以开，在初生之日。年为首，月为腰，日为尾，便可推门而入。"
---

:::caution[使用说明与合规提醒]
- **本文仅用于记录我个人学习网络配置的过程，内容主要用于技术学习和自用网络环境测试。**
- **不同地区对网络代理、加密通信、跨境访问等行为有不同规定。**
- **实际使用前，请自行了解并遵守所在地的法律法规、服务商条款以及 Cloudflare 等平台的使用政策。**
- **自建节点的目的是学习网络配置、理解协议差异，以及满足个人合理的网络测试需求。**
:::

## 背景说明

最近我在研究自建节点，主要是想了解 VPS、代理协议、Cloudflare 以及不同客户端之间的配置方式。

这次主要尝试了两种代理方案：

- **VLESS + Reality**
- **VLESS + WebSocket + TLS + Cloudflare + 优选 IP**

这篇文章主要记录我从安装 3x-ui 面板，到配置这两种方案，再到客户端连接的完整过程。

---

## 安装和初始化 3x-ui 面板

3x-ui 是一个基于 Xray-core 的 Web 管理面板，可以通过网页管理入站、用户、流量、协议和证书。

::github{repo="MHSanaei/3x-ui"}

:::note[版本说明]
3x-ui 近期更新了 v3 版本，本文使用的版本是 v3.0.2。
:::

### VPS 配置

VPS 是自建节点体验的核心。

我的 VPS 配置：

- 操作系统：Ubuntu 24.04 LTS
- 配置：1 核 1GB 内存

> 代理节点对 CPU 和内存的要求并没有那么高，真正影响体验的是线路。

:::important[服务商防火墙放行端口]
- 22：SSH 端口
- 80：申请/续期 SSL 证书
- 8443：面板端口
- 443：示例节点端口
- 2096：订阅信息端口
:::

### 安装 3x-ui

连接 VPS，可以先更新系统：

```bash showLineNumbers=false
apt update && apt upgrade -y
```

安装一些常用工具：

```bash showLineNumbers=false
apt install -y curl wget socat ufw
```

执行 3x-ui 安装脚本(v3.0.2)：

```bash showLineNumbers=false
bash <(curl -Ls https://raw.githubusercontent.com/mhsanaei/3x-ui/master/install.sh)
```

**1. 设置面板端口, 例如 8443。**

![3x-ui-node-guide-1.webp](https://image.xhwen.cn/blog/3x-ui-node-guide/3x-ui-node-guide-1.webp)

**2. SSL 证书设置方式, 默认根据 IP 设置证书, 生产环境建议使用域名证书。**

![3x-ui-node-guide-2.webp](https://image.xhwen.cn/blog/3x-ui-node-guide/3x-ui-node-guide-2.webp)

> 生产环境建议使用域名证书，以确保面板登录安全，可使用 Cloudflare 橙云代理服务。

**3. 安装成功后，会提示面板登录信息及地址。**

![3x-ui-node-guide-3.webp](https://image.xhwen.cn/blog/3x-ui-node-guide/3x-ui-node-guide-3.webp)

例如:

- 用户名: OkJRcpSKyJ
- 密码: JS9CtKQGXJ
- 面板端口: 8443
- 登陆地址: https://172.236.235.31:8443/wWozzDkCU1cjqDqlxL

**4. 登陆面板后，建议配置面板安全设置。**

![3x-ui-node-guide-4.webp](https://image.xhwen.cn/blog/3x-ui-node-guide/3x-ui-node-guide-4.webp)

> 如果访问失败，优先检查：
> - VPS 防火墙是否放行面板端口
> - 云服务商安全组是否放行面板端口
> - 3x-ui 服务是否正常运行
> - 面板路径是否输入正确
> - 端口是否被其他程序占用

---

## 方案一：VLESS + Reality

VLESS + Reality 是一种不依赖传统 TLS 证书、不强制需要域名的方案。

> 连接方式是：客户端 → VPS IP → 3x-ui / Xray

**优点：**

- 链路直接
- 延迟通常更低
- 速度上限更高
- 不强制需要域名

> 如果 VPS 线路足够好，Reality 理论上延迟更低，速度上限也更高。

**缺点：**

- 非常依赖 VPS 线路
- VPS 线路差时提升有限
- 源站 IP 直接暴露

> 如果 VPS 线路不好，Reality 也不能从根本上解决速度问题。

### 3x-ui 添加入站

进入 3x-ui 面板，**入站列表** → **添加入站**。

**基础配置：**

| 配置项                | 推荐值             |
| ------------------ | --------------- |
| 启用       | 开启              |
| 备注         | `vless-reality` |
| 协议      | `vless`         |
| 地址  | 留空              |
| 端口         | `443`   |

![3x-ui-node-guide-5.webp](https://image.xhwen.cn/blog/3x-ui-node-guide/3x-ui-node-guide-5.webp)

**协议配置：**

在客户端区域，一般会有一个默认用户。

| 配置项         | 推荐值                |
| ----------- | ------------------ |
| Enable      | 开启                 |
| Email       | 随便写，默认即可     |
| ID   | 默认自动生成即可           |
| Decryption    | `none`             |
| Encryption    | `none`            |

![3x-ui-node-guide-6.webp](https://image.xhwen.cn/blog/3x-ui-node-guide/3x-ui-node-guide-6.webp)

### Stream 配置

| 配置项         | 推荐值                |
| ----------- | ------------------ |
| Transmission      | `TCP(RAW)`                 |
| Target       | `www.microsoft.com:443`    |
| SNI   | `www.microsoft.com`           |
| 公钥        | 点击`Get New Cert`自动生成 / 自动带出 |
| 私钥        | 点击`Get New Cert`自动生成 / 自动带出 |

![3x-ui-node-guide-7.webp](https://image.xhwen.cn/blog/3x-ui-node-guide/3x-ui-node-guide-7.webp)

推荐伪装目标域名 `Target / SNI` 组合：

```txt showLineNumbers=false
Target: www.microsoft.com:443
SNI: www.microsoft.com
```
或者：
```txt showLineNumbers=false
Target: www.apple.com:443
SNI: www.apple.com
```
或者：
```txt showLineNumbers=false
Target: www.amazon.com:443
SNI: www.amazon.com
```

### Sniffing 配置

推荐开启：

![3x-ui-node-guide-8.webp](https://image.xhwen.cn/blog/3x-ui-node-guide/3x-ui-node-guide-8.webp)

### Flow 配置

创建后，在入站列表中找到该入站，点击编辑，配置 Flow 参数为 `xtls-rprx-vision`

![3x-ui-node-guide-9.webp](https://image.xhwen.cn/blog/3x-ui-node-guide/3x-ui-node-guide-9.webp)

### v2rayN 客户端配置

![3x-ui-node-guide-10.webp](https://image.xhwen.cn/blog/3x-ui-node-guide/3x-ui-node-guide-10.webp)

**Windows**

::github{repo="2dust/v2rayN"}

复制粘贴订阅信息到 `v2rayN` 客户端，点击`订阅分组`， `更新全部订阅(不通过代理)`即可。

![3x-ui-node-guide-11.webp](https://image.xhwen.cn/blog/3x-ui-node-guide/3x-ui-node-guide-11.webp)

**Android**

::github{repo="2dust/v2rayNG"}

手机 `v2rayNG` 扫描二维码即可。

---

## 方案二：VLESS + WebSocket + TLS + Cloudflare + 优选 IP

VLESS + WebSocket + TLS + Cloudflare + 优选 IP 是让客户端先连接 Cloudflare，再由 Cloudflare 转发到源站 VPS。

> 连接方式是：客户端 → Cloudflare 优选 IP 或域名 → VPS → 3x-ui / Xray

**优点：**

- 可以隐藏源站 IP
- 低成本 VPS 也能变得可用
- 域名访问更自然
- 对直连线路差的 VPS 有时更友好

> 在 VPS 线路差的情况下，利用 Cloudflare 入口改善连接。

**缺点：**

- 链路更长
- 延迟通常更高
- 速度上限受 Cloudflare 影响
- 配置项更多，排错更麻烦

> 低成本 VPS 过渡，对速度要求不高的场景。

### Cloudflare DNS 配置

进入 Cloudflare 后台：域名 → DNS → 记录 → 添加记录

| 类型 | 名称    | 内容        | 代理状态       |
| ---- | ------- | ----------- | -------------- |
| A    | `vless` | 你的 VPS IP | Proxied / 橙云 |

![3x-ui-node-guide-12.webp](https://image.xhwen.cn/blog/3x-ui-node-guide/3x-ui-node-guide-12.webp)

:::note[Cloudflare 橙云]
一定要开橙云。如果是灰云，那就是客户端直连 VPS，不走 Cloudflare，也就没有优选 IP 的意义。

Cloudflare 橙云只代理指定的 HTTP/HTTPS 端口，HTTPS 常用可代理端口包括 `443`、`2053`、`2083`、`2087`、`2096`、`8443` 等。
:::

### 3x-ui 申请证书

登录 VPS 服务器后执行：

```bash showLineNumbers=false
x-ui
```

然后依次选择：
- 19. SSL Certificate Management
- 1. Get SSL (Domain)
- 证书域名填写：`vless.xhwen.top`
- 后续默认即可

![3x-ui-node-guide-13.webp](https://image.xhwen.cn/blog/3x-ui-node-guide/3x-ui-node-guide-13.webp)

申请成功后，会在日志中显示得到类似路径：

```bash showLineNumbers=false
/root/cert/vless.xhwen.top/fullchain.pem
/root/cert/vless.xhwen.top/privkey.pem
```

### 3x-ui 添加入站

进入 3x-ui 面板，**入站列表** → **添加入站**。

**基础配置：**

| 配置项                | 推荐值             |
| ------------------ | --------------- |
| 启用       | 开启              |
| 备注         | `vless-ws-tls-cf` |
| 协议      | `vless`         |
| 地址  | 留空              |
| 端口         | `443`   |

![3x-ui-node-guide-14.webp](https://image.xhwen.cn/blog/3x-ui-node-guide/3x-ui-node-guide-14.webp)

**协议配置：**

在客户端区域，一般会有一个默认用户。

| 配置项         | 推荐值                |
| ----------- | ------------------ |
| Enable      | 开启                 |
| Email       | 随便写，默认即可     |
| ID   | 默认自动生成即可           |
| Decryption    | `none`             |
| Encryption    | `none`            |

![3x-ui-node-guide-15.webp](https://image.xhwen.cn/blog/3x-ui-node-guide/3x-ui-node-guide-15.webp)

### Stream 配置

| 配置项         | 推荐值                |
| ----------- | ------------------ |
| Transmission      | `WebSocket`                 |
| 主机   | `vless.xhwen.top`           |
| 路径        | 随便写，例如 `/vless` |
| Security       | `tls`    |
| SNI            | `vless.xhwen.top` |
| ALPN            | 可留空，或 `http/1.1` |
| 公钥            | `fullchain.pem` 路径 |
| 私钥            | `privkey.pem` 路径 |

![3x-ui-node-guide-16.webp](https://image.xhwen.cn/blog/3x-ui-node-guide/3x-ui-node-guide-16.webp)

### Sniffing 配置

推荐开启：

![3x-ui-node-guide-8.webp](https://image.xhwen.cn/blog/3x-ui-node-guide/3x-ui-node-guide-8.webp)

配置好后，点击保存即可。

### 优选 IP

使用 CloudflareSpeedTest 工具测试优选 IP，在晚高峰多测试几轮，筛选最适合自己网络的几个 IP。

::github{repo="XIU2/CloudflareSpeedTest"}

### 订阅设置

进入 3x-ui 面板，**面板设置** → **订阅设置**。

修改反向代理 URI 为 `https://域名:监听端口/URI路径`，例如：`https://vless.xhwen.top:443/vless`，

或者是使用优选IP 为反向代理 URI `https://优选 IP:监听端口/URI 路径`，保存后再点击重启面板。

![3x-ui-node-guide-17.webp](https://image.xhwen.cn/blog/3x-ui-node-guide/3x-ui-node-guide-17.webp)

### v2rayN 客户端配置

![3x-ui-node-guide-18.webp](https://image.xhwen.cn/blog/3x-ui-node-guide/3x-ui-node-guide-18.webp)

**1. Windows**

::github{repo="2dust/v2rayN"}

复制粘贴订阅信息到 `v2rayN` 客户端，点击`订阅分组`， `更新全部订阅(不通过代理)`即可。

:::tip[使用优选 IP]
在 `v2rayN` 客户端选中复制节点信息，编辑修改节点`地址(address)`为优选 IP。

![3x-ui-node-guide-19.webp](https://image.xhwen.cn/blog/3x-ui-node-guide/3x-ui-node-guide-19.webp)

效果如下：

![3x-ui-node-guide-20.webp](https://image.xhwen.cn/blog/3x-ui-node-guide/3x-ui-node-guide-20.webp)
:::

**2. Android**

::github{repo="2dust/v2rayNG"}

手机 `v2rayNG` 扫描二维码即可。

:::tip[使用优选 IP]
在 `v2rayNG` 选中节点`导出配置至剪切板`，然后再`从剪切板导入`以此复制多个节点，

最后编辑修改节点的`地址(address)`为优选 IP。
:::
