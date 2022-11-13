import { css } from '@emotion/css'
import classNames from 'classnames'
import { RenderElementProps } from 'slate-react'
import styles from './index.module.less'

const ListItem = ({ children, element, attributes }: RenderElementProps) => {
  return (
    <div className={styles.wrapper}>
      <div
        contentEditable={false}
        role="list-item-marker"
        data-level={element.level}
        className={classNames(
          styles.marker,
          css({
            color: '#8590ae'
          })
        )}
      ></div>
      <span role="list-item-line-wrapper" className={css({ width: '100%' })}>
        {children}
      </span>
    </div>
  )
}

export default ListItem
