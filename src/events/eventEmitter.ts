import { atom } from 'jotai'
import { EditorEvent } from './editorEvent'
import EventHandler from './eventHandler'

export interface Event<T, K extends keyof T> {
  readonly type: K
  readonly data?: T[K]
}
export interface EventMap {
  editor: EditorEvent
}
export default class EventEmitter {
  private listeners: { [name: string]: Array<EventHandler<unknown>> } = {}

  public addListener<K extends keyof EventMap>(name: K, handler: EventHandler<unknown>) {
    if (!this.listeners[name]) {
      this.listeners[name] = []
    }

    this.listeners[name].push(handler)
  }

  public removeListener<K extends keyof EventMap>(name: K, handler: EventHandler<unknown>) {
    this.listeners[name] = this.listeners[name]?.filter(h => h !== handler)
  }

  public removeAllListeners<K extends keyof EventMap>(name: K) {
    this.listeners[name] = []
  }

  public emit<K extends keyof EventMap>(name: K, data?: EventMap[K]) {
    this.listeners[name]?.forEach(handler => {
      handler.handle(data)
    })
  }
}

export const eventEmitter = atom(new EventEmitter())
