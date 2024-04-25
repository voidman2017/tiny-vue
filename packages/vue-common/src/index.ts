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

  return tinyMode
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

export const $setup = ({ props, context, template, extend = {} }) => {
  const mode = resolveMode(props, context)
  const view = hooks.computed(() => {
    if (typeof props.tiny_template !== 'undefined') return props.tiny_template

    const component = template(mode, props)

    return typeof component === 'function' ? defineAsyncComponent(component) : component
  })

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
 * 参数解构和初始处理
函数参数：
props：组件的props。
context：包含Vue组件上下文的对象，如slots和emit。
renderless：一个可选的渲染函数，通常用于高阶组件或库。
api：可能是一组方法或属性，用于暴露给组件的父级。
extendOptions：用于扩展或修改组件功能的额外选项。
mono：一个布尔值，指示是否为单层组件，影响API的继承行为。
classes：可能用于定义组件特定样式的类名映射。
render函数选择：
根据props.tiny_renderless的值确定，否则使用renderless参数。
配置和环境处理
配置读取：
从全局通过inject引入配置（如设计配置），并根据组件名称获取特定配置。
环境判定：
检查当前是否为特定环境（如PC），通过检测process对象。
工具和API准备
工具集（utils）：
包括国际化函数t、类合并函数（mergeClass，条件性添加）、断点工具（useBreakpoint）、主题解析函数等。
包含设计和全局设计配置。
API和全局配置合并：
根据设计配置中可能存在的renderless函数，调整sdk对象。
属性和方法定义
属性集（attrs）：
包括工具函数和数据对象，如过滤器绑定、属性过滤器等。
getElementCssClass函数用于从类映射中获取特定键的类名。
动态属性注入：
对于Vue 2环境下this.slots不更新的问题，使用defineInstanceProperties和defineParentInstanceProperties动态设置。
组件初始化与API处理
组件初始化：
调用initComponent来进行组件特有的初始化操作。
API处理：
如果API是数组，则根据设计配置中定义的API扩展。
将API方法或属性添加到attrs，以便父组件可以通过ref访问。
 * 
 */
export const setup = ({ props, context, renderless, api, extendOptions = {}, mono = false, classes = {} }) => {
  const render = typeof props.tiny_renderless === 'function' ? props.tiny_renderless : renderless

  // 获取组件级配置和全局配置（inject需要带有默认值，否则控制台会报警告）
  const globalDesignConfig: DesignConfig = customDesignConfig.designConfig || hooks.inject(design.configKey, {})
  const designConfig = globalDesignConfig?.components?.[getComponentName().replace($prefix, '')]

  const specifyPc = typeof process === 'object' ? process.env?.TINY_MODE : null
  const utils = {
    $prefix,
    t,
    ...tools(context, resolveMode(props, context)),
    designConfig,
    globalDesignConfig,
    useBreakpoint
  }
  if (specifyPc !== 'pc') {
    utils.mergeClass = mergeClass
  }

  utils.vm.theme = resolveTheme(props, context)
  utils.vm.chartTheme = resolveChartTheme(props, context)
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
