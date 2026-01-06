export interface SidebarSectionData {
  id: string;
  title: string;
  content: string | React.ReactNode;
  defaultOpen: boolean;
  links?: SidebarLink[];
}

export interface SidebarLink {
  text: string;
  to: string;
  external?: boolean;
}

export interface TechStackInfo {
  title: string;
  technologies: string[];
  description: string;
  githubUrl: string;
}

export interface EducationalSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  techStack: TechStackInfo;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export interface SidebarSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export interface SidebarToggleButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export interface TechStackFooterProps {
  stack: TechStackInfo;
}

export interface FaqQuestion {
  id: string;
  question: string;
  answer: string;
  relatedLinks?: Array<{ text: string; to: string; external?: boolean }>;
}

export interface FaqCategory {
  id: string;
  title: string;
  questions: FaqQuestion[];
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  learnMore?: Array<{ text: string; url: string }>;
}
