# Kindle Simple Clock

极简 Kindle 时钟与天气页面。黑白主题可切换，支持 1-7 天预报。

## 配置方式

本项目支持两种配置方式，按需选择其一：

1. 本地/静态配置（最简单）
把 `config.example.js` 复制为 `config.js`，填写以下字段：
- `API_KEY`：和风天气 API Key
- `API_HOST`：你的专属 API Host（形如 `https://xxxxxx.qweatherapi.com`，不带协议也会自动补全）
- `CITY_QUERY`：城市查询关键词（如 `深圳`）
- `DISPLAY_CITY`：页面显示的城市名（可选，不填则使用接口返回的名称）

2. Vercel 环境变量 + Serverless
如果不想在仓库里放 Key，可以在 Vercel 里设置环境变量，页面会自动请求 `/api/config` 获取配置。
环境变量名称：
- `QWEATHER_API_KEY`
- `QWEATHER_API_HOST`（可填完整 `https://` 或只填域名，都会自动补全）
- `QWEATHER_CITY_QUERY`
- `QWEATHER_DISPLAY_CITY`

## 本地运行

用任意静态服务器打开即可：

```bash
cd /Users/chenminglin/web_projects/kindle-simple-clock
python3 -m http.server 8080
```

然后访问 `http://localhost:8080/`。

## 部署到 Vercel

1. 把项目推到 GitHub。
2. 在 Vercel 新建项目，选择该仓库。
3. 任选一种配置方式：
- 使用 `config.js`（不推荐把 Key 提交到公网仓库）。
- 使用环境变量（推荐）。
4. 部署完成后访问 Vercel 提供的域名。

## 说明

- 页面会调用城市搜索接口获取 `LocationID`，再请求天气。
- 预报天数可在设置页调整（1-7 天）。

## 部署到 Netlify

1. 连接 GitHub 仓库并部署。
2. 在 Netlify 环境变量里设置：
   - `QWEATHER_API_KEY`
   - `QWEATHER_API_HOST`
   - `QWEATHER_CITY_QUERY`
   - `QWEATHER_DISPLAY_CITY`
3. 重新部署。

说明：项目已包含 Netlify Functions（`netlify/functions/config.js`）和重定向规则（`netlify.toml`），页面仍访问 `/api/config`，Netlify 会自动转发到 `/.netlify/functions/config`。
