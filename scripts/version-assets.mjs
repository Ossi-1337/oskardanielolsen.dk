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
    const styleText = css.replace(/\r\n/g, '\n');
    if (/<\/style/i.test(styleText)) throw new Error('Stylesheet contains an HTML style closing tag.');
    const stylePattern = /<style id="site-styles">[\s\S]*?<\/style>|<link rel="stylesheet" href="index\.css(?:\?v=[a-f0-9]+)?">/;
    if (!stylePattern.test(htmlSource)) throw new Error('Missing site stylesheet in index.html');
    let html = htmlSource.replace(stylePattern, () => `<style id="site-styles">${styleText}</style>`);
    const scriptPattern = /((?:src)="index\.js)(?:\?v=[a-f0-9]+)?(")/g;
    if (!scriptPattern.test(html)) throw new Error('Missing index.js reference in index.html');
    html = html.replace(scriptPattern, `$1?v=${version(js)}$2`);

    const headersSource = await readFile(assetPath('_headers'), 'utf8');
    const styleHash = createHash('sha256').update(styleText).digest('base64');
    const stylePolicy = /style-src 'self'(?: 'sha256-[A-Za-z0-9+/]+=*')*/g;
    if (!stylePolicy.test(headersSource)) throw new Error('Missing style-src policy in _headers');
    const headers = headersSource.replace(stylePolicy, () => `style-src 'self' 'sha256-${styleHash}'`);

    const changed = [['index.css', cssSource, css], ['index.html', htmlSource, html], ['_headers', headersSource, headers]]
        .filter(([, before, after]) => before.replace(/\r\n/g, '\n') !== after.replace(/\r\n/g, '\n'));
    if (check && changed.length) throw new Error('Asset versions are stale. Run node scripts/version-assets.mjs.');
    for (const [name, , content] of changed) await writeFile(assetPath(name), content);
    return changed.map(([name]) => name);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    const changed = await versionAssets(projectRoot, { check: process.argv.includes('--check') });
    console.log(changed.length ? `Versioned assets: ${changed.join(', ')}` : 'Asset versions are current.');
}
