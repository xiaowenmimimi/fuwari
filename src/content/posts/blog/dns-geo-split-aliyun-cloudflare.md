---
title: 阿里云 DNS + Cloudflare Pages 实现国内 / 海外分流
published: 2025-12-22
description: 在使用 Cloudflare Pages 的前提下，为国内提供更稳定、更快的访问入口，并保持整套方案长期可维护。
tags: [DNS, Cloudflare, 博客搭建]
category: 技术教程
draft: false
---

## 背景说明

**Cloudflare Pages** 提供了非常优秀的自动化部署与全球 CDN 能力，但在中国大陆网络环境下，跨境访问不可避免地存在以下问题：

* 跨境网络 RTT 高、稳定性不可控
* 不同运营商、时段稳定性差异明显

另一方面，完全放弃 Cloudflare Pages、迁移到国内云平台也并非理想方案：

* 丢失 Cloudflare Pages 的自动化优势
* 海外访问体验下降

**因此，本次实践的目标是：**

> **保留 Cloudflare Pages 作为海外入口，**
> 
> **同时国内引入一个独立的访问入口，**
> 
> **通过 DNS 层进行国内 / 海外分流。**

:::tip[未采用的方案]
在最终选择 DNS 分流前，也评估过以下方案：

* Cloudflare Workers 路由反代
* 固定 Cloudflare 优选 IP
* 基于 A / AAAA / CNAME 的 SaaS IP 优选

但在 Cloudflare Pages 场景下：

* **Workers 只能在请求到达 Cloudflare 后生效**，无法消除国内访问的跨境链路瓶颈；
* **Cloudflare Pages 属于“边缘即源站”架构**，不存在稳定可控的源站 IP，SaaS 优选稳定性与可维护性不足；
* **固定优选 IP 绕过 Cloudflare 官方调度机制**，稳定性与长期可维护性较差，且容易在网络环境变化后失效

因此，上述方案更适合作为补充或兜底，而非主要架构选择。
:::

---

## 前置条件

在进行 DNS 分流之前，博客已完成**双端独立部署**：

:::note[部署博客方案]
- [**使用 Cloudflare Pages 自动部署 Astro 博客**](/posts/blog/astro-deploy-cloudflare-pages/)

- [**GitHub Actions 自动部署 Astro 博客到服务器**](/posts/blog/astro-deploy-cn-server/)
:::

### 1️⃣ 海外入口（Cloudflare Pages）

- 平台：Cloudflare Pages
- 部署内容：Astro 静态博客
- 绑定域名：`blog.xhwen.cn`

Cloudflare Pages 负责：

- 海外用户访问
- GitHub 自动化构建与发布

### 2️⃣ 国内入口（阿里云服务器 + Nginx）

- 平台：阿里云 ECS
- 服务：Nginx 静态站点
- 部署内容：**同一份 Astro 博客构建产物**
- 绑定域名：`cn.blog.xhwen.cn`

国内服务器仅负责：

- 静态文件托管
- 不参与构建过程
- 不作为对外主站

### 3️⃣ 核心原则

> **博客只有一个“主站身份”，即** `blog.xhwen.cn`，
> 
> `cn.blog.xhwen.cn` 仅作为国内访问入口，
> 
> 不对用户、搜索引擎直接暴露。

---

## 一、方案概述

本实践采用**DNS 层国内 / 海外分流（以阿里云 DNS 为例）**的方式：

>**由阿里云 DNS 统一管理 `blog.xhwen.cn` 的解析，**
>
>**在 DNS 层完成国内 / 海外分流，**
>
>**Cloudflare Pages 仅作为海外访问入口存在。**

**域名角色划分**

| 域名                    | 角色             |
| ---------------------- | --------------- |
| `blog.xhwen.cn`       | **主站域名（唯一对外）** |
| `cn.blog.xhwen.cn`          | 国内入口（接入层） |

**访问路径逻辑**

```txt showLineNumbers=false
用户访问 blog.xhwen.cn
 ├─ 中国大陆 → 解析至 cn.blog.xhwen.cn（国内服务器）
 └─ 海外     → 解析至 Cloudflare Pages
```

- 用户始终访问 `blog.xhwen.cn`
- DNS 决定实际命中的物理入口
- 页面内容保持完全一致

---

## 二、阿里云 DNS 配置

### 1️⃣ 确保 `blog.xhwen.cn` 由阿里云 DNS 管理

在阿里云 DNS 控制台中：

- 添加解析域名：`blog.xhwen.cn`
- 进入该域名的解析管理页面

### 2️⃣ 配置线路解析

:::important[中国大陆线路]
| 项目   | 值                  |
| ---- | ------------------ |
| 记录类型 | CNAME              |
| 主机记录 | `@`                |
| 解析线路 | 中国大陆               |
| 记录值  | `cn.blog.xhwen.cn` |
| TTL  | 10            |
:::

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/dns-geo-split-aliyun-cloudflare-1.png)

:::important[海外线路]
| 项目   | 值                                         |
| ---- | ----------------------------------------- |
| 记录类型 | CNAME                                     |
| 主机记录 | `@`                                       |
| 解析线路 | 境外                                        |
| 记录值  | Cloudflare Pages 提供的域名（如 `xxx.pages.dev`） |
| TTL  | 10                                   |
:::

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/dns-geo-split-aliyun-cloudflare-2.png)

:::warning[Cloudflare Pages 注意事项]
Cloudflare Pages 必须配置对应的自定义域名。

> 阿里云 DNS 的 CNAME 只是把域名解析到 Cloudflare，
> 但 Cloudflare 只有在配置了对应的自定义域名后，才会为该域名签发证书、建立路由，并把请求转发到对应的 Pages / Worker。
> 否则 Cloudflare 不知道这个域名该指向哪个服务，会直接拒绝或返回错误。
:::

---

## 三、Astro 与服务器侧注意事项

### 1️⃣ Astro 的 site 配置

```js showLineNumbers=false title="astro.config.mjs"
site: "https://blog.xhwen.cn/"
```

说明：

- `blog.xhwen.cn` 是主站域名，用户直接访问的域名。
- `不随部署环境变化
- 避免 SEO / canonical 混乱

### 2️⃣ 国内 Nginx 的职责约束

国内服务器仅作为接入层：

- 不主动跳转到 `cn.blog.xhwen.cn`
- 不生成绝对 URL
- 只返回静态文件

（可选）防止被搜索引擎收录：

```nginx showLineNumbers=false
add_header X-Robots-Tag "noindex, nofollow";
```

---

## 四、验证效果

### 方法一：响应头验证

**编辑国内站点的 Nginx 配置**

找到你 cn.blog.xhwen.cn 对应的 server 块，例如：

```bash showLineNumbers=false
sudo vi /etc/nginx/conf.d/blog.conf
```

在 `server {}` 里**任意位置**加一行：

```nginx showLineNumbers=false
add_header X-Edge-From "CN-Nginx";
```

重载 Nginx 配置：

```bash showLineNumbers=false
sudo nginx -t
sudo nginx -s reload
```

**验证方法**

打开浏览器 → 开发者工具（F12）

- 刷新页面
- 在 Network 标签页查看响应头
- 点第一个 `Document` 请求（`blog.xhwen.cn`）

看 Response Headers

- **国内网络**你应该看到：

``` text showLineNumbers=false
X-Edge-From: CN-Nginx
```

- 海外网络 / VPN 则不应该看到 `X-Edge-From` 头
- URL 完全一样，Header 不一样 = 分流成功

### 方法二：DNS 解析验证（Windows / macOS / Linux）

在不同 DNS 服务器下查询 `blog.xhwen.cn` 的解析结果。

**Windows（cmd）：**

```cmd
nslookup blog.xhwen.cn 223.5.5.5   # 国内
nslookup blog.xhwen.cn 1.1.1.1     # 海外
```

**macOS / Linux：**

```bash
dig blog.xhwen.cn 223.5.5.5   # 国内
dig blog.xhwen.cn 1.1.1.1     # 海外
```

- 对比 `canonical name`，如果不一样 —— 分流成功

---

## 方案总结

通过**阿里云 DNS 的线路解析能力**，可以在**不改变现有 Cloudflare Pages 部署方式**的前提下，实现：

- **国内用户**：自动路由至国内服务器，获得更快加载速度
- **海外用户**：自动路由至 Cloudflare Pages，享受全球 CDN 加速
- 多物理入口，对用户透明
- 架构清晰、长期可维护

:::note[未分流前]
![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/dns-geo-split-aliyun-cloudflare-3.png)
:::

:::note[分流后]
![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/dns-geo-split-aliyun-cloudflare-4.png)
:::