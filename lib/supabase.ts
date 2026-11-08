import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

const isBrowser = typeof window !== 'undefined'

// In the browser every Supabase call goes to OUR OWN domain (/sb/...).
// The server route app/sb/[...path]/route.ts forwards it to Supabase, so users
// whose network blocks or throttles *.supabase.co still work without a VPN.
const baseUrl = isBrowser ? `${window.location.origin}/sb` : supabaseUrl

// Keep the exact storage key the app used before, so nobody is logged out.
function legacyStorageKey() {
    try {
        return `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
    } catch {
        return undefined
    }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Reads are retried (flaky mobile networks drop requests); writes are never
// retried automatically, but every request has a timeout so the UI cannot hang.
async function resilientFetch(
    input: RequestInfo | URL,
    init: RequestInit = {}
): Promise<Response> {
    const method = (init.method || 'GET').toUpperCase()
    const idempotent = method === 'GET' || method === 'HEAD'
    const attempts = idempotent ? 3 : 1
    const timeoutMs = idempotent ? 20000 : 90000
    const outer = init.signal

    for (let i = 0; i < attempts; i++) {
        const controller = new AbortController()
        const forward = () => controller.abort()

        if (outer) {
            if (outer.aborted) controller.abort()
            else outer.addEventListener('abort', forward, { once: true })
        }

        const timer = setTimeout(() => controller.abort(), timeoutMs)

        try {
            const res = await fetch(input, { ...init, signal: controller.signal })

            if (idempotent && res.status >= 502 && res.status <= 504 && i < attempts - 1) {
                await sleep(400 * 2 ** i)
                continue
            }

            return res
        } catch (err) {
            if (outer?.aborted || !idempotent || i === attempts - 1) throw err
            await sleep(400 * 2 ** i)
        } finally {
            clearTimeout(timer)
            outer?.removeEventListener('abort', forward)
        }
    }

    throw new Error('Network request failed')
}

export const supabase = createClient(baseUrl, supabasePublishableKey, {
    auth: { storageKey: legacyStorageKey() },
    global: { fetch: resilientFetch },
})

// auth.getUser() normally makes a network round trip to Supabase on every call
// (every page called it, twice). In the browser we read the stored session
// instead. Data access is still protected by Row Level Security on the server,
// and the profile (role / is_active) is still checked against the database.
if (isBrowser) {
    const original = supabase.auth.getUser.bind(supabase.auth)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.auth as any).getUser = async (jwt?: string) => {
        if (jwt) return original(jwt)

        const {
            data: { session },
        } = await supabase.auth.getSession()

        return { data: { user: session?.user ?? null }, error: null }
    }
}
