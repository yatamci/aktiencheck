"use client"

export default function ThemeToggle(){

function toggle(){
document.documentElement.classList.toggle("dark")
}

return(

<button
onClick={toggle}
className="border rounded px-3 py-1 text-lg"
>
🌙
</button>

)

}
