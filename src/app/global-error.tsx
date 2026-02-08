'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-bg-primary text-text-primary min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="font-primary text-h2 text-text-primary mb-4">
            Something went quietly wrong.
          </h1>
          <p className="font-secondary text-body text-text-secondary mb-8">
            We&apos;re experiencing some quiet technical difficulties.
          </p>
          <button
            onClick={reset}
            className="bg-accent text-bg-primary px-8 py-3 rounded-md font-secondary text-body-sm uppercase tracking-wider hover:bg-accent-hover transition-colors"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
