import css from "./style.css"
import gatorImagePath from "./assets/gator2.png"
import eggImagePath from "./assets/egg2.png"
import lam from "lambda-calculus"
import React, { useState, useMemo } from "react"
import ReactDOM from "react-dom"
import isNil from "lodash.isnil"

const EGG_WIDTH = 94
const EGG_HEIGHT = 57
const GATOR_WIDTH = 296
const GATOR_HEIGHT = 124

function expandLambdas(str) {
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

function getId() {
    return Math.floor(Math.random() * 1000000)
}

function makeProgramNode(astNode) {
    // uniquely identify each lambda
    // vars get associated to their corresponding lambdas

    const root = JSON.parse(JSON.stringify(astNode))

    walkBreadthFirst(root, (node, key, parent) => {
        renameProps(node)

        node.id = getId()
        node.parentId = parent?.id ?? -1

        if (node.type === "var") {
            const bindingLambda = getBindingLambdaForVar(node, root)
            node.bindingLambdaId = bindingLambda.id
        }
    })

    return root
}

function getBindingLambdaForVar(varNode, root) {
    const ancestorLambdas = getAncestors(varNode, root).filter(
        node => node.type === "lam"
    )

    // use De Bruijn index
    return ancestorLambdas[varNode.index]
}

function renameProps(node) {
    if (!isNil(node.ctor)) {
        node.type = node.ctor.toLowerCase()
        delete node.ctor
    }
    if (!isNil(node.argm)) {
        node.arg = node.argm
        delete node.argm
    }
}

function walkBreadthFirst(root, func) {
    const queue = [{ node: root, key: null, parent: null }]

    let count = 0
    while (queue.length > 0 && count < 1000) {
        count++
        const { node, key, parent } = queue.pop()
        const shouldStop = func(node, key, parent)

        if (!shouldStop) {
            queue.unshift(
                ...Object.entries(node)
                    .filter(
                        ([key, value]) =>
                            typeof value === "object" && !isNil(value)
                    )
                    .map(([key, value]) => ({
                        node: value,
                        key,
                        parent: node,
                    }))
            )
        }
    }
}

function getAncestors(node, root) {
    let next = node
    const ancestors = []

    do {
        next = findNodeWithId(root, next.parentId)
        if (!isNil(next)) ancestors.push(next)
    } while (!isNil(next))

    return ancestors
}

function findNodeWithId(root, id) {
    let desiredNode = null

    walkBreadthFirst(root, node => {
        if (node.id === id) {
            desiredNode = node
            return true
        }
        return false
    })

    return desiredNode
}

function reduceStep(program) {
    // - find leftmost application
    // - .func should always be a Lambda if its up for reducing
    // - sub .argm into all occurances of .func's bound variable, within .func.body
    // - nodes pass through buildProgramModel before getting substituted (they'll get new ids)
}

// const prog = "λab.a(λc.c(λd.d)(λd.d))(b(λcde.dc)(λcd.d))(λcde.e)(λcd.c)"
const initialProgString = "λa.((λb.(b b)) (a (λb.a)))"
console.log("ORIGINAL:", initialProgString)
console.log("CONVERTED:", expandLambdas(initialProgString))

function isLambda(char) {
    return char === "λ" || char === "L" || char === "\\"
}

function App({}) {
    const [programString, setProgramString] = useState(initialProgString)

    const program = useMemo(() => {
        try {
            const ast = lam.fromString(expandLambdas(programString))
            console.log("AST: ", ast)
            return makeProgramNode(ast)
        } catch (ex) {
            console.error(ex)
            return {}
        }
    }, [programString])

    console.log("program: ", program)

    return (
        <>
            <input
                className="program-input"
                type="text"
                value={programString}
                onChange={e => setProgramString(e.target.value)}
            />
            {/* <div className="gator-program">{renderNode(parseTree)}</div> */}
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
        case "lam":
            return renderLam(node, level)
        case "app":
            return renderFuncApp(node, level)
        case "var":
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
