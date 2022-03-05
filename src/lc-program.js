import { walkBreadthFirst, clone } from "./util"
import lam from "lambda-calculus"
import isNil from "lodash.isnil"

export let lambdaCount = 0
export let nodeCount = 0
export let unboundVarCount = 0

/**
 * Expands abbreviated lambda expressions like λcde.abc to λc.λd.λe.abc
 *
 * This is just a pre-processing step for the parser
 */
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

// probably want to support other chars representing 'λ'
function isLambda(char) {
    return char === "λ"
}

export function makeProgramFromString(programString) {
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

/**
 * Takes AST nodes and augments with a few properties.
 *
 * Notably this is were we uniquely identify each lambda,
 * and associate them with their corresponding bound vars
 *
 * This is possible with original AST where the relationship is encoded
 * through De Bruijn indices, but a matching numeric id is more
 * convenient for our purposes.
 */
function makeProgramNode(astNode) {
    const root = clone(astNode)

    walkBreadthFirst(root, (node, key, parent) => {
        renameProps(node)

        node.id = nodeCount++
        node.parentId = parent?.id ?? -1

        if (node.type === "var") {
            const bindingLambda = getBindingLambdaForVar(node, root)

            // If bindingLambda is null we are dealing with an unbound variable.
            // Unbound vars have negative ids.
            node.bindingLambdaId =
                bindingLambda?.lambdaIndex ?? -++unboundVarCount
        } else if (node.type === "lam") {
            node.lambdaIndex = lambdaCount++
        }
    })

    return root
}

export function reduceStep(program) {
    // clone because we're going perform reduction by mutating 'program',
    // but we want to preserve the old one for the undo stack.
    program = clone(program)

    // Grab the first application who function component is of type lambda.
    const app = getApplications(program).find(app => app.func.type === "lam")

    let subbedInNodes = []
    let lambda = null

    if (!isNil(app)) {
        console.assert(
            app.func.type === "lam",
            "expected function in application to be lambda; function node:",
            app.func
        )

        const appParent = findNodeWithId(program, app.parentId)
        lambda = app.func
        subbedInNodes = substituteVarOccurances(lambda, app.arg)

        if (!isNil(appParent)) {
            // Here's where we actually mutate the parent node to
            // reflect var substitutions
            Object.entries(appParent).forEach(([key, value]) => {
                if (value === app) {
                    appParent[key] = lambda.body
                }
            })
        } else {
            program = lambda.body
        }
    }

    return {
        reducedProgram: program,
        subbedInNodes,
        lambdaFunc: lambda,
        funcArg: app.arg,
    }
}

/**
 * Given a node representing a variable, find the lambda node it's bound to.
 *
 * Returns null for unbound vars.
 */
function getBindingLambdaForVar(varNode, root) {
    const ancestorLambdas = getAncestors(varNode, root).filter(
        node => node.type === "lam"
    )

    // use De Bruijn index
    return ancestorLambdas[varNode.index] ?? null
}

/**
 * This just exists because I'm picky
 */
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

function getApplications(node) {
    const apps = []
    walkBreadthFirst(node, node => {
        if (node.type === "app") apps.push(node)
    })

    return apps
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

/**
 * Given a lambda node and another node 'subValue', replace all occurences
 * of the lambda's variable with subValue. Basically this does function application
 * during reduction.
 */
function substituteVarOccurances(lambda, subValue) {
    const subbedVals = []
    walkBreadthFirst(lambda.body, (node, key, parent) => {
        if (
            node.type === "var" &&
            node.bindingLambdaId === lambda.lambdaIndex
        ) {
            // I think we're only reaching this key === null case when the program
            // is already in beta normal form and we try reducing again
            // console.log("gonna sub", subValue)
            // if (key === null) debugger

            // There are likely issues with simply re-using 'makeProgramNode' in this way.
            // It's a hack that maybe kind of works, but I think there is where proper
            // alpha-conversion needs to take place
            const newNode = makeProgramNode(subValue)
            newNode.parentId = parent.id
            parent[key] = newNode

            subbedVals.push(newNode)
        }
    })

    return subbedVals
}
