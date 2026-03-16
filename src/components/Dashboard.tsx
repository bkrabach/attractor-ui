import { Group, Panel, Separator } from 'react-resizable-panels'
import { GraphPane } from './GraphPane'
import { EventStream } from './EventStream'
import { NodeDetails } from './NodeDetails'
import { HumanInteraction } from './HumanInteraction'

export function Dashboard() {
  return (
    <Group orientation="vertical" className="flex-1">
      {/* Top row: GraphPane (55%) | EventStream (45%) */}
      <Panel defaultSize={55} minSize={20}>
        <Group orientation="horizontal">
          <Panel defaultSize={55} minSize={20}>
            <div className="h-full bg-gray-950">
              <GraphPane />
            </div>
          </Panel>
          <Separator className="bg-gray-700 hover:bg-blue-500 w-px" />
          <Panel defaultSize={45} minSize={20}>
            <div className="h-full bg-gray-950">
              <EventStream />
            </div>
          </Panel>
        </Group>
      </Panel>

      {/* Vertical resize handle */}
      <Separator className="bg-gray-700 hover:bg-blue-500 h-px" />

      {/* Bottom row: NodeDetails (55%) | HumanInteraction (45%) */}
      <Panel defaultSize={45} minSize={20}>
        <Group orientation="horizontal">
          <Panel defaultSize={55} minSize={20}>
            <div className="h-full bg-gray-950">
              <NodeDetails />
            </div>
          </Panel>
          <Separator className="bg-gray-700 hover:bg-blue-500 w-px" />
          <Panel defaultSize={45} minSize={20}>
            <div className="h-full bg-gray-950">
              <HumanInteraction />
            </div>
          </Panel>
        </Group>
      </Panel>
    </Group>
  )
}
