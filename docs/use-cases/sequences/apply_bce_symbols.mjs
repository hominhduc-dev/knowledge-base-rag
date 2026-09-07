import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// Keep the trusted Archify output separate; customize static SVG so exports
// and the viewer use exactly the same symbols, without runtime DOM patches.
const root = fileURLToPath(new URL('.', import.meta.url));
const archify = process.env.ARCHIFY_CLI;
const hash = value => createHash('sha256').update(value).digest('hex');
let count = 0;
for (const folder of readdirSync(root).filter(name => /^uc\d+_/.test(name)).sort()) {
  const dir = join(root, folder);
  const original = join(dir, 'diagram.archify.html');
  const output = join(dir, 'diagram.html');
  if (process.argv.includes('--render')) {
    if (!archify) throw new Error('Set ARCHIFY_CLI to the installed bin/archify.mjs');
    const run = spawnSync(process.execPath, [archify, 'deliver', 'sequence', join(dir, 'diagram.sequence.json'), original, '--quality', 'showcase', '--json'], { encoding: 'utf8' });
    if (run.status !== 0) throw new Error(run.stderr + run.stdout);
    writeFileSync(join(dir, 'diagram.archify.receipt.json'), run.stdout);
  }
  if (!existsSync(original)) {
    const initial = readFileSync(output, 'utf8');
    if (initial.includes('data-bce-symbol=')) throw new Error(`Missing original: ${folder}`);
    writeFileSync(original, initial);
  }
  const source = readFileSync(original, 'utf8');
  let html = source;
  for (const [id, kind] of [['actor', 'external'], ['boundary', 'frontend'], ['control', 'backend'], ['entity', 'database']]) {
    const pattern = new RegExp(`(<g id="node-${id}"[^>]*>)([\\s\\S]*?<text data-detail="context"[^>]*>[\\s\\S]*?</text>)\\s*</g>`);
    const match = html.match(pattern);
    if (!match) throw new Error(`Participant ${id} missing in ${folder}`);
    const body = match[2];
    const label = body.match(/<text data-node-label=""[\s\S]*?<\/text>/)[0];
    const sublabel = body.match(/<text data-detail="context"[\s\S]*?<\/text>/)[0];
    const x = Number(label.match(/ x="([^"]+)"/)[1]);
    const title = body.match(/<title>[\s\S]*?<\/title>/)[0];
    const stroke = `class="s-${kind}" stroke="currentColor" stroke-width="1.5" fill="none"`;
    let symbol;
    if (id === 'actor') {
      symbol = `<circle cx="${x}" cy="60" r="7" class="c-mask"/><circle cx="${x}" cy="60" r="7" ${stroke}/><path d="M${x} 67v25m-15-17h30m-15 17-14 16m14-16 14 16" ${stroke}/>`;
    } else {
      symbol = `<circle cx="${x}" cy="88" r="34" class="c-mask"/><circle cx="${x}" cy="88" r="34" class="c-${kind}" stroke-width="1.5"/>`;
      if (id === 'boundary') symbol += `<path d="M${x-48} 73v30m0-15h14" ${stroke}/>`;
      if (id === 'control') symbol += `<path d="M${x+12} 46l-12 8 12 8" ${stroke}/>`;
      if (id === 'entity') symbol += `<path d="M${x-27} 122h54" ${stroke}/>`;
      symbol += `<path d="M${x} 122v4" ${stroke}/>`;
    }
    const primary = label.replace(/ y="[^"]+"/, ` y="${id === 'actor' ? 120 : 92}"`);
    const secondary = sublabel.replace(/ y="[^"]+"/, ' y="140"');
    html = html.replace(pattern, `${match[1]}${title}<g data-bce-symbol="${id}" aria-hidden="true">${symbol}</g>${primary}${secondary}</g>`);
  }
  html = html.replace('</head>', '<meta name="diagram-variant" content="BCE SVG customization of diagram.archify.html">\n</head>');
  writeFileSync(output, html);
  writeFileSync(join(dir, 'diagram.bce.receipt.json'), JSON.stringify({ variant: 'BCE static SVG', source: 'diagram.archify.html', sourceSha256: hash(source), artifact: 'diagram.html', artifactSha256: hash(html), symbols: ['actor', 'boundary', 'control', 'entity'], archifyDeliveryAppliesTo: 'diagram.archify.html' }, null, 2) + '\n');
  count++;
}
console.log(`Updated ${count} BCE diagrams.`);
