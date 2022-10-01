/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

// 全局变量，作为每个Vue实例的唯一id（uid）
let uid = 0

export function initMixin (Vue: Class<Component>) {
  // 给Vue原型上添加_init方法，将会在Vue构造函数内被调用
  Vue.prototype._init = function (options?: Object) {
    // Vue 实例，也即组件实例
    const vm: Component = this
    // 实例的唯一id
    vm._uid = uid++

    // 开发环境时进行的性能测定
    let startTag, endTag
    // 在非生产环境时，需 config 中开启了性能测定，并且 mark 方法存在，才运行性能测定
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      // 标记性能测试起点
      mark(startTag)
    }

    // 表示这个对象是Vue实例，区分于其他对象，可以作为避免被 observe 的一个标识
    vm._isVue = true
    // merge options
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      // 合并选项，给实例添加了 $options 属性，这个属性主要被用来后面的实例初始化阶段
      // 后面会发现下面看到的 init* 系列方法中都用到了这个属性
      vm.$options = mergeOptions(
        // 构造函数选项
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    //  vm._renderProxy 将被作为render函数中的作用域，render中用于渲染的实例数据将从这里拿到
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      // 目的是在开发环境给开发者一些开发问题的友好提示，其最终也将对 vm._renderProxy 赋值
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }

    // 暴露真实的实例本身，比如在 render 中获取 vm._self.xxx
    // 因为 vm._renderProxy 并不一定等于vm，可能是一个代理对象（在上面的 initProxy 中）
    vm._self = vm
    initLifecycle(vm)
    initEvents(vm)
    initRender(vm)
    // 在进行数据初始化之前触发 beforeCreate 钩子
    callHook(vm, 'beforeCreate')
    // 初始化 inject
    initInjections(vm) // resolve injections before data/props
    // 初始化 props、data、computed、watch、methods
    initState(vm)
    // 初始化 provide
    initProvide(vm) // resolve provide after data/props
    // 在数据初始化之后触发 created 钩子
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

/**
 * 解析并合并构造函数的 options ，得到一个新的 options
 * 包括通过 Vue.extend() 得到的子类构造函数以及父类构造函数的 options
 * 如，Sub.options, Parent.options, Vue.options
 * @param {*} Ctor
 * @returns
 */
export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
