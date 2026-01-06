import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../ThemeToggle';
import { EducationalSidebar } from '../sidebar/EducationalSidebar';
import { SidebarSection } from '../sidebar/SidebarSection';
import { SidebarToggleButton } from '../sidebar/SidebarToggleButton';
import { sidebarSections } from '../../content/sidebar-sections';
import type { TechStackInfo } from '../../types/sidebar';

interface DemoLayoutProps {
  title: string;
  backTo?: string;
  techStack: TechStackInfo;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function DemoLayout({
  title,
  backTo = '/',
  techStack,
  children,
  footer
}: DemoLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      setIsSidebarCollapsed(saved === 'true');
    }
  }, []);

  // Save collapsed state to localStorage
  const handleToggleCollapse = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link
            to={backTo}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            ← Back
          </Link>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <SidebarToggleButton
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            isOpen={isSidebarOpen}
          />
          <ThemeToggle />
        </div>
      </header>

      {/* Main content + Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main content area */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Educational Sidebar */}
        <EducationalSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          techStack={techStack}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
        >
          {sidebarSections.map((section) => (
            <SidebarSection
              key={section.id}
              title={section.title}
              defaultOpen={section.defaultOpen}
            >
              <p>{section.content}</p>
              {section.links && section.links.length > 0 && (
                <div className="mt-3 space-y-1">
                  {section.links.map((link) => (
                    <div key={link.to}>
                      {link.external ? (
                        <a
                          href={link.to}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {link.text} ↗
                        </a>
                      ) : (
                        <Link
                          to={link.to}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                        >
                          {link.text}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SidebarSection>
          ))}
        </EducationalSidebar>
      </div>

      {/* Optional footer (e.g., chat input) */}
      {footer && footer}
    </div>
  );
}
