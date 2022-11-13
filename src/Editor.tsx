import { EditorEventHandler } from '@/events/editorEvent'
import useEventEmitter from '@/events/useEventEmitter'
import { useDebounceFn, useMemoizedFn, useRafFn, useUnmount } from '@/hooks'
import { FC, memo, MouseEvent,  useEffect, useMemo, useRef, useState } from 'react'
import { createEditor,  Transforms, Descendant, Node, Path, Element as SlateElement, Range } from 'slate'
import { withHistory } from 'slate-history'
import { withReact, ReactEditor } from 'slate-react'
import { CustomElement } from './customTypes'
import { useSelectedEditorRef } from './hooks/useSelectedEditorRef'
import InnerEditor from './InnerEditor'
import withVoid from './plugins/withVoid'
import './index.less'
import DragHandle from './components/dragHandle'
import EditorOverlay from './components/overlay'
import useIsDragging from './hooks/useIsDragging'
import classNames from 'classnames'
import useIsSelecting from './hooks/useIsSelecting'
import { getDistanceBetweenElementAndScrollableElement, getDistanceBetweenPointAndScrollableElement, isFullyScrolled, isScrollable } from './utils/scroll'
import { ID_TO_ELEMENTS_MAP, SELECTED_BLOCKS_MAP, SELECT_AREA_MAP } from './weakMaps'
import withEmitter from './plugins/withEmitter'
import withShortcuts from './plugins/withShortcuts'
import withHtml from './plugins/withHtml'
import withCustomComponent from './plugins/withCustomComponent'
import moveSingleElement from './utils/moveSingleElement'
import moveMultiElements from './utils/moveMultiElements'
import rebuildDragSelect from './utils/rebuildDragSelect'
import { getDistanceBetweenPointAndElement } from './utils/position'
import { getElementId } from './utils/element'
import { searchBlock } from './utils/algorithm'
import _ from 'lodash'

type DragHandleProps = {
  left: number
  top: number
  targetHeight: number
  targetId: number
}
const initial = [
  {
    id: 1,
    type: 'paragraph',
    children: [{ text: 'Rendevoz is an open-source knowledge management software,it aims to help people feel free of reading & noting!' }]
  },
  {
    id: 3,
    type: 'paragraph',
    children: [{ text: 'More features to be explored for you in Rendevoz! Tabs view, auto save, emoji, sub page, etc' }]
  },
  {
    id: 2,
    type: 'paragraph',
    children: [{ text: 'Download & Github Link: https://github.com/RealRong/Rendevoz       (too busy to develop a official site right now😵!)' }]
  }
]
export interface EditorProps {
  onEditorLoad?: (editor: ReactEditor) => void
  onChange?: (e: Descendant[]) => void
  onClick?: () => void
  initialValue?: Descendant[]
  id: string
}
export interface IEditorRef {
  insertNode: (element: CustomElement) => void
  elementPropertyChange: (element: CustomElement) => void
  outerElementPropertyChange: (element: CustomElement) => void
}
export const Reditor: FC<EditorProps> = memo(
  ({ onEditorInitialized, onChange, onClick, onSave, initialValue, onTitleChange, id, noteId,titleMarginTop }) => {
    const currentDraggingElementPath = useRef<Path>()
    const [isDragging, setIsDragging] = useIsDragging()
    const [outlineVisible, setOutlineVisible] = useState(false)
    const [mindmapVisible, setMindmapVisible] = useState(false)
    const [overlayVisible, setOverlayVisible] = useState(false)
    const [editorValue, setEditorValue] = useState(initial)
    const [title, setTitle] = useState()
    const [isSelecting, setIsSelecting] = useIsSelecting()
    const wrapperRef = useRef<HTMLDivElement>(null)
    const currentDraggingRef = useRef<HTMLDivElement>()
    const draggingLayerRef = useRef<HTMLDivElement>()
    const blockElementsRef = useRef<Map<globalThis.Element, { left: number; top: number; height: number; width: number }>>(new Map())
    const blockElementsArrayRef = useRef<HTMLElement[]>([])
    const [dragHandle, setDragHandle] = useState<DragHandleProps>()
    const indicatorRef = useRef<{ direction?: string; id?: number; isNested?: boolean }>()
    const scrollDirectionRef = useRef<string>()
    const scrollFramerId = useRef<number>()
    const emitter = useEventEmitter()
    const handler = new EditorEventHandler()
    const selectedRef = useSelectedEditorRef()
    const previousIndicatorRef = useRef<{ direction: string | null; id: number | null }>({
      direction: null,
      id: null
    })
    useEffect(() => {
      const wrapper = wrapperRef.current
      if (wrapper) {
        wrapper.addEventListener('mousedown', handleStartSelecting)
        return () => {
          wrapper.removeEventListener('mousedown', handleStartSelecting)
        }
      }
    })
    const handleStartSelecting = (e: MouseEvent) => {
      // click on blank wrapper space, start selecting
      if (e.target === e.currentTarget) {
        document.body.style.cursor = 'default'
        setIsSelecting(true)
        const wrapper = wrapperRef.current
        if (!wrapper) return
        blockElementsArrayRef.current = []
        blockElementsRef.current.clear()
        Array.from(wrapper.querySelector(`[role="textbox"]`)?.querySelectorAll('[data-spec-type="common-block"]') || []).forEach(i => {
          const { left, top, width, height } = i.getBoundingClientRect()
          const distance = getDistanceBetweenPointAndScrollableElement({ x: left, y: top }, wrapper)
          blockElementsArrayRef.current.push(i)
          blockElementsRef.current.set(i, {
            left: distance.left,
            top: distance.top,
            width,
            height
          })
        })
        const distanceToScrollElement = getDistanceBetweenElementAndScrollableElement(
          {
            left: e.clientX,
            top: e.clientY,
            x: e.clientX,
            y: e.clientY,
            right: e.clientX,
            bottom: e.clientY,
            width: 0,
            height: 0
          },
          wrapper
        )
        if (distanceToScrollElement) {
          SELECT_AREA_MAP.set(editor, {
            startPoint: { ...distanceToScrollElement },
            endPoint: { ...distanceToScrollElement },
            ...distanceToScrollElement
          })
        }
      }
    }
    useEffect(() => {
      if (isSelecting) {
        document.addEventListener('mousemove', handleSelecting2)
        document.addEventListener('mouseup', handleEndSelecting)
        document.addEventListener('click', handleEndSelecting, true)
        return () => {
          document.removeEventListener('mousemove', handleSelecting2)
          document.removeEventListener('mouseup', handleEndSelecting)
        }
      }
    }, [isSelecting])
    const handleSelecting = useMemoizedFn((e: MouseEvent) => {
      const wrapper = wrapperRef.current
      if (!wrapper) {
        return
      }
      e.preventDefault()
      if (isScrollable(wrapper)) {
        const distance = getDistanceBetweenPointAndElement(e, wrapper)
        if (distance.top < 100 && distance.top > 0 && isFullyScrolled(wrapper) !== 'top') {
          if (!scrollDirectionRef.current) {
            startScroll('top')
          }
        } else if (distance.bottom < 100 && distance.bottom > 0 && isFullyScrolled(wrapper) !== 'bottom') {
          if (!scrollDirectionRef.current) {
            startScroll('bottom')
          }
        } else {
          endScroll()
        }
      }
      const prevRect = SELECT_AREA_MAP.get(editor)
      if (!prevRect) return

      const startPoint = prevRect.startPoint as Required<Position>
      const endPoint = getDistanceBetweenPointAndScrollableElement(
        {
          x: e.clientX,
          y: e.clientY
        },
        wrapper
      )
      const currRect = {
        startPoint,
        endPoint,
        left: Math.min(startPoint.left, endPoint.left),
        top: Math.min(startPoint.top, endPoint.top),
        right: Math.min(startPoint.left, endPoint.left) + Math.abs(endPoint.left - startPoint.left),
        bottom: Math.min(startPoint.top, endPoint.top) + Math.abs(endPoint.top - startPoint.top)
      }
      SELECT_AREA_MAP.set(editor, currRect)
      emitter.emit('editor', {
        type: 'toggleOverlay',
        data: {
          content: 'selectArea'
        }
      })
      // start search selected blocks
      const firstBlock = blockElementsArrayRef.current[0]
      const lastBlock = blockElementsArrayRef.current[blockElementsArrayRef.current.length - 1]
      const firstBlockRect = blockElementsRef.current.get(firstBlock)
      const lastBlockRect = blockElementsRef.current.get(lastBlock)
      const blocksMap = ID_TO_ELEMENTS_MAP.get(editor)
      if (!firstBlockRect || !lastBlockRect) return
      if (currRect.bottom < firstBlockRect.top) {
        const prevSelectedBlocks = SELECTED_BLOCKS_MAP.get(editor)
        if (prevSelectedBlocks) {
          Array.from(prevSelectedBlocks.values()).forEach(i => {
            const id = getElementId(i)
            blocksMap?.get(id)?.collisionSelectBlock()
          })
        }
        return
      }
      if (currRect.top > lastBlockRect.top + lastBlockRect.height) return
      const blockEntriesArray = Array.from(blockElementsRef.current.entries())
      const topBlock = searchBlock(blockEntriesArray, currRect.top)
      const bottomBlock = searchBlock(blockEntriesArray, currRect.bottom)
      const topIdx = topBlock === -1 ? 0 : blockElementsArrayRef.current.findIndex(i => i === topBlock)
      let finalBottomBlock = bottomBlock
      if (bottomBlock !== -1) {
        finalBottomBlock = _.findLast(blockEntriesArray, i => {
          return i[1].top === blockElementsRef.current.get(bottomBlock)?.top ? true : false
        })?.[0]
      }

      const bottomIdx =
        finalBottomBlock === -1
          ? blockElementsArrayRef.current.length
          : blockElementsArrayRef.current.findIndex(i => i === finalBottomBlock) + 1
      const blocks = blockElementsArrayRef.current.slice(topIdx, bottomIdx)
      const prevSelectedBlocks = SELECTED_BLOCKS_MAP.get(editor)
      if (prevSelectedBlocks) {
        Array.from(prevSelectedBlocks.values())
          .filter(i => !blocks.some(o => o === i))
          .forEach(i => {
            const id = getElementId(i)
            blocksMap?.get(id)?.collisionSelectBlock()
          })
      }

      blocks.forEach(i => {
        const id = getElementId(i)
        blocksMap?.get(id)?.collisionSelectBlock()
      })
    })

    const handleEndSelecting = useMemoizedFn((e: MouseEvent) => {
      if (e.type === 'click') {
        e.stopPropagation()
        document.removeEventListener('click', handleEndSelecting, true)
        return
      }
      SELECT_AREA_MAP.delete(editor)
      document.body.style.cursor = 'auto'
      emitter.emit('editor', {
        type: 'toggleOverlay',
        data: {
          content: 'selectArea'
        }
      })
      setIsSelecting(false)
    })

    const editor = useMemo(() => {
      return withVoid(
        withHtml(
          withCustomComponent(
            withShortcuts(
              withEmitter(withHistory(withReact(createEditor())), emitter)
            )
          )
        )
      )
    }, [])
    const elementsMap = ID_TO_ELEMENTS_MAP.get(editor)

    useEffect(() => {
      ID_TO_ELEMENTS_MAP.set(editor, new Map())
      SELECTED_BLOCKS_MAP.set(editor, new Map())
    }, [editor])

    const handleNestedListItem = useMemoizedFn((isNested: boolean) => {
      indicatorRef.current = {
        ...indicatorRef.current,
        isNested
      }
    })

    const handleInnerRendered = useMemoizedFn(() => {
      console.log('inner rendered (this is placeholder console)')
    })
    const handleInsertEmoji = element => {
      const { selection } = editor
      const ele = {
        type: element.type,
        name: element.name,
        children: element.children
      }
      Transforms.insertNodes(editor, ele, { at: Range.end(selection) })
      Transforms.move(editor, {
        edge: 'end',
        distance: 1,
        unit: 'word'
      })
    }

    const handleElementPropertyChange = (element: CustomElement) => {
      if (element.id) {
        Transforms.setNodes(editor, element, {
          match: n => n.id === element.id
        })
      }
    }

    const handleOuterElementPropertyChange = (element: OuterElement) => {
      if (element.originId) {
        Transforms.setNodes(
          editor,
          { title: element.title },
          {
            at: [],
            match: n => n.originId && n.originId === element.originId,
            voids: true,
            mode: 'all'
          }
        )
      }
    }

    const handleDragDrop = useMemoizedFn(() => {
      if (indicatorRef.current) {
        setDragHandle(undefined)
        const { direction, isNested, id } = indicatorRef.current
        const selectedBlocksMap = SELECTED_BLOCKS_MAP.get(editor)
        const [targetElement, targetPath] = Array.from(Node.descendants(editor)).find(i => i[0].id === id) || []

        if (selectedBlocksMap && selectedBlocksMap.size > 0) {
          const selectedBlocks = Array.from(selectedBlocksMap.values())
          const selectedElements = selectedBlocks.map(i => elementsMap?.get(getElementId(i))?.getElement()).filter(i => !!i)
          if (selectedElements.length === 1) {
            const currPath = ReactEditor.findPath(editor, selectedElements[0])
            moveSingleElement(editor, currPath, targetElement, targetPath, direction, isNested)
            return
          }
          moveMultiElements(editor, selectedElements, targetElement, targetPath, direction, isNested)
          return
        }
        const currPath = currentDraggingElementPath.current
        moveSingleElement(editor, currPath, targetElement, targetPath, direction, isNested)
      }
    })

    const handleStartDragging = () => {
      setIsDragging(true)
      blockElementsArrayRef.current = []
      blockElementsRef.current.clear()
      document.body.style.cursor = 'grabbing'
      const wrapper = wrapperRef.current
      if (!wrapper) {
        return
      }
      // save all outest blocks rect for horizontally select which is currently dragging over
      Array.from(wrapper.querySelector(`[role="textbox"]`)?.children || [])
        .filter(i => i.getAttribute('data-type') === 'block')
        .forEach(i => {
          const { left, top, width, height } = i.getBoundingClientRect()
          const distance = getDistanceBetweenPointAndScrollableElement({ x: left, y: top }, wrapper)
          blockElementsArrayRef.current.push(i)
          blockElementsRef.current.set(i, {
            left: distance.left,
            top: distance.top,
            width,
            height
          })
        })
      document.addEventListener('mousemove', handleDragging2)
      document.addEventListener('mouseup', handleEndDragging)
    }

    const startScroll = (direction: string) => {
      scrollDirectionRef.current = direction
      scroll()
    }

    const scroll = () => {
      if (scrollDirectionRef.current && wrapperRef.current) {
        const step = wrapperRef.current.scrollHeight / 500
        const direction = scrollDirectionRef.current
        if (direction === 'top') {
          wrapperRef.current.scrollTop = wrapperRef.current.scrollTop - step
        } else {
          wrapperRef.current.scrollTop = wrapperRef.current.scrollTop + step
        }
        cancelAnimationFrame(scrollFramerId.current)
        scrollFramerId.current = requestAnimationFrame(scroll)
      }
    }

    const endScroll = () => {
      cancelAnimationFrame(scrollFramerId.current)
      scrollDirectionRef.current = undefined
    }

    const handleDragging = useMemoizedFn((e: MouseEvent) => {
      const draggingLayer = draggingLayerRef.current
      const wrapper = wrapperRef.current
      const currentDraggingElement = currentDraggingRef.current
      const indicator = indicatorRef.current
      if (!draggingLayer || !wrapper || !currentDraggingElement || !blockElementsRef.current.size) {
        return
      }

      if (!draggingLayer.hasChildNodes()) {
        const selectedBlocksSet = SELECTED_BLOCKS_MAP.get(editor)
        if (selectedBlocksSet && selectedBlocksSet.size > 0) {
          draggingLayer.appendChild(rebuildDragSelect(editor, e))
        } else {
          const cloned = currentDraggingElement.cloneNode(true)
          const rect = currentDraggingElement.getBoundingClientRect()
          draggingLayer.style.opacity = '0.5'
          draggingLayer.style.width = `${rect?.width}px`
          draggingLayer.style.height = `${rect?.height}px`
          draggingLayer.appendChild(cloned)
        }
      }
      draggingLayer.firstElementChild &&
        ((draggingLayer.firstElementChild as HTMLElement).style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`)
      if (isScrollable(wrapper)) {
        const distance = getDistanceBetweenPointAndElement(e, wrapper)
        if (distance.top < 100 && distance.top > 0 && isFullyScrolled(wrapper) !== 'top') {
          if (!scrollDirectionRef.current) {
            startScroll('top')
          }
        } else if (distance.bottom < 100 && distance.bottom > 0 && isFullyScrolled(wrapper) !== 'bottom') {
          if (!scrollDirectionRef.current) {
            startScroll('bottom')
          }
        } else {
          endScroll()
        }
      }
      const distanceToWrapper = getDistanceBetweenPointAndScrollableElement({ x: e.clientX, y: e.clientY }, wrapper)
      const currentBlock = searchBlock(Array.from(blockElementsRef.current.entries()), distanceToWrapper.top)
      if (currentBlock === -1) {
        // right now we need to check if dragging over the toppest / bottomest
        const firstBlock = blockElementsArrayRef.current[0]
        const lastBlock = blockElementsArrayRef.current[blockElementsArrayRef.current.length - 1]
        const distanceToFirstBlock = getDistanceBetweenPointAndElement(e, firstBlock)
        const distanceToLastBlock = getDistanceBetweenPointAndElement(e, lastBlock)
        if (distanceToFirstBlock.top < 0 && distanceToFirstBlock.left > 0 && distanceToFirstBlock.right > 0) {
          changeIndicator('top', e, getElementId(firstBlock))
          return
        }
        if (distanceToLastBlock.bottom < 0 && distanceToLastBlock.left > 0 && distanceToLastBlock.right > 0) {
          changeIndicator('bottom', e, getElementId(lastBlock))
          return
        }
        return
      }
      const currentBlockId = getElementId(currentBlock)
      const previousBlock = currentBlock?.previousElementSibling
      const previousBlockId = getElementId(previousBlock)
      let draggingOverColumn = null

      // right now dragging over column list,we do not determine the top / bottom direction of column list
      if (currentBlock?.getAttribute('data-spec-type') === 'columnList') {
        const columns = currentBlock.querySelectorAll(`[data-spec-type="column"]`)
        // check if dragging over the right blank space
        const lastColumn = Array.from(columns).pop()
        if (lastColumn) {
          const distance = getDistanceBetweenPointAndElement(e, lastColumn)
          if (distance.right < 0) {
            changeIndicator('right', e, getElementId(lastColumn))
            return
          }
        }

        // else check if dragging between the columns or in the columns
        for (const column of columns) {
          const distance = getDistanceBetweenPointAndElement(e, column)
          if (distance.left < 0) {
            changeIndicator('left', e, getElementId(column))
            return
          }
          if (distance.left > 0 && distance.right > 0) {
            if (distance.top > 0 && (distance.top < currentBlock.getBoundingClientRect().height * 0.8 || distance.bottom > 0)) {
              draggingOverColumn = column
            }
            break
          }
        }
        if (draggingOverColumn) {
          const currentDraggingOverBlock = Array.from(draggingOverColumn.children).find(i => {
            const distance = getDistanceBetweenPointAndElement(e, i)
            if (distance.top > 0 && distance.bottom > 0) {
              return i
            }
          })
          // we have the dragging over block,means we are not dragging over the blank space
          if (currentDraggingOverBlock) {
            // next we need to determine the mouse pos on top 50% side or bottom 50% side
            const distance = getDistanceBetweenPointAndElement(e, currentDraggingOverBlock)
            const { height } = currentDraggingOverBlock.getBoundingClientRect()
            const currentDraggingOverBlockId = getElementId(currentDraggingOverBlock)
            if (distance.top / height < 0.5) {
              // we are on the top side and current dragging over block is the first one,so we can put the indicator above it
              if (currentDraggingOverBlock === draggingOverColumn.firstElementChild) {
                changeIndicator('top', e, currentDraggingOverBlockId)
                return
              } else {
                const previousBlockId = getElementId(currentDraggingOverBlock.previousElementSibling)
                // if current dragging over block is not the first child,we need to check if the indicator is under the previous block
                if (indicator && indicator.direction === 'bottom' && indicator.id === previousBlockId) {
                  // do nothing here
                  return
                } else {
                  changeIndicator('bottom', e, previousBlockId)
                  return
                  // we need to put the indicator under the previous block
                }
              }
            } else {
              // now we are dragging over the bottom 50% side
              // we can't eagerly return right here because maybe we are dragging over list-item block so change indicator should be trigger for marker/line wrapper check
              changeIndicator('bottom', e, currentDraggingOverBlockId)
              return
            }
          } else {
            // now we are dragging over the blank space of the column,always the bottom side
            // so we should set indicator on the bottomest block
            const lastBlock = draggingOverColumn.lastElementChild
            const lastBlockId = getElementId(lastBlock)
            changeIndicator('bottom', e, lastBlockId)
            return
          }
        } else {
          const distance = getDistanceBetweenPointAndElement(e, currentBlock)
          const { height } = currentBlock.getBoundingClientRect()
          if (distance.top / height > 0.8) {
            changeIndicator('bottom', e, currentBlockId)
            return
          }
          if (distance.top / height < 0.2) {
            if (currentBlock === wrapperRef.current?.querySelector(`[role="textbox"]`)?.firstElementChild) {
              changeIndicator('top', e, currentBlockId)
              return
            } else {
              changeIndicator('bottom', e, previousBlockId)
              return
            }
          }
        }
      } else {
        // right now dragging over normal block,direction can be top / right / bottom / left
        // eslint-disable-next-line no-unsafe-optional-chaining
        const distance = getDistanceBetweenPointAndElement(e, currentBlock)
        const { height } = currentBlock.getBoundingClientRect()
        // right direction and left direction are more important on noraml block
        // bottom 50% -> direction is bottom of current block      top 50% -> direction is bottom of previous block,if there is no previous block,direction is top of current block
        if (distance.right < 0) {
          // direction is right
          if (getElementId(currentBlock) === getElementId(currentDraggingElement)) {
            return
          }
          changeIndicator('right', e, currentBlockId)
          return
        }
        if (distance.left < 0) {
          if (getElementId(currentBlock) === getElementId(currentDraggingElement)) {
            return
          }
          if (Number(currentBlock.getAttribute('data-level')) > 0) {
            return
          }
          changeIndicator('left', e, currentBlockId)
          return
        }
        if (distance.top / height < 0.5) {
          if (currentBlock === currentBlock.parentElement?.firstElementChild) {
            changeIndicator('top', e, currentBlockId)
            return
          } else {
            changeIndicator('bottom', e, previousBlockId)
            return
          }
        } else {
          changeIndicator('bottom', e, currentBlockId)
          return
        }
      }
    })

    const throttledHandleDragging = useRafFn(handleDragging)
    const throttledHandleSelecting = useRafFn(handleSelecting)

    const handleSelecting2 = useMemoizedFn((e: MouseEvent) => {
      try {
        e.preventDefault()
        throttledHandleSelecting(e)
      } catch (e) {
        console.error(e)
      }
    })
    const handleDragging2 = useMemoizedFn((e: MouseEvent) => {
      try {
        throttledHandleDragging(e)
      } catch (e) {
        console.log(e)
      }
      e.preventDefault()
    })

    const handleEndDragging = useMemoizedFn(() => {
      document.body.style.cursor = 'auto'
      document.removeEventListener('mousemove', handleDragging2)
      document.removeEventListener('mouseup', handleEndDragging)
      blockElementsRef.current.clear()
      currentDraggingRef.current = undefined
      try {
        handleDragDrop()
      } catch (e) {
        console.log(e)
      }
      setIsDragging(false)
      changeIndicator(null)
      endScroll()
    })

    const handleDividerDragEnd = useMemoizedFn(
      (previousColumnWidthRatio: number, previousColumnPath: Path, nextColumnWidthRatio: number, nextColumnPath: Path) => {
        setDragHandle(undefined)
        setIsDragging(false)
        Transforms.setNodes(
          editor,
          {
            ratio: previousColumnWidthRatio
          },
          {
            at: previousColumnPath
          }
        )
        Transforms.setNodes(
          editor,
          {
            ratio: nextColumnWidthRatio
          },
          {
            at: nextColumnPath
          }
        )
      }
    )

    const handleDividerDragStart = useMemoizedFn(() => {
      setIsDragging(true)
    })

    const handleMouseEnter = useMemoizedFn((e: MouseEvent, element) => {
      if (!isDragging && !overlayVisible) {
        currentDraggingRef.current = e.currentTarget as HTMLDivElement
        currentDraggingElementPath.current = ReactEditor.findPath(editor, element)
        const targetRect = e.currentTarget.getBoundingClientRect()
        setDragHandle({
          left: targetRect.x,
          top: targetRect.y,
          targetId: element.id,
          targetHeight: targetRect.height
        })
      }
    })

    const handleToggleMindmap = useMemoizedFn(() => {
      setMindmapVisible(!mindmapVisible)
    })

    const handleToggleOutline = useMemoizedFn(() => {
      setOutlineVisible(!outlineVisible)
    })

    const changeIndicator = useMemoizedFn((direction: string | null, e?: MouseEvent, id?: number) => {
      if (direction === null) {
        indicatorRef.current = undefined
      } else {
        indicatorRef.current = { direction, id }
      }
      if (id) {
        const block = elementsMap?.get(id)
        if (!block?.changeIndicator(direction, e)) {
          indicatorRef.current = undefined
        }
      }
      const previousIndicator = previousIndicatorRef.current
      if (previousIndicator.id === id && previousIndicator.direction === direction) {
        return
      } else {
        if (previousIndicator.id) {
          const prevBlock = elementsMap?.get(previousIndicator.id)
          prevBlock?.changeIndicator(null)
        }
        previousIndicatorRef.current = {
          direction,
          id
        }
      }
    })

    const { run: debouncedChangeEditorValue } = useDebounceFn(
      value => {
        setEditorValue(value)
      },
      { wait: 300 }
    )

    const handleEditorValueChange = useMemoizedFn(value => {
      debouncedChangeEditorValue(value)
    })

    return (
      <div className='reditor-editor'>
        <div ref={wrapperRef} className='reditor-wrapper'>
          <div role="inner-editor" className='reditor-inner-editor'>
            <InnerEditor
              titleMarginTop={titleMarginTop}
              scrollElement={wrapperRef.current}
              title={title}
              noteId={noteId}
              editor={editor}
              onRendered={handleInnerRendered}
              defaultValue={initial}
              onChange={handleEditorValueChange}
              onDividerDragEnd={handleDividerDragEnd}
              onDividerDragStart={handleDividerDragStart}
              onBlockMouseEnter={handleMouseEnter}
              onNestedListItem={handleNestedListItem}
              onToggleMindmap={handleToggleMindmap}
              onToggleOutline={handleToggleOutline}
            />
          </div>
        </div>
        <EditorOverlay
          onVisiblityChange={visibility => {
            setOverlayVisible(visibility)
            if (overlayVisible) {
              setDragHandle(undefined)
            }
          }}
          visible={overlayVisible}
          editor={editor}
          scrollElement={wrapperRef.current}
        />
        <div></div>
        <DragHandle onMouseDown={handleStartDragging} {...dragHandle} visible={!isDragging && !outlineVisible && !mindmapVisible} />
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, pointerEvents: 'none' }} role="dragging-layer">
          <div style={{ pointerEvents: 'auto', position: 'relative', zIndex: 0 }}>
            {isDragging && <div style={{ position: 'absolute', top: 0, left: 0 }} ref={draggingLayerRef}></div>}
          </div>
        </div>
      </div>
    )
  }
)
