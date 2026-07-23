# 将微信读书划线/想法等信息同步到 Notion

## 项目说明

- 支持将微信读书划线/想法同步到 Notion
- 通过 github actions 每天定时同步
- 同步微信读书部分元数据信息

## 最终效果

[点我查看在线版](https://zengyincen.notion.site/bc53c0bb724d8388af60016cce930ea6)

## 截图

画廊
![画廊](images/画廊.png)

表格
![表格](images/表格.png)

## 相关配置信息

[notion 集成申请](https://www.notion.so/profile/integrations)\
[模板地址](https://sailor0913.notion.site/1f269034c78f8019af2dc928f665bca9?pvs=73)

## 阅读时长热力图

仓库会每 3 小时运行一次 `Read time sync` 工作流，将当年的每日阅读时长生成到固定文件：

```text
heatmap/weread.svg
```

热力图直接使用微信读书官方 Agent API，不再依赖 `github_heatmap` 的
`REFRESH_TOKEN / ACTIVATION_CODE / DEVICE_ID` 登录方式，因此不会出现
`Failed to refresh token` 或 `-2010 用户不存在`。

在仓库的 **Settings → Secrets and variables → Actions** 中配置：

- `WEREAD_API_KEY`（推荐）：在 https://weread.qq.com/r/weread-skills 获取。
- `WEREAD_COOKIE`（兼容）：未配置 API Key 时，脚本会用已有 Cookie 自动获取。
- `HEATMAP_BLOCK_ID`：可直接填写 Notion 页面 ID；脚本会自动查找或创建热力图图片块。也兼容填写现有 image/embed 块 ID。
- `NOTION_INTEGRATIONS`：沿用本项目已有的 Notion Integration Token。

`HEATMAP_BLOCK_ID` 未配置时，工作流仍会生成并提交 SVG，只跳过 Notion 更新。
Notion 页面必须已共享给对应 Integration。图片使用提交 SHA 组成公开 URL，既保持
`weread.svg` 文件名不变，也能避开 Notion 图片缓存。

可选的 Repository Variables：`YEAR`、`HEATMAP_NAME` 以及
`HEATMAP_BACKGROUND_COLOR`、`HEATMAP_EMPTY_COLOR`、`HEATMAP_LOW_COLOR`、
`HEATMAP_MEDIUM_COLOR`、`HEATMAP_HIGH_COLOR`、`HEATMAP_TEXT_COLOR`。

本地生成：

```bash
npm ci
npm run heatmap
```

<br />

## 致谢


[weread-to-notion](https://github.com/sailor0913/weread-to-notion)\
[obsidian-weread-plugin](https://github.com/zhaohongxuan/obsidian-weread-plugin)\
[weread2notion](https://github.com/malinkang/weread2notion)
<br />
