"use client"

import {useState} from "react"

export default function SearchBar({onSearch}:{onSearch:(symbol:string)=>void}){

const [symbol,setSymbol] = useState("")

return(

<div className="flex gap-2">

<input
className="border rounded p-2 w-full dark:bg-zinc-800"
placeholder="Apple, Tesla, AAPL..."
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
