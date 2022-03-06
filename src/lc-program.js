import { walkBreadthFirst, clone, isCompoundType } from "./util"
import lam from "lambda-calculus"
import isNil from "lodash.isnil"
import { nanoid } from "nanoid"

export let lambdaCount = 0
export let freeVarCount = 0

const TYPE_LAM = "lam"
const TYPE_APP = "app"
const TYPE_VAR = "var"

/**
 * Expands abbreviated lambda expressions like λcde.edc to λc.λd.λe.edc
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

function normalizeLambdaChars(str) {
    return str.replaceAll("L", "λ")
}

function preProcessProgString(str) {
    return normalizeLambdaChars(expandLambdas(str))
}

function isLambda(char) {
    return char === "λ" || char === "L"
}

export function makeProgramFromString(programString) {
    // reset
    lambdaCount = 0
    freeVarCount = 0

    try {
        const ast = lam.fromString(preProcessProgString(programString))
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

        node.id = nanoid()
        node.parentId = parent?.id ?? -1

        if (node.type === TYPE_VAR) {
            const bindingLambda = getBindingLambdaForVar(node, root)

            // If bindingLambda is null we are dealing with a free variable.
            // Free vars have negative ids.
            node.bindingLambdaId = bindingLambda?.lambdaIndex ?? -++freeVarCount
        } else if (node.type === TYPE_LAM) {
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
    // Performing function applications in the correct order is currently
    // highly depending on the traversal order used by walkBreadthFirst.
    // Check its implementation for more info.
    const allApps = getApplications(program)
    const app = allApps.find(app => app.func.type === TYPE_LAM)

    let subbedInNodes = []
    let lambda = null

    // app will be nil if all eligible applications have been applied
    if (!isNil(app)) {
        console.assert(
            app.func.type === TYPE_LAM,
            "expected function in application to be lambda; function node:",
            app.func
        )

        const appParent = findNodeWithId(program, app.parentId)
        lambda = app.func
        subbedInNodes = substituteVarOccurances(lambda, app.arg)

        if (!isNil(appParent)) {
            // Now that we've applied the lambda from our application
            // node to its arg, the application node gets replaced by
            // the body of the lambda.
            Object.entries(appParent).forEach(([key, value]) => {
                if (value === app) {
                    appParent[key] = lambda.body
                }
            })
        } else {
            // if appParent was nil, the application node was the
            // root node of our program
            program = lambda.body
        }
    }

    return {
        reducedProgram: program,
        reductionWasComplete: isNil(app),
        subbedInNodes,
        lambdaFunc: lambda,
        funcArg: app?.arg,
    }
}

/**
 * Given a node representing a variable, find the lambda node it's bound to.
 *
 * Returns null for free vars.
 */
function getBindingLambdaForVar(varNode, root) {
    const ancestorLambdas = getAncestors(varNode, root).filter(
        node => node.type === TYPE_LAM
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
        if (node.type === TYPE_APP) apps.push(node)
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
            node.type === TYPE_VAR &&
            node.bindingLambdaId === lambda.lambdaIndex
        ) {
            const newNode = prepareSubbedNode(subValue, lambda)
            newNode.parentId = parent.id
            parent[key] = newNode

            subbedVals.push(newNode)
        }
    })

    return subbedVals
}

/**
 * Rather than substituting nodes in directly during function application,
 * we use altered clones produced by this function. The purpose is to avoid
 * name conflicts, i.e. the same purpose as alpha-conversion.
 *
 * In addition to alpha-conversion however, our nodes maintain separate unique
 * identifiers used in rendering, so we ensure those remain unique too.
 */
function prepareSubbedNode(node, lambda) {
    node = clone(node)

    // Need to generate new ids since if a var occurs multiple
    // times within a lambda, then substitution will mean replicating
    // nodes, which would mean multiple nodes with shared ids.
    walkBreadthFirst(node, curNode => {
        curNode.id = nanoid()
        Object.values(curNode)
            .filter(isCompoundType)
            .forEach(child => {
                child.parentId = curNode.id
            })
    })

    //
    // alpha-conversion
    //
    let incrementCount = false
    const newLambdaIndex = lambdaCount + 1
    walkBreadthFirst(node, curNode => {
        if (
            curNode.type === TYPE_LAM &&
            curNode.lambdaIndex === lambda.lambdaIndex
        ) {
            walkBreadthFirst(curNode, innerCurNode => {
                if (innerCurNode.bindingLambdaId === curNode.lambdaIndex) {
                    innerCurNode.bindingLambdaId = newLambdaIndex
                }
            })
            curNode.lambdaIndex = newLambdaIndex
            incrementCount = true
        }
    })

    if (incrementCount) lambdaCount++

    return node
}
