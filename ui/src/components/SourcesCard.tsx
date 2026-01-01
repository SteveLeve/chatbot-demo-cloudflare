import { useState } from 'react';
import type { DocumentSource } from '../types';

interface SourcesCardProps {
  sources: DocumentSource[];
}

export function SourcesCard({ sources }: SourcesCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 border-t border-gray-200 pt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left mb-2"
      >
        <h3 className="text-sm font-semibold text-gray-700">
          Sources ({sources.length})
        </h3>
        <span className="text-gray-500">{isOpen ? '▼' : '▶'}</span>
      </button>

      {isOpen && (
        <div className="space-y-2">
          {sources.map((source, idx) => (
            <div
              key={source.chunkId}
              className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors text-sm"
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-gray-900">{source.title}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {(source.similarity * 100).toFixed(1)}% match
                </div>
              </div>
              <p className="text-gray-700 text-xs line-clamp-3">
                {source.chunkText}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
