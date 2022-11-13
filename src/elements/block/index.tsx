import { useMemoizedFn, useMergedRef } from '@/hooks'
import classNames from 'classnames'
import { FC, memo, useRef, useState, CSSProperties, useEffect, cloneElement, MouseEvent } from 'react'
import { RenderElementProps, useSlate } from 'slate-react'
import { CustomElement } from '../../customTypes'
import { motion, AnimatePresence } from 'framer-motion'
import { useClickOutside } from '@/hooks'
import { scrollToTarget } from '../../utils/positions/scroll'
import { SELECT_AREA_MAP, ID_TO_ELEMENTS_MAP, SELECTED_BLOCKS_MAP } from '../../weakMaps'
import useIsSelecting from '../../hooks/useIsSelecting'
import { isRectsCollision } from '../../utils/positions/collision'
import { getDistanceBetweenElementAndScrollableElement } from '@/utils/scroll'
import { getDistanceBetweenPointAndElement } from '@/utils/position'
import './index.less'

type BlockProps = {
  blockId: number
  type: string
  ratio?: number
  onMouseEnter?: (e: MouseEvent, element: CustomElement) => void
  onNestedListItem?: (isNested: boolean) => void
  element?: CustomElement
  scrollElement?: HTMLDivElement | null
}
const Block: FC<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> & BlockProps & RenderElementProps> = memo(
  ({ scrollElement, blockId, children, ratio, type, attributes, element, onMouseEnter, onNestedListItem, ...rest }) => {
    const blockRef = useRef<HTMLDivElement>(null)
    const columnRef = useRef<HTMLDivElement>(null)
    const editor = useSlate()
    const map = ID_TO_ELEMENTS_MAP.get(editor)
    const mergedChildrenRef = useMergedRef(blockRef, attributes.ref)
    const [direction, setDirection] = useState<string>()
    const [selected, setSelected] = useState(false)
    const [withLine, setWithLine] = useState<{ width: number } | null>(null)
    const [isSelecting] = useIsSelecting()
    const distanceToScrollElementRef = useRef<{ left: number; top: number; right: number; bottom: number }>()

    const handleCollisionSelectBlock = useMemoizedFn(() => {
      const selectArea = SELECT_AREA_MAP.get(editor)
      if (isRectsCollision(selectArea, distanceToScrollElementRef.current)) {
        setSelected(true)
      } else {
        setSelected(false)
      }
    })
    useEffect(() => {
      if (isSelecting) {
        const block = blockRef.current
        if (block && scrollElement) {
          distanceToScrollElementRef.current = getDistanceBetweenElementAndScrollableElement(block, scrollElement)
        }
      }
    }, [isSelecting])
    useEffect(() => {
      if (selected) {
        const selectedBlocksMap = SELECTED_BLOCKS_MAP.get(editor)
        selectedBlocksMap?.set(blockId, blockRef.current)
        return () => {
          selectedBlocksMap?.delete(blockId)
        }
      }
    }, [selected])
    useClickOutside(() => {
      if (!isSelecting) {
        setSelected(false)
      }
    }, blockRef)
    const handleIndicatorChange = useMemoizedFn((direction: string | null, e?: MouseEvent) => {
      console.log(element, direction)
      if (selected) {
        return false
      }
      if (direction === 'bottom' && (element?.type === 'list-item' || element?.level)) {
        if (e) {
          const distanceToBlock = getDistanceBetweenPointAndElement(e, blockRef.current)
          if (distanceToBlock.left > 0 && distanceToBlock.left < 20) {
            setWithLine(null)
            onNestedListItem?.(false)
          }
          if (distanceToBlock.left > 20 && distanceToBlock.right > 0) {
            setWithLine({ width: 20 })
            onNestedListItem?.(true)
          }
        }
      }
      if (direction !== null) {
        setDirection(direction)
      } else {
        setWithLine(null)
        setDirection(undefined)
      }
      return true
    })
    const handleSelectBlock = useMemoizedFn(() => {
      setSelected(true)
      if (scrollElement) {
        scrollToTarget(blockRef.current, scrollElement)
      }
    })
    const indicatorStyle: CSSProperties = {
      position: 'absolute',
      left: direction === 'left' ? -4 : direction === 'top' || direction === 'bottom' ? 0 : undefined,
      top: direction === 'top' ? -4 : direction === 'left' || direction === 'right' ? 0 : undefined,
      bottom: direction === 'bottom' ? -4 : direction === 'left' || direction === 'right' ? 0 : undefined,
      right: direction === 'right' ? -4 : direction === 'top' || direction === 'bottom' ? 0 : undefined,
      width: direction === 'right' || direction === 'left' ? 4 : undefined,
      height: direction === 'top' || direction === 'bottom' ? 4 : undefined,
      backgroundColor: '#8590ae',
      borderRadius: '3px'
    }
    if (withLine) {
      indicatorStyle.left = withLine.width + 2
    }
    const withLineStyle: CSSProperties = {
      position: 'absolute',
      left: 0,
      height: 4,
      bottom: -4,
      width: withLine?.width - 1,
      borderRadius: '3px',
      backgroundColor: '#8590aea8',
      zIndex: 2
    }
    useEffect(() => {
      map?.set(blockId, {
        selectBlock: handleSelectBlock,
        collisionSelectBlock: handleCollisionSelectBlock,
        changeIndicator: handleIndicatorChange,
        getElement: () => element
      })
      return () => {
        map?.delete(blockId)
      }
    })
    useEffect(() => {
      const width = `calc(( 100% - ${
        46 * ((columnRef.current?.parentElement?.querySelectorAll("[data-type='column']").length || 2) - 1)
      }px ) * ${ratio?.toFixed(3)})`
      if (columnRef.current) {
        columnRef.current.style.width = width
      }
    }, [ratio])
    const handleMouseEnter = (e: MouseEvent) => {
      onMouseEnter?.(e, element)
    }
    const renderChildren = () => (
      <div
        key={blockId}
        {...attributes}
        ref={mergedChildrenRef}
        onMouseEnter={handleMouseEnter}
        data-level={element?.level}
        {...rest}
        className={classNames(
          type === 'columnList' && 'ColumnListBlock',
          type === 'column' && 'ColumnBlock',
          type.startsWith('heading') && 'HeadingBlock',
          type !== 'column' && type !== 'columnList' && !type.startsWith('heading') && 'ParagraphBlock'
        )}
      >
        <AnimatePresence>
          {selected && (
            <motion.div
              transition={{ duration: 0.2 }}
              key="selected"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='Selected'
            ></motion.div>
          )}
        </AnimatePresence>
        {children}
        <AnimatePresence>
          {direction && (
            <motion.div
              transition={{ duration: 0.15 }}
              key={direction}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {withLine && <div style={withLineStyle}></div>}
              <div style={indicatorStyle} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
    return type === 'column'
      ? cloneElement(
          <div></div>,
          {
            ref: columnRef,
            style: {
              paddingTop: 12,
              paddingBottom: 12,
              flexGrow: 0,
              flexShrink: 0
            }
          },
          renderChildren()
        )
      : renderChildren()
  }
)

export default Block
