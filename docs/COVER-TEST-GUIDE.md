# 封面获取功能测试说明

## 概述

这个测试套件用于验证用户导入书籍的封面获取功能，确保 Open Library API 集成正常工作。

## 测试方式

### 方式 1: GitHub Actions 自动测试（与 sync.yml 集成）

封面测试已集成到 [sync.yml](.github/workflows/sync.yml) 中：

- **触发条件**:
  1. 手动触发 workflow（workflow_dispatch）
  2. 提交信息包含"封面"关键字

- **运行顺序**:
  1. **封面获取功能测试** (test-cover-fetch) - 先运行
  2. **同步主任务** (sync) - 仅在测试通过后运行

- **查看测试结果**:
  1. 访问 GitHub 仓库 → Actions 标签
  2. 选择 "WeRead to Notion Sync" workflow
  3. 查看 "封面获取功能测试" 任务日志

## 测试内容

### 测试 1: 检测用户导入书籍
验证 `isUserImportedBook()` 函数能够正确识别以下类型的 URL：
- ✅ 用户导入书籍的封面（包含 `res.weread.qq.com/wrepub` 和 `_parsecover`）
- ✅ 普通书籍封面
- ✅ 第三方书籍封面

### 测试 2: 通过书名和作者搜索封面
测试 `searchBookCover()` 函数：
- 使用 Open Library API 搜索书籍封面
- 支持中英文书名和作者
- 验证返回的封面 URL 是否有效

### 测试 3: 通过 ISBN 搜索封面
测试 `searchBookCoverByISBN()` 函数：
- 优先使用 ISBN 进行精确搜索
- 测试有效的 ISBN（如 Clean Code: 9780132350884）
- 验证返回的封面 URL

### 测试 4: 综合封面获取测试
测试 `getBookCoverUrl()` 主函数：
- 测试普通书籍（已有有效封面）
- 测试用户导入书籍（有 ISBN）
- 测试用户导入书籍（无 ISBN）
- 验证智能选择最佳封面获取方式

## 运行测试

### 方式 1: GitHub Actions 自动测试（已集成到 sync.yml）

详细说明见上方 "测试方式" 部分。

### 方式 2: 本地手动测试
```bash
# 构建项目
npm run build

# 运行测试脚本
npx ts-node src/test-cover-fetch.ts
```

## 相关文件

- `src/utils/cover-fetch.ts` - 封面获取服务
- `src/utils/cover.ts` - 封面 URL 规范化
- `.github/workflows/sync.yml` - CI/CD 配置（包含封面测试）
