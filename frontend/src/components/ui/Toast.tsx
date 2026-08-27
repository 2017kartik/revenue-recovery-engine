'use client';

import React, { useEffect } from 'react';

// ── parseAIMessage ────────────────────────────────────────────────────────────
// Extracts the final SMS from AI-generated text.
export function parseAIMessage(rawText: string): { sms: string } {
  // Strategy 1: XML tags <sms>...</sms>
  const smsXml = rawText.match(/<sms>([\s\S]*?)<\/sms>/i);
  if (smsXml) {
    return { sms: smsXml[1].trim() };
  }

  // Strategy 2: Final SMS (handles asterisks, colons, dashes)
  const finalSmsMatch = rawText.match(/\*{0,2}Final SMS\*{0,2}[:\-\s]*([\s\S]*)/i);
  if (finalSmsMatch) {
    return { sms: finalSmsMatch[1].replace(/\*\*/g, '').trim() };
  }

  // Strategy 3: Fallback raw text
  return { sms: rawText.replace(/\*\*/g, '').trim() };
}

// ── Toast Component ───────────────────────────────────────────────────────────
// Auto-dismisses after 5 seconds via useEffect with empty dependency array [].
// The cleanup function clearTimeout prevents memory leaks on unmount.

interface ToastProps {
  message: string;
  title?: string;
  onClose: () => void;
}

export function Toast({ message, title, onClose }: ToastProps) {
  // useEffect with [] runs exactly once on mount and cleans up on unmount.
  // This is isolated from the parent's re-renders (every 1s countdown).
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer); // Prevents memory leaks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array: fire once on mount, never re-run

  const { sms } = parseAIMessage(message);

  return (
    <>
      {/* Backdrop — clicking outside the card closes the toast */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Toast card */}
      <div className="fixed bottom-6 right-6 max-w-md w-full bg-navy text-white shadow-2xl rounded-2xl p-6 z-50 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 text-primary">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            {title && <h4 className="text-base font-bold tracking-wide">{title}</h4>}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 flex-shrink-0"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3">
          <div className="bg-primary/20 border border-primary/30 p-4 rounded-xl">
            <span className="block text-[10px] text-primary uppercase tracking-widest font-bold mb-1.5">
              Sent Message
            </span>
            <p className="text-[15px] text-white leading-relaxed font-medium">
              {sms}
            </p>
          </div>
        </div>

      </div>
    </>
  );
}
