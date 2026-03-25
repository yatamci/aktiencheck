'use client'
import { useState, useEffect } from 'react'
import type { Lang } from '../lib/evaluate'

interface WatchItem { symbol: string; name: string; addedAt: string }

interface Props {
  currentSymbol?: string
  currentName?: string
  lang: Lang
  onSelect: (symbol: string) => void
}

export default function Watchlist({ currentSymbol, currentName, lang, onSelect }: Props) {
  const [items, setItems] = useState<WatchItem[]>([])
  const [open, setOpen]   = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('watchlist')
      if (stored) setItems(JSON.parse(stored))
    } catch {}
  }, [])

  const save = (next: WatchItem[]) => {
    setItems(next)
    localStorage.setItem('watchlist', JSON.stringify(next))
  }

  const isWatched = currentSymbol ? items.some(i => i.symbol === currentSymbol) : false

  const toggle = () => {
    if (!currentSymbol) return
    if (isWatched) {
      save(items.filter(i => i.symbol !== currentSymbol))
    } else {
      save([...items, { symbol: currentSymbol, name: currentName ?? currentSymbol, addedAt: new Date().toISOString() }])
    }
  }

  const de = lang === 'de'

  return (
    <div className="watchlist-wrap">
      {/* Star toggle button */}
      {currentSymbol && (
        <button
          className={`watchlist-star${isWatched ? ' watchlist-star--on' : ''}`}
          onClick={toggle}
          title={isWatched ? (de ? 'Aus Watchlist entfernen' : 'Remove from watchlist') : (de ? 'Zur Watchlist hinzufügen' : 'Add to watchlist')}
        >
          {isWatched ? '★' : '☆'}
        </button>
      )}

      {/* Watchlist dropdown trigger */}
      {items.length > 0 && (
        <div className="watchlist-dropdown-wrap">
          <button className="watchlist-toggle" onClick={() => setOpen(o => !o)}>
            <span className="watchlist-icon">★</span>
            <span className="watchlist-count">{items.length}</span>
          </button>
          {open && (
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
          )}
        </div>
      )}
    </div>
  )
}
