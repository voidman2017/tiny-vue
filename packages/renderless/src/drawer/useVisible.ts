export function useVisible(options, propName) {
  const { props, watch, state } = options

  if (props.visibleType === 1 || props.visibleType === 2) {
    state.created = false
  }
  if (props.visibleType === 3) {
    state.created = true
  }

  watch(
    () => props[propName],
    (val, oldVal) => {
      if (props.visibleType === 1) {
        if (val && !oldVal) {
          state.created = true
        }
      }
      if (props.visibleType === 2) {
        state.created = val
      }
    },
    { immediate: true }
  )
}
