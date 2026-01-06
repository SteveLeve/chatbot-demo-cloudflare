import { useState, useId } from 'react';
import type { SidebarSectionProps } from '../../types/sidebar';

export function SidebarSection({
  title,
  defaultOpen = false,
  children,
  icon
}: SidebarSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset dark:focus:ring-blue-400"
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-gray-500 dark:text-gray-400" aria-hidden="true">{icon}</span>}
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {title}
          </h3>
        </div>
        <span className="text-gray-500 dark:text-gray-400 text-sm" aria-hidden="true">
          {isOpen ? '▼' : '▶'}
        </span>
      </button>

      {isOpen && (
        <div
          id={contentId}
          className="px-4 pb-4 text-sm text-gray-700 dark:text-gray-300 space-y-2"
          role="region"
        >
          {children}
        </div>
      )}
    </div>
  );
}
