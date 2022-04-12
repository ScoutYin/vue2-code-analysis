/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { defineComputed, proxy } from '../instance/state'
import { extend, mergeOptions, validateComponentName } from '../util/index'

export function initExtend (Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */
  Vue.cid = 0
  // 每个实例构造函数都有一个唯一的cid
  let cid = 1

  /**
   * Class inheritance
   */
  Vue.extend = function (extendOptions: Object): Function {
    extendOptions = extendOptions || {}
    // 这个Super和this就是实例构造函数，
    // 注意：实例构造函数不一定就是Vue，
    // 也可能是通过Vue.extend({...})出来的子类，如 Child = Vue.extend({})
    // 或者再从子类扩展出来的另一个子类 如 Child2 = Child.extend({})
    const Super = this
    // 每个实例构造函数都有一个唯一的cid
    const SuperId = Super.cid
    // 如果同一个扩展选项被同一个实例构造函数（注意：是同一个实例构造函数，因为是用实例构造函数的cid做缓存标识）扩展多次，将命中缓存
    // 比如 const config = {...}; const Sub1 = Vue.extend(config); const Sub2 = Vue.extend(config); 
    // 那么Sub1和Sub2其实是同一个被缓存的子类构造函数
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }

    const name = extendOptions.name || Super.options.name
    if (process.env.NODE_ENV !== 'production' && name) {
      // 非生产环境时，将校验组件名是否符合规范
      // 规范要求：1、由普通的字符和中横线(-)组成，且必须以字母开头；
      // 2、不能和内置组件（slot、component等）重名、不能是保留标签（html、svg）
      validateComponentName(name)
    }

    const Sub = function VueComponent (options) {
      // 实际上还是Vue.prototype._init方法，因为都是通过Vue.extend来的
      this._init(options)
    }
    // 将子类的原型指向一个__proto__为父类原型的对象，目的是实现原型的继承
    Sub.prototype = Object.create(Super.prototype)
    // 因为上面是对Sub.prototype直接赋值，直接赋值的结果会导致Sub.prototype.constructor为父类的constructor
    // 所以需要改写prototype.constructor
    Sub.prototype.constructor = Sub
    // 每个实例构造函数拥有的唯一cid
    Sub.cid = cid++
    // 合并选项。注意：此处mergeOptions未传入vm参数，因为这里是子类的选项合并
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )
    // 用于记录与父类间的继承关系
    // 在Vue.prototype._init方法中，初始化vm.$options时，resolveConstructorOptions中用到
    Sub['super'] = Super

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    if (Sub.options.props) {
      initProps(Sub)
    }
    if (Sub.options.computed) {
      initComputed(Sub)
    }

    // 子类构造函数上也将拥有这三个方法
    // allow further extension/mixin/plugin usage
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

    // create asset registers, so extended classes
    // can have their private assets too.
    ASSET_TYPES.forEach(function (type) {
      // 子类也将拥有组件、指令和过滤器的注册方法（对应Vue.component()、Vue.directive()、Vue.filter()）
      // 如 Child.component()等
      Sub[type] = Super[type]
    })
    // enable recursive self-lookup
    if (name) {
      // 将自身作为自己的子组件，可用于递归使用自己这个组件
      Sub.options.components[name] = Sub
    }

    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    Sub.superOptions = Super.options
    Sub.extendOptions = extendOptions
    Sub.sealedOptions = extend({}, Sub.options)

    // 基于cid和extendOptions缓存
    // cache constructor
    cachedCtors[SuperId] = Sub
    return Sub
  }
}

function initProps (Comp) {
  const props = Comp.options.props
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key)
  }
}

function initComputed (Comp) {
  const computed = Comp.options.computed
  for (const key in computed) {
    defineComputed(Comp.prototype, key, computed[key])
  }
}
