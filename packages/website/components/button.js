import Link from 'next/link'
import clsx from 'clsx'

/**
 * @typedef {Object} ButtonProps
 * @prop {string} [wrapperClassName]
 * @prop {string} [className]
 * @prop { import('react').MouseEventHandler<HTMLButtonElement> } [onClick]
 * @prop {string} [href]
 * @prop {import('react').ButtonHTMLAttributes<HTMLButtonElement>["type"]} [type]
 * @prop {import('react').ReactChildren | string} children
 * @prop {boolean} [disabled]
 * @prop {string} [id]
 * @prop {'dark' | 'light'} [variant]
 * @prop {boolean} [small] If the button should have min-width & height or not
 * @prop {boolean} [rounded] If the button should have border-radius
 * @prop {import('react').FunctionComponent} [Icon] Icon component to prefix
 */

/**
 *
 * @param {ButtonProps} param0
 * @returns
 */
export default function Button({
  id,
  wrapperClassName,
  className,
  onClick,
  href,
  type = 'button',
  children,
  disabled = false,
  variant = 'dark',
  small,
  rounded,
  Icon,
}) {
  const buttonStyle = small ? {} : { minWidth: '8rem', minHeight: '3.25rem' }
  const variantClasses = variant === 'dark' ? 'bg-w3storage-purple text-white' : 'bg-transparent text-black'

  const btn = (
    <button
      type={type}
      className={clsx(
        variantClasses,
        'flex',
        'items-center',
        'justify-center',
        'border',
        'border-transparent',
        rounded && 'rounded-md',
        'px-4',
        disabled ? 
          'cursor-auto opacity-50' :
          'hover:opacity-90 focus:opacity-90 focus:border-white',
        'typography-cta',
        !small && 'w-full',
        className
      )}
      style={buttonStyle}
      onClick={onClick}
      disabled={disabled}
      id={id}
    >
      { Icon && <Icon className="w-7 mr-2 fill-current"/> }
      {children}
    </button>
  )
  return href ? (
    <Link href={href}>
      <a className={wrapperClassName}>
        {btn}
      </a>
    </Link>
  ) : (
    <div className={wrapperClassName}>
      {btn}
    </div>
  )
}
