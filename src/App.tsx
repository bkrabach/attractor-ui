import { Sidebar } from './components/Sidebar'
import { Dashboard } from './components/Dashboard'

function App() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <Dashboard />
    </div>
  )
}

export default App
