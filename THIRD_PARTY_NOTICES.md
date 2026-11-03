# 第三方内容、来源与许可范围

## 自有代码与论文内容分开

根目录 `LICENSE` 的 MIT 许可覆盖项目自有的页面代码、维护工具和项目说明，不覆盖 `atlas-data` 中来源于第三方的论文摘要、原论文正文或外部资源。单文件 HTML 同时包含代码和论文记录，不意味着整个文件中的所有内容都获得同一许可。

- 论文标题、作者信息、书目信息、原文摘要及其他第三方材料，相关权利仍归各自权利人。
- 收录、链接、JSONL 导出和索引不构成再许可，不授予对第三方材料的统一再分发、商用或模型训练权利。
- 外部论文 PDF、数据集、作者代码和项目页以其各自许可及使用条款为准。本仓库不打包这些外部文件。
- 会议名称、AI Safety HOT 名称及商标用于说明导航目的，不表示隶属、赞助、合作或背书。

## 来源与摘要标记

每篇记录的 `links`、`urls`、`source_records`、`abstract_source` 等字段用于追溯来源。`abstract_kind=summary` 表示整理摘要，不是逐字原文；`abstract_source_kind=secondary_aggregator` 表示二级来源，不等于已独立核对原文。缺失字段应当保留未知，不能由使用者假定为验证通过。

公开快照保留既有文献整理历史，不声称对每条原始摘要完成了逐项版权审查。贡献者应尽量提交简短、自写、明确标识的忠实摘要与原始链接，而不是大段复制未经许可的论文文本。

## 纠错、署名或移除请求

如发现错误链接、署名问题或不适宜收录的内容，请在本仓库提交 Issue，提供论文 ID、原始来源和具体问题；不要附带私密信息。维护者可按具体证据更正、补充署名、改用简短整理摘要或移除相关内容，并保留必要的修订记录。

## English summary

MIT applies only to project-owned code and documentation. Third-party scholarly content retains its original rights. Linking, indexing, or exporting records is not a blanket relicensing or permission for model training. Consult the original source before reuse. Preserve provenance and summary labels. Report attribution or removal requests through the repository's issue tracker.
