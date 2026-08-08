import type { TraceEvent } from '../types/agent';

const TYPE_LABELS: Record<TraceEvent['type'], string> = {
  retrieve: 'Retrieve',
  tool: 'Tool',
  generate: 'Generate',
  guard: 'Guard',
  eval: 'Eval',
};

const TYPE_COLORS: Record<TraceEvent['type'], string> = {
  retrieve: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  tool: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
  generate: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  guard: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  eval: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

interface TracePanelProps {
  events: TraceEvent[];
  traceId?: string;
  spanId?: string;
}

export function TracePanel({ events, traceId, spanId }: TracePanelProps) {
  return (
    <aside className="w-full lg:w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col min-h-0">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Agent trace
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Steps emitted by the Agents SDK loop — correlate with Workers logs.
        </p>
        {traceId && (
          <div className="mt-2 text-xs font-mono text-gray-600 dark:text-gray-400 space-y-0.5">
            <div>
              <span className="text-gray-400 dark:text-gray-500">traceId </span>
              {traceId}
            </div>
            {spanId && (
              <div>
                <span className="text-gray-400 dark:text-gray-500">spanId </span>
                {spanId}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {events.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            Trace events appear here as the agent retrieves and generates.
          </p>
        )}

        {events.map((event, index) => (
          <div
            key={`${event.timestamp}-${index}`}
            className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/50"
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${TYPE_COLORS[event.type]}`}
              >
                {TYPE_LABELS[event.type]}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm text-gray-800 dark:text-gray-200">{event.summary}</p>
            {event.detail && Object.keys(event.detail).length > 0 && (
              <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(event.detail, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
