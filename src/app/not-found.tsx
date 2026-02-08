'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center text-center max-w-md"
      >
        {/* 404 number */}
        <div 
          className="text-display-mobile md:text-display font-primary text-accent/30 mb-6"
          aria-hidden="true"
        >
          404
        </div>

        {/* Title */}
        <h1 className={cn(
          'font-primary text-h2-mobile md:text-h2',
          'text-text-primary',
          'mb-4'
        )}>
          This space is quiet.
        </h1>

        {/* Message */}
        <p className={cn(
          'font-secondary text-body-mobile md:text-body',
          'text-text-secondary',
          'mb-8'
        )}>
          The page you&apos;re looking for doesn&apos;t exist. 
          Perhaps it was never here, or it has moved on.
        </p>

        {/* Return button */}
        <Link href="/" passHref>
          <Button variant="primary">
            Return to the sanctuary
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
