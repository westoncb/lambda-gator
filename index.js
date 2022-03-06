import ReactDOM from "react-dom"
import React from "react"
import GatorApp from "./src/components/GatorApp"

// would be nice to support programs in this format, but currently we need to
// be more explicit with parens and need spaces to indicate applications
// const initialProgString = "λab.a(λc.c(λd.d)(λd.d))(b(λcde.dc)(λcd.d))(λcde.e)(λcd.c)"

const initialProgString = "(λa.((λb.(b b)) (a (λb.a))) (λc.(a (λb.a))))"

const metaNode = document.createElement("meta")
metaNode.setAttribute("name", "viewport")
metaNode.setAttribute("content", "width=device-width, initial-scale=1")

document.querySelector("head").appendChild(metaNode)
document.querySelector("body").innerHTML = `<div class="app"></div>`

window.onload = () => {
    ReactDOM.render(
        <GatorApp initialProgString={initialProgString} />,
        document.querySelector(".app")
    )
}
