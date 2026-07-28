const GITHUB_LOGIN = 'Ossi-1337';
const PINNED_REPOSITORIES_QUERY = `
    query PinnedRepositories($login: String!) {
        user(login: $login) {
            pinnedItems(first: 6, types: REPOSITORY) {
                nodes {
                    ... on Repository {
                        name
                        description
                        url
                        primaryLanguage {
                            name
                        }
                    }
                }
            }
        }
    }
`;

function jsonResponse(body, status, cacheControl = 'no-store') {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': cacheControl,
        },
    });
}

export async function onRequestGet({ env }) {
    if (!env.GITHUB_TOKEN) {
        return jsonResponse({ error: 'GitHub integration is not configured.' }, 503);
    }

    let response;
    try {
        response = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: {
                Accept: 'application/vnd.github+json',
                Authorization: `Bearer ${env.GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'oskardanielolsen.dk',
            },
            body: JSON.stringify({
                query: PINNED_REPOSITORIES_QUERY,
                variables: { login: GITHUB_LOGIN },
            }),
        });
    } catch {
        return jsonResponse({ error: 'GitHub is temporarily unavailable.' }, 502);
    }

    if (!response.ok) {
        return jsonResponse({ error: 'GitHub request failed.' }, 502);
    }

    let payload;
    try {
        payload = await response.json();
    } catch {
        return jsonResponse({ error: 'GitHub returned an invalid response.' }, 502);
    }

    const pinnedItems = payload.data?.user?.pinnedItems?.nodes;
    if (payload.errors || !Array.isArray(pinnedItems)) {
        return jsonResponse({ error: 'GitHub returned an invalid response.' }, 502);
    }

    const repositories = pinnedItems
        .filter(Boolean)
        .map((repository) => ({
            name: repository.name,
            description: repository.description,
            html_url: repository.url,
            language: repository.primaryLanguage?.name ?? null,
        }));

    return jsonResponse(
        repositories,
        200,
        'public, max-age=300, s-maxage=900'
    );
}
