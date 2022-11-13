import { useState } from 'react'
import { Reditor } from './Editor'
import '@icon-park/react/styles/index.less'
import './common.less'
import './global.less'
import Content from './components/base/Content'

function App() {

  return (
    <div style={{height: '100vh',width: '100vw',display: 'flex',flexDirection: 'column',alignItems: 'center'}}>
          <Reditor id = '1'/>
    </div>
  )
}

export default App
