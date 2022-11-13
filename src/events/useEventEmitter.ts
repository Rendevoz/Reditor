import { GlobalScope } from '@/consts/jotaiScope'
import { eventEmitter } from '@/events/eventEmitter'
import { useAtomValue } from 'jotai'

const useEventEmitter = () => useAtomValue(eventEmitter, GlobalScope)
export default useEventEmitter
