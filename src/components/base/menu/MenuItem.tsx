import classNames from 'classnames'
import { FC, MouseEvent, MouseEventHandler, useState } from 'react'
import Content from '../Content'
import styles from './index.module.less'

interface MenuItemProps {
  onClick?: MouseEventHandler
  onDoubleClick?: MouseEventHandler
  onContextMenu?: MouseEventHandler
  icon?: React.ReactNode
  to?: string
  type: 'route' | 'button' | 'link' | 'separator'
  children: React.ReactNode
  selected?: boolean
  id?: number | string
  gap?: number
  disabled?: boolean
}
const MenuItem: FC<MenuItemProps> = ({
  type,
  icon,
  to,
  onClick,
  onDoubleClick,
  onContextMenu,
  children,
  selected,
  id,
  gap = 10,
  disabled = false
}) => {
  return (
    <>
      {type === 'button' && (
        <Item
          gap={gap}
          id={id}
          selected={selected}
          children={children}
          icon={icon}
          onClick={onClick}
          disabled={disabled}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
        />
      )}
    </>
  )
}

const Item: FC<Omit<MenuItemProps, 'type'>> = ({ icon, children, onClick, onDoubleClick, onContextMenu, selected, id, gap, disabled }) => {
  const className = classNames(styles.item, selected && styles.selected, disabled && styles.disabled)

  const handleInternalClick = (e: MouseEvent) => {
    !disabled && onClick?.(e)
  }
  return (
    <Content
      gap={gap}
      flex
      id={String(id)}
      className={className}
      onContextMenuCapture={onContextMenu}
      onMouseDown={e => e.preventDefault()}
      onDoubleClick={onDoubleClick}
      onClick={handleInternalClick}
      style={{ position: 'relative' }}
    >
      {icon && <div className={styles.icon}>{icon}</div>}
      <div className={styles.text}>{children}</div>
    </Content>
  )
}

export default MenuItem
