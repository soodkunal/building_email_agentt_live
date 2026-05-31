'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const callbackExecuted = useRef(false);

  useEffect(() => {
    // Only execute once (react dev double-mount check)
    if (callbackExecuted.current) return;
    
    const code = searchParams.get('code');
    if (!code) {
      setStatus('error');
      setErrorMessage('Authorization code is missing from redirect URL.');
      return;
    }

    callbackExecuted.current = true;

    const exchangeCode = async () => {
      try {
        const code_verifier = localStorage.getItem('google_code_verifier') || '';
        const res = await fetch('http://localhost:8000/api/auth/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, code_verifier }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || 'Failed to exchange authorization code');
        }

        const data = await res.json();
        if (data.success && data.email) {
          // Store user session in localStorage
          localStorage.setItem('user_email', data.email);
          setStatus('success');
          
          // Smooth transition to dashboard
          setTimeout(() => {
            router.push('/dashboard');
          }, 1500);
        } else {
          throw new Error('Authentication succeeded but returned invalid response data');
        }
      } catch (err: any) {
        console.error(err);
        setStatus('error');
        setErrorMessage(err.message || 'Failed to complete Google Sign In');
      }
    };

    exchangeCode();
  }, [searchParams, router]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 text-white">
      {/* Background Radial Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.15),transparent_50%)]" />

      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            {/* Pulsing loading ring */}
            <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-indigo-500/20" />
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
            </div>
            <h2 className="text-xl font-bold">Completing Google Login</h2>
            <p className="mt-2 text-sm text-slate-400">Exchanging credentials and establishing secure session...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            {/* Animated check circle */}
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-emerald-400 font-sans">Authorized Successfully</h2>
            <p className="mt-2 text-sm text-slate-400">Redirecting you to your inbox dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            {/* Cross circle */}
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-red-400 font-sans">Login Failed</h2>
            <p className="mt-2 text-sm text-slate-400">{errorMessage || 'An error occurred during authentication.'}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-6 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold hover:bg-indigo-500 transition-colors"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
