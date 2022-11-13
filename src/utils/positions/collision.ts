export const isRectsCollision = (rect1: DOMRect, rect2: DOMRect) => {
  if (rect1.left < rect2.right && rect1.right > rect2.left && rect1.top < rect2.bottom && rect1.bottom > rect2.top) return true
  else return false
}

