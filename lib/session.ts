// Tiny per-tab cache so the header does not re-query the user's role on every page.
const KEY = 'kalu_role_cache'
const TTL_MS = 2 * 60 * 1000

export function getCachedRole(userId: string): string | null {
    try {
        const raw = sessionStorage.getItem(KEY)
        if (!raw) return null
        const v = JSON.parse(raw)
        if (v.id !== userId || Date.now() - v.t > TTL_MS) return null
        return v.role as string
    } catch {
        return null
    }
}

export function setCachedRole(userId: string, role: string) {
    try {
        sessionStorage.setItem(KEY, JSON.stringify({ id: userId, role, t: Date.now() }))
    } catch {
        /* storage unavailable: just skip caching */
    }
}

export function clearSessionCaches() {
    try {
        sessionStorage.removeItem(KEY)
    } catch {
        /* ignore */
    }
}
