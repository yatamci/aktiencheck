'use client'

import Link from 'next/link'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export default function AlphaBar() {
  return (
    <div className="alpha-bar">
      {LETTERS.map(l => (
        <Link key={l} href={`/browse/${l}`} className="alpha-btn" prefetch={false}>
          {l}
        </Link>
      ))}
    </div>
  )
}
