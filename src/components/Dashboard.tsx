export function Dashboard() {
  return (
    <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-px bg-gray-800 overflow-hidden">
      <div className="bg-gray-950 flex items-center justify-center text-gray-400 text-sm">
        Graph Pane
      </div>
      <div className="bg-gray-950 flex items-center justify-center text-gray-400 text-sm">
        Event Stream
      </div>
      <div className="bg-gray-950 flex items-center justify-center text-gray-400 text-sm">
        Node Details
      </div>
      <div className="bg-gray-950 flex items-center justify-center text-gray-400 text-sm">
        Human Interaction
      </div>
    </div>
  )
}
