
import React, { CSSProperties, forwardRef } from 'react'
import { Property } from 'csstype'
import { default as IconPark } from '@icon-park/react/es/all'
import  Content  from './Content'
export interface IconProps {
  name: string
  theme?: 'outline' | 'filled' | 'two-tone' | 'multi-color'
  size?: number
  cursor?: Property.Cursor
  className?: string
  containerStyle?: CSSProperties
}
const Icon = forwardRef<HTMLDivElement, IconProps>(({ name, size, theme, className, cursor, onClick, containerStyle, ...rest }, ref) => {
  const style: React.CSSProperties = {
    cursor: cursor,
    userSelect: 'none',
    ...rest.style
  }
  const renderIcon = (name: string) => {
    if (name.startsWith('park')) {
      return <IconPark {...rest} style={style} className={className} type={name.slice(5)} theme={theme} size={size} />
    }
  }
  return (
    <Content style={containerStyle} onClick={onClick} flex centered ref={ref}>
      {renderIcon(name)}
    </Content>
  )
})
export default Icon
