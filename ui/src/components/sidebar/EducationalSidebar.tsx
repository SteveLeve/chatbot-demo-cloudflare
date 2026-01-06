import { useEffect, useRef, useState } from 'react';
import type { EducationalSidebarProps } from '../../types/sidebar';
import { TechStackFooter } from './TechStackFooter';

export function EducationalSidebar({
  isOpen,
  onClose,
  techStack,
  isCollapsed = false,
  onToggleCollapse,
  children
}: EducationalSidebarProps & { children?: React.ReactNode }) {
  const sidebarRef = useRef<HTMLElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Mobile viewport detection for modal-only behavior
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)');

    // Set initial value
    setIsMobile(mediaQuery.matches);

    // Listen for viewport changes
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Lock body scroll when mobile drawer is open (mobile only)
  useEffect(() => {
    // Only lock scroll on mobile where sidebar is a modal overlay
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isMobile]);

  // Focus management: auto-focus and return focus (mobile only)
  useEffect(() => {
    // Only manage focus on mobile where sidebar is a modal dialog
    if (isOpen && isMobile && sidebarRef.current) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Focus the first focusable element in the sidebar
      const firstFocusable = sidebarRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (firstFocusable) {
        firstFocusable.focus();
      }
    } else if (!isOpen && previousActiveElement.current) {
      // Return focus to the element that opened the drawer
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [isOpen, isMobile]);

  // Focus trap for mobile drawer (mobile only)
  useEffect(() => {
    // Only trap focus on mobile where sidebar is a modal dialog
    if (!isOpen || !isMobile || !sidebarRef.current) return;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !sidebarRef.current) return;

      const focusableElements = sidebarRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: if on first element, move to last
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        // Tab: if on last element, move to first
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleTabKey);
    return () => window.removeEventListener('keydown', handleTabKey);
  }, [isOpen, isMobile]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`
          fixed lg:static
          top-0 right-0 bottom-0
          w-full max-w-sm lg:max-w-none
          ${isCollapsed ? 'lg:w-12' : 'lg:w-80'}
          bg-white dark:bg-gray-800
          border-l border-gray-200 dark:border-gray-700
          z-50 lg:z-0
          flex flex-col
          transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          shadow-2xl lg:shadow-none
        `}
        role={isOpen && isMobile ? 'dialog' : undefined}
        aria-modal={isOpen && isMobile ? 'true' : undefined}
        aria-labelledby="sidebar-title"
        aria-label="Educational sidebar"
      >
        {/* Desktop collapse/expand toggle */}
        {onToggleCollapse && (
          <div className="hidden lg:flex items-center justify-center p-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={onToggleCollapse}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                {isCollapsed ? (
                  /* Expand icon (chevron left) */
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                ) : (
                  /* Collapse icon (chevron right) */
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                )}
              </svg>
            </button>
          </div>
        )}

        {/* Sidebar header (mobile only) */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 id="sidebar-title" className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Learn About RAG
          </h2>
          <button
            onClick={onClose}
            className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            aria-label="Close sidebar"
          >
            <svg
              className="w-6 h-6 text-gray-600 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable content - hidden when collapsed on desktop */}
        <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'hidden lg:hidden' : ''}`}>
          {children}
        </div>

        {/* Tech stack footer - hidden when collapsed on desktop */}
        {!isCollapsed && <TechStackFooter stack={techStack} />}
      </aside>
    </>
  );
}
