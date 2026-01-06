import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DemoLayout } from '../components/layouts/DemoLayout';
import { faqCategories } from '../content/faq-data';
import type { TechStackInfo } from '../types/sidebar';

const TECH_STACK: TechStackInfo = {
  title: 'Built with',
  technologies: ['Cloudflare Workers AI', 'Vectorize', 'D1', 'R2', 'React Router v7'],
  description: 'Demonstrating RAG patterns on the edge with Cloudflare',
  githubUrl: 'https://github.com/SteveLeve/chatbot-demo-cloudflare'
};

function FaqQuestion({
  question,
  answer,
  relatedLinks,
  questionId
}: {
  question: string;
  answer: string;
  relatedLinks?: Array<{ text: string; to: string; external?: boolean }>;
  questionId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      id={questionId}
      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden scroll-mt-20"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between"
        aria-expanded={isOpen}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 pr-4">
          {question}
        </h3>
        <span className="text-gray-500 dark:text-gray-400 text-xl flex-shrink-0">
          {isOpen ? '−' : '+'}
        </span>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 bg-white dark:bg-gray-800">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {answer.split('\n\n').map((paragraph, idx) => {
              // Check if paragraph starts with ** for bold headings
              if (paragraph.startsWith('**')) {
                // Extract bold text between ** markers using regex
                const match = paragraph.match(/^\*\*([^*]+)\*\*(.*)$/);
                if (match) {
                  const [, boldText, remainingText] = match;
                  return (
                    <p key={idx} className="mb-3 text-gray-700 dark:text-gray-300">
                      <strong className="font-semibold text-gray-900 dark:text-gray-100">
                        {boldText}
                      </strong>
                      {remainingText}
                    </p>
                  );
                }
              }
              return (
                <p key={idx} className="mb-3 text-gray-700 dark:text-gray-300">
                  {paragraph}
                </p>
              );
            })}
          </div>

          {relatedLinks && relatedLinks.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Related Resources
              </h4>
              <ul className="space-y-1">
                {relatedLinks.map((link) => (
                  <li key={link.to}>
                    {link.external ? (
                      <a
                        href={link.to}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.text} ↗
                      </a>
                    ) : (
                      <Link
                        to={link.to}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {link.text}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FaqCategory({
  title,
  questions,
  categoryId
}: {
  title: string;
  questions: typeof faqCategories[0]['questions'];
  categoryId: string;
}) {
  return (
    <section id={categoryId} className="scroll-mt-20">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        {title}
      </h2>
      <div className="space-y-3 mb-8">
        {questions.map((q) => (
          <FaqQuestion
            key={q.id}
            question={q.question}
            answer={q.answer}
            relatedLinks={q.relatedLinks}
            questionId={q.id}
          />
        ))}
      </div>
    </section>
  );
}

export function FaqPage() {
  return (
    <DemoLayout title="Frequently Asked Questions" techStack={TECH_STACK}>
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
          <span className="text-gray-900 dark:text-gray-100">FAQ</span>
        </nav>

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
            Learn more about Retrieval-Augmented Generation, implementation details, and best practices.
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

        {/* Quick navigation */}
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-8">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Jump to Category
          </h2>
          <div className="flex flex-wrap gap-2">
            {faqCategories.map((category) => (
              <a
                key={category.id}
                href={`#${category.id}`}
                className="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:border-blue-500 dark:hover:border-blue-400 transition-colors text-gray-700 dark:text-gray-300"
              >
                {category.title}
              </a>
            ))}
          </div>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-8">
          {faqCategories.map((category) => (
            <FaqCategory
              key={category.id}
              title={category.title}
              questions={category.questions}
              categoryId={category.id}
            />
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Still have questions?
          </p>
          <Link
            to="/demos/basic-rag"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors font-medium"
          >
            Try the Demo
          </Link>
        </div>
      </div>
    </DemoLayout>
  );
}
