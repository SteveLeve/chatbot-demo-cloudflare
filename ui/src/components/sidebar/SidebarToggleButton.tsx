import type { SidebarToggleButtonProps } from '../../types/sidebar';

export function SidebarToggleButton({ onClick, isOpen }: SidebarToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
      aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      aria-expanded={isOpen}
    >
      <svg
        className="w-6 h-6 text-gray-600 dark:text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        {isOpen ? (
          /* X icon for close */
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        ) : (
          /* Info icon */
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        )}
      </svg>
    </button>
  );
}
