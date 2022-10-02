/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'

// 缓存原生的数组原型对象
const arrayProto = Array.prototype
// 创建一个 __proto__ 指向原生的数组原型对象的对象 arrayMethods
export const arrayMethods = Object.create(arrayProto)

// 需要改写的数组实例方法
const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 * 因为数组没办法像对象一样通过 Object.defineProperty() 方法来监听
 * 所以只能通过改写数组实例的方法，以达到能够在数组变更后通知更新的效果
 * 当然也仅限于通过这几个方法来变更数组的
 * 如果通过 arr[0].xxx = 'test'，这种也是监听不到的，因此也触发不了更新
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  // 缓存原生的实例方法
  const original = arrayProto[method]
  // 在 arrayMethods 对象上添加与原生实例方法同名的方法
  def(arrayMethods, method, function mutator (...args) {
    // 调用原生的实例方法
    const result = original.apply(this, args)
    // 获取到该数组的 observer 实例，在后面用与通知更新
    const ob = this.__ob__
    // 用于保存 push、unshift 和 splice 方法插入的数据
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    // 如果存在插入的数据，那么也对它们进行监听
    if (inserted) ob.observeArray(inserted)
    // notify change
    // 通知更新
    ob.dep.notify()
    // 将原生方法执行结果返回，保证改写的方法与原生表现一致
    return result
  })
})
