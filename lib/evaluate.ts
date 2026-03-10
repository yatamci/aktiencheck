export function evaluatePE(value:number){

if(value < 10) return "good"
if(value < 20) return "warn"
return "bad"

}

export function evaluatePS(value:number){

if(value < 2) return "good"
if(value < 5) return "warn"
return "bad"

}

export function evaluateROE(value:number){

if(value > 0.2) return "good"
if(value > 0.1) return "warn"
return "bad"

}

export function evaluateDebt(value:number){

if(value < 0.5) return "good"
if(value < 1.5) return "warn"
return "bad"

}

export function evaluateRSI(value:number){

if(value < 30) return "good"
if(value < 70) return "warn"
return "bad"

}

export function calculateScore(values:any){

let score = 0

if(values.pe < 20) score++
if(values.ps < 5) score++
if(values.roe > 0.1) score++
if(values.debt < 1) score++
if(values.rsi < 70) score++

return score
}
