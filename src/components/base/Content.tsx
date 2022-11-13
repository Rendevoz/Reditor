import { DetailedHTMLProps, forwardRef, HTMLAttributes } from 'react'
import { Property } from 'csstype'

interface ContentProps extends DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
  position?: 'absolute' | 'relative' | 'fixed'
  flex?: boolean
  column?: boolean
  alignItems?: Property.AlignItems
  justifyContent?: Property.JustifyContent
  gap?: number
  centered?: boolean
  children?: React.ReactNode
  className?: string
  fullWidth?: boolean
  fullHeight?: boolean
  auto?: boolean
}
const Content = forwardRef<HTMLDivElement, ContentProps>(
  (
    {
      style,
      position = 'relative',
      flex,
      auto,
      column,
      justifyContent,
      alignItems,
      gap,
      centered,
      className,
      fullWidth,
      fullHeight,
      children,
      ...rest
    },
    ref
  ) => {
    const Style: React.CSSProperties = {
      position: position,
      display: flex ? 'flex' : 'block',
      flexDirection: flex && column ? 'column' : 'row',
      justifyContent: centered ? 'center' : justifyContent,
      alignItems: centered ? 'center' : alignItems,
      flex: auto ? 'auto' : undefined,
      width: fullWidth ? '100%' : undefined,
      height: fullHeight ? '100%' : undefined,
      gap,
      ...style
    }
    return (
      <div ref={ref} className={className} style={Style} {...rest}>
        {children}
      </div>
    )
  }
)

export default Content
