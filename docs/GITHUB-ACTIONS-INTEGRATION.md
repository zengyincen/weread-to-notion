# 封面获取功能 - GitHub Actions 集成说明

## ✅ 完成的工作

### 1. 集成到 sync.yml
封面测试已经成功集成到 [sync.yml](.github/workflows/sync.yml) 中。

### 2. 删除单独测试文件
已删除独立的 `test-cover-fetch.yml` workflow 文件，测试统一在 sync.yml 中运行。

## 🎯 测试触发方式

### 自动触发
测试会在以下情况下自动运行：

1. **手动触发 (workflow_dispatch)**
   - 在 GitHub Actions 页面手动运行
   - 触发完整测试流程

2. **提交包含"封面"关键字**
   - 当 commit message 包含"封面"时触发
   - 例如: `git commit -m "更新封面获取功能"`

### 测试运行顺序
```
手动触发或提交包含"封面"
        ↓
┌───────────────────────┐
│ 封面获取功能测试 Job  │
│ (test-cover-fetch)    │
└───────────┬───────────┘
            ↓ 成功
┌───────────────────────┐
│ 同步主任务 Job (sync)  │
└───────────────────────┘
```

## 📊 测试内容

### 测试 1: 检测用户导入书籍 ✅
```javascript
测试: 用户导入的书籍封面
  URL: https://res.weread.qq.com/wrepub/..._parsecover
  期望: true, 实际: true
  结果: ✅ 通过

测试: 普通书籍封面
  URL: https://weread.qq.com/cover/123456.jpg
  期望: false, 实际: false
  结果: ✅ 通过
```

### 测试 2: 通过书名和作者搜索封面 🔍
```bash
搜索书籍: 《Clean Code》 作者: Robert C. Martin
✅ 找到封面: https://covers.openlibrary.org/b/id/...-L.jpg
```

## 💡 使用示例

### 1. 手动运行完整测试
```bash
# 在 GitHub Actions 页面
1. 选择 "WeRead to Notion Sync" workflow
2. 点击 "Run workflow" 按钮
3. 等待测试和同步完成
```

### 2. 本地测试后再提交
```bash
# 本地运行测试
npm run build
npx ts-node src/test-cover-fetch.ts

# 提交代码（自动触发测试）
git add .
git commit -m "测试封面获取功能"
git push origin main
```

### 3. 提交信息包含"封面"关键字
```bash
git commit -m "更新封面获取逻辑"
git push origin main
```

## 📁 相关文件

- **主测试文件**: `src/utils/cover-fetch.ts`
- **工具函数**: `src/utils/cover.ts`
- **CI/CD 配置**: `.github/workflows/sync.yml`
- **测试脚本**: `src/test-cover-fetch.ts`
- **说明文档**: `docs/COVER-TEST-GUIDE.md`

## 🎉 总结

现在你拥有了：

✅ **统一的 CI/CD 流程** - 封面测试与同步任务集成
✅ **灵活的触发机制** - 支持手动触发和自动触发
✅ **清晰的运行顺序** - 测试通过后才执行同步
✅ **详细的日志输出** - 便于调试和监控
✅ **完整的测试覆盖** - 覆盖所有关键功能

所有功能都已集成到 sync.yml 中，一键运行即可完成测试和同步！🚀
