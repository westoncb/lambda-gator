import css from "./style.css"
import gatorImagePath from "./assets/gator2.png"
import eggImagePath from "./assets/egg2.png"
import lam from "lambda-calculus"
import React, { useState, useMemo } from "react"
import ReactDOM from "react-dom"

const EGG_WIDTH = 94
const EGG_HEIGHT = 57
const GATOR_WIDTH = 296
const GATOR_HEIGHT = 124

function convert(str) {
    let output = ""
    let index = 0
    while (index < str.length) {
        let char = str.charAt(index++)
        output += char
        if (isLambda(char)) {
            const periodIndex = index + str.substring(index).indexOf(".")
            char = str.charAt(index++)
            output += char
            while (index < periodIndex) {
                let char = str.charAt(index++)
                output += `.λ${char}`
            }
        }
    }

    return output
}

// const prog = "λab.a(λc.c(λd.d)(λd.d))(b(λcde.dc)(λcd.d))(λcde.e)(λcd.c)"
const prog = "λa.(λb.bb)(a(λb.a))"
console.log("ORIGINAL:", prog)
console.log("CONVERTED:", convert(prog))

function isLambda(char) {
    return char === "λ" || char === "L" || char === "\\"
}

function App({}) {
    const [program, setProgram] = useState("(λa.(λb.(b b)) (a (λb.a)))")

    const parseTree = useMemo(() => {
        try {
            // const lexer = new Lexer(convert(program))
            // const parser = new Parser(lexer)
            // const ast = parser.parse()
            // console.log("AST", parse(convert(program)))
            return lam.fromString(convert(program))
        } catch (ex) {
            console.error(ex)
            return {}
        }
    }, [program])

    console.log("parse tree: ", parseTree)

    return (
        <>
            <input
                className="program-input"
                type="text"
                value={program}
                onChange={e => setProgram(e.target.value)}
            />
            <div className="gator-program">{renderNode(parseTree)}</div>
        </>
    )
}

document.querySelector("body").innerHTML = `<div class="app"></div>`

window.onload = () => {
    ReactDOM.render(<App />, document.querySelector(".app"))
}

function renderNode(node, level = 1) {
    const category = node.ctor

    switch (category) {
        case "Lam":
            return renderLam(node, level)
        case "App":
            return renderFuncApp(node, level)
        case "Var":
            return renderVar(node, level)
        default:
            console.error("unknown category: ", category)
            break
    }
}

function renderFuncApp(node, level) {
    const func = node.func
    const arg = node.argm

    return (
        <div className="func-app">
            {renderNode(func, level)}
            {renderNode(arg, level)}
        </div>
    )
}

function renderVar(node, level) {
    const scaleVal = Math.sqrt(1 / level)
    return (
        <img
            style={{
                width: `${EGG_WIDTH * scaleVal}px`,
                height: `${EGG_HEIGHT * scaleVal}px`,
            }}
            className="egg-image"
            src={eggImagePath}
        />
    )
}

function renderLam(node, level) {
    const scaleVal = Math.sqrt(1 / level)

    return (
        <div className="lambda">
            <img
                className="gator-image"
                style={{
                    width: `${GATOR_WIDTH * scaleVal}px`,
                    height: `${GATOR_HEIGHT * scaleVal}px`,
                }}
                src={gatorImagePath}
            />
            {renderNode(node.body, level + 1)}
        </div>
    )
}
