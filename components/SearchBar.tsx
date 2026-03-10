"use client"

import { useState } from 'react';

interface SearchBarProps {
  onSearch: (symbol: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [symbol, setSymbol] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) {
      onSearch(symbol.toUpperCase());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="search-container">
      <input
        type="text"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        placeholder="AAPL"
        className="search-input"
      />
      <button type="submit" className="search-button">
        Check
      </button>
    </form>
  );
}
