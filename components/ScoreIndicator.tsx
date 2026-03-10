export default function ScoreIndicator({score}:{score:string}){

if(score === "good")
return(
<div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-sm">
✓
</div>
)

if(score === "warn")
return(
<div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm">
!
</div>
)

return(
<div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-sm">
✕
</div>
)

}
