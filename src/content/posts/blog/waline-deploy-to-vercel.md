---
title: Waline 迁移到 Vercel
published: 2026-02-09
description: 将 Waline 评论后端 从自建服务器迁移到 Vercel Serverless。
tags: [Waline,Vercel]
category: 技术教程
draft: false
---

## 背景

::url{href="https://blog.xhwen.cn"}

:::note[原 Waline 部署方式]
原 Waline 部署方式是使用 Docker + PostgreSQL 在自建服务器搭建 Waline 评论系统。
文章：[**搭建 Waline 评论系统**](/posts/blog/waline-docker-postgresql/)
:::

1
::url{href="https://blog.xhwen.cn"}

在小规格服务器上，Waline 作为一个**常驻 Node 服务**，会带来：

- 持续占用内存
- 与其他服务争抢资源
- Node 进程被 OOM Kill 的风险

而 Waline 的特点是：

- 纯 HTTP API
- 无长连接
- 请求驱动
- 官方支持 Serverless

**非常适合部署在 Vercel**

---

## 迁移前准备

### 账号

- GitHub 账号
- Vercel 账号（可直接用 GitHub 登录）

### 数据库

Waline **不依赖本地文件系统**，只依赖数据库。

| 当前数据库                 | 是否可直接迁       |
| --------------------- | ------------ |
| LeanCloud             | 可以         |
| MongoDB Atlas         | 可以         |
| 外部 MySQL / PostgreSQL | 可以         |
| 本机数据库                 | 不行（必须迁到外部） |

> **Vercel 无法使用本地数据库**，必须是公网可访问的数据库。

## 创建 Waline Serverless 项目

### 使用官方模板（最简单，推荐）：

:::tip[Waline 官方文档]
[Waline 官方文档-快速开始教程](https://github.com/walinejs/waline)
:::

1. 打开 [Waline 官方文档](https://github.com/walinejs/waline)

2. 点击使用官方提供的 Vercel 部署入口（按钮），跳转至 Vercel 进行 Server 端部署。

    > 本质上是：
    > * 帮你 fork 官方仓库
    > * 自动创建一个 Vercel 项目
    > * 自动配置好 Serverless 运行方式

3. 登录 / 授权 Vercel：

   首次使用会经历以下流程：
    * 跳转到 Vercel
    * 选择 **Continue with GitHub**
    * 授权 Vercel 访问你的 GitHub

    需要确认的权限通常包括：
    * 创建仓库
    * 读取仓库内容

4. 创建 GitHub 仓库

    * **Git Scope**
        * 选你的个人 GitHub 账号即可

    * **Repository Name**（仓库名）
        * 示例：`waline-server`
        * 建议独立一个仓库，方便维护和回滚

    确认后点击 `Create`，自动构建完成后点击 `Continue to Dashboard` 跳转到 Vercel 项目页面。

    ![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/waline-deploy-to-vercel-1.png)

---

## 使用 Vercel 托管 PostgreSQL 服务

### 创建 PostgreSQL 数据库

在 **Vercel 项目后台**：
- **Storage → Create a database**

选择 PostgreSQL 提供商：
- 在页面中部 **Marketplace Database Providers** 区域，找到 **Neon** 并点击 `Create`。
- 跳转授权，点击 `Accept and Create` 按钮。（第一次才有）

    ![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/waline-deploy-to-vercel-2.png)

创建数据库：
- Region：选择一个距离最近的区域，例如 `Singapore (Southeast)`。
- 其他保持默认，点击 `Continue`。

    ![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/waline-deploy-to-vercel-3.png)

- Database name：名称随意，例如 `waline-db`。
- 点击 `Create`。

### 从原 PostgreSQL 迁移数据

1. 在原服务器上导出数据（原来的 Waline 是通过 Docker 运行 PostgreSQL）：

```bash showLineNumbers=false
docker exec -t postgres pg_dump -U waline_user waline > waline.sql
```

> `postgres`：容器名
> `-U waline_user`：数据库用户
> `waline`：数据库名
> `waline.sql`：导出到当前目录

2. 导出完成后检查：

```bash showLineNumbers=false
ls -lh waline.sql
```

3. 导入到 **Vercel Postgres**：

- 在 Vercel 控制台进入 Postgres 数据库: Project → Storage → Databases
- 找到完整的 PostgreSQL Connection String 示例：
    - psql `postgresql://USER:PASSWORD@HOST/DATABASE`
- 把连接字符串临时记在一边（下面用）
- 用 `psql` 直接导入数据（使用 Docker 里的 psql 导入）：

```bash showLineNumbers=false
docker run --rm -i postgres:16 psql "postgresql://USER:PASSWORD@HOST/DATABASE" < waline.sql
```

---

## 配置 Waline 环境变量

**打开环境变量配置页面：**

- 在 Vercel 项目页面，点击 **Settings** 标签。
- 滚动到 **Environment Variables** 部分。

**新增 Waline 必需的唯一变量：**

- **手动新增一条变量**，点击 **Add Environment Variable** 按钮。
- **变量名 Key**：`DATABASE_URL`
- **变量值 Value**：
    - 回到 Neon 数据库页面，找到 **完整的 PostgreSQL 连接字符串**。
    - 示例：`postgresql://USER:PASSWORD@HOST/DATABASE`

    ![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/waline-deploy-to-vercel-5.png)
    - 复制整条，粘贴到 Value 输入框中。

    ![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/waline-deploy-to-vercel-6.png)