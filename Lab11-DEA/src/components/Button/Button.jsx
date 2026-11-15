function Button({ children, variant = 'primary', className = '', href, type = 'button', ...props }) {
  const buttonClassName = `button button--${variant} ${className}`.trim()

  if (href) {
    return <a className={buttonClassName} href={href} {...props}>{children}</a>
  }

  return <button className={buttonClassName} type={type} {...props}>{children}</button>
}

export default Button
