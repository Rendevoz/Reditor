import Id from '@/utils/id'
import { Descendant, Editor, Path, Transforms } from 'slate'
import { CustomEditor } from '../types'
import { hasSelectedBlocks } from '../weakMaps'

const moveSingleElement = (
  editor: CustomEditor,
  currPath: Path,
  targetElement: Descendant,
  targetPath: Path,
  direction: string,
  isNested: boolean
) => {
  const currElement = Editor.node(editor, currPath)
  if (!currPath || !targetPath || !targetElement) return
  const currParentPath = Path.parent(currPath)
  // use pathRef to track path change
  const currPathRef = Editor.pathRef(editor, currPath)
  const currParentPathRef = Editor.pathRef(editor, currParentPath)
  const currParentElement = Editor.node(editor, currParentPath)
  if (direction === 'top' || direction === 'bottom') {
    if (
      (Path.isAfter(currPath, targetPath) || !Path.isSibling(currPath, targetPath)) &&
      direction === 'bottom' &&
      !Path.equals(currPath, targetPath)
    ) {
      targetPath = Path.next(targetPath)
    }
    if (targetElement.type === 'list-item' || targetElement.level) {
      let nextLevel
      if (isNested) {
        nextLevel = targetElement.level + 1 || 1
      } else {
        nextLevel = targetElement.level || undefined
      }
      Transforms.setNodes(
        editor,
        {
          level: nextLevel,
          type: currElement[0].type === 'paragraph' ? 'list-item' : currElement[0].type
        },
        { at: currPath }
      )
    }

    Transforms.moveNodes(editor, {
      at: currPath,
      to: targetPath
    })
  }
  if (direction === 'left' || direction === 'right') {
    const targetNode = Editor.node(editor, targetPath)
    const currNode = Editor.node(editor, currPath)
    if (targetNode[0].type !== 'column') {
      // we are dropping on normal block
      // first we need to create a column list at target path
      Transforms.removeNodes(editor, { at: targetPath })
      Transforms.insertNodes(
        editor,
        {
          type: 'columnList',
          id: Id.getId(),
          children:
            direction === 'left'
              ? [
                  {
                    type: 'column',
                    id: Id.getId(),
                    ratio: 0.5,
                    children: [currNode[0]]
                  },
                  {
                    type: 'column',
                    id: Id.getId(),
                    ratio: 0.5,
                    children: [targetNode[0]]
                  }
                ]
              : [
                  {
                    type: 'column',
                    id: Id.getId(),
                    ratio: 0.5,
                    children: [targetNode[0]]
                  },
                  {
                    type: 'column',
                    id: Id.getId(),
                    ratio: 0.5,
                    children: [currNode[0]]
                  }
                ]
        },
        {
          at: targetPath
        }
      )
      Transforms.removeNodes(editor, { at: currPath })
    } else {
      // left or right should insert new column at target path first
      // if there is only one block in the column and currPath = targetPath or targetPath = currPath + 1,do nothing
      const doesColumnOnlyHaveOneChild = Editor.node(editor, currParentPath)[0].children.length === 1
      if (
        doesColumnOnlyHaveOneChild &&
        (Path.equals(targetPath, currParentPath) ||
          (Path.equals(Path.hasPrevious(targetPath) ? Path.previous(targetPath) : targetPath, currParentPath) && direction !== 'right'))
      ) {
        return
      }
      if (direction === 'right') {
        targetPath = Path.next(targetPath)
      }
      Transforms.insertNodes(
        editor,
        {
          type: 'column',
          id: Id.getId(),
          children: []
        },
        { at: targetPath }
      )
      const targetColumnListId = Editor.node(editor, Path.parent(targetPath))[0].id
      Transforms.moveNodes(editor, {
        at: currPathRef.current,
        to: [...targetPath, 0]
      })
      // after insert new column,we need to recalculate the widths of all the columns
      // origin column blocks width ratio should * (1 - 1/n),new column width ratio = 1/n
      const targetColumnListPath = [editor.children.findIndex(i => i.id === targetColumnListId)]
      const targetColumnList = Editor.node(editor, targetColumnListPath)[0]
      const columnsLength = targetColumnList.children.length
      targetColumnList.children.forEach((i, idx) => {
        const columnPath = [...targetColumnListPath, idx]
        Transforms.setNodes(
          editor,
          {
            ratio: i.ratio ? i.ratio * (1 - 1 / columnsLength) : 1 / columnsLength
          },
          {
            at: columnPath
          }
        )
      })
    }
  }
  if (targetElement.type !== 'list-item' && targetElement.level === undefined) {
    Transforms.setNodes(
      editor,
      {
        level: undefined
      },
      {
        at: currPathRef.current
      }
    )
  }
  const afterMoveParentPath = currParentPathRef.unref()
  const afterMoveCurrParent = Editor.node(editor, afterMoveParentPath)
  const afterMoveCurrParentNode = afterMoveCurrParent[0]

  if (!Path.equals(currParentElement[1], []) && Editor.isEmpty(editor, Editor.node(editor, afterMoveCurrParent[1])[0])) {
    if (afterMoveCurrParentNode.type === 'column') {
      const currColumnListNode = Editor.node(editor, Path.parent(afterMoveCurrParent[1]))
      if (currColumnListNode[0].children.length === 2) {
        const siblingColumnNode = Array.from(currColumnListNode[0].children).find(i => i.id !== afterMoveCurrParentNode.id) as Descendant
        const items = Array.from(siblingColumnNode.children || [])
          .filter(i => i.type && i.type !== 'column')
          .map(i => i)
        Transforms.removeNodes(editor, { at: currColumnListNode[1] })
        Transforms.insertNodes(editor, items, { at: currColumnListNode[1] })
        return
      }
    }
    Transforms.removeNodes(editor, { at: afterMoveCurrParent[1] })
  }
}

export default moveSingleElement
