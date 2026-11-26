import { navigate } from './navigation.js'

// Native anchors retain keyboard, open-in-new-tab and modified-click behavior.
export function Link({ href, children, onClick, ...props }) {
  return <a href={href} {...props} onClick={event => {
    onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target === '_blank') return
    event.preventDefault()
    navigate(href)
  }}>{children}</a>
}
