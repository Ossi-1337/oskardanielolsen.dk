export async function onRequest(context) {
    const requestHeaders = new Headers(context.request.headers);
    if (context.request.method === 'GET' || context.request.method === 'HEAD') {
        // A cached or partial HTML document must not receive a different nonce.
        for (const name of ['If-None-Match', 'If-Modified-Since', 'Range', 'If-Range']) {
            requestHeaders.delete(name);
        }
    }

    const response = await context.next(new Request(context.request, { headers: requestHeaders }));
    const contentType = response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
    if (contentType !== 'text/html') return response;

    const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
    const secured = new Response(response.body, response);
    // Cloudflare copies this response nonce onto its injected JavaScript Detections scripts.
    const basePolicy = response.headers.get('Content-Security-Policy') ?? [
        "default-src 'self'",
        "base-uri 'none'",
        "connect-src 'self'",
        "form-action 'none'",
        "frame-ancestors 'none'",
        "img-src 'self'",
        "object-src 'none'",
        "script-src 'self'",
        "style-src 'self'",
    ].join('; ');
    secured.headers.set('Content-Security-Policy', basePolicy.replace(
        /(^|;\s*)script-src\s+[^;]+/,
        (directive) => `${directive} 'nonce-${nonce}'`
    ));
    secured.headers.set('Permissions-Policy', 'camera=(), geolocation=(), microphone=()');
    for (const name of ['Cache-Control', 'CDN-Cache-Control', 'Cloudflare-CDN-Cache-Control']) {
        secured.headers.set(name, 'no-store');
    }
    for (const name of ['ETag', 'Last-Modified', 'Age', 'Expires']) {
        secured.headers.delete(name);
    }
    return secured;
}
