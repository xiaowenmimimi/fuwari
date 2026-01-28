---
title: Umami API 获取访客数 / 浏览量 / 访问次数 / 在线人数
published: 2026-01-27
description: 使用 Umami Server API 在自部署环境下获取博客的 PV、UV、Visits 以及在线人数，并安全地展示到前端页面。
tags: [博客搭建, Umami]
category: 技术教程
draft: false
---

## 使用 Umami Server API 获取访客数 / 浏览量 / 访问次数 / 在线人数

在 **自部署 Umami（Docker + Nginx HTTPS）** 场景下，通过 **Server API** 的方式，安全地获取以下统计数据：

- 访客数（Unique Visitors / UV）
- 浏览量（Pageviews / PV）
- 访问次数（Visits / Sessions）
- 在线人数（Active Visitors）

适用于：
静态博客 + 后端代调 **API（Go / Node / Java）** 的架构。

:::note[Umami 文档]
[Umami API 参考](https://umami.is/docs/api)
:::

---

## 安全架构

```text showLineNumbers=false
浏览器
   ↓
你自己的后端接口（如 /api/analytics）
   ↓
Umami Server API（携带 token）
```

- Umami 只对内网或后端可见
- 前端永远只访问你自己的 API
- 后端可做缓存 / 限流 / 聚合

> 不推荐的做法
> - 前端（浏览器）直接调用 Umami `/api/*`
> - 在前端暴露 Umami 用户名 / 密码 / token

---

## 获取 API Token（登录）

**请求示例**

```bash showLineNumbers=false
curl -X POST "https://umami.example.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"your-username","password":"your_password"}'
```

**响应示例**

```json showLineNumbers=false
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  ...
}
```

> 后续所有 Server API 请求都需要携带：`Authorization: Bearer <token>`

---

## 获取 Website ID（站点 ID）

每个站点在 Umami 中都有一个唯一的 `websiteId`。

**请求示例**

```bash showLineNumbers=false
curl -X GET "https://umami.example.com/api/websites" \
  -H "Authorization: Bearer <token>"
```

**响应示例**

```json showLineNumbers=false
{
  "data": [
    {
      "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "name": "Example",
      "domain": "example.com",
      ...
    }
  ],
  ...
}
```

记录下 `id` 字段，后续 API 请求中需要使用。

> websiteId = xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

---

## 获取访客数 / 浏览量 / 访问次数（汇总统计）

**使用接口：Website Stats**

```bash showLineNumbers=false
GET /api/websites/{websiteId}/stats
```

**参数说明**

| 参数       | 说明                                     |
| -------- | -------------------------------------- |
| startAt  | 开始时间（**毫秒时间戳**）                        |
| endAt    | 结束时间（**毫秒时间戳**）                        |
| timezone | 时区（如 `Asia/Shanghai`） |
| path（**可选**） | URL名称（单篇文章访问量） |

**请求示例（获取最近 7 天）**

```bash showLineNumbers=false
curl -X GET "https://umami.example.com/api/websites/{websiteId}/stats?startAt=1768899198000&endAt=1769503998000&timezone=Asia/Shanghai" \
  -H "Authorization: Bearer <token>"
```

**响应示例**

```json showLineNumbers=false
{
	"pageviews": 32,
	"visitors": 2,
	"visits": 4,
	...
}
```

**对应关系**

| 指标                | 含义             |
| ----------------- | -------------- |
| `pageviews` | 浏览量（PV）        |
| `visitors`  | 访客数（UV，去重）     |
| `visits`    | 访问次数（Sessions） |

---

## 获取在线人数（Active Visitors）

**使用接口：Active**

该接口用于获取 **当前在线访客数**（近一段时间内仍活跃的访客）。

```bash showLineNumbers=false
GET /api/websites/{websiteId}/active
```

**请求示例**

```json showLineNumbers=false
curl -X GET "https://umami.example.com/api/websites/{websiteId}/active" \
  -H "Authorization: Bearer <token>"
```

**响应示例**

```json showLineNumbers=false
{
	"active": 2
}
```

---

## Umami Server API 统计后端接口（Go）

使用 **Go** 编写一个**轻量后端**，通过 **Server API** 安全获取并对外提供：
- **访客数（Unique Visitors / UV）**
- **浏览量（Pageviews / PV）**
- **访问次数（Visits）**
- **在线人数（Active Visitors）**

### 安装 Go

```bash showLineNumbers=false
cd /tmp
wget https://go.dev/dl/go1.22.6.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.22.6.linux-amd64.tar.gz
```

### 配置环境变量

```bash showLineNumbers=false
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
go version
```

### 项目结构 

```text showLineNumbers=false
umami-analytics-api/
├── main.go
├── go.mod
└── config.yaml
```

**创建项目目录：**

```bash showLineNumbers=false
mkdir -p umami-analytics-api && cd umami-analytics-api
go mod init umami-analytics-api
```

### 配置说明

| 变量名                 | 示例                                                 | 说明               |
| ------------------- | -------------------------------------------------- | ---------------- |
| `umami.base_url`    | `http://umami:3000` 或 `http://127.0.0.1:3000` | Umami 地址（推荐容器内网） |
| `umami.username`    | `admin`                                            | Umami 管理员账号      |
| `umami.password`    | `xxxxxx`                                           | Umami 管理员密码      |
| `umami.website_id`  | `1622d120-...`                                     | 站点 ID            |
| `umami.timezone`    | `Asia/Shanghai`                                   | 时区               |
| `server.listen_addr`       | `:8080`                                            | 后端监听地址           |
| `server.cache_ttl_seconds` | `3`                                                | 微缓存秒数（建议 1~5）    |
| `server.api_key`           | `change_me`                                        | 可选：请求头鉴权（为空则关闭）  |

### 配置文件示例

```yaml  title="config.yaml"
server:
  listen_addr: ":8080"          # 端口号
  api_key: "change_me"          # 为空则不校验
  cache_ttl_seconds: 3          # 微缓存 1~5 秒推荐

umami:
  base_url: "http://umami:3000"  # 容器内网地址
  username: "admin"
  password: "your_password"
  website_id: "1622d120-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  timezone: "Asia/Shanghai"
```

读取 YAML 配置文件需要一个轻量依赖：`gopkg.in/yaml.v3`

```go title="go.mod"
module umami-analytics-api

go 1.22

require gopkg.in/yaml.v3 v3.0.1
```

### 后端代码

```go title="main.go" wrap=false collapse={108-166, 170-200, 204-298, 302-443}
package main

import (
	"bytes"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	neturl "net/url"
	"os"
	"strings"
	"sync"
	"time"

	"gopkg.in/yaml.v3"
	"net/http"
)

type AppConfig struct {
	Server struct {
		ListenAddr      string `yaml:"listen_addr"`
		APIKey          string `yaml:"api_key"`
		CacheTTLSeconds int    `yaml:"cache_ttl_seconds"`
	} `yaml:"server"`

	Umami struct {
		BaseURL   string `yaml:"base_url"`
		Username  string `yaml:"username"`
		Password  string `yaml:"password"`
		WebsiteID string `yaml:"website_id"`
		Timezone  string `yaml:"timezone"`
	} `yaml:"umami"`
}

type RuntimeConfig struct {
	UmamiBaseURL string
	Username     string
	Password     string
	WebsiteID    string
	Timezone     string

	ListenAddr string
	APIKey     string
	CacheTTL   time.Duration
}

func loadConfig(path string) (RuntimeConfig, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return RuntimeConfig{}, err
	}
	var c AppConfig
	if err := yaml.Unmarshal(b, &c); err != nil {
		return RuntimeConfig{}, err
	}

	rc := RuntimeConfig{
		UmamiBaseURL: strings.TrimRight(strings.TrimSpace(c.Umami.BaseURL), "/"),
		Username:     strings.TrimSpace(c.Umami.Username),
		Password:     c.Umami.Password,
		WebsiteID:    strings.TrimSpace(c.Umami.WebsiteID),
		Timezone:     strings.TrimSpace(c.Umami.Timezone),

		ListenAddr: strings.TrimSpace(c.Server.ListenAddr),
		APIKey:     strings.TrimSpace(c.Server.APIKey),
		CacheTTL:   time.Duration(c.Server.CacheTTLSeconds) * time.Second,
	}

	// defaults
	if rc.ListenAddr == "" {
		rc.ListenAddr = ":8080"
	}
	if rc.Timezone == "" {
		rc.Timezone = "Asia/Shanghai"
	}
	if c.Server.CacheTTLSeconds <= 0 {
		rc.CacheTTL = 0
	}

	// validate
	missing := []string{}
	if rc.UmamiBaseURL == "" {
		missing = append(missing, "umami.base_url")
	}
	if rc.Username == "" {
		missing = append(missing, "umami.username")
	}
	if rc.Password == "" {
		missing = append(missing, "umami.password")
	}
	if rc.WebsiteID == "" {
		missing = append(missing, "umami.website_id")
	}
	if len(missing) > 0 {
		return RuntimeConfig{}, fmt.Errorf("missing config fields: %s", strings.Join(missing, ", "))
	}

	return rc, nil
}

// ---------- Umami token ----------

type TokenManager struct {
	mu    sync.Mutex
	token string
}

func (tm *TokenManager) Get(cfg RuntimeConfig, c *http.Client) (string, error) {
	tm.mu.Lock()
	defer tm.mu.Unlock()
	if tm.token != "" {
		return tm.token, nil
	}
	tok, err := login(cfg, c)
	if err != nil {
		return "", err
	}
	tm.token = tok
	return tok, nil
}

func (tm *TokenManager) Invalidate() {
	tm.mu.Lock()
	defer tm.mu.Unlock()
	tm.token = ""
}

func login(cfg RuntimeConfig, c *http.Client) (string, error) {
	body, _ := json.Marshal(map[string]string{
		"username": cfg.Username,
		"password": cfg.Password,
	})

	req, err := http.NewRequest("POST", cfg.UmamiBaseURL+"/api/auth/login", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("umami login failed: %s, body=%s", resp.Status, string(b))
	}

	var out struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", err
	}
	if out.Token == "" {
		return "", errors.New("umami login returned empty token")
	}
	return out.Token, nil
}

// ---------- tiny TTL cache ----------

type cacheItem struct {
	val []byte
	exp time.Time
}

type ttlCache struct {
	mu    sync.Mutex
	items map[string]cacheItem
}

func newTTLCache() *ttlCache { return &ttlCache{items: make(map[string]cacheItem)} }

func (c *ttlCache) Get(key string) ([]byte, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	it, ok := c.items[key]
	if !ok {
		return nil, false
	}
	if time.Now().After(it.exp) {
		delete(c.items, key)
		return nil, false
	}
	return it.val, true
}

func (c *ttlCache) Set(key string, val []byte, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items[key] = cacheItem{val: val, exp: time.Now().Add(ttl)}
}

// ---------- helpers ----------

func clientIP(r *http.Request) string {
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return host
	}
	return r.RemoteAddr
}

func sha1Short(s string) string {
	h := sha1.Sum([]byte(s))
	return hex.EncodeToString(h[:])[:12]
}

func calcRangeMs(rng, tz string) (startAt, endAt int64) {
	loc, err := time.LoadLocation(tz)
	if err != nil {
		loc = time.FixedZone("UTC+8", 8*3600)
	}

	now := time.Now().In(loc)
	endAt = now.UnixMilli()

	switch rng {
	case "today":
		y, m, d := now.Date()
		start := time.Date(y, m, d, 0, 0, 0, 0, loc)
		startAt = start.UnixMilli()
	case "30d":
		startAt = now.AddDate(0, 0, -30).UnixMilli()
	case "7d":
		startAt = now.AddDate(0, 0, -7).UnixMilli()
	case "all":
		startAt = 0
	default:
		// 默认 7 天
		startAt = now.AddDate(0, 0, -7).UnixMilli()
	}
	return
}

func umamiGET(cfg RuntimeConfig, c *http.Client, tm *TokenManager, pathWithQuery string) ([]byte, int, error) {
	token, err := tm.Get(cfg, c)
	if err != nil {
		return nil, 0, err
	}

	req, err := http.NewRequest("GET", cfg.UmamiBaseURL+pathWithQuery, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)

	// token 失效：自动刷新重试一次
	if resp.StatusCode == 401 {
		tm.Invalidate()
		token2, err := tm.Get(cfg, c)
		if err != nil {
			return nil, 0, err
		}
		req2, _ := http.NewRequest("GET", cfg.UmamiBaseURL+pathWithQuery, nil)
		req2.Header.Set("Authorization", "Bearer "+token2)
		resp2, err := c.Do(req2)
		if err != nil {
			return nil, 0, err
		}
		defer resp2.Body.Close()
		b2, _ := io.ReadAll(resp2.Body)
		return b2, resp2.StatusCode, nil
	}

	return b, resp.StatusCode, nil
}

func requireAPIKey(cfg RuntimeConfig, w http.ResponseWriter, r *http.Request) bool {
	if cfg.APIKey == "" {
		return true
	}
	if r.Header.Get("x-api-key") != cfg.APIKey {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return false
	}
	return true
}

// ---------- main ----------

func main() {
	configPath := flag.String("config", "./config.yaml", "path to config yaml")
	flag.Parse()

	cfg, err := loadConfig(*configPath)
	if err != nil {
		log.Fatal("load config failed: ", err)
	}

	httpClient := &http.Client{Timeout: 10 * time.Second}
	tm := &TokenManager{}
	cache := newTTLCache()

	mux := http.NewServeMux()

	// 1) stats（全站 or 单页）
	//
	// 全站：GET /api/analytics/stats?range=today|7d|30d|all
	// 单页：GET /api/analytics/stats?range=7d&path=/posts/xxx
	mux.HandleFunc("/api/analytics/stats", func(w http.ResponseWriter, r *http.Request) {
		if !requireAPIKey(cfg, w, r) {
			return
		}

		rng := r.URL.Query().Get("range")
		if rng == "" {
			rng = "7d"
		}

		// 用 path 语义更清晰（兼容你之前的 url 参数：如果你前端还在传 url，也照样能用）
		pagePath := r.URL.Query().Get("path")
		if pagePath == "" {
			pagePath = r.URL.Query().Get("url") // 兼容旧参数名
		}

		startAt, endAt := calcRangeMs(rng, cfg.Timezone)

		cacheKey := fmt.Sprintf("stats:%s:%d:%d:%s", rng, startAt, endAt, sha1Short(pagePath))
		if cfg.CacheTTL > 0 {
			if v, ok := cache.Get(cacheKey); ok {
				w.Header().Set("Content-Type", "application/json")
				w.Write(v)
				return
			}
		}

		// 组装 Umami 请求
		q := fmt.Sprintf("startAt=%d&endAt=%d&timezone=%s", startAt, endAt, neturl.QueryEscape(cfg.Timezone))
		if pagePath != "" {
			q += "&path=" + neturl.QueryEscape(pagePath)
		}

		upstreamPath := fmt.Sprintf("/api/websites/%s/stats?%s", cfg.WebsiteID, q)

		b, status, err := umamiGET(cfg, httpClient, tm, upstreamPath)
		if err != nil {
			http.Error(w, err.Error(), 502)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		w.Write(b)

		if status == 200 && cfg.CacheTTL > 0 {
			cache.Set(cacheKey, b, cfg.CacheTTL)
		}
	})

	// 2) active 在线人数
	// GET /api/analytics/active
	mux.HandleFunc("/api/analytics/active", func(w http.ResponseWriter, r *http.Request) {
		if !requireAPIKey(cfg, w, r) {
			return
		}

		cacheKey := "active"
		if cfg.CacheTTL > 0 {
			if v, ok := cache.Get(cacheKey); ok {
				w.Header().Set("Content-Type", "application/json")
				w.Write(v)
				return
			}
		}

		upstreamPath := fmt.Sprintf("/api/websites/%s/active", cfg.WebsiteID)
		b, status, err := umamiGET(cfg, httpClient, tm, upstreamPath)
		if err != nil {
			http.Error(w, err.Error(), 502)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		w.Write(b)

		if status == 200 && cfg.CacheTTL > 0 {
			cache.Set(cacheKey, b, cfg.CacheTTL)
		}
	})

	// 3) （可选）realtime 最近 30 分钟
	// GET /api/analytics/realtime
	mux.HandleFunc("/api/analytics/realtime", func(w http.ResponseWriter, r *http.Request) {
		if !requireAPIKey(cfg, w, r) {
			return
		}

		// realtime 适合更短缓存；这里复用 CacheTTL
		cacheKey := "realtime:" + clientIP(r)
		if cfg.CacheTTL > 0 {
			if v, ok := cache.Get(cacheKey); ok {
				w.Header().Set("Content-Type", "application/json")
				w.Write(v)
				return
			}
		}

		upstreamPath := fmt.Sprintf("/api/realtime/%s", cfg.WebsiteID)
		b, status, err := umamiGET(cfg, httpClient, tm, upstreamPath)
		if err != nil {
			http.Error(w, err.Error(), 502)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		w.Write(b)

		if status == 200 && cfg.CacheTTL > 0 {
			cache.Set(cacheKey, b, cfg.CacheTTL)
		}
	})

	// healthz
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})

	log.Printf("analytics-api listen on %s\n", cfg.ListenAddr)
	log.Fatal(http.ListenAndServe(cfg.ListenAddr, mux))
}
```

### 运行方式

**安装依赖：**

```bash showLineNumbers=false
# 安装依赖
go mod tidy
# 如果网络环境有问题，可以设置 GOPROXY 来加速依赖下载
GOPROXY=https://goproxy.cn,direct GOSUMDB=sum.golang.google.cn go mod tidy
```

**编译成二进制：**

```bash showLineNumbers=false
go build -o umami-analytics-api
```

**创建 systemd 服务：**

```bash showLineNumbers=false
sudo nano /etc/systemd/system/umami-analytics-api.service
```

内容如下（根据实际路径改）：

```ini
[Unit]
Description=Umami Analytics API (Go)
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/umami-analytics-api
ExecStart=/opt/go/umami-analytics-api/umami-analytics-api -config /opt/go/umami-analytics-api/config.yaml
Restart=always
RestartSec=5
User=root

# 可选：限制资源
MemoryMax=200M
CPUQuota=50%

[Install]
WantedBy=multi-user.target
```

**启动并设为开机自启：**

```bash showLineNumbers=false
sudo systemctl daemon-reload
sudo systemctl enable umami-analytics-api
sudo systemctl start umami-analytics-api
# 查看状态
sudo systemctl status umami-analytics-api
```

**功能测试：**

```bash showLineNumbers=false
# 最近 7 天（默认）
curl -s "http://127.0.0.1:8080/api/analytics/stats" -H "x-api-key: change_me"
# 今天（today）
curl -s "http://127.0.0.1:8080/api/analytics/stats?range=today" -H "x-api-key: change_me"
# 最近 30 天
curl -s "http://127.0.0.1:8080/api/analytics/stats?range=30d" -H "x-api-key: change_me"
# 从建站至今（all）
curl -s "http://127.0.0.1:8080/api/analytics/stats?range=all" -H "x-api-key: change_me"
# 指定文章 path
curl -s "http://127.0.0.1:8080/api/analytics/stats?range=all&path=/xxx/xxx" -H "x-api-key: change_me"
# 当前在线人数
curl -s "http://127.0.0.1:8080/api/analytics/active" -H "x-api-key: change_me"
```

---

## Nginx 配置

```nginx showLineNumbers=false
# === Umami analytics proxy ===
location /api/analytics/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    # 防止 nginx 吞 querystring（关键）
    proxy_pass_request_headers on;

    # 可选：超时设置
    proxy_connect_timeout 5s;
    proxy_read_timeout 10s;

    # 可选：简单限流（建议）
    limit_req zone=analytics burst=10 nodelay;
}
```