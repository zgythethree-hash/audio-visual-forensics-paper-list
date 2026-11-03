import { readAtlas, validateAtlas, validatePage, validatePreservation } from './atlas.mjs';

try {
  const source = await readAtlas();
  const report = { ...validateAtlas(source.data), ...validatePage(source.html), source_sha256: source.sha256 };
  const args = process.argv.slice(2);
  if (args.length) {
    if (args.length !== 2 || args[0] !== '--baseline') throw Error('Usage: node scripts/validate.mjs [--baseline previous.html]');
    report.preservation = validatePreservation((await readAtlas(args[1])).data, source.data);
  }
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(`Validation failed: ${error.message}`);
  process.exitCode = 1;
}
