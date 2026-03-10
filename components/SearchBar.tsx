'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Suggestion {
  symbol: string
  name: string
  exchange: string
}

interface SearchBarProps {
  onSearch: (symbol: string, name: string) => void
  loading: boolean
}

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [fetching, setFetching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 1) { setSuggestions([]); return }
    setFetching(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data: Suggestion[] = await res.json()
      setSuggestions(Array.isArray(data) ? data : [])
      setShowDropdown(true)
      setActiveIndex(-1)
    } catch {
      setSuggestions([])
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setSuggestions([]); setShowDropdown(false); return }
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 280)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, fetchSuggestions])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectSuggestion(s: Suggestion) {
    setQuery(s.name)
    setSuggestions([])
    setShowDropdown(false)
    onSearch(s.symbol, s.name)
  }

  function handleSubmit() {
    if (!query.trim()) return
    const active = activeIndex >= 0 ? suggestions[activeIndex] : null
    if (active) {
      selectSuggestion(active)
    } else {
      setShowDropdown(false)
      onSearch(query.trim(), query.trim())
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === 'Enter') handleSubmit()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div className="search-wrapper" ref={containerRef}>
      <div className={`search-container${showDropdown && suggestions.length > 0 ? ' search-container--open' : ''}`}>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Aktie suchen – z.B. Apple, AAPL, Tesla, SAP …"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          disabled={loading}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {fetching && (
          <div className="search-spinner" />
        )}
        <button
          className="search-button"
          onClick={handleSubmit}
          disabled={loading || !query.trim()}
        >
          {loading ? 'Lädt …' : 'Analysieren'}
        </button>
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div className="dropdown">
          {suggestions.map((s, i) => (
            <button
              key={s.symbol}
              className={`dropdown-item${i === activeIndex ? ' dropdown-item--active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s) }}
              onMouseEnter={() => setActiveIndex(i)}
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
