import css from "../../style.css"
import gatorImagePath from "../../assets/gator2.png"
import eggImagePath from "../../assets/egg2.png"
import React, { useEffect, useState } from "react"
import isNil from "lodash.isnil"
import { CSSTransition } from "react-transition-group"
import { skipForwardIcon, skipBackIcon } from "../icons"
import {
    makeProgramFromString,
    reduceStep,
    freeVarCount,
    getReducibleApplications,
} from "../lc-program"
import { pause } from "../util"
import AboutDialog from "./AboutDialog"

const EGG_WIDTH = 94
const EGG_HEIGHT = 57
const GATOR_WIDTH = 296
const GATOR_HEIGHT = 124
const BASE_SCALE = 0.5

// if you change this, make sure to update in style.css too
const ANIMATION_TIME = 300

let randomColorOffset = Math.random() * 360

export default function GatorApp({ initialProgString }) {
    const [programString, setProgramString] = useState(initialProgString)
    const [program, setProgram] = useState(makeProgramFromString(programString))
    const [undoStack, setUndoStack] = useState([])
    const [currentInputString, setCurrentInputString] =
        useState(initialProgString)
    const progStringChanged = currentInputString !== programString
    const [showDialog, setShowDialog] = useState(false)
    const reductionComplete = getReducibleApplications(program).length === 0

    useEffect(() => {
        clearTransitions()
        setUndoStack([])
        setProgram(makeProgramFromString(programString))
    }, [programString])

    // used for animations
    const [lamTransition, setLamTransition] = useState({
        id: -1,
    })
    const [argTransition, setArgTransition] = useState({
        id: -1,
    })
    const [subTransitions, setSubTransitions] = useState([])

    function clearTransitions() {
        setLamTransition({ id: -1 })
        setArgTransition({ id: -1 })
        setSubTransitions([])
    }

    async function handleNextStep() {
        if (!reductionComplete) {
            setUndoStack([...undoStack, program])
            const { reducedProgram, subbedInNodes, lambdaFunc, funcArg } =
                reduceStep(program)

            await doAnimations(subbedInNodes, lambdaFunc, funcArg)
            setProgram(reducedProgram)
        }
    }

    async function doAnimations(subbedInNodes, lambdaFunc, funcArg) {
        setArgTransition({ animState: false, id: funcArg.id })
        await pause(ANIMATION_TIME)
        setLamTransition({ animState: false, id: lambdaFunc.id })
        await pause(ANIMATION_TIME)
        setSubTransitions(
            subbedInNodes.map(node => ({ animState: true, id: node.id }))
        )
        await pause(ANIMATION_TIME / 2)
    }

    return (
        <div className="main-container">
            <AboutDialog
                show={showDialog}
                closeFunc={() => setShowDialog(false)}
            />
            <div className="input-row">
                <button
                    className="load-button"
                    disabled={!progStringChanged}
                    onClick={e => setProgramString(currentInputString)}
                >
                    Load program
                </button>
                <input
                    className="program-input"
                    type="text"
                    value={currentInputString}
                    onChange={e => setCurrentInputString(e.target.value)}
                />
                <button
                    disabled={undoStack.length === 0}
                    onClick={e => {
                        clearTransitions()
                        setProgram(undoStack.pop())
                        setUndoStack([...undoStack])
                    }}
                >
                    {skipBackIcon()}
                </button>
                <button disabled={reductionComplete} onClick={handleNextStep}>
                    {skipForwardIcon()}
                </button>
            </div>
            <div className="gator-program">
                {renderNode(program, {
                    lambTransition: lamTransition,
                    argTransition,
                    subTransitions,
                })}
                {reductionComplete && (
                    <div className="reduction-complete-message">
                        <div style={{ fontSize: "1.25rem" }}>
                            Reduction complete!
                        </div>{" "}
                        <div style={{ fontStyle: "italic" }}>
                            (or there's a bug...)
                        </div>
                    </div>
                )}
            </div>
            <button
                className="about-button"
                onClick={e => setShowDialog(showDialog => !showDialog)}
            >
                ABOUT / INSTRUCTIONS
            </button>
        </div>
    )
}

function renderNode(node, state, level = 1) {
    const funcMap = {
        lam: () => renderLam(node, state, level),
        app: () => renderFuncApp(node, state, level),
        var: () => renderVar(node, state, level),
    }

    const isArgTransition = state.argTransition.id === node.id
    let animState = isArgTransition ? state.argTransition.animState : true

    const subTransition = state.subTransitions.find(sub => sub.id === node.id)
    const isSubTransition = !isNil(subTransition)
    animState = isSubTransition ? subTransition.animState : animState

    let classNamePrefix = isArgTransition ? "arg-node" : "sub-node"

    return (
        <CSSTransition
            in={animState}
            timeout={ANIMATION_TIME}
            classNames={classNamePrefix}
        >
            <div>{funcMap[node.type]()}</div>
        </CSSTransition>
    )
}

function renderFuncApp(node, state, level) {
    const func = node.func
    const arg = node.arg

    return (
        <div className="func-app">
            {renderNode(func, state, level)}
            {renderNode(arg, state, level)}
        </div>
    )
}

function renderVar(node, state, level) {
    const scaleVal = Math.sqrt(1 / level) * BASE_SCALE

    return (
        <div style={{ position: "relative", maxWidth: "fit-content" }}>
            <img
                style={{
                    width: `${EGG_WIDTH * scaleVal}px`,
                    height: `${EGG_HEIGHT * scaleVal}px`,
                    filter: filterValForLambdaIndex(node.bindingLambdaId),
                }}
                className="egg-image"
                src={eggImagePath}
            />
            <div
                className="lambda-number"
                style={{
                    transform: `scale(${scaleVal}) translate(-${
                        50 / scaleVal
                    }%, -${50 / scaleVal}%)`,
                }}
            >
                {node.bindingLambdaId}
            </div>
        </div>
    )
}

function renderLam(node, state, level) {
    const scaleVal = Math.sqrt(1 / level) * BASE_SCALE

    const animState =
        state.lambTransition.id === node.id
            ? state.lambTransition.animState
            : true

    return (
        <>
            <CSSTransition
                in={animState}
                timeout={ANIMATION_TIME}
                classNames="lambda-anim"
            >
                <div style={{ position: "relative", maxWidth: "fit-content" }}>
                    <img
                        className="gator-image"
                        style={{
                            width: `${GATOR_WIDTH * scaleVal}px`,
                            height: `${GATOR_HEIGHT * scaleVal}px`,
                            filter: filterValForLambdaIndex(node.lambdaIndex),
                        }}
                        src={gatorImagePath}
                    />
                    <div
                        className="lambda-number"
                        style={{
                            transform: `scale(${scaleVal}) translate(-${
                                50 / scaleVal
                            }%, -${50 / scaleVal}%)`,
                        }}
                    >
                        {node.lambdaIndex}
                    </div>
                </div>
            </CSSTransition>
            {renderNode(node.body, state, level + 1)}
        </>
    )
}

/**
 * Responsible for assigning unique colors to each lambda and its associated var
 */
function filterValForLambdaIndex(lambdaIndex) {
    let hueRotation =
        indexToDistantPosition(lambdaIndex, 360) + randomColorOffset

    // free variable
    if (lambdaIndex < 0) {
        hueRotation = (360 / freeVarCount) * -lambdaIndex + randomColorOffset
    }

    return `drop-shadow(0px 0px 4px rgba(0, 0, 0, 0.7)) sepia(100%)
        saturate(1150%) hue-rotate(${hueRotation}deg)`
}

/**
 * The idea here is to skip around 'totalSpace' at intervals that give
 * a large sample distance (we're using it to pick dissimilar hues)
 *
 * 'Samples' are uniformly spaced with in each power-of-2 bucket, but
 * whenever an index is larger enough to enter a new bucket the interval shrinks.
 */
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
