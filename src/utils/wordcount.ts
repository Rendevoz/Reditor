import { Descendant, Node } from 'slate'
function strLen(str: string) {
  let count = 0
  for (let i = 0, len = str.length; i < len; i++) {
    count += str.charCodeAt(i) < 256 ? 1 : 2
  }
  return count
}
const wordCount = (descendants: Descendant[]) => {
  let count = 0
  descendants.forEach(d => {
    count += strLen(Node.string(d))
  })
  return count
}

export default wordCount