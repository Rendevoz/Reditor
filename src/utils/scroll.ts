export const isScrollable = (element: HTMLElement) => {
  const hasScrollableContent = element.scrollHeight > element.clientHeight
  const overflowYStyle = window.getComputedStyle(element).overflowY
  const isOverflowHidden = overflowYStyle.indexOf('hidden') !== -1

  return hasScrollableContent && !isOverflowHidden
}
export const isFullyScrolled = (element: HTMLElement) => {
  if (element.scrollTop === 0) {
    return 'top'
  }
  if (Math.floor(element.scrollTop + element.offsetHeight) >= element.scrollHeight) {
    return 'bottom'
  }
  return false
}
export const getDistanceBetweenPointAndScrollableElement = (point: { x: number; y: number }, element: HTMLElement) => {
  const rect = element.getBoundingClientRect()
  return {
    left: point.x + element.scrollLeft - rect.left,
    top: point.y + element.scrollTop - rect.top
  }
}

export const getDistanceBetweenElementAndScrollableElement = (element: HTMLElement | DOMRect, scrollElement: HTMLElement) => {
  const eleRect = 'getBoundingClientRect' in element ? (element as HTMLElement).getBoundingClientRect() : (element as DOMRect)
  const scrollEleRect = scrollElement?.getBoundingClientRect()
  if (eleRect && scrollElement && scrollEleRect) {
    return {
      x: eleRect.x + scrollElement.scrollLeft - scrollEleRect.left,
      y: eleRect.y + scrollElement.scrollTop - scrollEleRect.top,
      left: eleRect.x + scrollElement.scrollLeft - scrollEleRect.left,
      top: eleRect.y + scrollElement.scrollTop - scrollEleRect.top,
      right: eleRect.x + scrollElement.scrollLeft - scrollEleRect.left + eleRect.width,
      bottom: eleRect.y + scrollElement.scrollTop - scrollEleRect.top + eleRect.height
    }
  }
}
