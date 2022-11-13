import { RenderElementProps, useFocused, useSelected } from 'slate-react'
import './index.less'
export const Spacer: React.FC<RenderElementProps> = props => {
  const selected = useSelected()
  const focused = useFocused()
  return (
    <span style={{ fontSize: `${selected && focused ? '15px' : '1em'}` }} className="spacer" {...props.attributes}>
      {props.children}
      <br></br>
    </span>
  )
}
