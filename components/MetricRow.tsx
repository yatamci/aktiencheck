import ScoreIndicator from "./ScoreIndicator"

export default function MetricRow({label,value,score}:{label:string,value:number,score:string}){

return(

<div className="flex justify-between items-center bg-zinc-100 dark:bg-zinc-800 p-3 rounded">

<div>

<p className="font-semibold">{label}</p>
<p className="text-sm text-zinc-500">{value}</p>

</div>

<ScoreIndicator score={score}/>

</div>

)

}
