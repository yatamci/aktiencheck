"use client"

import { useState } from "react"

export default function SearchBar({onSearch}:{onSearch:(symbol:string)=>void}){

const [symbol,setSymbol] = useState("")

return(

<div className="flex gap-2">

<input
className="border p-2 rounded w-full dark:bg-zinc-800"
placeholder="Aktie eingeben (z.B. AAPL oder Apple)"
value={symbol}
onChange={(e)=>setSymbol(e.target.value)}
/>

<button
onClick={()=>onSearch(symbol)}
className="bg-blue-600 text-white px-4 rounded"
>
Check
</button>

</div>

)
}
