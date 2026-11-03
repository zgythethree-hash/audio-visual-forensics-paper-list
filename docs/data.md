# 数据结构与维护边界

唯一数据源是 `atlas-share-latest.html` 中 `id="atlas-data"` 的 `application/json` script。顶层为 schema_version=2，包含 `papers`、`taxonomy`、`stats`、数据版本和`update_history`。页面无需网络读取数据。

## 常用字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 稳定论文ID，不随标题／正式版本更新而改变 |
| `title` / `abstract` / `venue` / `publication` | string | 标题、摘要、来源与出版说明；未知保留空字符串 |
| `authors` | string[] | 完整作者数组 |
| `year` | integer | 当前记录的书目年份，不等于本次收录年份 |
| `primary_domain` | string | taxonomy.domains中的ID |
| `paper_types` / `tasks` / `techniques` / `properties` | string[] | taxonomy ID数组 |
| `training_modalities` / `inference_modalities` | string[] | 分别记录训练与推理模态；空数组可表示未核实 |
| `links.paper/pdf/arxiv/project` | string（可选） | 对应资源；不要假设字段总存在 |
| `links.code` | string[] | 多个代码资源；没有公开代码时为空数组 |
| `doi` / `arxiv_id` | string（可选） | 身份标识，缺失不是错误的充分证据 |
| `urls` | string[] | 关联与历史资源地址 |
| `source_records` | object[] | 来源、核验字段、日期、状态和备注 |
| `classification_evidence` | object[] | 分类依据；不能仅依题名猜分类 |
| `abstract_kind` | string（可选） | `summary`=整理摘要；`original`=明确标原文；未设置不自动推断 |
| `abstract_source_kind` / `abstract_source` | string（可选） | 原始／作者稿／二级来源及地址 |
| `publication_status` / `publication_type` | string（可选） | 并非整库都显式设置；不可把缺省当已发表 |
| `first_published` / `publication_date` / `updated` / `checked_at` | string（可选） | 首次公开／正式出版／来源更新时间／核验时间；允许年、月、日不同精度 |

其余字段按原语义保留。尤其不要丢弃`original_ids`、`original_branches`、`title_correction`、`identity_conflict`、`rejected_arxiv_ids`、`rejected_urls`与未参与渲染的字段。

## 核验不是二元标签

`identity_verified`或记录级`checked_at`是整理历史，不代表本轮把全部字段重新核实。引用具体事实时优先看`source_records[].fields`、状态、日期和原始URL。

历史`stats.original_records/added_records/excluded_records/quarantined_records/duplicate_records_removed/identity_verified/core_reviewed`有原整理批次的含义；当前`count/final_papers/domains/missing_*`与本轮`update_history`分开。隔离数量并不包含可重建的隔离内容。

## 2026-10-28快照已知限制

- 1352篇；3条摘要未取得：`p-0215928c6e6e0f8b`、`p-bde693f8e9b98f8c`、`p-c9114660797b2b3b`。
- 49条旧记录只确认arXiv来源，正式出版仍待核实。
- LAVA与NDSS2027关联研究保留作者声明，但不冒充独立确认录用。
- ROMCIR研究已核实Workshop身份与公开报告日，论文集正式出版日期／卷号仍未知。
- MVAD的PDF规模数字存在内部不一致，摘要不引用未澄清数量。
- 近似标题检查不能排除所有改名、翻译或内容重叠的工作。

## 安全修改

使用`scripts/atlas.mjs`提供的`parseAtlas`与`serializeAtlas`，通过JSON解析／序列化修改内嵌数据。后者转义`<`、`>`、`&`及Unicode行分隔符，防止内容意外终止script块。不要手工拼接整库JSON。

修改后运行`npm run validate`和测试；与旧快照比较时增加`--baseline`。程序检查只检查结构及保留规则，不替代原论文的事实核验。完整工作流见[贡献指南](../CONTRIBUTING.md)。
