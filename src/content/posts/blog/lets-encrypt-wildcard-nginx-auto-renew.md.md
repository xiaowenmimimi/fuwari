---
title: 使用 Let’s Encrypt 为域名申请 SSL 证书并实现自动续期
published: 2025-12-24
description: 在阿里云 DNS 环境下，使用 Let’s Encrypt 申请通配符 SSL 证书并通过 Nginx 实现自动续期的完整实践。
tags: [域名, Nginx, 博客搭建]
category: 技术教程
draft: false
---

## 前言

在搭建个人博客或网站时，HTTPS 已经是必不可少的基础配置。如果网站未来可能使用多个子域名，那么申请通配符证书（如 `*.xhwen.cn`）将是一个更方便的选择。

通配符证书可以为所有子域名提供加密保护，而无需为每个子域名单独申请证书。这在管理多个域名或子域名时尤为重要。

本文记录一次完整实践：

- 根域名 DNS 在 **阿里云**
- 使用 **Let’s Encrypt**
- 申请 **通配符 SSL 证书**
- 通过 **Nginx** 部署
- 实现 **全自动续期**

证书方案：

- CA：Let’s Encrypt（免费）
- 验证方式：DNS-01（阿里云 DNS）
- 证书管理工具：acme.sh
- 自动续期：cron 自动完成

### 为什么选择 Let’s Encrypt？

选择 **Let’s Encrypt** 的原因很简单：

- **浏览器全面信任**  
  主流浏览器（Chrome / Firefox / Safari / Edge）均内置根证书，不会出现安全警告。

- **支持自动续期**  
  基于 ACME 协议，可实现证书自动申请、自动续期、自动部署，一次配置后几乎无需维护。

- **支持通配符证书**  
  可申请 `*.xhwen.cn`，覆盖所有子域名，适合长期维护的网站和博客。

- **与 Linux / Nginx 生态契合**  
  工具成熟（如 acme.sh、certbot），文档完善，配置透明可控。

- **免费但不低质**  
  由非营利组织运营，安全性与常见 DV 付费证书等价，已被大量网站采用。

对于个人博客和非商业网站来说，Let’s Encrypt 是一个稳定、省心、长期可用的 HTTPS 方案。

---

## 一、环境准备

### 1. 系统环境

- CentOS 7 / 8（其他 Linux 发行版类似）
- 已安装 Nginx
- 域名 `xhwen.cn` 的 DNS 托管在阿里云

### 2. 确保 80 / 443 端口可用

```bash showLineNumbers=false
ss -ltnp | grep -E ':80|:443'
```

---

## 二、安装 acme.sh

`acme.sh` 是一个用 Shell 编写的 ACME 客户端，用于与 Let’s Encrypt 交互。  
相比 certbot，它**更轻量、更灵活**，对通配符证书（DNS-01 验证）支持也更好，非常适合自建服务器和长期维护的博客。

### 安装前说明

- 不依赖 Python / Docker
- 不会修改系统配置
- 所有文件默认安装在当前用户目录（`~/.acme.sh`）
- **不需要 root 权限**（推荐使用普通用户）

### 下载并安装 `acme.sh`

先把脚本下载成文件，在服务器上执行：

```bash showLineNumbers=false wrap=false
cd /root
curl -L -o acme.sh.tar.gz https://github.com/acmesh-official/acme.sh/archive/refs/heads/master.tar.gz
ls -lh acme.sh.tar.gz
```

解压并安装

```bash showLineNumbers=false
tar -xzf acme.sh.tar.gz
cd acme.sh-master
./acme.sh --install --home /root/.acme.sh
```

做成全局命令（可选）

```bash showLineNumbers=false wrap=false
ln -s /root/.acme.sh/acme.sh /usr/local/bin/acme.sh
```

### 验证是否安装成功

```bash showLineNumbers=false wrap=false
ls -la /root/.acme.sh | head
ls -la /root/.acme.sh/dnsapi | head
acme.sh --version
```

你必须能看到：

- `/root/.acme.sh/acme.sh` 存在
- `/root/.acme.sh/dnsapi/` 存在（里面会有很多 `dns_*.sh`，包括 `dns_ali.sh`）
- 能输出版本号

### 自动升级与定时任务说明

acme.sh 在安装时会**自动创建 cron 定时任务**，用于：

- 定期检查证书是否即将过期
- 自动续期证书
- 在续期成功后执行你配置的 reload 命令（如重载 Nginx）

可以查看 cron 任务：

```bash showLineNumbers=false
crontab -l
```

看到类似：

```bash showLineNumbers=false wrap=false
52 0 * * * "/root/.acme.sh"/acme.sh --cron --home "/root/.acme.sh" > /dev/null
```

- 每天自动运行一次
- 不需要手动处理续期，acme.sh 会自动完成

:::tip[（推荐）设置默认 CA 为 Let’s Encrypt]
为了避免使用测试 CA，建议显式指定默认 CA：

```bash showLineNumbers=false
acme.sh --set-default-ca --server letsencrypt
```
:::

---

## 三、配置阿里云 DNS API 权限

申请 Let’s Encrypt 通配符证书（`*.xhwen.cn`）时，必须使用 **DNS-01 验证**。  
这意味着 `acme.sh` 需要通过 **阿里云 DNS API** 自动添加 / 删除 TXT 解析记录，因此需要提前配置 API 权限。

### 创建阿里云 AccessKey

登录阿里云控制台 → 右上角头像 → **访问控制（RAM）**

**创建 RAM 用户**

- 登录名称：acme-dns（示例，随意）
- 显示名称：acme-dns
- 访问方式一定要勾选：编程访问（AccessKey），不需要勾选「控制台访问」

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/lets-encrypt-wildcard-nginx-auto-renew-1.png)

创建完成后，阿里云会 立刻显示：

- `AccessKey ID`
- `AccessKey Secret`

:::warning[注意事项]
**请妥善保存 Secret，只会显示一次**
:::

### 给用户绑定 DNS 权限（最小权限原则）

进入刚创建的用户 → **权限管理** → 添加权限：

推荐权限策略：

- `AliyunDNSFullAccess`

![](https://img.xhwen.cn/gh/xiaowenmimimi/myImage/main/img/blog/lets-encrypt-wildcard-nginx-auto-renew-2.png)

对个人博客来说，这是最省事、最稳定的策略，完全满足 acme.sh 的 DNS-01 验证。  

### 在服务器上配置环境变量（关键步骤）

在服务器上执行（以 root 用户为例）：

```bash showLineNumbers=false
export Ali_Key="你的AccessKeyID"
export Ali_Secret="你的AccessKeySecret"
```

:::important[将环境变量写入 bashrc]

避免重启或新会话失效：

```bash showLineNumbers=false
cat >> ~/.bashrc << 'EOF'
export Ali_Key="你的AccessKeyID"
export Ali_Secret="你的AccessKeySecret"
EOF
```

然后立即生效：

```bash showLineNumbers=false
source ~/.bashrc
```

验证环境变量是否生效

```bash showLineNumbers=false
echo $Ali_Key
```

如果能正确输出（不是空），说明配置成功。
:::

---

## 四、申请通配符证书

### 使用 acme.sh 申请通配符证书

```bash showLineNumbers=false
acme.sh --issue \
  --dns dns_ali \
  -d xhwen.cn \
  -d '*.xhwen.cn'
```
说明:

- `--issue`：申请证书
- `--dns dns_ali`：使用阿里云 DNS 插件
- `-d xhwen.cn`：主域名
- `-d '*.xhwen.cn'`：通配符子域名

执行过程中，acme.sh 会自动：

1.调用阿里云 DNS API
2.创建 _acme-challenge.xhwen.cn 的 TXT 记录
3.等待 Let’s Encrypt 验证
4.验证完成后自动删除 TXT 记录

**整个过程无需手动干预。**

### 申请成功的标志

如果成功，你会看到类似输出（关键信息）：

```text showLineNumbers=false
Your cert is in: /root/.acme.sh/xhwen.cn/xhwen.cn.cer
Your key is in: /root/.acme.sh/xhwen.cn/xhwen.cn.key
The intermediate CA cert is in: /root/.acme.sh/xhwen.cn/ca.cer
And the full chain certs is there: /root/.acme.sh/xhwen.cn/fullchain.cer
```

并且**没有 error / failed 字样**。

这一步完成后，证书已经成功签发，但**还没有部署到 Nginx**。

### 查看当前已签发的证书

```bash showLineNumbers=false
acme.sh --list
```

你会看到类似输出（关键信息）：

```text showLineNumbers=false
Main_Domain: xhwen.cn
SAN_Domains: *.xhwen.cn
```

说明通配符证书已生效。

---

## 五、部署证书到 Nginx

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

由于我申请的是 ECC 证书，所以必须带上 `--ecc` 参数。

```bash showLineNumbers=false
acme.sh --install-cert \
  -d xhwen.cn \
  --ecc \
  --key-file       /etc/nginx/ssl/xhwen.cn/privkey.pem \
  --fullchain-file /etc/nginx/ssl/xhwen.cn/fullchain.pem \
  --reloadcmd     "nginx -s reload"
```

注册自动续期回调：

- 证书续期成功后
- 自动执行 `nginx -s reload` 重启 Nginx 生效
- **HTTPS 全程无感知更新**

执行一次模拟续期：

```bash showLineNumbers=false
acme.sh --renew -d xhwen.cn --ecc --force
```

能在输出中看到：

```text showLineNumbers=false
Reloading nginx
```

并且 Nginx 没有报错。

### 配置 Nginx 使用证书

编辑站点配置文件（示例）：

```bash showLineNumbers=false
vi /etc/nginx/conf.d/blog.conf
```

### 配置 HTTPS 服务器（443 端口）并把 80 重定向到 https

```nginx
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

```bash showLineNumbers=false
nginx -t
systemctl reload nginx
```

若看到：

```text showLineNumbers=false
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

说明配置无误。

## 六、验证 HTTPS 是否正常

### 浏览器验证

访问 [https://blog.xhwen.cn](https://blog.xhwen.cn) ，看到浏览器 🔒 锁标志，说明 HTTPS 配置成功。

### 命令行验证

```bash showLineNumbers=false
openssl s_client -connect xhwen.cn:443 -servername xhwen.cn
```

若看到：

- 证书链完整
- 使用 ECC（如 ECDSA）
- 没有证书错误

说明 HTTPS 配置成功。