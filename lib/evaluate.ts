export function evaluatePE(pe:number){

if(pe < 10) return "good"
if(pe < 20) return "warn"
return "bad"

}

export function evaluateRSI(rsi:number){

if(rsi < 30) return "good"
if(rsi < 70) return "warn"
return "bad"

}
