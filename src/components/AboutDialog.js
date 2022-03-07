import React from "react"
import { skipForwardIcon, closeIcon } from "../icons"

export default function AboutDialog({ show, closeFunc }) {
    const display = show ? "flex" : "none"

    return (
        <div className="about-dialog" style={{ display }}>
            <button
                style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    background: "none",
                    border: "none",
                    padding: 0,
                    margin: "0.5rem",
                    cursor: "pointer",
                }}
                onClick={closeFunc}
            >
                {closeIcon()}
            </button>
            <div className="about-dialog-content">
                <h2>How to use:</h2>
                <p>
                    Enter a lambda calculus program into the top text input and
                    press "Load program". At this point you should see a
                    pictographic representation of the program below, based on
                    Bret Victor's{" "}
                    <a
                        href="http://worrydream.com/AlligatorEggs/"
                        target="_blank"
                    >
                        "Aligator Eggs"
                    </a>
                    .
                </p>
                <p>
                    In the visualization <b>matching colors</b> are equivalent
                    to matching variable labels in lambda calculus. (
                    <b>Numeric ids</b> are also used to indicate this; ideally
                    we would use the original variable labels from the input
                    program, but they are currently lost in parsing.)
                </p>
                <p>
                    The <b>alligators</b> represent lambda terms and <b>eggs</b>{" "}
                    represent variables. Eggs with negative ids are{" "}
                    <b>free variables</b>; otherwise any egg bound to an
                    alligator should have a matching id.
                </p>
                <p>
                    The <b>dark horizontal lines</b> represent function
                    applications. The <b>function</b> to be applied will always
                    be on the left, its <b>argument</b> will be on the right.
                </p>
                <p>
                    If some pictographic elements are <b>below</b> an alligator,
                    this means they are in the body of the lambda term
                    represented by the alligator.
                </p>
                <p>
                    Each time you press the {skipForwardIcon()} button a
                    beta-reduction step will be applied to the active program.
                </p>
                <p>
                    You can use <b>L</b> in place of <b>λ</b>, e.g.{" "}
                    <b>Lx.(x x)</b> is a valid program.
                </p>
                <h2>Limitations:</h2>
                <p>
                    This was a 4 day project done a whim and there are almost
                    certainly major issues with it. I would describe what's here
                    at present as closer to a proof of concept than a finished
                    program. It has not been tested extensively, and there are
                    probably critical mistakes in core pieces (i.e. I wouldn't
                    be surprised if there are evaluation order issues, problems
                    with alpha-conversion etc.)
                </p>
                <p>
                    <b style={{ fontSize: "1.1rem", color: "red" }}>
                        The parser will go into an infinite loop
                    </b>{" "}
                    on syntax errors! It is also generally inflexible and uses
                    overly-precise syntax. For instance, all function
                    applications need to be surrounded by parens and must have a
                    space between the left-hand-side and right-hand-side, e.g.
                    (x x) instead of xx.
                </p>
                <h2>Credits:</h2>
                <p>
                    The original concept alligator/egg scheme, and graphics are
                    due to{" "}
                    <a href="http://worrydream.com/" target="_blank">
                        Bret Victor
                    </a>
                    . The original version of this software was written by{" "}
                    <a href="http://symbolflux.com/" target="_blank">
                        Weston Beecroft
                    </a>
                    .
                </p>
                <h4>
                    Source:{" "}
                    <a
                        href="https://github.com/westoncb/lambda-gator"
                        target="_blank"
                    >
                        https://github.com/westoncb/lambda-gator
                    </a>
                </h4>
            </div>
            {/* 
            how to use
            limitations
            background + state of project
            prioritized improvement list (better for README)
        */}
        </div>
    )
}
