import css from "./style.css"
import gatorImagePath from "./assets/gator2.png"
import eggImagePath from "./assets/egg2.png"
import lam from "lambda-calculus"
import React, { useState, useMemo, useEffect } from "react"
import ReactDOM from "react-dom"
import isNil from "lodash.isnil"

const EGG_WIDTH = 94
const EGG_HEIGHT = 57
const GATOR_WIDTH = 296
const GATOR_HEIGHT = 124

let lambdaCount = 0
let nodeCount = 0
let unboundVarCount = 0
let randomColorOffset = Math.random() * 360

// const initialProgString = "λab.a(λc.c(λd.d)(λd.d))(b(λcde.dc)(λcd.d))(λcde.e)(λcd.c)"
const initialProgString = "(λa.((λb.(b b)) (a (λb.a))) (λc.c))"

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

function isLambda(char) {
    return char === "λ" || char === "L" || char === "\\"
}

function makeProgramFromString(programString) {
    // reset
    lambdaCount = 0
    nodeCount = 0
    unboundVarCount = 0

    try {
        const ast = lam.fromString(expandLambdas(programString))
        console.log("AST: ", ast)

        return makeProgramNode(ast)
    } catch (ex) {
        console.error(ex)
        return {}
    }
}

function makeProgramNode(astNode) {
    // uniquely identify each lambda
    // vars get associated to their corresponding lambdas

    const root = JSON.parse(JSON.stringify(astNode))

    walkBreadthFirst(root, (node, key, parent) => {
        renameProps(node)

        node.id = nodeCount++
        node.parentId = parent?.id ?? -1

        if (node.type === "var") {
            const bindingLambda = getBindingLambdaForVar(node, root)
            node.bindingLambdaId =
                bindingLambda?.lambdaIndex ?? -++unboundVarCount
        } else if (node.type === "lam") {
            node.lambdaIndex = lambdaCount++
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

function getLambdas(node) {
    const lambdas = []
    walkBreadthFirst(node, node => {
        if (node.type === "lam") lambdas.push(node)
    })

    return lambdas
}

function getApplications(node) {
    const apps = []
    walkBreadthFirst(node, node => {
        if (node.type === "app") apps.push(node)
    })

    return apps
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

function findAll(node, predicate) {
    const matches = []
    walkBreadthFirst(node, node => {
        if (predicate(node)) mataches.push(node)
    })

    return matches
}

function substituteVarOccurances(lambda, subValue) {
    walkBreadthFirst(lambda.body, (node, key, parent) => {
        if (
            node.type === "var" &&
            node.bindingLambdaId === lambda.lambdaIndex
        ) {
            // I think we're only reaching this key === null case when the program
            // is already in beta normal form and we try reducing again
            // console.log("gonna sub", subValue)
            // if (key === null) debugger

            parent[key] = subValue
        }
    })
}

function reduceStep(program) {
    // - find leftmost application
    // - .func should always be a Lambda if its up for reducing
    // - sub .argm into all occurances of .func's bound variable, within .func.body
    // - nodes pass through buildProgramModel before getting substituted (they'll get new ids)

    program = JSON.parse(JSON.stringify(program))
    const app = getApplications(program).find(app => app.func.type === "lam")

    if (!isNil(app)) {
        console.assert(
            app.func.type === "lam",
            "expected function in application to be lambda; function node:",
            app.func
        )

        const lambda = app.func
        const appParent = findNodeWithId(program, app.parentId)

        substituteVarOccurances(lambda, app.arg)

        if (!isNil(appParent)) {
            Object.entries(appParent).forEach(([key, value]) => {
                if (value === app) {
                    appParent[key] = lambda.body
                }
            })
        } else {
            program = lambda.body
        }
    }

    return program
}

function App({}) {
    const [programString, setProgramString] = useState(initialProgString)
    const [program, setProgram] = useState(makeProgramFromString(programString))
    const [undoStack, setUndoStack] = useState([])

    useEffect(() => {
        console.log("program: ", program)
    }, [program])

    return (
        <>
            <div className="input-row">
                <input
                    className="program-input"
                    type="text"
                    value={programString}
                    onChange={e => setProgramString(e.target.value)}
                />
                <button
                    disabled={undoStack.length === 0}
                    onClick={e => {
                        setProgram(undoStack.pop())
                        setUndoStack([...undoStack])
                    }}
                >
                    {skipBackIcon()}
                </button>
                <button
                    onClick={e => {
                        setUndoStack([...undoStack, program])
                        setProgram(reduceStep(program))
                    }}
                >
                    {skipForwardIcon()}
                </button>
            </div>
            <div className="gator-program">{renderNode(program)}</div>
        </>
    )
}

document.querySelector("body").innerHTML = `<div class="app"></div>`

window.onload = () => {
    ReactDOM.render(<App />, document.querySelector(".app"))
}

function renderNode(node, level = 1) {
    // if (!node?.type) debugger
    const category = node.type

    switch (category) {
        case "lam":
            return renderLam(node, level)
        case "app":
            return renderFuncApp(node, level)
        case "var":
            return renderVar(node, level)
        default:
            console.error(
                "attempted to render node with unknown category: ",
                category,
                node
            )
            break
    }
}

function renderFuncApp(node, level) {
    const func = node.func
    const arg = node.arg

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
                filter: filterValForLambdaIndex(node.bindingLambdaId),
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
                    filter: filterValForLambdaIndex(node.lambdaIndex),
                }}
                src={gatorImagePath}
            />
            {renderNode(node.body, level + 1)}
        </div>
    )
}

function filterValForLambdaIndex(lambdaIndex) {
    let hueRotation =
        indexToDistantPosition(lambdaIndex, 360) + randomColorOffset

    // unbound variable
    if (lambdaIndex < 0) {
        hueRotation = (360 / unboundVarCount) * -lambdaIndex + randomColorOffset
    }

    return `drop-shadow(0px 0px 3px rgba(0, 0, 0, 0.6)) sepia(100%)
        saturate(1150%) hue-rotate(${hueRotation}deg)`
}

function indexToDistantPosition(index, totalSpace) {
    let nextPwrOf2 = 0
    let lastPwrOf2 = 0
    let count = 0

    while (index > nextPwrOf2) {
        lastPwrOf2 = nextPwrOf2
        nextPwrOf2 = (++count) ** 2
    }

    const subRegionIndex = index - lastPwrOf2
    const subRegions = nextPwrOf2 - lastPwrOf2 + 1
    const subRegionWidth = totalSpace / subRegions

    return subRegionIndex * subRegionWidth + subRegionWidth / 2
}

function skipForwardIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polygon points="5 4 15 12 5 20 5 4"></polygon>
            <line x1="19" y1="5" x2="19" y2="19"></line>
        </svg>
    )
}

function skipBackIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polygon points="19 20 9 12 19 4 19 20"></polygon>
            <line x1="5" y1="19" x2="5" y2="5"></line>
        </svg>
    )
}
