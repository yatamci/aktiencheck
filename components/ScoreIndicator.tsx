export default function ScoreIndicator({score}:{score:string}){

if(score === "good")
return <span className="text-green-500">✔</span>

if(score === "warn")
return <span className="text-orange-500">!</span>

return <span className="text-red-500">✖</span>

}
