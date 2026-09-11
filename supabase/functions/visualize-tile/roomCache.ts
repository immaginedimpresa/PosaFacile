/** Short-lived, bounded per-worker cache. Product changes must reuse room geometry.
 * No photos or masks are persisted to storage; failed analyses are never cached. */
export class RoomCache<T> {
    private entries = new Map<string, { expires: number; value: Promise<T> }>()
    constructor(private capacity = 3, private ttlMs = 5 * 60_000) {}
    get(key: string, analyze: () => Promise<T>): Promise<T> {
        const now = Date.now()
        for (const [id, entry] of this.entries) if (entry.expires <= now) this.entries.delete(id)
        const existing = this.entries.get(key)
        if (existing) {
            this.entries.delete(key)
            this.entries.set(key, existing)
            return existing.value
        }
        while (this.entries.size >= this.capacity) this.entries.delete(this.entries.keys().next().value!)
        const value = Promise.resolve().then(analyze)
        this.entries.set(key, { expires: now + this.ttlMs, value })
        void value.catch(() => { if (this.entries.get(key)?.value === value) this.entries.delete(key) })
        return value
    }
}
