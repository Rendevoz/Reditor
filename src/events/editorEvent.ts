import { Event } from './eventEmitter'
import EventHandler from './eventHandler'

type Noop = () => void

export interface FoldHeadingEvent {
  headingId: number
  folded: boolean
}
export interface InsertNodeEvent {
  element: CustomElement
}
export interface SwitchTabEvent {
  tabId: string
}
export interface ElementPropertyChangeEvent {
  element: CustomElement
}
export interface IndicatorChangeEvent {
  direction?: string
  id?: number
}
export interface ToggleOverlayEvent {
  top?: number
  left?: number
  content?: string
}
export type OuterElementPropertyChangeEvent = ElementPropertyChangeEvent

export interface EditorEventMap {
  insertNode: InsertNodeEvent
  foldHeading: FoldHeadingEvent
  toggleThoughtLayer: Noop
  toggleOverlay: ToggleOverlayEvent
  openMenu: Noop
  compositionStart: Noop
  compositionEnd: Noop
  forceUpdate: Noop
  indicatorChange: IndicatorChangeEvent
  switchTab: SwitchTabEvent
  elementPropertyChange: ElementPropertyChangeEvent
  outerElementPropertyChange: OuterElementPropertyChangeEvent
}
export type EditorEvent = Event<EditorEventMap, keyof EditorEventMap>
export class EditorEventHandler extends EventHandler<EditorEventMap> {}
