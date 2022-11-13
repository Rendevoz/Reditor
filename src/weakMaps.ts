import { Noop } from '@/common/types'
import { Position } from '@/types'
import { Element } from 'slate'
import { CustomEditor } from './types'

export interface ElementFunctions {
  selectBlock: Noop
  changeIndicator: (direction: string | null, e?: MouseEvent) => boolean
  collisionSelectBlock: Noop
  getElement: () => Element
}
export const ID_TO_ELEMENTS_MAP = new WeakMap<CustomEditor, Map<number, ElementFunctions>>()

export const SELECTED_ID_TO_ELEMENTS_SET = new WeakMap<CustomEditor, Map<number, ElementFunctions>>()

export interface EditorSelectArea {
  startPoint: Position
  endPoint: Position
  left: number
  top: number
  right: number
  bottom: number
}
export const SELECT_AREA_MAP = new WeakMap<CustomEditor, EditorSelectArea>()

export const SELECTED_BLOCKS_MAP = new WeakMap<CustomEditor, Map<number, HTMLElement | null>>()

export const hasSelectedBlocks = (editor: CustomEditor) => {
  const selectedBlocksMap = SELECTED_BLOCKS_MAP.get(editor)
  return selectedBlocksMap && selectedBlocksMap.size > 0
}
