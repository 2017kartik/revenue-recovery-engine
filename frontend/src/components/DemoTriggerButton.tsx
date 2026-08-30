'use client';

import React, { useState } from 'react';

const FIRST_NAMES = ["Bruce", "Clark", "Diana", "Barry", "Arthur", "Victor", "Hal", "Oliver", "Dinah", "John", "Tony", "Steve"];
const LAST_NAMES = ["Wayne", "Kent", "Prince", "Allen", "Curry", "Stone", "Jordan", "Queen", "Lance", "Constantine", "Stark", "Rogers"];
const FAILURE_REASONS = ["insufficient_funds", "bank_timeout", "expired_card"];

function getRandomName() {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${first} ${last}`;
}

function getRandomAmount() {
  return parseFloat((Math.random() * (2000 - 50) + 50).toFixed(2));
}

function getRandomReason() {
  return FAILURE_REASONS[Math.floor(Math.random() * FAILURE_REASONS.length)];
}

export default function DemoTriggerButton() {
  const [isInjecting, setIsInjecting] = useState(false);
  const [toast, setToast] = useState<{ message: string; isError: boolean } | null>(null);

  const handleInject = async () => {
    setIsInjecting(true);
    setToast(null);

    const payload = {
      customer_name: getRandomName(),
      amount: getRandomAmount(),
      failure_reason: getRandomReason(),
      // Adding a random test phone number so Twilio validation passes (if configured)
      customer_phone: `+155501${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`
    };

    try {
      const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const baseUrl = rawBaseUrl.replace(/\/$/, '');
      const endpoint = `${baseUrl}/api/webhooks/payment-failed`;
      
      console.log(`[DemoTrigger] Attempting to POST payload to ${endpoint}`, payload);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let errMessage = `HTTP ${res.status} ${res.statusText}`;
        try {
          const body = await res.json();
          if (body.error) errMessage = body.error;
        } catch (e) {
          // If we can't parse JSON, fallback to status text
        }
        throw new Error(errMessage);
      }
      
      console.log(`[DemoTrigger] Successfully injected payment for ${payload.customer_name}.`);
      setToast({ message: "Test payment injected! Waiting for next poll...", isError: false });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      console.error(`[DemoTrigger] Fetch error:`, err);
      // Show explicit error in the toast
      setToast({ message: `Error: ${err.message || String(err)}`, isError: true });
      setTimeout(() => setToast(null), 6000);
    } finally {
      setIsInjecting(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleInject}
        disabled={isInjecting}
        className={`
          inline-flex items-center gap-2 px-6 py-3 rounded-xl
          text-sm font-bold tracking-wide
          transition-all duration-200 active:scale-95
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-light
          disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
          bg-white text-navy border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 hover:bg-gray-50
        `}
      >
        {isInjecting ? (
          <>
            <svg className="animate-spin w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span>Injecting...</span>
          </>
        ) : (
          <>
            <span className="text-amber-500 text-lg leading-none">⚡</span>
            <span>Inject Failed Payment</span>
          </>
        )}
      </button>

      {toast && (
        <span className={`text-sm font-bold animate-in fade-in slide-in-from-left-4 ${toast.isError ? 'text-red-500' : 'text-emerald-500'}`}>
          {toast.message}
        </span>
      )}
    </div>
  );
}
