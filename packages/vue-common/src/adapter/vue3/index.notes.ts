/**
 * Copyright (c) 2022 - present TinyVue Authors.
 * Copyright (c) 2022 - present Huawei Cloud Computing Technologies Co., Ltd.
 *
 * Use of this source code is governed by an MIT-style license.
 *
 * THE OPEN SOURCE SOFTWARE IN THIS PRODUCT IS DISTRIBUTED IN THE HOPE THAT IT WILL BE USEFUL,
 * BUT WITHOUT ANY WARRANTY, WITHOUT EVEN THE IMPLIED WARRANTY OF MERCHANTABILITY OR FITNESS FOR
 * A PARTICULAR PURPOSE. SEE THE APPLICABLE LICENSES FOR MORE DETAILS.
 *
 */
import * as hooks from 'vue'

import { camelize, capitalize, hyphenate } from '@opentiny/vue-renderless/common/string'
import { bindFilter, emitter, getElementCssClass, getElementStatusClass } from '../utils'

const Teleport = hooks.Teleport

export { emitter, bindFilter, getElementCssClass, getElementStatusClass, Teleport }

export const defineAsyncComponent = hooks.defineAsyncComponent

export const markRaw = hooks.markRaw

export const renderComponent = ({
  view = undefined as any,
  component = undefined as any,
  props,
  context: { attrs, slots },
  extend = {}
}) => {
  return () => hooks.h((view && view.value) || component, { ...props, ...attrs, ...extend }, slots)
}

export const rootConfig = (context) => {
  const instance = hooks.getCurrentInstance()
  context && setInstanceEmitter(instance)
  return instance?.appContext.config.globalProperties
}

export const getComponentName = () => {
  // 此处组件最多为两层组件，所以对多获取到父级组件即可
  const instance = hooks.getCurrentInstance()
  let componentName = instance?.type?.name
  if (!componentName) {
    componentName = instance?.parent?.type?.name
  }

  return componentName || ''
}

export const appContext = () =>
  hooks.getCurrentInstance()?.appContext || {
    component: () => {
      // do nothing
    }
  }

export const appProperties = () => {
  const instance = hooks.getCurrentInstance()
  return instance?.appContext.config.globalProperties || {}
}

export const useRouter = (instance = hooks.getCurrentInstance()) => {
  const router = instance?.appContext.config.globalProperties.$router
  const route = router && router.currentRoute.value

  return { route, router }
}

const setInstanceEmitter = (instance) => {
  const $emitter = emitter()

  if (typeof instance.$emitter === 'undefined') Object.defineProperty(instance, '$emitter', { get: () => $emitter })
}

const emitEvent = (vm) => {
  const broadcast = (vm, componentName, eventName, params) => {
    const children = (vm.subTree && vm.subTree.children) || vm.children

    Array.isArray(children) &&
      children.forEach((child) => {
        const name = child.type && child.type.componentName
        const component = child.component

        if (name === componentName) {
          component.emit(eventName, params)
          component.$emitter && component.$emitter.emit(eventName, params)
        } else {
          broadcast(child, componentName, eventName, params)
        }
      })
  }

  return {
    dispatch(componentName, eventName, params) {
      let parent = vm.parent || vm.root
      let name = parent.type && parent.type.componentName

      while (parent && (!name || name !== componentName)) {
        parent = parent.parent

        if (parent) name = parent.type && parent.type.componentName
      }

      if (parent) {
        parent.emit(...[eventName].concat(params))
        // fix: VUE3下事件参数为数组，VUE2下事件参数不是数组，这里修改为和VUE2兼容
        parent.$emitter && parent.$emitter.emit(...[eventName].concat(params))
      }
    },
    broadcast(componentName, eventName, params) {
      broadcast(vm, componentName, eventName, params)
    }
  }
}

const getRealParent = (vm) => {
  if (vm && vm.parent)
    return vm.parent.type.name === 'AsyncComponentWrapper' && vm.parent.parent ? vm.parent.parent : vm.parent
}

const parent = (vm) => (handler) => {
  let parent = getRealParent(vm)
  let level = 0

  const parentObject = (parent) => {
    return {
      level,
      vm: createVm({}, parent),
      el: parent.vnode.el,
      options: parent.type
    }
  }

  if (typeof handler !== 'function') return parent ? parentObject(parent) : {}

  level++

  while (parent) {
    if (handler(parentObject(parent))) break
    parent = getRealParent(parent)
    level++
  }
}

const children = (vm) => (handler) => {
  if (typeof handler !== 'function') return generateChildren(vm.subTree)

  let layer = 1
  const broadcast = (subTree) => {
    if (subTree) {
      const children = subTree.children || subTree.dynamicChildren
      const level = layer++

      if (Array.isArray(children)) {
        if (
          children.some((child) => {
            return (
              child.component &&
              handler({
                level,
                vm: createVm({}, child.component),
                el: child.el,
                options: child.type,
                isLevel1: true
              })
            )
          })
        )
          return

        children.forEach((child) => broadcast(child))
      }
    }
  }

  broadcast(vm.subTree)
}

const regEventPrefix = /^on[A-Z]/

const generateListeners = (attrs) => {
  const $attrs = {}
  const $listeners = {}

  for (const name in attrs) {
    const event = attrs[name]

    if (regEventPrefix.test(name) && typeof event === 'function') {
      $listeners[hyphenate(name.substr(2))] = event
      continue
    }

    $attrs[name] = event
  }

  return { $attrs, $listeners }
}

const generateChildren = (subTree) => {
  const children: any = []
  children.refs = {}

  if (subTree) {
    const arr = subTree.dynamicChildren || subTree.children

    if (Array.isArray(arr)) {
      arr.forEach((child) => {
        if (child.component) {
          const vm = createVm({}, child.component)

          children.push(vm)
          child.props.ref && (children.refs[child.props.ref] = vm)
        }
      })
    } else if (subTree.component) {
      children.push(createVm({}, subTree.component))
    }
  }

  return children
}

const defineProperties = (vm, instance, property, filter) => {
  for (const name in instance[property]) {
    if (typeof filter === 'function' && filter(name)) continue

    Object.defineProperty(vm, name, {
      configurable: true,
      enumerable: true,
      get: () => instance[property][name],
      set: (value) => (instance[property][name] = value)
    })
  }

  return vm
}

const filter = (name) => name.indexOf('_') === 0

const defineInstanceVm = (vm, instance) => {
  defineProperties(vm, instance, 'setupState', null)
  defineProperties(vm, instance, 'props', filter)
  defineProperties(vm, instance, 'ctx', filter)

  return vm
}

const createVm = (vm, instance, context = null) => {
  const { $attrs, $listeners } = generateListeners(instance.attrs)
  let $emitter = instance.$emitter

  if (!$emitter) {
    setInstanceEmitter(instance)
    $emitter = instance.$emitter
  }

  const emit = (...args) => {
    instance.emit(...args)
    $emitter.emit.apply(vm, args)
  }

  const $set = (target, propertyName, value) => (target[propertyName] = value)

  context || defineInstanceVm(vm, instance)

  Object.defineProperties(vm, {
    $attrs: { get: () => $attrs },
    $children: { get: () => generateChildren(instance.subTree) },
    $constants: { get: () => instance.props._constants },
    $emit: { get: () => emit },
    $el: { get: () => instance.vnode.el },
    $listeners: { get: () => $listeners },
    $mode: { get: () => instance._tiny_mode },
    $nextTick: { get: () => hooks.nextTick },
    $off: { get: () => $emitter.off },
    $on: { get: () => $emitter.on },
    $once: { get: () => $emitter.once },
    $options: { get: () => ({ componentName: instance.type.componentName }) },
    $parent: {
      get: () => instance.parent && createVm({}, getRealParent(instance))
    },
    $refs: { get: () => instance.refs },
    $renderless: { get: () => instance.props.tiny_renderless },
    $scopedSlots: { get: () => instance.slots },
    $set: { get: () => $set },
    $slots: { get: () => instance.slots },
    $template: { get: () => instance.props.tiny_template }
  })

  return vm
}

const onBeforeMount = (instance, refs) => {
  for (let name in instance.refs) {
    if (Object.prototype.hasOwnProperty.call(instance.refs, name)) {
      refs[name] = instance.refs[name]
    }
  }
}

/**
构建并返回一个包含多个工具和实用功能的对象，这些功能支持 Vue 组件在不同环境下正确运行和相互交互。这个函数特别适用于 Vue 3，利用了 Vue 3 的 Composition API 中的钩子和其它功能。以下是 tools 函数提供的主要功能和组件：

1. 实例和上下文管理：
 - 获取当前组件的实例和全局属性。
 - 创建和管理虚拟机（vm）实例，这可能用于更复杂的状态管理或侧效应处理。
2. 路由管理：
  - 使用 useRouter 获取当前的路由 (route) 和路由器 (router) 实例，支持导航和路由守卫等功能。
3. 国际化 (i18n)：
  - 通过访问根实例的 $i18n 属性来支持多语言功能。
4. 事件派发和广播：
 - 提供 dispatch 和 broadcast 方法，这些方法可能用于组件之间的事件通信，特别是在一个组件树中。
5. 父子组件处理：
 - 处理父组件和子组件的关系，包括获取真实的父组件 (getRealParent) 和创建对应的虚拟机。
6. 属性和插槽管理：
 - 管理组件的属性 (attrs)、插槽 (slots) 和作用域插槽 (scopedSlots)。
7. Vue 的响应式和生命周期钩子：
 - 使用 Vue 3 的钩子函数 (onBeforeMount 等) 管理组件的生命周期。
8. 服务和工具方法：
 - 提供对服务层的访问，通过 root.$service 和 root.$getService 方法，可能用于调用后端 API 或执行业务逻辑。
9. 模式判断：
 - 根据传入的 mode 参数，判断是 pc 还是 mobile 模式，这有助于组件在不同设备上呈现不同的行为或样式。
10. 属性设置函数：
 - 提供 setParentAttribute 函数，允许设置父组件的属性，这在处理组件嵌套和状态提升时非常有用。

 这个工具函数集中处理了许多常见的功能需求，使得组件开发更加模块化和高效，同时也保证了代码的可维护性和可扩展性。
 */
export const tools = (context, mode) => {
  const instance = hooks.getCurrentInstance() as any
  const root = instance?.appContext.config.globalProperties
  const { route, router } = useRouter(instance)
  const i18n = instance?.proxy?.$root?.$i18n
  const { dispatch, broadcast } = emitEvent(instance)
  const parentHandler = parent(instance)
  const childrenHandler = children(instance)
  const vm = createVm({}, instance, context)
  const emit = context.emit
  const refs = {}
  const grandParent = typeof instance.props.tiny_template === 'undefined' && getRealParent(instance)
  const parentVm = grandParent ? createVm({}, grandParent) : instance.parent ? createVm({}, instance.parent) : null

  const setParentAttribute = ({ name, value }) => {
    const ctx = grandParent ? grandParent.ctx : instance?.parent?.ctx
    ctx[name] = value

    // 当前的parentVm也保存一下。
    parentVm[name] = value
  }

  const defineInstanceProperties = (props) => {
    Object.defineProperties(vm, props)
    Object.defineProperties(instance?.ctx, props)
  }

  const defineParentInstanceProperties = (props) => {
    parentVm && Object.defineProperties(parentVm, props)
  }

  hooks.onBeforeMount(() => defineInstanceVm(vm, instance))
  hooks.onMounted(() => onBeforeMount(instance, refs))

  return {
    framework: 'vue3', // 表示当前工具函数是为 Vue 3 框架设计的。
    vm, // 虚拟组件实例，通常用于组件内部逻辑处理和状态管理。
    emit, // 用于发射事件，使得子组件可以向父组件传递信息。
    emitter, // 事件发射器，用于跨组件通信的事件发射器。
    route, // 当前的 Vue 路由对象，包含了当前路由的信息，如路径、参数等。
    router, // Vue 路由器实例，用于编程式导航和路由管理。
    dispatch, // 用于向上派发事件，直到找到第一个监听该事件的组件。
    broadcast, // 用于向下广播事件到所有子组件，无论子组件是否监听该事件。
    parentHandler, // 父组件处理器，用于获取父组件的信息或调用父组件的方法。
    childrenHandler, // 子组件处理器，用于操作或获取子组件的状态。
    i18n, // 国际化实例，用于支持多语言功能。
    refs, // 一个对象，用于存储和访问组件内部的 refs，以方便直接操作 DOM 或组件实例。
    slots: instance?.slots, // 当前组件的插槽对象，包含了所有插入到组件中的内容。
    scopedSlots: instance?.slots, // 作用域插槽对象，Vue 3 中已经与普通插槽合并。
    attrs: context.attrs, // 传递给组件的属性，包括那些非 prop 的特性。
    parent: parentVm, // 父虚拟机实例，用于在需要时访问或操作父级组件的状态。
    nextTick: hooks.nextTick, // Vue 的 nextTick 函数，用于在下一个 DOM 更新周期之后执行延迟回调。
    constants: instance?.props._constants, // 组件实例中定义的常量，可能用于配置或条件判断。
    mode, // 当前的运行模式（如 'pc' 或 'mobile'），影响组件的响应式和适配行为。
    isPCMode: mode === 'pc', // 布尔值，指示当前是否为 PC 模式。
    isMobileMode: mode === 'mobile', // 布尔值，指示当前是否为移动模式。
    service: root?.$service, // ？？？根实例上的服务对象，用于处理业务逻辑或 API 调用。
    getService: () => root?.$getService(vm), // ？？函数，用于获取服务实例，与 service 相关联，但允许传入特定的 vm。
    setParentAttribute, // 函数，用于设置父组件的属性值，方便状态管理和组件间通信。
    defineInstanceProperties, // 函数，用于定义或修改 vm 实例的属性。
    defineParentInstanceProperties // 函数，用于定义或修改父组件实例的属性。
  }
}

const mapping = (content, before, after) => {
  if (typeof content[before] !== 'undefined') {
    const fn = content[before]

    content[after] = (el, binding, vnode) => {
      vnode.context = binding.instance
      fn(el, binding, vnode)
    }

    delete content[before]
  }
}

export const directive = (directives) => {
  for (const name in directives) {
    const content = directives[name]

    mapping(content, 'bind', 'beforeMount')
    mapping(content, 'update', 'updated')
    mapping(content, 'unbind', 'unmounted')
  }

  return directives
}

export const parseVnode = (vnode) => vnode

const { Text, Comment } = hooks

export const isEmptyVnode = (vnode) => !vnode || !vnode.type || [Text, Comment].includes(vnode.type)

const parseProps = (propsData) => {
  const props = {}

  for (const name in propsData) {
    if (name === 'class' || name === 'style') {
      props[name] = propsData[name]
    } else if (name === 'on' || name === 'nativeOn') {
      const events = propsData[name]

      for (const eventName in events) props[`on${capitalize(camelize(eventName))}`] = events[eventName]
    } else if (name === 'attrs' || name === 'props' || name === 'domProps') {
      const attrs = propsData[name]

      for (const key in attrs) props[key] = attrs[key]
    } else {
      props[name] = propsData[name]
    }
  }

  return props
}

const customResolveComponent = (component) => {
  let type = component
  let customElement = false

  if (typeof component === 'string' && typeof document !== 'undefined') {
    const el = document.createElement(component)
    const svgTagNames = ['SVG', 'CIRCLE', 'PATH']

    if ((el instanceof HTMLUnknownElement && !svgTagNames.includes(el.nodeName)) || component.includes('-')) {
      component = component.toLowerCase()
      customElement = true

      if (component === 'transition') type = hooks.Transition
      else if (component === 'transition-group') type = hooks.TransitionGroup
      else type = hooks.resolveComponent(component)
    } else {
      type = component
    }
  }

  return { type, component, customElement }
}

type CreateElement = (component: any, propsData?: any, childData?: any) => ReturnType<typeof hooks.h>

export const h: CreateElement = (component, propsData, childData) => {
  let props = {}
  let children = childData
  const ret = customResolveComponent(component)
  const customElement = ret.customElement
  const type = ret.type

  component = ret.component

  if (propsData && typeof propsData === 'object' && !Array.isArray(propsData)) {
    props = parseProps(propsData)
    propsData.scopedSlots && (children = propsData.scopedSlots)
  } else if (typeof propsData === 'string' || Array.isArray(propsData)) {
    childData = propsData
  }

  if (typeof childData === 'string' || Array.isArray(childData))
    children = typeof component !== 'string' || customElement ? () => childData : childData

  return hooks.h(type, props, children)
}

export const createComponentFn = (design) => {
  return ({ component, propsData, el }) => {
    const comp = Object.assign(component, { provide: { [design.configKey]: design.configInstance } })
    const vnode = hooks.createVNode(comp, propsData)

    hooks.render(vnode, el)
    return createVm({}, vnode.component)
  }
}

export const defineComponent = hooks.defineComponent

export default hooks

export const isVue2 = false

export const isVue3 = true

export const isVnode = hooks.isVNode

export const KeepAlive = hooks.KeepAlive

export type {
  PropType,
  ExtractPropTypes,
  DefineComponent,
  ComponentPublicInstance,
  SetupContext,
  ComputedRef
} from 'vue'
