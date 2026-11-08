// Same-origin proxy to Supabase.
//
// Why: browsers on some Iranian networks cannot reach *.supabase.co directly,
// which is why the app only worked with a VPN. The browser now talks only to
// our own domain (/sb/...); this route forwards the request from Cloudflare's
// network, which is not subject to those restrictions.
//
// It only forwards to the three public Supabase APIs the app already uses, with
// the user's own Authorization/apikey headers, so it grants nothing new.

export const dynamic = 'force-dynamic'

const UPSTREAM = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
).replace(/\/+$/, '')

const ALLOWED_PREFIXES = ['auth/v1/', 'rest/v1/', 'storage/v1/']

const FORWARD_REQUEST_HEADERS = [
    'authorization',
    'apikey',
    'content-type',
    'accept',
    'prefer',
    'range',
    'range-unit',
    'content-profile',
    'accept-profile',
    'cache-control',
    'if-none-match',
    'if-modified-since',
    'x-client-info',
    'x-upsert',
    'x-supabase-api-version',
]

const FORWARD_RESPONSE_HEADERS = [
    'content-type',
    'cache-control',
    'etag',
    'last-modified',
    'content-range',
    'content-disposition',
    'content-location',
    'accept-ranges',
    'preference-applied',
    'retry-after',
    'www-authenticate',
    'x-supabase-api-version',
]

type Ctx = { params: Promise<{ path: string[] }> }

async function proxy(req: Request, ctx: Ctx): Promise<Response> {
    const { path } = await ctx.params
    const joined = (path || []).join('/')

    if (
        !UPSTREAM ||
        joined.includes('..') ||
        !ALLOWED_PREFIXES.some((p) => joined.startsWith(p))
    ) {
        return new Response('Not found', { status: 404 })
    }

    const incoming = new URL(req.url)
    const target = `${UPSTREAM}/${joined}${incoming.search}`

    const headers = new Headers()
    for (const name of FORWARD_REQUEST_HEADERS) {
        const value = req.headers.get(name)
        if (value) headers.set(name, value)
    }

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
    const body = hasBody ? await req.arrayBuffer() : undefined

    let upstream: Response
    try {
        upstream = await fetch(target, {
            method: req.method,
            headers,
            body,
            redirect: 'manual',
        })
    } catch {
        return Response.json({ error: 'upstream_unreachable' }, { status: 502 })
    }

    const out = new Headers()
    for (const name of FORWARD_RESPONSE_HEADERS) {
        const value = upstream.headers.get(name)
        if (value) out.set(name, value)
    }

    // Data and auth responses are per-user: never cache them. Signed storage
    // objects keep the cache headers Supabase sets so images are cached by the browser.
    const isStorageRead =
        req.method === 'GET' && joined.startsWith('storage/v1/object/')
    if (!isStorageRead || !out.has('cache-control')) {
        out.set('cache-control', 'no-store')
    }

    return new Response(upstream.status === 204 ? null : upstream.body, {
        status: upstream.status,
        headers: out,
    })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
export const HEAD = proxy
export const OPTIONS = async () => new Response(null, { status: 204 })
