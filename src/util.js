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
            const newNodes = Object.entries(node)
                .filter(([key, value]) => isCompoundType(value))
                .map(([key, value]) => ({
                    node: value,
                    key,
                    parent: node,
                }))

            // NOTE: this is a subtle hack that should be REPLACED
            // with something more reliable!!!
            //
            // Our traversal order currently depends on the ordering of keys
            // within objects (because we're using Object.entries to access 'child nodes')
            // The ordering of these keys is such that .arg property would come
            // before the .func property on application nodes, but this makes it inconvenient
            // to find the next appropriate application node during a reduction step, so we're
            // reversing the order here in order to traverse '.func's before '.arg's.
            if (node.type === "app") {
                newNodes.reverse()
            }

            queue.unshift(...newNodes)
        }
    }
}

export function isCompoundType(value) {
    return typeof value === "object" && !isNil(value)
}

export function clone(obj) {
    return JSON.parse(JSON.stringify(obj))
}
