# 用户导入书籍封面处理指南

## 概述

用户从微信读书导入本地书籍（如 TXT、PDF、EPUB）时，微信读书的封面 URL 需要登录认证才能访问，Notion 无法直接显示。本方案提供了多种解决方法。

## 解决流程

```
用户导入书籍封面（需要认证）
    ↓
下载封面（使用微信读书 Cookie）
    ↓
上传到公开图床
    ↓
获取公开 URL
    ↓
导入到 Notion
```

## 配置步骤

### 1. 配置环境变量

在 GitHub Secrets 或本地 `.env` 文件中配置以下变量：

```bash
# 必需配置
WEREAD_COOKIE=your_weread_cookie_here
NOTION_API_KEY=your_notion_api_key_here
NOTION_DATABASE_ID=your_database_id_here

# 图床配置（二选一即可）
# 方案1: 使用 Imgur（推荐，更简单）
IMGUR_CLIENT_ID=your_imgur_client_id

# 方案2: 使用 GitHub 仓库
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_REPOSITORY=username/repository
```

### 2. 获取 Imgur Client ID（推荐）

1. 访问 [Imgur API](https://apidocs.imgur.com/)
2. 创建一个新应用（"Register an Application"）
3. 选择 "OAuth 2 authorization without a callback URL"
4. 填写基本信息后获取 Client ID

### 3. 获取 GitHub Token（备选）

1. 访问 [GitHub Settings > Tokens](https://github.com/settings/tokens)
2. 创建新的 Personal Access Token
3. 需要至少 `repo` 权限
4. 在仓库中创建一个 `temp-covers` 文件夹（可选，会自动创建）
5. 将仓库设为公开（让 Notion 能访问图片）

## GitHub Actions 配置

工作流已包含在 `.github/workflows/sync.yml`，支持：
- 手动触发（workflow_dispatch）
- 定时触发（每天凌晨 0 点）

## 封面获取策略

系统会按以下优先级尝试获取封面：

1. **优先使用 Imgur**（如果配置了 Imgur Client ID）
2. **其次使用 GitHub**（如果配置了 GitHub Token）
3. **然后使用 Open Library**（通过书名和作者搜索）
4. **最后使用 ISBN 搜索**（如果有 ISBN）
5. **全部失败则不显示封面**

## 文件说明

| 文件 | 作用 |
|------|------|
| `src/utils/image-upload.ts` | 图片下载和上传功能 |
| `src/utils/cover-fetch.ts` | 封面获取逻辑 |
| `.github/workflows/sync.yml` | GitHub Actions 工作流 |
| `.env.example` | 环境变量示例 |

## 本地测试

```bash
# 1. 复制配置文件
cp .env.example .env

# 2. 填入你的配置
# 编辑 .env 文件

# 3. 安装依赖
npm install

# 4. 编译并运行
npm run build
npm start -- --all
```

## 注意事项

1. **Cookie 安全**：WEREAD_COOKIE 包含敏感信息，请不要提交到仓库
2. **GitHub 仓库**：如果使用 GitHub 作为图床，建议使用专门的仓库
3. **图片存储**：GitHub 仓库中的图片会永久保存，建议定期清理
4. **速率限制**：注意 Notion 和图床的 API 速率限制

## 故障排查

### 封面下载失败
- 检查 WEREAD_COOKIE 是否有效
- 确认书籍在微信读书中可正常访问

### Imgur 上传失败
- 检查 Client ID 是否正确
- 确认网络可以访问 Imgur

### GitHub 上传失败
- 检查 Token 权限是否足够
- 确认仓库存在且为公开

### Notion 不显示图片
- 确认图片 URL 是公开可访问的
- 检查 Notion 中文件属性是否正确配置
