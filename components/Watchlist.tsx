'use client'
import { useState, useEffect } from 'react'
import type { Lang } from '../lib/evaluate'

interface WatchItem { symbol: string; name: string; addedAt: string }

interface Props {
  lang: Lang
  onSelect: (symbol: string) => void
}

export default function Watchlist({ lang, onSelect }: Props) {
  const [items, setItems] = useState<WatchItem[]>([])
  const [open, setOpen]   = useState(false)

  useEffect(() => {
    const load = () => {
      try {
        const stored = localStorage.getItem('watchlist')
        if (stored) setItems(JSON.parse(stored))
      } catch {}
    }
    load()
    // Listen for storage changes (e.g. when WatchlistStar toggles)
    window.addEventListener('storage', load)
    // Also poll briefly for same-tab updates
    const interval = setInterval(load, 500)
    return () => { window.removeEventListener('storage', load); clearInterval(interval) }
  }, [])

  if (items.length === 0) return null

  const de = lang === 'de'

  return (
    <div className="watchlist-dropdown-wrap">
      <button className="watchlist-toggle" onClick={() => setOpen(o => !o)} title={de ? 'Watchlist' : 'Watchlist'}>
        <span className="watchlist-icon">★</span>
        <span className="watchlist-count">{items.length}</span>
      </button>
      {open && (
        <>
          {/* Click outside to close */}
          <div className="watchlist-backdrop" onClick={() => setOpen(false)} />
          <div className="watchlist-panel">
            <div className="watchlist-header">
              <span>{de ? 'Meine Watchlist' : 'My Watchlist'}</span>
              <button className="watchlist-close" onClick={() => setOpen(false)}>✕</button>
            </div>
            {items.map(item => (
              <button
                key={item.symbol}
                className="watchlist-item"
                onClick={() => { onSelect(item.symbol); setOpen(false) }}
              >
                <span className="watchlist-item-name">{item.name}</span>
                <span className="watchlist-item-sym">{item.symbol}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
