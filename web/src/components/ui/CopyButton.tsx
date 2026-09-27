'use client';

import { useState } from 'react';
import { Button } from './Button';

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context): the text is on screen to copy by hand.
    }
  }

  return (
    <Button variant="secondary" onClick={copy} aria-live="polite">
      {copied ? 'Copied ✓' : label}
    </Button>
  );
}
