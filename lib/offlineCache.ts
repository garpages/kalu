export function saveCache<T>(key: string, data: T) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch {
        // ignore quota/storage errors
    }
}

export function loadCache<T>(key: string): T | null {
    try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
    } catch {
        return null;
    }
}
