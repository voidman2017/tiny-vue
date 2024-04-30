/**
 hooks 从 adapter 引入 virtual:common/adapter/vue
 这里  virtual: 是别名。
 internals/cli/src/config/vite.ts:33
 'virtual:common/adapter/vue': pathFromWorkspaceRoot(`packages/vue-common/src/adapter/vue${vueVersion}/index`)
 设置了 alias ，指向对应版本

 vue2:
  packages/vue-common/src/adapter/vue2/index.ts:10 实现 hooks 指向 @vue/composition-api。 所以打印 hooks，发现 hooks.version 是 1.7.2 (packages/vue-common/src/adapter/vue2/package.json中锁定了版本)
 vue2.7:
 packages/vue-common/src/adapter/vue2.7/index.ts:13 ,直接引用vue，所以version 是2.7.10 (packages/vue-common/src/adapter/vue2.7/package.json中锁定了版本)
 vue3:
 packages/vue-common/src/adapter/vue3/index.ts:12，直接引用vue，所以 version 是 3.x.x

总结hooks主要用于管理Vue的组合式API（Composition API）。这些适配器使得不同版本的Vue可以使用统一的API接口，主要是为了兼容性和代码重用。

 这里有个重要的库，@vue/composition-api。其目的是为了在vue2.7之前的版本使用组合式API
 */
import hooks from './adapter'
import {
  appContext,
  appProperties,
  bindFilter,
  createComponentFn,
  getElementCssClass,
  getElementStatusClass
} from './adapter'
import { defineAsyncComponent, directive, emitter, h, markRaw, Teleport, KeepAlive } from './adapter'
import {
  parseVnode,
  isEmptyVnode,
  renderComponent,
  rootConfig,
  tools,
  useRouter,
  getComponentName,
  isVnode
} from './adapter'
import { t } from '@opentiny/vue-locale'
import { stringifyCssClass } from './csscls'
import { twMerge } from 'tailwind-merge'
import '@opentiny/vue-theme/base/index.less'
import { defineComponent, isVue2, isVue3 } from './adapter'
import { useBreakpoint } from './breakpoint'
import { useDefer } from './usedefer'

export { useBreakpoint, useDefer }

export { version } from '../package.json'

export { defineComponent, isVue2, isVue3, appProperties }

export const $prefix = 'Tiny'

export const $props = {
  'tiny_mode': String,
  'tiny_mode_root': Boolean,
  'tiny_template': [Function, Object],
  'tiny_renderless': Function,
  'tiny_theme': String,
  'tiny_chart_theme': Object
}

export const props: Array<
  | 'tiny_mode'
  | 'tiny_mode_root'
  | 'tiny_template'
  | 'tiny_renderless'
  | '_constants'
  | 'tiny_theme'
  | 'tiny_chart_theme'
> = ['tiny_mode', 'tiny_mode_root', 'tiny_template', 'tiny_renderless', '_constants', 'tiny_theme', 'tiny_chart_theme']

/**
 * 
resolveMode 函数的主要作用是确定组件运行的模式。这个函数可以帮助组件根据不同的环境（例如桌面或移动设备）来调整它们的行为或样式。具体来说，这个函数通过以下几个步骤来确定最终的模式：

参数读取：首先，它尝试从组件的 props 中读取 tiny_mode 属性。
注入读取：如果 props 中没有指定，它会尝试从 Vue 的依赖注入系统中读取 TinyMode。
全局配置：如果上述两者都未指定，它会使用全局配置中的 tiny_mode。
函数内部有一个 isRightMode 的辅助函数，用来检查给定的模式是否为有效的模式（目前支持的模式有 'pc', 'mobile', 'mobile-first'）。

最终，如果在 props、注入或全局配置中定义了有效的模式，resolveMode 将返回这个模式。如果这些途径都没有定义有效的模式，则默认返回 'pc'。
此外，如果组件的 props 中设置了 tiny_mode_root 为 true，那么这个模式还会被提供给所有子组件，允许子组件也根据这个模式来调整自己的行为。
这个函数的实现保证了组件能够灵活适应不同的运行环境，使得开发者可以编写更加通用和适应性强的组件。

在web端返回值为pc
 */
export const resolveMode = (props, context) => {
  let isRightMode = (mode) => ~['pc', 'mobile', 'mobile-first'].indexOf(mode)
  let config = rootConfig(context)
  let tinyModeProp = typeof props.tiny_mode === 'string' ? props.tiny_mode : null
  let tinyModeInject = hooks.inject('TinyMode', null)
  let tinyModeGlobal

  // 解决modal、loading、notify 组件（函数式组件，脱离组件树）的内部组件模式判断错误问题。
  if (typeof config.tiny_mode === 'string') {
    tinyModeGlobal = config.tiny_mode
  } else if (config.tiny_mode) {
    tinyModeGlobal = config.tiny_mode.value
  }

  if (!isRightMode(tinyModeProp)) tinyModeProp = null
  if (!isRightMode(tinyModeInject)) tinyModeInject = null
  if (!isRightMode(tinyModeGlobal)) tinyModeGlobal = null

  let tinyMode = tinyModeProp || tinyModeInject || tinyModeGlobal || 'pc'

  if (props.tiny_mode_root) {
    hooks.provide('TinyMode', tinyMode)
  }

  let instance = hooks.getCurrentInstance()

  if (isVue2) {
    instance = instance.proxy
  }

  Object.defineProperty(instance, '_tiny_mode', { value: tinyMode })

  return tinyMode // web端返回 pc
}

export const resolveTheme = (props, context) => {
  const isRightTheme = (theme) => ~['tiny', 'saas'].indexOf(theme)
  const config = rootConfig(context)
  let tinyThemeProp = typeof props.tiny_theme === 'string' ? props.tiny_theme : null
  let tinyThemeInject = hooks.inject('TinyTheme', null)
  let tinyThemeGlobal = config.tiny_theme && config.tiny_theme.value

  if (!isRightTheme(tinyThemeProp)) tinyThemeProp = null
  if (!isRightTheme(tinyThemeInject)) tinyThemeInject = null
  if (!isRightTheme(tinyThemeGlobal)) tinyThemeGlobal = null

  const tinyTheme = tinyThemeProp || tinyThemeInject || tinyThemeGlobal || 'tiny'

  return tinyTheme
}

const resolveChartTheme = (props, context) => {
  const config = rootConfig(context)
  let tinyChartProp = typeof props.tiny_chart_theme === 'object' ? props.tiny_chart_theme : null
  let tinyChartInject = hooks.inject('TinyChartTheme', null)
  let tinyChartGlobal = config.tiny_chart_theme && config.tiny_chart_theme.value

  const tinyChartTheme = tinyChartProp || tinyChartInject || tinyChartGlobal || null

  return tinyChartTheme
}

/**
在组件初始化时根据当前的 props 和 context 动态决定组件的渲染逻辑和展示内容。
通过使用 Vue 的响应式系统（如 computed）和异步组件机制（defineAsyncComponent），这个函数为构建动态和高度可配置的组件提供了强大的支持
该方法通常会在 packages/vue/src/{组件}/src/index.ts 中被调用。目的就是为了实现pc端和移动端的兼容适配
*/
export const $setup = ({ props, context, template, extend = {} }) => {
  /* 
  1.模式解析：
  调用 resolveMode 函数来确定当前组件的模式（如 'pc', 'mobile'）。该函数基于 props 和 context 来决定最合适的模式。
  */
  const mode = resolveMode(props, context)
  /* 
  2.视图的计算属性：
  使用 Vue 的 computed 创建一个计算属性 view。
  在 view 的计算过程中，首先检查 props.tiny_template 是否被定义。如果已定义，直接使用这个模板。
  如果 props.tiny_template 未定义，会调用 template 函数（packages/vue/src/{组件}/src/index.ts引入pc.vue或者mobile-first.vue）生成一个组件，这个函数接收解析得到的模式和 props 作为参数。
  如果 template 函数返回一个函数（即一个动态组件定义），则使用 defineAsyncComponent 来异步定义这个组件。否则，直接使用返回的组件。
  */
  const view = hooks.computed(() => {
    if (typeof props.tiny_template !== 'undefined') return props.tiny_template

    const component = template(mode, props)

    return typeof component === 'function' ? defineAsyncComponent(component) : component
  })

  /* 
  3.渲染组件：
  调 renderComponent（packages/vue-common/src/adapter/vue3/index.ts） 函数来渲染组件。这个函数接受一个对象，其中包含了计算得到的 view、传递给 $setup 的 props、context 以及一个扩展对象 extend。
  最终调用 h 渲染函数实现组件渲染
  */
  return renderComponent({ view, props, context, extend })
}

export const mergeClass = /* @__PURE__ */ (...cssClasses) => twMerge(stringifyCssClass(cssClasses))

// 提供给没有renderless层的组件使用（比如TinyVuePlus组件）
export const design = {
  configKey: Symbol('designConfigKey'),
  configInstance: null
}

// 注入规范配置
export const provideDesignConfig = (designConfig) => {
  if (Object.keys(designConfig).length) {
    hooks.provide(design.configKey, designConfig)
    design.configInstance = designConfig
  }
}

const createComponent = createComponentFn(design)

interface DesignConfig {
  components?: any
  name?: string
  version?: string
}

interface CustomDesignConfig {
  designConfig: null | DesignConfig
}

// 允许自定义主题规范，适用于MetaERP项目
export const customDesignConfig: CustomDesignConfig = {
  designConfig: null
}

/**
 * 
 setup 函数接受一个对象，对象中包含若干属性，重点关注其中 props、context、 renderless、 api 4个属性。该函数在组件 .vue 文件 setup 中被调用，最终返回一个 composition-api 模式下 setup 函数中需要返回的对象
 这么做的目的有两个：
 1、抹平不同vue版本之间的插件
 2、setup函数中提供公共方法
  
 函数整体逻辑：
 1、定义render方法，通常来自于组件对应的renderless方法
 2、获取组件级配置和全局配置，定义utils工具方法
 3、执行render方法获取sdk
 4、定义返回对象基础模板 attrs，包括工具方法、国际化等
 5、遍历组件renderless中定义的api集合，合并到attrs，通常包括state和事件等
 6、返回attrs对象


以组件 carousel 为例
packages/vue/src/carousel/src/pc.vue:102 调用以下 setup 函数返回一个对象，即 composition-api 模式下 setup 函数中需要返回的对象
 */
export const setup = ({ props, context, renderless, api, extendOptions = {}, mono = false, classes = {} }) => {
  /**
  render (packages/vue-common/src/index.ts:165 ) : 忽略 props.tiny_renderless，即组件中传入的 renderless。packages/vue/src/button/src/pc.vue:45 从 packages/renderless/src/button/vue.ts 中引入相关逻辑
  即render函数指向 packages/renderless/src/carousel/vue.ts:148 定义的 renderless 函数。
   */
  const render = typeof props.tiny_renderless === 'function' ? props.tiny_renderless : renderless

  // 获取组件级配置和全局配置（inject需要带有默认值，否则控制台会报警告）
  const globalDesignConfig: DesignConfig = customDesignConfig.designConfig || hooks.inject(design.configKey, {})
  const designConfig = globalDesignConfig?.components?.[getComponentName().replace($prefix, '')]

  const specifyPc = typeof process === 'object' ? process.env?.TINY_MODE : null
  const utils = {
    $prefix, // 字符串，通常用作组件命名的前缀，帮助确保组件名的全局唯一性。
    t, // 一个函数，用于国际化和本地化，通常用来翻译文本。
    ...tools(context, resolveMode(props, context)), // 展开了由 `tools` 函数返回的对象，该函数根据当前上下文和模式提供各种实用工具和服务。
    designConfig, // 一个对象，包含特定于当前组件的设计配置，可能包括样式、行为等设置。
    globalDesignConfig, // 一个对象，包含全局的设计配置，影响整个应用的组件。
    useBreakpoint // 一个函数或钩子，用于根据当前的屏幕尺寸或视口特性来调整组件的布局或行为。
  }
  if (specifyPc !== 'pc') {
    utils.mergeClass = mergeClass
  }

  utils.vm.theme = resolveTheme(props, context)
  utils.vm.chartTheme = resolveChartTheme(props, context)
  /**
  render函数通常来自于组件的renderless方法。
    props:组件接受的props
    hooks:不同版本vue对应的hooks，用于管理Vue的组合式API。这样在组件rederless方法中可以使用 ref、reactive、watch、computed、 生命周期等 composition api
    utils: 工具方法。常用的：vm, parent, emit, constants, childrenHandler, dispatch, slots 
    extendOptions

    通过调用 renderless 方法，返回一组模板需要的api。最终在后续 packages/vue-common/src/index.ts:222编译api，合并到attrs，返回.vue单文件组件 setup 需要的对象，会暴露给模板和组件实例
   */
  const sdk = render(props, hooks, utils, extendOptions)

  // 加载全局配置，合并api
  if (typeof designConfig?.renderless === 'function') {
    Object.assign(sdk, designConfig.renderless(props, hooks, utils, sdk))
  }

  const attrs = {
    t,
    vm: utils.vm,
    f: bindFilter,
    a: filterAttrs,
    d: utils.defineInstanceProperties,
    dp: utils.defineParentInstanceProperties,
    gcls: (key) => getElementCssClass(classes, key)
  }
  if (specifyPc !== 'pc') {
    attrs.m = mergeClass
  }
  /**
   * 修复 render 函数下 this.slots 不会动态更新的问题（vue3 环境没有问题）
   * 解决方法：在 instance 下注入 slots、scopedSlots
   * 注意：renderless 下尽量使用 vm.$refs、vm.$slots
   */
  attrs.d({
    slots: { get: () => utils.vm.$slots, configurable: true },
    scopedSlots: { get: () => utils.vm.$scopedSlots, configurable: true }
  })

  attrs.dp({
    slots: { get: () => utils.parent.$slots, configurable: true },
    scopedSlots: { get: () => utils.parent.$scopedSlots, configurable: true }
  })

  initComponent()

  if (Array.isArray(api)) {
    // 允许 design里定义的api扩展出来，
    if (Array.isArray(designConfig?.api)) {
      api = api.concat(designConfig.api)
    }
    api.forEach((name) => {
      const value = sdk[name]

      if (typeof value !== 'undefined') {
        attrs[name] = value
        // 只有单层组件，才需要给setup传递： mono:true
        // 双层组件，需要把内层的api复制到外层，这样用户应用的ref才能拿到组件的api
        if (!mono) {
          utils.setParentAttribute({ name, value })
        }
      }
    })
  }

  return attrs
}

// 这里需要使用函数声明语句，可以提升变量，保证saas-common可以正常运行
export function svg({ name = 'Icon', component }) {
  return (propData?) =>
    markRaw(
      defineComponent({
        name: $prefix + name,
        setup: (props, context) => {
          const { fill, width, height, 'custom-class': customClass } = context.attrs || {}
          const mergeProps = Object.assign({}, props, propData || null)
          const mode = resolveMode(mergeProps, context)
          const isMobileFirst = mode === 'mobile-first'
          const tinyTag = { 'data-tag': isMobileFirst ? 'tiny-svg' : null }
          const attrs = isVue3 ? tinyTag : { attrs: tinyTag }
          let className = 'tiny-svg'

          const specifyPc = typeof process === 'object' ? process.env?.TINY_MODE : null
          if (specifyPc !== 'pc' && isMobileFirst) {
            className = mergeClass('h-4 w-4 inline-block', customClass || '', mergeProps.class || '')
          }

          const extend = Object.assign(
            {
              style: { fill, width, height },
              class: className,
              isSvg: true
            },
            attrs
          )

          // 解决本地运行会报大量警告的问题
          if (process.env.BUILD_TARGET) {
            extend.nativeOn = context.listeners
          }

          return renderComponent({
            component,
            props: mergeProps,
            context,
            extend
          })
        }
      })
    )
}

export const filterAttrs = (attrs, filters, include) => {
  const props = {}

  for (let name in attrs) {
    const find = filters.some((r) => new RegExp(r).test(name))

    if ((include && find) || (!include && !find)) {
      props[name] = attrs[name]
    }
  }

  return props
}

// eslint-disable-next-line import/no-mutable-exports
export let setupComponent = {}

export const initComponent = () => {
  for (let name in setupComponent) {
    const component = setupComponent[name]

    if (typeof component.install === 'function') {
      component.install(appContext())
    }

    if (typeof component.init === 'function') {
      component.init(appProperties())
    }
  }

  setupComponent = {}
}

export const $install = (component) => {
  component.install = function (Vue) {
    Vue.component(component.name, component)
  }
}

export type {
  PropType,
  ExtractPropTypes,
  DefineComponent,
  ComponentPublicInstance,
  SetupContext,
  ComputedRef
} from './adapter'

export {
  h,
  hooks,
  directive,
  parseVnode,
  isEmptyVnode,
  useRouter,
  emitter,
  createComponent,
  defineAsyncComponent,
  getElementStatusClass,
  Teleport,
  KeepAlive,
  isVnode
}

export default {
  h,
  directive,
  parseVnode,
  isEmptyVnode,
  useRouter,
  emitter,
  createComponent,
  defineAsyncComponent,
  filterAttrs,
  initComponent,
  setupComponent,
  svg,
  $prefix,
  $props,
  props,
  $setup,
  setup,
  hooks,
  getElementStatusClass,
  $install,
  isVnode
}
