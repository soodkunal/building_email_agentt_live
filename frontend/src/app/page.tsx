'use client';

import { useState } from 'react';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/api/auth/url');
      if (!response.ok) {
        throw new Error('Failed to get auth URL');
      }
      const data = await response.json();
      if (data.url && data.code_verifier) {
        localStorage.setItem('google_code_verifier', data.code_verifier);
        window.location.href = data.url;
      } else {
        throw new Error('Authorization URL or verifier not found in API response');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 text-white">
      {/* Background Radial Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.15),transparent_40%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.15),transparent_40%)]" />

      {/* Glassmorphic Container */}
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center text-center">
          {/* Logo / Icon */}
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.2)] animate-pulse">
            <svg
              className="h-8 w-8 text-indigo-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0l-7.5-4.615a2.25 2.25 0 0 1-1.07-1.916V6.75"
              />
            </svg>
          </div>

          <h1 className="bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
            MailAgent
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Sleek AI-powered reply drafting for your Gmail inbox
          </p>

          <div className="my-8 h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Description */}
          <p className="mb-8 text-center text-sm leading-relaxed text-slate-300">
            Securely connect your Google Account to automatically draft intelligent context-aware replies for your primary inbox. Approve, edit, and send with a single click.
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="group flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 py-3.5 text-sm font-semibold transition-all duration-300 hover:border-indigo-500/30 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] disabled:opacity-50"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-xs text-slate-500">
        © 2026 MailAgent Inc. All rights reserved.
      </div>
    </main>
  );
}
