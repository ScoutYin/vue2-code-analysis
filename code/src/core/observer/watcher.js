/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  invokeWithErrorHandling,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 * watcher 用于解析一个表达式，并收集依赖
 * 在表达式的值发生变化时触发回调
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  // 唯一标识，因为 id 是自增的，因此也可以用来判断 watcher 创建的顺序
  id: number;
  // 是否深度监听
  deep: boolean;
  // 标识开发者定义的（如 watch、$watch） 还是 内部定义的
  user: boolean;
  // 是否惰性求值，用于 computed
  lazy: boolean;
  // 是否同步求值并执行回调，在表达式值发生变化后，不放到队列中等待异步更新，而是直接触发更新
  sync: boolean;
  // 标识惰性求值情况下，当计算属性初始化还未进行求值时，或者当依赖的数据变化后，
  // 会将该值置为 true，等到真正求值完，将其置为 false
  dirty: boolean;
  active: boolean;
  // 该 watcher 依赖的 dep 实例数组
  deps: Array<Dep>;
  // 在每次求值时收集到的最新的依赖，用于与旧的依赖比对
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  // 数据变更并触发更新前的钩子
  before: ?Function;
  getter: Function;
  // watch 的表达式或函数的计算结果
  value: any;

  constructor (
    // 组件实例
    vm: Component,
    // 监听的表达式或者函数
    expOrFn: string | Function,
    // 当被观察的表达式的值变化时的回调函数
    cb: Function,
    // 配置项
    options?: ?Object,
    // 标识该观察者实例是否是渲染函数的观察者
    isRenderWatcher?: boolean
  ) {
    this.vm = vm
    // 如果是渲染函数的 watcher，则将组件实例的 _watcher 属性指向该 watcher 实例
    if (isRenderWatcher) {
      vm._watcher = this
    }
    // vm._watchers 收集所有该组件实例的 watcher
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
      this.before = options.before
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    // 如果是计算属性 watcher，则 lazy 为 true，否则为 false
    this.dirty = this.lazy // for lazy watchers
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    // 如果表达式是函数，则将其作为 getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      // 否则的话，expOrFn 是就是 'a.b.c' 这种路径字符串
      // 然后通过解析得到一个 getter 函数，
      // 如果 parsePath 解析成功，返回的是一个函数，在执行该函数时，会触发取值，
      // 从而触发响应式属性的 getter，达到依赖收集的作用
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    // 如果惰性求值，则不调用 get 进行求值，等到使用到时再进行求值
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   * 执行 getter，并重新收集依赖
   */
  get () {
    // 将该 watcher 实例做为当前需要被 dep 收集的 watcher
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      // 调用 getter 函数求值
      value = this.getter.call(vm, vm)
    } catch (e) {
      // 如果是开发者定义的，则在发生错误时给与友好提示
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      // 如果要求深度监听，则值进行监听
      if (this.deep) {
        // 递归读取对象子属性的值，触发子属性的 get 拦截器函数，保证子属性的 dep 能够收集到该 watcher
        // 这样对象子属性只变化也能通知到该 watcher 进行更新
        traverse(value)
      }
      // 与 pushTarget 成对使用，推出当前 watcher
      popTarget()
      // 因为 get 求值过程中会收集到最新的所有依赖
      // 所以最后重新根据新的依赖，来对该 watcher 的 deps 进行更新
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  addDep (dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      // 清除当前 deps 中不包含在最新依赖中的的 dep
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    // 以下为用新的依赖覆盖旧的依赖的过程
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      // 如果是惰性求值模式，如 computed watcher
      // 那么只会将 dirty 属性置为 true
      // 真正的求值会在 computed 被读取时触发
      this.dirty = true
    } else if (this.sync) {
      // 如果该 watcher 是采用同步更新的方式，则直接运行 run
      // 在 run() 函数中如果 watcher 的值发生变化，则会直接执行回调 cb
      this.run()
    } else {
      // 否则的话，默认都是放到需要更新的 watcher 队列中，等待一起异步更新
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run () {
    if (this.active) {
      // 求值
      const value = this.get()
      if (
        // 判断新旧值不一样
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        // 使用新值更新 watcher 的 value
        this.value = value
        if (this.user) {
          // 如果是开发者定义的 watcher，则处理可能发生的错误
          const info = `callback for watcher "${this.expression}"`
          // 执行值变更后的回调
          invokeWithErrorHandling(this.cb, this.vm, [value, oldValue], this.vm, info)
        } else {
          // 非开发者定义的 watcher，直接执行回调
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    this.value = this.get()
    // 每次求值完后将 dirty 重新置为 false
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   * 让其他的 watcher 收集到该 watcher 所依赖的 deps。
   * 比如：存在计算属性 a，计算属性 a 依赖 $data.b
   * 模板中使用计算属性 <div>{{ a }}</div>
   * 如果 $data.b 发生变化，将触发计算属性 a 的 watcherA.update()，但因为计算属性的 watcher 是惰性求值的
   * 如果没有重新执行 render 进行模板渲染，便不会重新读取计算属性 a，watcherA.get() 也就一直不会执行，
   * 导致视图中 a 的数据还是旧的，
   *
   * 因此需要将计算属性 a 所依赖的 deps 也被 renderWatcher 收集到，
   * 这样 $data.b 变化后，就能触发 renderWatcher.update()，
   * 从而读取计算属性 a，促使 watcherA 进行求值，
   * 最终将视图中的 a 更新
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    // 如果 watcher 为激活状态，才进行下列卸载操作
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      // 将该 watcher 从其依赖的每个 dep 中的订阅者中移除
      while (i--) {
        this.deps[i].removeSub(this)
      }
      // 调整为非激活状态
      this.active = false
    }
  }
}
