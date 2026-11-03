# 贡献指南

欢迎通过 Issue 推荐论文或纠错，也欢迎提交 Pull Request。项目以音视频联合鉴伪为重点，沿用现有六个方向，不自动收录全部 AI 安全新闻或纯文本大模型论文。

## 提交论文／修改记录

1. 在页面中检索标题、DOI、arXiv ID，检查是否已有同一工作的预印本或正式版。
2. 提供原始来源：官方论文集、出版社、arXiv、作者／机构项目页。聚合站只用于发现线索。
3. 写明研究价值：具体问题、方法差异、失败分析、评测协议或可复现资源。会议等级不是唯一标准。
4. 非顶会／预印本至少阅读摘要及必要的方法、实验或分析，并简要写明阅读范围。
5. 更新 `atlas-share-latest.html` 的 `atlas-data`，通过程序提取、修改和安全序列化 JSON；不要整库格式化或丢弃未显示的可选字段。

## 数据约束

- 保持已有 `id`。新增使用唯一稳定ID，推荐 `p-` + SHA-256(`arxiv:<去版本号ID>` 或 `doi:<小写DOI>`) 的前16位；不能据此重命名旧ID。
- `authors`、所有标签、`links.code` 保持数组；标签值必须来自当前 taxonomy。
- 音视频联合指内容依据，不按标题中的“multimodal”一词猜测。区分训练与推理模态。
- 更新正式发表信息时保留原预印本及历史链接。同一工作不同版本不重复计数；不同内容的会议／期刊扩展版需显式说明关系。
- 保留 `source_records`、`classification_evidence`、`original_ids`、`original_branches`、身份冲突、标题纠错、`rejected_arxiv_ids` 和 `rejected_urls`。
- 只有实际核验的字段追加来源与核验日期；不批量刷新 `checked_at`。
- 首次公开、正式发表、档案上线、来源更新与核验日期分别记录；只知道年／月时不要编造日。
- 主会、Workshop、期刊、预印本和已录用但未出版分开；作者自报录用不自动视为官方确认。
- 自写摘要标 `abstract_kind: "summary"`，保留来源。不要提交未经许可的大段原文。
- 当前总量／缺失统计同步计算；历史导入、隔离和去重统计不重新定义。

## 本地检查

Node.js 22+，维护命令跨平台：

```bash
npm ci
npm run validate
npm test
npx playwright install chromium
npm run build
npm run test:browser
npm run export:agent
```

Windows PowerShell 若限制 `npm.ps1`，使用 `npm.cmd`／`npx.cmd`，不要为此降低系统执行策略。

可保存旧 HTML 到临时目录，并运行历史保留检查：

```bash
node scripts/validate.mjs --baseline /path/to/previous.html
```

如确需合并旧ID、迁移taxonomy或移除错误历史字段，不要绕过检查；在PR中提出显式映射、理由和迁移测试，由维护者处理。

## Pull Request

- 使用小而聚焦的改动；一个PR尽量只做一类论文更新或界面修复。
- 提供目标ID、新增／修改数量、证据及验证结果，必要时补截图。
- 有意更改数量或taxonomy时同步 README 与文档，不把部署日当成数据版本日期。
- 不提交 `_site/`、`_exports/`、凭据、机器绝对路径、会话记录、原始研究缓存、论文PDF或大数据集。
- PR检查通过不代表论文质量已证实。维护者仍需核对事实和研究范围。
