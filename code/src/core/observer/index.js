/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

/**
 * ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']
 * 用于复制
 */
const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

// 切换监听开关
export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * 每个被监听的对象身上都会被添加一个 __ob__ 属性，指向 observer 实例，
 * 被监听的对象的属性 key 会被转换成 getter/setters，以进行依赖收集和通知更新
 *
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    // 被监听的值（数组或对象）
    this.value = value
    // 保存该对象的依赖，用于$set 或 Vue.set 给数据对象添加新属性时触发更新
    this.dep = new Dep()
    this.vmCount = 0
    // 给被监听的目标对象添加 __ob__ 属性，指向当前 observer 实例
    def(value, '__ob__', this)
    // 值是数组的情况
    if (Array.isArray(value)) {
      // 如果当前运行环境可以使用 __proto__ 属性
      if (hasProto) {
        // 将被监听的的数组实例的 __proto__ 属性指向 arrayMethods
        protoAugment(value, arrayMethods)
      } else {
        // 否则使用复制的方式
        copyAugment(value, arrayMethods, arrayKeys)
      }
      this.observeArray(value)
    } else {
      // 值是对象的情况
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    // 获取对象的所有 key
    const keys = Object.keys(obj)
    // 循环这些 key，调用 defineReactive(obj, keys[i])，设置响应式 getter、setter
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 * 设置对象的 __proto__ 属性指向
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * 创建一个值（数组或者对象）的 observer 实例，对该值进行监听
 * 并返回创建的 observer 实例
 * 如果该值已经被监听了，则直接返回该值的 observer 实例
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // 如果值不是对象类型，或者是 VNode 实例，则不进行监听
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  // 声明 ob 变量，用于保存 observers 实例，最后返回的就是这个变量
  let ob: Observer | void
  // 如果该值身上已经有 __ob__ 自身属性，并且该属性指向的对象是 Observer 的实例
  // 则说明该值已经被监听过了
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    // shouldObserve 是一个开关状态，在某些场景下不需要对值进行监听时，可将其切换为关闭状态
    shouldObserve &&
    !isServerRendering() &&
    // 得是数组或者纯对象
    (Array.isArray(value) || isPlainObject(value)) &&
    // 并且该对象要是可扩展的
    Object.isExtensible(value) &&
    // _isVue 若为 true，表示为 Vue 组件实例，也就是说，如果对象是 Vue 实例也是不进行监听的
    !value._isVue
  ) {
    // 创建 observer 实例
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 * 将对象的一个属性定义为响应式的
 */
export function defineReactive (
  // 目标对象
  obj: Object,
  // 需要被定义为响应式的属性名
  key: string,
  // 属性值
  val: any,
  // 自定义的 setter，在开发环境下会用到，用于当用户对其设置时，进行警告提示，比如设置 vm.$attrs
  customSetter?: ?Function,
  // 是否浅监听
  shallow?: boolean
) {
  // 通过闭包引用的 dep 实例，用于收集依赖该属性的 watcher 实例
  const dep = new Dep()

  const property = Object.getOwnPropertyDescriptor(obj, key)
  // 一个不可配置的属性是不能使用也没必要使用 Object.defineProperty() 改变其属性定义的
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }

  /**
   * 如果不是浅监听，则默认会对该属性的值也进行监听
   * 如果 val 被成功监听，则 childOb 就是 val 的 observer 实例
   */
  let childOb = !shallow && observe(val)
  Object.defineProperty(obj, key, {
    // 可枚举
    enumerable: true,
    // 可配置
    configurable: true,
    get: function reactiveGetter () {
      // 如果用户自己定义了 getter，则调用其定义的 getter，否则取 val
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {
        // 执行依赖收集
        dep.depend()
        if (childOb) {
          /**
           * childOb.dep 不同于 上面的 dep
           * 上面的 dep 是当前属性创建的闭包中引用的，收集的依赖的触发时机是当前属性值被修改时触发
           * 而 childOb.dep 是 observer.dep，是在使用 $set 或 Vue.set 给数据对象添加新属性时触发
           */
          childOb.dep.depend()
          if (Array.isArray(value)) {
            // 对数组的每一项执行依赖收集，保证数组项变化后也能通知到 watcher 触发更新
            // 比如 obj = { arr: [{ a: 1 }] }，使 obj.arr[0].a = 2 这样也能触发更新
            dependArray(value)
          }
        }
      }
      return value
    },
    // setter 要完成两件事：1.设置新值 2.触发更新
    set: function reactiveSetter (newVal) {
      // 获取旧值，用于与新值作比较
      const value = getter ? getter.call(obj) : val
      // 比对新值与旧值是否相等，
      // 在 newVal !== value 的情况下，需要通过 self-compare 排除 NaN 的情况，因为 NaN !== NaN
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      // 对新值设置监听
      childOb = !shallow && observe(newVal)
      // 通知更新
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  // 提示 target 要是数组或者对象
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  // 数组的情况
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    // 因为被监听的数组的 splice 方法已经被改写，在其内部会触发 dep.notify
    // 因此此处不需要手动触发更新
    target.splice(key, 1, val)
    return val
  }
  // 如果对象身上已经有该属性，则直接修改
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  // 不能给 Vue 实例对象以及实例的 $data 属性上添加响应式属性
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  // 如果该对象没有被监听，那么也不需要对它进行监听，直接设置相应值即可
  if (!ob) {
    target[key] = val
    return val
  }
  // 对该属性设置响应式
  defineReactive(ob.value, key, val)
  // 并触发更新
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  // 提示 target 要是数组或者对象
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  // 数组的情况，直接使用 splice
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  // 如果该对象身上不存在该自身属性，则直接 return
  if (!hasOwn(target, key)) {
    return
  }

  delete target[key]
  // 如果不是响应式的，直接 return
  if (!ob) {
    return
  }
  // 如果是响应式的，则需要通知更新
  // 这也是使用 Object.defineProperty 实现响应式的的缺点：
  // 无法拦截到属性的删除，并做更新，而是需要手动触发
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 * 因为数组索引不能和对象的属性访问那样实现拦截
 * 所以需要对数组的每一项进行都执行依赖收集
 * 这样当数组某一项变化后，也能触发更新
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      // 递归收集
      dependArray(e)
    }
  }
}
