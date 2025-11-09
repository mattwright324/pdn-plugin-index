/**
 * Feature: Object.groupBy()
 * Source: https://github.com/jimmywarting/groupby-polyfill/blob/main/lib/polyfill.js
 * Compatibility: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy#browser_compatibility
 */
function groupBy() {
    if ("groupBy" in Object) {
        return
    }
    Object.groupBy ??= function groupBy(iterable, callbackfn) {
        const obj = Object.create(null)
        let i = 0
        for (const value of iterable) {
            const key = callbackfn(value, i++)
            key in obj ? obj[key].push(value) : (obj[key] = [value])
        }
        return obj
    }

    Map.groupBy ??= function groupBy(iterable, callbackfn) {
        const map = new Map()
        let i = 0
        for (const value of iterable) {
            const key = callbackfn(value, i++), list = map.get(key)
            list ? list.push(value) : map.set(key, [value])
        }
        return map
    }
}

export async function load() {
    [groupBy].forEach(fn => {
        try {
            fn()
        } catch (e) {
            console.log("Error loading polyfill", e)
        }
    });
}