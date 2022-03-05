import isNil from "lodash.isnil"

export async function pause(time) {
    await new Promise(resolve => {
        setTimeout(() => {
            resolve()
        }, time)
    })
}

export function walkBreadthFirst(root, func) {
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

export function clone(obj) {
    return JSON.parse(JSON.stringify(obj))
}
