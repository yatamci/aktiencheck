import BrowseClient from './BrowseClient'
import { tickerDb } from '../../api/search/tickerDb'

export function generateStaticParams() {
  return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => ({ letter }))
}

export default function BrowsePage({ params }: { params: { letter: string } }) {
  const letter = params.letter.toUpperCase()
  const stocks = tickerDb
    .filter(s => s.name.toUpperCase().startsWith(letter) || s.symbol.toUpperCase().startsWith(letter))
    .sort((a, b) => a.name.localeCompare(b.name))
  return <BrowseClient letter={letter} stocks={stocks} />
}
