
import { FC, ReactNode } from 'react'
import Content from '../Content'
import styles from './index.module.less'

interface MenuGroupProps {
  title: string
  children: ReactNode
}
const MenuGroup: FC<MenuGroupProps> = ({ children, title }) => {
  return (
    <Content className={styles.group}>
      <div className={styles.groupTitle}>{title}</div>
      {children}
    </Content>
  )
}
export default MenuGroup
