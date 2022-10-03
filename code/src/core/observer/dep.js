/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * 依赖对象
 */
export default class Dep {
  // 指向当前要被收集的 watcher
  static target: ?Watcher;
  // dep 实例的唯一标识，因为 id 是自增的，因此也可以用来判断 dep 创建的顺序
  id: number;
  // 订阅者数组，即收集到的 watcher 实例数组
  subs: Array<Watcher>;

  constructor () {
    // 初始化
    this.id = uid++
    this.subs = []
  }

  /**
   * 添加一个订阅者 watcher
   * @param {*} sub
   */
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  /**
   * 移除一个订阅者 watcher
   * @param {*} sub
   */
  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  /**
   * 执行依赖收集
   */
  depend () {
    if (Dep.target) {
      /**
       * 调用 watcher 的 addDep 方法，
       * 在 watcher.addDep 方法中才会调用 dep.addSub
       */
      Dep.target.addDep(this)
    }
  }

  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      // 通知依赖当前 dep 的订阅者（watcher）进行更新
      subs[i].update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
Dep.target = null
const targetStack = []

export function pushTarget (target: ?Watcher) {
  targetStack.push(target)
  Dep.target = target
}

/**
 * 与 pushTarget 成对使用
 */
export function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
