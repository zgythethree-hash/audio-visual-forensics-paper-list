import { test, expect } from '@playwright/test';
import { readAtlas } from '../../scripts/atlas.mjs';

const { data } = await readAtlas();
const all = data.papers;
const file = new URL('../../_site/index.html', import.meta.url).href;
const count = page => page.locator('#result-count strong');
const number = n => n.toLocaleString('en-US');
test('local file works offline; searches old and new papers; no network or console errors', async ({ page, context }) => {
  await context.setOffline(true);
  const errors = []; const requests = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
  page.on('request', r => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
  await page.goto(file);
  await expect(count(page)).toHaveText(number(all.filter(p => p.primary_domain === 'av').length));
  await expect(page.locator('.paper')).toHaveCount(25);
  await page.locator('a[href="#domain=all"]').click();
  await expect(count(page)).toHaveText(number(all.length));
  for (const word of ['BabelFake', 'AV-FABLE', 'ARISE', 'SynthID-Image', 'LADDER']) {
    await page.locator('#search').fill(word);
    await expect(page.locator('.paper-heading').filter({ hasText: word }).first()).toBeVisible();
  }
  await page.locator('#clear-search').click();
  await expect(count(page)).toHaveText(number(all.length));
  expect(requests).toEqual([]); expect(errors).toEqual([]);
});

test('multi-select OR, cross-group AND, code filter and dynamic facet counts', async ({ page }) => {
  await page.goto(`${file}#domain=all`);
  await page.getByRole('checkbox', { name: '年份：2025', exact: true }).check();
  await page.getByRole('checkbox', { name: '年份：2024', exact: true }).check();
  await expect(count(page)).toHaveText(number(all.filter(p => [2024, 2025].includes(p.year)).length));
  await page.getByRole('checkbox', { name: '论文类型：方法', exact: true }).check();
  const selected = all.filter(p => [2024, 2025].includes(p.year) && p.paper_types.includes('method'));
  await expect(count(page)).toHaveText(number(selected.length));
  await page.locator('#code').check();
  await expect(count(page)).toHaveText(number(selected.filter(p => p.links.code.length > 0).length));
  const expected2026 = all.filter(p => p.year === 2026 && p.paper_types.includes('method') && p.links.code.length > 0).length;
  const actual = await page.getByRole('checkbox', { name: '年份：2026', exact: true }).evaluate(n => n.closest('label').querySelector('.count').textContent);
  expect(actual).toBe(number(expected2026));
  await page.reload();
  await expect(page.getByRole('checkbox', { name: '年份：2024', exact: true })).toBeChecked();
  await expect(page.locator('#code')).toBeChecked();
  await page.locator('.reset-button').click();
  await expect(count(page)).toHaveText(number(all.length));
});

test('sorting, pagination, back/forward, empty result and reset', async ({ page }) => {
  await page.goto(`${file}#domain=all`);
  for (const mode of ['title', 'old', 'new']) {
    await page.locator('#sort').selectOption(mode);
    const first = all.slice().sort((a, b) => mode === 'title' ? a.title.localeCompare(b.title, 'en') : (mode === 'old' ? a.year - b.year : b.year - a.year) || (mode === 'old' ? (a.first_published || '').localeCompare(b.first_published || '') : (b.first_published || '').localeCompare(a.first_published || '')) || a.title.localeCompare(b.title, 'en'))[0];
    await expect(page.locator('.paper-heading').first()).toHaveText(first.title);
  }
  await page.getByRole('button', { name: '下一页', exact: true }).click();
  await expect(page.locator('#result-count')).toContainText('26–50');
  await page.goBack();
  await expect(page.locator('#result-count')).toContainText('1–25');
  await page.goForward();
  await expect(page.locator('#result-count')).toContainText('26–50');
  await page.locator('#search').fill('zz_no_such_paper_999999');
  await expect(page.locator('.empty')).toBeVisible();
  await expect(count(page)).toHaveText('0');
  await page.locator('.empty button').click();
  await expect(count(page)).toHaveText(number(all.length));
});

test('authors, abstract labels, expansion and theme persistence', async ({ page }) => {
  await page.goto(`${file}#domain=all&q=ASVspoof+2019%3A+A+large-scale+public+database`);
  const article = page.locator('.paper').filter({ has: page.locator('h2', { hasText: 'ASVspoof 2019: A large-scale public database' }) });
  const authors = article.locator('.authors button');
  await authors.click(); await expect(authors).toHaveAttribute('aria-expanded', 'true');
  await authors.click(); await expect(authors).toHaveAttribute('aria-expanded', 'false');
  const abstract = article.locator('.abstract-toggle');
  await abstract.click(); await expect(abstract).toHaveAttribute('aria-expanded', 'true');
  await expect(article).toContainText('整理，非原文');
  const secondary = all.find(p => p.abstract && p.abstract_source_kind === 'secondary_aggregator');
  await page.locator('#search').fill(secondary.title);
  await expect(page.locator('.paper').filter({ hasText: secondary.title }).first()).toContainText('二级来源');
  const before = await page.locator('html').getAttribute('data-theme');
  await page.locator('#theme').click();
  const after = await page.locator('html').getAttribute('data-theme');
  expect(after).not.toBe(before);
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', after);
});

for (const width of [320, 390, 1440]) {
  test(`navigation, keyboard and layout at ${width}px in both themes`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(file);
    for (const theme of ['light', 'dark']) {
      if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator('#theme').click();
      const details = page.locator('.research-hub details');
      const summary = details.locator('summary');
      await summary.focus(); await page.keyboard.press('Enter');
      await expect(details).toHaveAttribute('open', '');
      await expect(page.locator('.research-hub a')).toHaveCount(13);
      await expect(page.locator('.research-hub a[href="https://aisafetyhot.com/zh"]')).toBeVisible();
      const geometry = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        links: [...document.querySelectorAll('.research-hub a')].every(a => a.target === '_blank' && a.rel.includes('noopener') && a.rel.includes('noreferrer') && a.getBoundingClientRect().right <= innerWidth + 1),
        searchFirst: document.querySelector('#search-form').getBoundingClientRect().bottom <= document.querySelector('.research-hub').getBoundingClientRect().top
      }));
      expect(geometry).toEqual({ overflow: false, links: true, searchFirst: true });
      await summary.focus(); await page.keyboard.press('Space');
      await expect(details).not.toHaveAttribute('open', '');
    }
  });
}

test('project-site subpath serves the same data, manifest and offline download', async ({ page, request }) => {
  const url = 'http://127.0.0.1:4173/paper-list/';
  await page.goto(url);
  await expect(count(page)).toHaveText(number(all.filter(p => p.primary_domain === 'av').length));
  const manifest = await (await request.get(`${url}manifest.json`)).json();
  expect(manifest.paper_count).toBe(all.length);
  const download = await request.get(`${url}atlas-share-latest.html`);
  expect(download.ok()).toBe(true);
  expect(await download.body()).toEqual((await readAtlas()).bytes);
});
