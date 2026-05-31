'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Email {
  id: string;
  thread_id: string;
  subject: string;
  sender: string;
  date: string;
  body: string;
  message_id_header?: string;
}

interface Draft {
  id?: string;
  email_id: string;
  thread_id?: string;
  recipient: string;
  subject: string;
  body: string;
  original_draft: string;
  final_sent?: string;
  status: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editedDraftText, setEditedDraftText] = useState('');
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contexts, setContexts] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    const email = localStorage.getItem('user_email');
    if (!email) {
      router.push('/');
    } else {
      setUserEmail(email);
      fetchEmails(email);
    }
  }, [router]);

  const fetchEmails = async (email: string) => {
    setLoadingEmails(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:8000/api/emails?email=${encodeURIComponent(email)}`);
      if (!res.ok) {
        throw new Error('Failed to fetch emails');
      }
      const data = await res.json();
      if (data.success) {
        setEmails(data.emails || []);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while loading your inbox.');
    } finally {
      setLoadingEmails(false);
    }
  };

  const handleSelectEmail = async (email: Email) => {
    setSelectedEmail(email);
    setDraft(null);
    setContexts([]);
    setEditedDraftText('');
    setSendSuccess(false);
    setFeedbackSubmitted(false);
    setFeedbackComment('');
    setFeedbackRating(5);
    setLoadingDraft(true);
    
    try {
      const res = await fetch('http://localhost:8000/api/emails/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: email.id,
          thread_id: email.thread_id,
          subject: email.subject,
          sender: email.sender,
          body: email.body,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to fetch or generate draft reply');
      }

      const data = await res.json();
      if (data.success && data.draft) {
        setDraft(data.draft);
        setEditedDraftText(data.draft.original_draft);
        setContexts(data.contexts || []);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load draft reply.');
    } finally {
      setLoadingDraft(false);
    }
  };

  const handleSend = async () => {
    if (!selectedEmail || !userEmail || !editedDraftText) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/api/emails/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_email: userEmail,
          email_id: selectedEmail.id,
          thread_id: selectedEmail.thread_id,
          recipient: selectedEmail.sender,
          subject: draft?.subject || `Re: ${selectedEmail.subject}`,
          body: editedDraftText,
          message_id_header: selectedEmail.message_id_header || '',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to send reply');
      }

      const data = await res.json();
      if (data.success) {
        setSendSuccess(true);
        // Refresh email list
        fetchEmails(userEmail);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to send reply email.');
    } finally {
      setSending(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!draft?.id) return;
    setSubmittingFeedback(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/api/emails/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          draft_id: draft.id,
          rating: feedbackRating,
          comment: feedbackComment,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit feedback');
      }

      const data = await res.json();
      if (data.success) {
        setFeedbackSubmitted(true);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to submit feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('user_email');
    router.push('/');
  };

  if (!mounted) return null;

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-slate-950 text-white font-sans">
      {/* Background Radial Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(99,102,241,0.08),transparent_40%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_90%,rgba(168,85,247,0.08),transparent_40%)]" />

      {/* Header bar */}
      <header className="relative flex h-16 w-full items-center justify-between border-b border-white/10 bg-slate-900/50 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-500/10">
            <svg className="h-4.5 w-4.5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0l-7.5-4.615a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-indigo-200 to-purple-200 bg-clip-text text-transparent">MailAgent Dashboard</span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">{userEmail}</span>
          <button
            onClick={handleSignOut}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold hover:bg-white/10 hover:border-red-500/30 hover:text-red-400 transition-all duration-300"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Left Side: Email List */}
        <section className="w-full border-r border-white/10 bg-slate-900/20 sm:w-1/3 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h2 className="text-sm font-semibold tracking-wider uppercase text-slate-400">Primary Inbox (Unread)</h2>
            <button
              onClick={() => userEmail && fetchEmails(userEmail)}
              className="rounded-md p-1.5 hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              title="Refresh Inbox"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {loadingEmails ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mb-3" />
                <span className="text-xs">Fetching messages...</span>
              </div>
            ) : emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 p-4 text-center">
                <svg className="h-10 w-10 text-slate-600 mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                </svg>
                <span className="text-sm font-semibold">Your inbox is clean!</span>
                <span className="text-xs mt-1">No unread primary emails found.</span>
              </div>
            ) : (
              emails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => handleSelectEmail(email)}
                  className={`w-full text-left p-4 hover:bg-white/[0.03] transition-colors flex flex-col gap-1 border-l-2 ${
                    selectedEmail?.id === email.id ? 'border-indigo-500 bg-indigo-500/5' : 'border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="font-semibold text-sm truncate max-w-[70%]">{email.sender.split(' <')[0]}</span>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">{email.date.split(', ')[1]?.substring(0, 11) || email.date.substring(0, 11)}</span>
                  </div>
                  <span className="text-xs font-medium text-slate-200 truncate">{email.subject}</span>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">{email.body}</p>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Right Side: Conversation / Drafting Panel */}
        <section className="flex-1 bg-slate-950 flex flex-col overflow-hidden">
          {error && (
            <div className="m-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="hover:text-white">✕</button>
            </div>
          )}

          {selectedEmail ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Email Content Panel */}
              <div className="p-6 border-b border-white/10 bg-slate-900/10 overflow-y-auto max-h-[35%] shrink-0">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h1 className="text-lg font-bold text-slate-100">{selectedEmail.subject}</h1>
                    <div className="flex flex-col gap-0.5 mt-2">
                      <span className="text-xs text-slate-300">From: <strong className="text-slate-200">{selectedEmail.sender}</strong></span>
                      <span className="text-[11px] text-slate-400 font-mono">{selectedEmail.date}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans border-t border-white/5 pt-4">
                  {selectedEmail.body}
                </div>
              </div>

              {/* Draft Generation Panel */}
              <div className="flex-1 p-6 flex flex-col overflow-y-auto">
                <h3 className="text-xs font-semibold tracking-wider uppercase text-indigo-400 mb-3">AI Agent Suggested Reply</h3>

                {loadingDraft ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <div className="relative flex h-10 w-10 items-center justify-center mb-3">
                      <div className="absolute inset-0 animate-ping rounded-full bg-indigo-500/20" />
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                    </div>
                    <span className="text-xs">Querying RAG database & generating draft...</span>
                  </div>
                ) : sendSuccess ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="h-14 w-14 rounded-full border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)] mb-4">
                      <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold text-emerald-400">Reply Sent Successfully!</h2>
                    <p className="text-xs text-slate-400 mt-2 max-w-sm">The email thread has been updated in Gmail and the unread tag removed.</p>

                    {/* RAG Feedback Widget */}
                    <div className="mt-8 w-full max-w-sm rounded-xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur-xl">
                      <h4 className="text-sm font-bold text-slate-200">How was this draft?</h4>
                      <p className="text-[11px] text-slate-400 mt-1">Help refine the similarity RAG models with rating feedback.</p>
                      
                      {!feedbackSubmitted ? (
                        <div className="mt-4 flex flex-col gap-4">
                          {/* Rating selector */}
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => setFeedbackRating(star)}
                                className={`text-xl hover:scale-110 transition-transform ${
                                  star <= feedbackRating ? 'text-amber-400' : 'text-slate-600'
                                }`}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                          {/* Comments textbox */}
                          <textarea
                            value={feedbackComment}
                            onChange={(e) => setFeedbackComment(e.target.value)}
                            placeholder="Add details on what went well or how to improve (optional)..."
                            className="w-full h-16 rounded-lg border border-white/10 bg-slate-900/50 p-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                          />
                          <button
                            onClick={handleSubmitFeedback}
                            disabled={submittingFeedback}
                            className="rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
                          >
                            {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400 text-center">
                          ✓ Thank you for your feedback!
                        </div>
                      )}
                    </div>
                  </div>
                ) : draft ? (
                  <div className="flex-1 flex flex-col gap-4">
                    {/* RAG Context Display */}
                    {contexts && contexts.length > 0 && (
                      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-2">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-1.769-1.019H16.5m0 0a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3h3m2.231 13.481A3 3 0 0 0 15 17.25m-1.769-1.019a3 3 0 0 0-1.731-1.019" />
                          </svg>
                          Matching Knowledge Base Context
                        </div>
                        <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
                          {contexts.map((ctx, idx) => (
                            <div key={idx} className="text-xs text-slate-300 border-l border-indigo-500/30 pl-2 py-0.5">
                              <span className="font-semibold text-indigo-300">Match {idx + 1} ({Math.round(ctx.similarity * 100)}% Match):</span>
                              <p className="mt-1 text-slate-400 whitespace-pre-wrap">{ctx.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Draft Edit Area */}
                    <textarea
                      value={editedDraftText}
                      onChange={(e) => setEditedDraftText(e.target.value)}
                      className="flex-1 w-full min-h-[180px] rounded-xl border border-white/10 bg-slate-900/40 p-4 text-sm leading-relaxed text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-sans shadow-inner resize-none"
                    />

                    {/* Actions panel */}
                    <div className="flex justify-end items-center gap-3">
                      <button
                        onClick={handleSend}
                        disabled={sending || !editedDraftText}
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 text-sm font-semibold shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all duration-300 disabled:opacity-50"
                      >
                        {sending ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                            </svg>
                            <span>Approve & Send</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                    Select an email to fetch or generate a draft.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/5 bg-white/[0.02] mb-3 text-slate-400">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0l-7.5-4.615a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>
              <span className="text-sm font-semibold">Select an email</span>
              <span className="text-xs mt-1 max-w-xs">Choose any email from the left sidebar to view details and generate suggested AI drafts.</span>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
