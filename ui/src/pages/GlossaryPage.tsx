import { Link } from 'react-router-dom';
import { DemoLayout } from '../components/layouts/DemoLayout';
import { glossaryTerms } from '../content/glossary-data';
import type { TechStackInfo } from '../types/sidebar';

const TECH_STACK: TechStackInfo = {
  title: 'Built with',
  technologies: ['Cloudflare Workers AI', 'Vectorize', 'D1', 'R2', 'React Router v7'],
  description: 'Demonstrating RAG patterns on the edge with Cloudflare',
  githubUrl: 'https://github.com/SteveLeve/chatbot-demo-cloudflare'
};

function GlossaryTermCard({
  term,
  definition,
  learnMore
}: {
  term: string;
  definition: string;
  learnMore?: Array<{ text: string; url: string }>;
}) {
  const termId = term.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <div
      id={termId}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 scroll-mt-20"
    >
      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
        {term}
      </h3>
      <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
        {definition}
      </p>

      {learnMore && learnMore.length > 0 && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Learn More
          </h4>
          <ul className="space-y-1">
            {learnMore.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {link.text} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function GlossaryPage() {
  // Group terms by first letter
  const termsByLetter = glossaryTerms.reduce((acc, term) => {
    const firstLetter = term.term[0].toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(term);
    return acc;
  }, {} as Record<string, typeof glossaryTerms>);

  const letters = Object.keys(termsByLetter).sort();

  return (
    <DemoLayout title="Glossary" techStack={TECH_STACK}>
      <div className="max-w-4xl mx-auto p-6">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          <Link to="/" className="hover:text-gray-900 dark:hover:text-gray-100">
            Home
          </Link>
          {' '}/{' '}
          <Link to="/demos/basic-rag" className="hover:text-gray-900 dark:hover:text-gray-100">
            Basic RAG Demo
          </Link>
          {' '}/{' '}
          <span className="text-gray-900 dark:text-gray-100">Glossary</span>
        </nav>

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Technical Glossary
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
            Key terms and concepts related to Retrieval-Augmented Generation and vector search.
          </p>
          <Link
            to="/demos/basic-rag"
            className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            Try the Interactive Demo
          </Link>
        </div>

        {/* Jump to letter navigation */}
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-8 sticky top-20 z-10">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Jump to Letter
          </h2>
          <div className="flex flex-wrap gap-2">
            {letters.map((letter) => (
              <a
                key={letter}
                href={`#letter-${letter.toLowerCase()}`}
                className="w-10 h-10 flex items-center justify-center text-sm font-semibold bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300"
              >
                {letter}
              </a>
            ))}
          </div>
        </div>

        {/* Terms grouped by letter */}
        <div className="space-y-12">
          {letters.map((letter) => (
            <section key={letter} id={`letter-${letter.toLowerCase()}`} className="scroll-mt-32">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6 pb-2 border-b-2 border-gray-200 dark:border-gray-700">
                {letter}
              </h2>
              <div className="space-y-4">
                {termsByLetter[letter].map((term) => (
                  <GlossaryTermCard
                    key={term.term}
                    term={term.term}
                    definition={term.definition}
                    learnMore={term.learnMore}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Ready to see these concepts in action?
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/demos/basic-rag"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors font-medium"
            >
              Try the Demo
            </Link>
            <Link
              to="/docs/faq"
              className="inline-block px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Read the FAQ
            </Link>
          </div>
        </div>
      </div>
    </DemoLayout>
  );
}
