import ScoreIndicator from "./ScoreIndicator"
import { evaluatePE } from "../lib/evaluate"

export default function MetricRow({label,value}:{label:string,value:number}){

const score = evaluatePE(value)

return(

<div className="flex justify-between border-b pb-2">

<span>{label}</span>

<div className="flex gap-2">
<span>{value}</span>
<ScoreIndicator score={score}/>
</div>

</div>

)
}
