import { EditorScope } from '@/jotai/jotaiScope'
import { atom, useAtom } from 'jotai'

const isSelectingAtom = atom(false)

const useIsSelecting = () => useAtom(isSelectingAtom, EditorScope)

export default useIsSelecting
