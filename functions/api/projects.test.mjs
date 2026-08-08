import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('./projects.js', import.meta.url), 'utf8');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const { onRequestGet } = await import(moduleUrl);

test('query variants reuse the projects cache entry', async (t) => {
    const originalCaches = globalThis.caches;
    const originalFetch = globalThis.fetch;
    const cacheEntries = new Map();
    const pendingWrites = [];
    let fetchCalls = 0;

    t.after(() => {
        globalThis.caches = originalCaches;
        globalThis.fetch = originalFetch;
    });

    globalThis.caches = {
        default: {
            async match(request) {
                return cacheEntries.get(request.url)?.clone();
            },
            async put(request, response) {
                cacheEntries.set(request.url, response.clone());
            },
        },
    };

    const repositories = [
        {
            name: 'actio',
            description: 'Local-first workflow runner.',
            url: 'https://github.com/Ossi-1337/actio',
            primaryLanguage: { name: 'C#' },
        },
    ];

    globalThis.fetch = async () => {
        fetchCalls += 1;
        return Response.json({
            data: {
                user: {
                    pinnedItems: { nodes: repositories },
                },
            },
        });
    };

    async function requestProjects(url) {
        const response = await onRequestGet({
            env: { GITHUB_TOKEN: 'test-token' },
            request: new Request(url),
            waitUntil(promise) {
                pendingWrites.push(promise);
            },
        });

        await Promise.all(pendingWrites.splice(0));
        return response;
    }

    const first = await requestProjects('https://example.com/api/projects');
    const repeated = await requestProjects('https://example.com/api/projects');
    const queryVariant = await requestProjects(
        'https://example.com/api/projects?nonce=attacker-controlled'
    );
    const encodedQueryVariant = await requestProjects(
        'https://example.com/api/projects?nonce=%2Fapi%2Fprojects&duplicate=1'
    );

    assert.equal(fetchCalls, 1);
    const firstBody = await first.json();
    const repeatedBody = await repeated.json();
    const queryVariantBody = await queryVariant.json();
    const encodedQueryVariantBody = await encodedQueryVariant.json();
    assert.deepEqual(firstBody, repeatedBody);
    assert.deepEqual(repeatedBody, queryVariantBody);
    assert.deepEqual(queryVariantBody, encodedQueryVariantBody);
    assert.equal(first.headers.get('Cache-Control'), 'public, max-age=300, s-maxage=900');
    assert.deepEqual([...cacheEntries.keys()], ['https://example.com/api/projects']);
});
