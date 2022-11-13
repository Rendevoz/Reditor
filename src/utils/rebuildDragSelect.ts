import { CustomEditor } from '../types'
import { SELECTED_BLOCKS_MAP } from '../weakMaps'

const rebuildDragSelect = (editor: CustomEditor,e: MouseEvent) => {
  const selectedBlocksMap = SELECTED_BLOCKS_MAP.get(editor)
  if (selectedBlocksMap) {
    if (selectedBlocksMap.size > 0) {
      // all common blocks,we need to rebuild the column & columnlist view
      const blocks = Array.from(selectedBlocksMap.values())
      const clonedBlocks = blocks.map(i => {
        if (!i) return
        const cloned = i?.cloneNode(true)
        const rect = i.getBoundingClientRect()
        cloned.style.position = 'absolute'
        cloned.style.width = `${rect.width}px`
        cloned.style.height = `${rect.height}px`
        cloned.style.left = `${rect.x - e.clientX}px`
        cloned.style.top = `${rect.y - e.clientY}px`
        return cloned
      })
      const containerEl = document.createElement('div')
      containerEl.style.position = 'fixed'
      containerEl.style.inset = '0px'
      clonedBlocks.forEach(i => containerEl.appendChild(i))
      return containerEl
    }
  }
}

export default rebuildDragSelect
