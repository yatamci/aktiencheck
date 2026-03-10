'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Suggestion {
  symbol: string
  name: string
  exchange: string
}

interface SearchBarProps {
  onSearch: (symbol: string) => void
  loading: boolean
}

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query,       setQuery]       = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open,        setOpen]        = useState(false)
  const [activeIdx,   setActiveIdx]   = useState(-1)
  const [fetching,    setFetching]    = useState(false)
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch suggestions with debounce
  const fetchSuggestions = useCallback(async (q: string) => {
    setFetching(true)
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const json = await res.json()
      const list = Array.isArray(json) ? json : []
      setSuggestions(list)
      setOpen(list.length > 0)
      setActiveIdx(-1)
    } catch {
      setSuggestions([])
      setOpen(false)
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setSuggestions([]); setOpen(false); return }
    debounceRef.current = setTimeout(() => fetchSuggestions(query.trim()), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, fetchSuggestions])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function pick(s: Suggestion) {
    setQuery(`${s.name} (${s.symbol})`)
    setSuggestions([])
    setOpen(false)
    onSearch(s.symbol)
  }

  function submit() {
    if (!query.trim() || loading) return
    const active = activeIdx >= 0 ? suggestions[activeIdx] : null
    if (active) { pick(active); return }
    setOpen(false)
    // If input looks like a pure ticker (e.g. "AAPL"), use as-is; otherwise pass full string
    onSearch(query.trim())
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter')     { e.preventDefault(); submit(); return }
    if (e.key === 'Escape')    { setOpen(false); return }
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
  }

  return (
    <div ref={containerRef} className="search-wrapper">
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Aktie suchen – z.B. Apple, AAPL, Tesla, SAP …"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKey}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          disabled={loading}
          autoComplete="off"
          spellCheck={false}
        />
        {fetching && <div className="search-spinner" />}
        <button className="search-button" onClick={submit} disabled={loading || !query.trim()}>
          {loading ? 'Lädt …' : 'Analysieren'}
        </button>
      </div>

      {open && suggestions.length > 0 && (
        <div className="dropdown">
          {suggestions.map((s, i) => (
            <button
              key={s.symbol}
              className={`dropdown-item${i === activeIdx ? ' dropdown-item--active' : ''}`}
              onMouseDown={e => { e.preventDefault(); pick(s) }}
              onMouseEnter={() => setActiveIdx(i)}
            >
              <span className="dropdown-symbol">{s.symbol}</span>
              <span className="dropdown-name">{s.name}</span>
              <span className="dropdown-exchange">{s.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
