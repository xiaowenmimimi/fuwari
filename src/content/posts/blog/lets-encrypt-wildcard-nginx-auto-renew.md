---
title: Let’s Encrypt 申请 SSL 证书并自动续期
published: 2025-12-24
updated: 2026-08-19
description: 记录如何为 DNS 托管在阿里云或 Cloudflare 的域名申请 Let’s Encrypt 通配符证书，并通过 acme.sh 自动续期。
tags: [域名, 博客搭建]
category: 技术教程
draft: false
---

## 背景说明

这篇文章记录我为 `xhwen.cn` 申请 Let’s Encrypt 通配符证书的过程。

域名 DNS 可以托管在阿里云或 Cloudflare，证书交给 acme.sh 申请、部署和自动续期。

---

## 环境准备

### 1. 系统环境

- CentOS 7 / 8（其他 Linux 发行版类似）
- 已安装 Nginx
- 域名 DNS 托管在以下任意平台：
  - 阿里云 DNS
  - Cloudflare DNS

> 两种 DNS 服务商的配置不用一起做，按实际情况选择即可。

### 2. 确保 80 / 443 端口可用

```bash showLineNumbers=false
ss -ltnp | grep -E ':80|:443'
```

---

## 安装 acme.sh

`acme.sh` 是一个用 Shell 编写的 ACME 客户端，用于与 Let’s Encrypt 交互。

### 下载并安装 acme.sh

先把源码包下载到服务器：

```bash showLineNumbers=false wrap=false
cd /root
curl -L -o acme.sh.tar.gz https://github.com/acmesh-official/acme.sh/archive/refs/heads/master.tar.gz
ls -lh acme.sh.tar.gz
```

解压后安装：

```bash showLineNumbers=false
tar -xzf acme.sh.tar.gz
cd acme.sh-master
./acme.sh --install --home /root/.acme.sh
```

创建全局命令链接：

```bash showLineNumbers=false wrap=false
ln -s /root/.acme.sh/acme.sh /usr/local/bin/acme.sh
```

### 验证是否安装成功

```bash showLineNumbers=false wrap=false
ls -la /root/.acme.sh | head
ls -la /root/.acme.sh/dnsapi | head
acme.sh --version
```

检查命令输出，确认以下三点：

- `/root/.acme.sh/acme.sh` 存在
- `/root/.acme.sh/dnsapi/` 存在（里面会有很多 `dns_*.sh`，包括 `dns_ali.sh`）
- 能输出版本号

### 自动续期与定时任务

安装时，acme.sh 会自动创建 cron 任务。它每天检查一次证书有效期，在需要时续期；

如果配置了 reload 命令，续期后也会一并执行。

用下面的命令查看 cron 任务：

```bash showLineNumbers=false
crontab -l
```

任务大致如下：

```bash showLineNumbers=false wrap=false
52 0 * * * "/root/.acme.sh"/acme.sh --cron --home "/root/.acme.sh" > /dev/null
```

这条任务每天运行一次，平时不需要手动续期。

:::tip[设置默认 CA 为 Let’s Encrypt]
为了避免默认 CA 与预期不一致，我习惯显式设置为 Let’s Encrypt：

```bash showLineNumbers=false
acme.sh --set-default-ca --server letsencrypt
```
:::

---

## 配置 DNS API 权限

通配符证书需要通过 DNS-01 验证。acme.sh 会调用 DNS 服务商的 API，

临时添加用于验证的 TXT 记录，因此要先配置相应的 API 权限。

### 方案一：阿里云 DNS

#### 创建阿里云 AccessKey

登录阿里云控制台，依次进入 **右上角头像 → 访问控制 RAM → 用户**，然后创建 RAM 用户：

- 登录名称：acme-dns（示例）
- 显示名称：acme-dns
- 访问方式一定要勾选：编程访问（AccessKey），不需要勾选「控制台访问」

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/lets-encrypt-wildcard-nginx-auto-renew-1.png)

创建完成后，阿里云会立即显示：

- `AccessKey ID`
- `AccessKey Secret`

:::warning[注意]
Secret 只会显示一次，记得当场保存。
:::

#### 给用户绑定 DNS 权限（最小权限原则）

进入刚创建的用户 → **权限管理** → 添加权限：

推荐权限策略：

- `AliyunDNSFullAccess`

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/lets-encrypt-wildcard-nginx-auto-renew-2.png)

个人博客用这个策略就够了。

#### 在服务器上配置环境变量

以 root 用户为例，在服务器上设置：

```bash showLineNumbers=false
export Ali_Key="你的AccessKeyID"
export Ali_Secret="你的AccessKeySecret"
```

:::important[将环境变量写入 bashrc]

重启后的新会话也能读取这些变量，可以写入 `~/.bashrc`：

```bash showLineNumbers=false
cat >> ~/.bashrc << 'EOF'
export Ali_Key="你的AccessKeyID"
export Ali_Secret="你的AccessKeySecret"
EOF
```

写入后重新加载：

```bash showLineNumbers=false
source ~/.bashrc
```

确认变量不是空值：

```bash showLineNumbers=false
echo $Ali_Key
```

看到输出 AccessKey ID，说明配置成功。
:::

### 方案二：Cloudflare DNS

#### 创建 Cloudflare API Token

在 Cloudflare 控制台打开 **右上角用户图标 → 配置文件 → API 令牌**，新建令牌并按下面配置：

- API 令牌模板：编辑区域 DNS
- 令牌名称：acme-dns
- 权限：区域 → DNS → 编辑
- 区域资源：包括 → 特定区域 → 选择域名

![](https://image.xhwen.cn/blog/lets-encrypt-wildcard-nginx-auto-renew/lets-encrypt-wildcard-nginx-auto-renew-3.webp)

:::warning[注意]
API Token 只会完整显示一次，先保存好再关闭页面。
:::

#### 获取区域 ID

打开 **Domains → xhwen.cn → 概述**，在页面下方的 API 区域可以看到：

- 区域 ID
- 帐户 ID

![](https://image.xhwen.cn/blog/lets-encrypt-wildcard-nginx-auto-renew/lets-encrypt-wildcard-nginx-auto-renew-4.webp)

#### 在服务器上配置环境变量

在服务器上设置：

```bash showLineNumbers=false
export CF_Token="你的 Cloudflare API Token"
export CF_Zone_ID="你的区域 ID"
```

:::important[将环境变量写入 bashrc]

同样，把变量写入 `~/.bashrc`，避免新会话读取不到：

```bash showLineNumbers=false
cat >> ~/.bashrc << 'EOF'
export CF_Token="你的Cloudflare API Token"
export CF_Zone_ID="你的区域 ID"
EOF
```

写入后重新加载：

```bash showLineNumbers=false
source ~/.bashrc
```

最后确认区域 ID 不是空值：

```bash showLineNumbers=false
echo $CF_Zone_ID
```

看到 Zone ID 就说明配置成功。
:::

---

## 申请通配符证书

下面两条命令只需要执行一条。`-d xhwen.cn` 指定主域名，`-d '*.xhwen.cn'` 指定通配符子域名。

### 阿里云 DNS

```bash showLineNumbers=false
acme.sh --issue \
  --dns dns_ali \
  -d xhwen.cn \
  -d '*.xhwen.cn'
```

这里的 `--dns dns_ali` 表示使用阿里云 DNS API。

### Cloudflare DNS

```bash showLineNumbers=false
acme.sh --issue \
  --dns dns_cf \
  -d xhwen.cn \
  -d '*.xhwen.cn'
```

Cloudflare 对应的参数是 `--dns dns_cf`。无论使用哪家 DNS，acme.sh 都会自动创建 TXT 记录，验证完成后再将其删除。

### 确认签发结果

签发成功时，输出会包含下面这些证书路径：

```text showLineNumbers=false
Your cert is in: /root/.acme.sh/xhwen.cn/xhwen.cn.cer
Your key is in: /root/.acme.sh/xhwen.cn/xhwen.cn.key
The intermediate CA cert is in: /root/.acme.sh/xhwen.cn/ca.cer
And the full chain certs is there: /root/.acme.sh/xhwen.cn/fullchain.cer
```

确认没有 `error` 或 `failed` 后，就可以部署到 Nginx。

### 查看当前已签发的证书

```bash showLineNumbers=false
acme.sh --list
```

列表中会有类似记录：

```text showLineNumbers=false
Main_Domain: xhwen.cn
SAN_Domains: *.xhwen.cn
```

主域名和 `*.xhwen.cn` 都在列表中，说明证书已经签发。

---

## 部署证书到 Nginx

### 创建 Nginx 证书目录

```bash  showLineNumbers=false
mkdir -p /etc/nginx/ssl/xhwen.cn
```

推荐目录结构：

```text showLineNumbers=false
/etc/nginx/ssl/
└── xhwen.cn/
    ├── fullchain.pem
    └── privkey.pem
```

### 使用 acme.sh 安装证书

我这里签发的是 ECC 证书，所以安装时要带上 `--ecc` 参数。

```bash showLineNumbers=false
acme.sh --install-cert \
  -d xhwen.cn \
  --ecc \
  --key-file       /etc/nginx/ssl/xhwen.cn/privkey.pem \
  --fullchain-file /etc/nginx/ssl/xhwen.cn/fullchain.pem \
  --reloadcmd     "nginx -s reload"
```

`--reloadcmd` 会保存续期后的回调命令。以后证书续期成功，acme.sh 会自动执行 `nginx -s reload`，Nginx 不需要停机。

先强制续期一次，顺便确认回调能正常执行：

```bash showLineNumbers=false
acme.sh --renew -d xhwen.cn --ecc --force
```

输出中应该能看到：

```text showLineNumbers=false
Reloading nginx
```

同时确认 Nginx 没有报错。

### 配置 Nginx 使用证书

编辑站点配置文件（示例）：

```bash showLineNumbers=false
vi /etc/nginx/conf.d/blog.conf
```

### 配置 HTTPS，并将 HTTP 重定向到 HTTPS

```nginx ins={15-17,19-22} {7,12}
<!-- /etc/nginx/conf.d/blog.conf -->
# 80 端口：强制跳转到 HTTPS
server {
    listen 80;
    server_name xhwen.cn blog.xhwen.cn;

    return 301 https://$host$request_uri;
}

# 443 端口：真正提供网站内容
server {
    listen 443 ssl http2;
    server_name xhwen.cn blog.xhwen.cn;

    # 证书（通配符证书也可以用在 blog.xhwen.cn，只要证书包含 *.xhwen.cn）
    ssl_certificate     /etc/nginx/ssl/xhwen.cn/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/xhwen.cn/privkey.pem;

    # TLS 配置（够用且安全）
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 其他配置...
}
```

### 验证 Nginx 配置并生效

先检查配置语法，确认无误后再重载 Nginx：

```bash showLineNumbers=false
nginx -t
systemctl reload nginx
```

`nginx -t` 出现下面两行就表示语法检查通过：

```text showLineNumbers=false
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

## 验证 HTTPS 是否正常

### 浏览器验证

访问 [https://blog.xhwen.cn](https://blog.xhwen.cn)，确认浏览器能正常建立 HTTPS 连接。

### 命令行验证

```bash showLineNumbers=false
openssl s_client -connect xhwen.cn:443 -servername xhwen.cn
```

重点看证书链和验证结果是否正常。如果签发的是 ECC 证书，公钥算法会显示为 ECDSA。