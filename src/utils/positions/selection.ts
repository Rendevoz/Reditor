export const getSelectionDirection = function () {
  const selection = window.getSelection()
  const range = document.createRange()
  range.setStart(selection.anchorNode, selection.anchorOffset)
  range.setEnd(selection.focusNode, selection.focusOffset)

  return range.collapsed ? 'backward' : 'forward'
}

let range: Range | null = null
export function saveSelection() {
  if (window.getSelection) {
    const sel = window.getSelection()
    if (sel && sel.getRangeAt && sel.rangeCount) {
      range = sel.getRangeAt(0)
    }
  }
  return null
}

export function restoreSelection() {
  if (range) {
    if (window.getSelection) {
      const sel = window.getSelection()
      if (!sel) return
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }
}
