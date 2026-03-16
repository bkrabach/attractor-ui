import { Sidebar } from './components/Sidebar'
import { Dashboard } from './components/Dashboard'

function App() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-950 text-gray-100">
      <Sidebar />
      <Dashboard />
    </div>
  )
}

export default App
