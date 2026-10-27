import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

function version(content) {
    return createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex').slice(0, 16);
}

export async function versionAssets(root = projectRoot, { check = false } = {}) {
    const assetPath = (name) => resolve(root, 'public', name);
    const cssSource = await readFile(assetPath('index.css'), 'utf8');
    let css = cssSource;

    for (const icon of ['github', 'linkedin']) {
        const iconVersion = version(await readFile(assetPath(`icons/${icon}.svg`), 'utf8'));
        const iconPattern = new RegExp(`icons/${icon}\\.svg(?:\\?v=[a-f0-9]+)?`, 'g');
        if (!iconPattern.test(css)) throw new Error(`Missing ${icon} icon reference in index.css`);
        css = css.replace(iconPattern, `icons/${icon}.svg?v=${iconVersion}`);
    }

    const js = await readFile(assetPath('index.js'), 'utf8');
    const htmlSource = await readFile(assetPath('index.html'), 'utf8');
    let html = htmlSource;
    for (const [asset, content] of [['css', css], ['js', js]]) {
        const pattern = new RegExp(`((?:href|src)="index\\.${asset})(?:\\?v=[a-f0-9]+)?(")`, 'g');
        if (!pattern.test(html)) throw new Error(`Missing index.${asset} reference in index.html`);
        html = html.replace(pattern, `$1?v=${version(content)}$2`);
    }

    const changed = [['index.css', cssSource, css], ['index.html', htmlSource, html]]
        .filter(([, before, after]) => before !== after);
    if (check && changed.length) throw new Error('Asset versions are stale. Run node scripts/version-assets.mjs.');
    for (const [name, , content] of changed) await writeFile(assetPath(name), content);
    return changed.map(([name]) => name);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    const changed = await versionAssets(projectRoot, { check: process.argv.includes('--check') });
    console.log(changed.length ? `Versioned assets: ${changed.join(', ')}` : 'Asset versions are current.');
}
