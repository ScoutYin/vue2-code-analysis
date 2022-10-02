/* @flow */

import { _Set as Set, isObject } from '../util/index'
import type { SimpleSet } from '../util/index'
import VNode from '../vdom/vnode'

// 用于缓存已经处理过的对象的 __ob__.dep.id，防止死循环
const seenObjects = new Set()

/**
 * Recursively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 * 目的是递归读取对象子属性的值，触发子属性的 get 拦截器函数，保证子属性能够收集到观察者
 */
export function traverse (val: any) {
  _traverse(val, seenObjects)
  seenObjects.clear()
}

function _traverse (val: any, seen: SimpleSet) {
  let i, keys
  const isA = Array.isArray(val)
  // 如果不是数组、不是对象、对象被冻结、或者对象为 VNode 实例，则不进行
  if ((!isA && !isObject(val)) || Object.isFrozen(val) || val instanceof VNode) {
    return
  }
  if (val.__ob__) {
    const depId = val.__ob__.dep.id
    // 如果已经处理过则跳过处理，避免循环引用的情况下陷入死循环
    if (seen.has(depId)) {
      return
    }
    // 记录进 seen
    seen.add(depId)
  }
  if (isA) {
    i = val.length
    // 同样对数组的每一项进行递归遍历处理
    // 这将触发数组项中的对象子属性的 get 拦截器函数，保证子属性能够收集到观察者
    while (i--) _traverse(val[i], seen)
  } else {
    keys = Object.keys(val)
    i = keys.length
    // 对对象的每个属性值进行递归处理
    // 读取子属性的值，这将触发子属性的 get 拦截器函数，保证子属性能够收集到观察者
    while (i--) _traverse(val[keys[i]], seen)
  }
}
