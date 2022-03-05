import ReactDOM from "react-dom"
import React from "react"
import GatorApp from "./src/components/GatorApp"

// would be nice to support programs in this format, but currently we need to
// be more explicit with parens and need spaces to indicate applications
// const initialProgString = "λab.a(λc.c(λd.d)(λd.d))(b(λcde.dc)(λcd.d))(λcde.e)(λcd.c)"

const initialProgString =
    "(λa.((λb.(b b)) (a (λb.a))) (λc.(a (λb.(λz.(a (λb.z)))))))"

document.querySelector("body").innerHTML = `<div class="app"></div>`

window.onload = () => {
    ReactDOM.render(
        <GatorApp initialProgString={initialProgString} />,
        document.querySelector(".app")
    )
}
