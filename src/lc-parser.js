let program
const DEBUG = true

/**
 *
 * TERM := APP | TERM2
 * TERM2 := LAMBDA | VAR
 * LAMBDA := 'λ' VAR '.' TERM | '(' 'λ' VAR '.' TERM ')'
 * APP := TERM TERM | '(' TERM TERM ')'
 */

export default function parse(programString) {
    program = programString.split("")

    return term()
}

function term() {
    DEBUG ? console.log("TERM", program.join("")) : ""

    // λa.(λb.ab)

    // debugger

    const app = application()
    if (app) return app

    const t2 = term2()
    if (t2) return t2

    throw "term was not: lambda, application, or variable"
}

function term2() {
    const l = lambda()
    if (l) return l

    const v = variable()
    if (v) return v

    return null
}

function term3() {
    const app = application()
    if (app) return app

    const v = variable()
    if (v) return v

    return null
}

function lambda() {
    DEBUG ? console.log("LAMBDA", program.join("")) : ""

    if (accept("(λ")) {
        const l = lambdaNoParen()
        if (!expect(")") || !l) return null
        return l
    } else {
        return lambdaNoParen()
    }
}
function lambdaNoParen() {
    if (!expect("λ")) return null
    const v = variable()
    if (!expect(".") || !v) return null
    const body = term3() ?? lambda()
    if (!body) return null
    return { type: "lambda", variable: v, body }
}

function application() {
    DEBUG ? console.log("APPLICATION", program.join("")) : ""

    if (!accept("(λ", 2, true) && accept("(")) {
        const app = applicationNoParen()
        if (!expect(")") || !app) return null
        return app
    } else {
        return applicationNoParen()
    }
}
function applicationNoParen() {
    debugger
    const t1 = term2() ?? application()
    const t2 = term2() ?? application()

    if (t1 && t2) {
        return { type: "application", term1: t1, term2: t2 }
    } else {
        throw `expected two terms in application but found: ${JSON.stringify(
            t1
        )} and ${JSON.stringify(t2)}`
    }
}

function variable() {
    DEBUG ? console.log("VARIABLE", program.join("")) : ""

    const nextChar = peek(program)
    return expect(isLetter) ? { type: "variable", id: nextChar } : null
}

function isLetter(str) {
    return str.match(/[a-z]/i)
}

function accept(symbol, peekDistance = 1, testOnly = false) {
    let predicate = symbol
    if (typeof symbol === "string") {
        predicate = x => x === symbol
        peekDistance = symbol.length
    }

    if (predicate(peek(program, peekDistance))) {
        if (!testOnly) program.shift()
        return true
    } else {
        return false
    }
}

function expect(symbol) {
    if (accept(symbol)) {
        return true
    } else {
        return false //throw `Expected: '${symbol}'; found: ${peek(program)}`
    }
}

function peek(array, peekDistance = 1) {
    const str = array.slice(0, peekDistance).join("")
    console.log("peek: ", str)
    return str
}
