# GitHub Pages 部署与发布

## 结构

`atlas-share-latest.html`是唯一源文件；`npm run build`把它原样复制为`_site/index.html`与下载版`_site/atlas-share-latest.html`，附加版本／哈希manifest及许可说明。整个工作目录绝不会作为Pages产物上传。

网页本身不需要构建；这里的构建只是校验和打包，保证部署内容明确、可追溯。

## GitHub配置

仓库：`zgythethree-hash/audio-visual-forensics-paper-list`。

在 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。官方说明：

- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

工作流`.github/workflows/pages.yml`：

1. main推送、Pull Request或手动触发运行校验和测试。
2. 数据／工具单元测试、真实Chromium浏览器回归通过后才上传Pages产物。
3. 只有`main`且不是PR事件的部署job获得`pages: write`和`id-token: write`。
4. 部署环境名为`github-pages`，建议限制只能由`main`部署。
5. 使用官方Actions并固定完整提交SHA；依赖使用`npm ci`与lockfile。Dependabot可提出依赖更新PR，不能自动跳过测试合并。

在线地址：`https://zgythethree-hash.github.io/audio-visual-forensics-paper-list/`。

Fork后修改README中的仓库／网站链接，并在自己的仓库启用Pages；不需要改页面资源路径。

## 一次正常更新

```bash
npm ci
npm run validate
npm test
npx playwright install chromium
npm run build
npm run test:browser
```

提交小而清晰的PR，核验数据来源并同步CHANGELOG。合并到main后，在Actions查看`Validate and deploy`，确认部署成功，再实测网站。更新HTML时不要更新无关记录的核验日期。

## 发布下载版本

通过GitHub Release发布版本标签，例如`v1.0.0`。附件建议包含原样单文件HTML及其SHA-256校验文件；数据版本与项目代码版本分别说明。原有历史由Git与Release保存，不把多份完整备份重复提交到main。

## 回退与排障

- **检查失败：**先看validate／单元／浏览器步骤，修复具体问题，不绕过部署门禁。
- **Pages未启用：**检查Source是否为GitHub Actions，以及仓库权限和`github-pages`环境。
- **部署404：**检查成功的Pages运行和产物中的根`index.html`；区分仓库文件预览与网站地址。
- **数据不一致：**比对在线`manifest.json`的`source_sha256`与本地文件；不要只看浏览器缓存。
- **回退：**对引入问题的提交做`git revert`，审核后推送；默认不重写公开分支历史。

本地私人研究文件、凭据、备份及会话记录由`.gitignore`排除。每次首发或新增目录前还应检查`git diff --cached --name-only`；忽略规则不能替代发布范围审查。
