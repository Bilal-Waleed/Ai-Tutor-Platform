import React, { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Highlight, themes } from 'prism-react-renderer';
import { Copy, Check } from 'lucide-react';
import { toast } from 'react-toastify';

const CodeBlock = memo(({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success('Code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4">
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 rounded-t-lg border border-gray-700">
        <span className="text-xs font-mono text-gray-400 uppercase">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
        >
          {copied ? (
            <>
              <Check size={14} />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <Highlight
        theme={themes.vsDark}
        code={value}
        language={language || 'text'}
      >
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={className}
            style={{
              ...style,
              margin: 0,
              borderRadius: '0 0 0.5rem 0.5rem',
              border: '1px solid #374151',
              borderTop: 'none',
              padding: '1rem',
              overflowX: 'auto',
            }}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                <span className="inline-block w-8 text-right mr-4 text-gray-600 select-none">
                  {i + 1}
                </span>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
});

CodeBlock.displayName = 'CodeBlock';

const MessageRenderer = memo(({ content }) => {
  return (
    <div className="relative group">      
      <div className="prose prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Headings
            h1: ({ node, ...props }) => (
              <h1 className="text-2xl font-bold mt-6 mb-4 text-white border-b border-gray-600 pb-2" {...props} />
            ),
            h2: ({ node, ...props }) => (
              <h2 className="text-xl font-bold mt-5 mb-3 text-white" {...props} />
            ),
            h3: ({ node, ...props }) => (
              <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-200" {...props} />
            ),
            h4: ({ node, ...props }) => (
              <h4 className="text-base font-semibold mt-3 mb-2 text-gray-300" {...props} />
            ),
            
            // Paragraphs
            p: ({ node, ...props }) => (
              <p className="mb-3 text-gray-200 leading-relaxed" {...props} />
            ),
            
            // Lists
            ul: ({ node, ...props }) => (
              <ul className="list-disc list-inside mb-3 space-y-1 text-gray-200" {...props} />
            ),
            ol: ({ node, ...props }) => (
              <ol className="list-decimal list-inside mb-3 space-y-1 text-gray-200" {...props} />
            ),
            li: ({ node, ...props }) => (
              <li className="ml-4 text-gray-200" {...props} />
            ),
            
            // Code blocks
            code: ({ node, inline, className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || '');
              const value = String(children).replace(/\n$/, '');
              
              if (!inline && match) {
                return <CodeBlock language={match[1]} value={value} />;
              }
              
              // Inline code
              return (
                <code
                  className="bg-gray-800 text-blue-400 px-1.5 py-0.5 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            },
            
            // Blockquotes
            blockquote: ({ node, ...props }) => (
              <blockquote
                className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-gray-800/50 text-gray-300 italic"
                {...props}
              />
            ),
            
            // Links
            a: ({ node, ...props }) => (
              <a
                className="text-blue-400 hover:text-blue-300 underline"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              />
            ),
            
            // Tables
            table: ({ node, ...props }) => (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border border-gray-700" {...props} />
              </div>
            ),
            thead: ({ node, ...props }) => (
              <thead className="bg-gray-800" {...props} />
            ),
            tbody: ({ node, ...props }) => (
              <tbody className="divide-y divide-gray-700" {...props} />
            ),
            tr: ({ node, ...props }) => (
              <tr className="border-b border-gray-700" {...props} />
            ),
            th: ({ node, ...props }) => (
              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-200" {...props} />
            ),
            td: ({ node, ...props }) => (
              <td className="px-4 py-2 text-sm text-gray-300" {...props} />
            ),
            
            // Horizontal rule
            hr: ({ node, ...props }) => (
              <hr className="my-6 border-gray-700" {...props} />
            ),
            
            // Strong/Bold
            strong: ({ node, ...props }) => (
              <strong className="font-bold text-white" {...props} />
            ),
            
            // Emphasis/Italic
            em: ({ node, ...props }) => (
              <em className="italic text-gray-200" {...props} />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
});

MessageRenderer.displayName = 'MessageRenderer';

export default MessageRenderer;

