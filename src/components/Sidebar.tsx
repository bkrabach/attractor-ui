export function Sidebar() {
  return (
    <aside className="w-64 min-w-48 bg-gray-900 flex flex-col h-full text-white">
      <header className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold">Attractor</h1>
      </header>
      <div className="flex-1 p-4">
        <p className="text-gray-400 text-sm">No pipelines yet.</p>
      </div>
      <div className="p-4 border-t border-gray-700">
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded">
          + New Pipeline
        </button>
      </div>
    </aside>
  )
}
