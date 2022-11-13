import { EditorEventHandler } from '@/events/editorEvent'
import useEventEmitter from '@/events/useEventEmitter'
import { FC, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CustomEditor } from '../../customTypes'
import { EditorSelectArea, SELECT_AREA_MAP } from '../../weakMaps'

interface OverlayProps {
  visible: boolean
  onVisiblityChange: (visiblity: boolean) => void
  editor: CustomEditor
  scrollElement?: HTMLElement | null
}
type Position = {
  left?: number
  top?: number
}
const EditorOverlay: FC<OverlayProps> = ({ visible, onVisiblityChange, editor, scrollElement }) => {
  const [position, setPosition] = useState<Position>()
  const [content, setContent] = useState<'dragHandleMenu' | 'emojiPicker'>()
  const [selectArea, setSelectArea] = useState<EditorSelectArea>()
  const emitter = useEventEmitter()
  const handler = new EditorEventHandler()
  handler.on('toggleOverlay', data => {
    if (data.content === 'selectArea') {
      const selectArea = SELECT_AREA_MAP.get(editor)
      if (selectArea && scrollElement) {
        const width = selectArea.right - selectArea.left
        const height = selectArea.bottom - selectArea.top
        const scrollElementRect = scrollElement.getBoundingClientRect()
        const left = scrollElementRect.left + selectArea.left
        const top = scrollElementRect.top + selectArea.top - scrollElement.scrollTop
        setSelectArea({
          width,
          height,
          left,
          top
        })
      } else {
        setSelectArea(undefined)
      }
      return
    }
    setPosition({ top: data.top, left: data.left })
    setContent(data.content)
    onVisiblityChange(true)
    console.log(data)
  })
  useEffect(() => {
    emitter.addListener('editor', handler)
    return () => {
      emitter.removeListener('editor', handler)
    }
  })
  const positions = (): string[] => {
    switch (content) {
      case 'dragHandleMenu':
        return ['left', 'right']
      case 'emojiPicker':
        return ['bottom']
      default:
        return ['left']
    }
  }
  // return (
  //   <AnimatePopover
  //     positions={positions()}
  //     padding={20}
  //     onClickOutside={() => onVisiblityChange(false)}
  //     visible={visible}
  //     content={
  //       <>
  //         {content === 'dragHandleMenu' && <DragHandleMenu />}
  //         {content === 'emojiPicker' && (
  //           <WithBorder>
  //             <EmojiPicker
  //               onPick={name => {
  //                 emitter.emit('editor', {
  //                   type: 'insertNode',
  //                   data: {
  //                     element: {
  //                       type: 'emoji',
  //                       name,
  //                       children: [{ text: '' }]
  //                     }
  //                   }
  //                 })
  //               }}
  //             />
  //           </WithBorder>
  //         )}
  //       </>
  //     }
  //   >
  //     <PosHelper {...position}></PosHelper>
  //   </AnimatePopover>
  // )
  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
    >
      {selectArea && <div style={{ ...selectArea, background: 'rgba(0,0,0,0.06)', position: 'absolute',borderRadius: 10 }}></div>}
    </div>,
    document.body,
    'editorOverlay'
  )
}


export default EditorOverlay
