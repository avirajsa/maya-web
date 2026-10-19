"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Activity, ArrowUp, AudioLines, Bot, Check, Globe2, LogOut, Menu, Mic, Plus, Settings2, ShieldCheck, Sparkles, UserRound, Volume2, VolumeX, Wifi, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { checkMayaHealth, sendChatMessage } from "@/lib/maya-api";

type Message = { id: string; role: "user" | "assistant"; content: string };
type UserView = { id: string; email?: string };
const uuid = () => crypto.randomUUID();

export default function MayaApp() {
  const [user, setUser] = useState<UserView | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [voiceMode, setVoiceMode] = useState(false);
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) {
    try { supabaseRef.current = createClient(); } catch { /* Show configuration error in auth UI. */ }
  }
  const supabase = supabaseRef.current;

  useEffect(() => {
    setSessionId(uuid());
    if (!supabase) { setAuthReady(true); setNotice("Configure Supabase URL and publishable key in .env.local, then restart the dev server."); return; }
    supabase.auth.getSession().then(({ data }) => {
      const current = data.session?.user;
      setUser(current ? { id: current.id, email: current.email } : null);
      setAuthReady(true);
    }).catch(() => setAuthReady(true));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const current = session?.user;
      setUser(current ? { id: current.id, email: current.email } : null);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => { checkMayaHealth().then(() => setApiStatus("online")).catch(() => setApiStatus("offline")); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, sending]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthBusy(true); setNotice("");
    if (!supabase) { setNotice("Supabase is not configured. Add the values from .env.example to .env.local."); setAuthBusy(false); return; }
    try {
      const result = authMode === "signin"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (authMode === "signup" && !result.data.session) setNotice("Account created. Check your email to confirm it, then sign in.");
      else setNotice(authMode === "signup" ? "Account created." : "Signed in.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Authentication failed."); }
    finally { setAuthBusy(false); }
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setMessages([]); setNotice("");
  }

  async function submitMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault(); const message = draft.trim();
    if (!message || sending || !user || !supabase) return;
    setDraft(""); setMessages((old) => [...old, { id: uuid(), role: "user", content: message }]); setSending(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session expired. Sign in again.");
      const result = await sendChatMessage({ message, sessionId: sessionId || uuid(), accessToken: token, voiceMode });
      setSessionId(result.session_id);
      setMessages((old) => [...old, { id: uuid(), role: "assistant", content: result.response }]);
    } catch (error) {
      setMessages((old) => [...old, { id: uuid(), role: "assistant", content: `I couldn't complete that request. ${error instanceof Error ? error.message : "Please try again."}` }]);
    } finally { setSending(false); inputRef.current?.focus(); }
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submitMessage(); }
  }

  if (!authReady) return <main className="loading-screen"><div className="maya-orb"><Sparkles size={24} /></div><p>Starting Maya…</p></main>;

  if (!user) return <main className="auth-shell">
    <section className="auth-visual">
      <div className="brand"><div className="brand-mark"><Sparkles size={19} /></div><span>MAYA</span><span className="brand-caption">PERSONAL INTELLIGENCE</span></div>
      <div className="auth-hero"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-orb"><AudioLines size={46} strokeWidth={1.2}/></div><p className="eyebrow">YOUR SECOND MIND</p><h1>Make room<br/>for <em>what matters.</em></h1><p className="hero-copy">A personal intelligence layer for your ideas, your work, and the world around you.</p></div>
      <div className="auth-foot"><span><ShieldCheck size={14}/> Private by design</span><span>Built for curiosity.</span></div>
    </section>
    <section className="auth-panel"><div className="auth-mobile-brand"><div className="brand-mark"><Sparkles size={18}/></div><span>MAYA</span></div><div className="auth-form-wrap">
      <p className="eyebrow">{authMode === "signin" ? "WELCOME BACK" : "GET STARTED"}</p><h2>{authMode === "signin" ? "Your mind, continued." : "Meet your second mind."}</h2><p className="muted">{authMode === "signin" ? "Sign in to pick up where you left off." : "Create your Maya account to begin."}</p>
      <form className="auth-form" onSubmit={handleAuth}><label htmlFor="email">Email address</label><input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required/><label htmlFor="password">Password</label><input id="password" type="password" autoComplete={authMode === "signin" ? "current-password" : "new-password"} placeholder="At least 8 characters" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required/>{notice && <p className="form-message">{notice}</p>}<button className="primary-button auth-submit" type="submit" disabled={authBusy}>{authBusy ? "One moment…" : authMode === "signin" ? "Sign in" : "Create account"}<ArrowUp size={17}/></button></form>
      <p className="auth-switch">{authMode === "signin" ? "New to Maya?" : "Already have an account?"} <button onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setNotice(""); }}>{authMode === "signin" ? "Create an account" : "Sign in"}</button></p><p className="auth-legal">Authentication is handled by Supabase. Maya's API checks your access token and account permissions.</p>
    </div></section>
  </main>;

  return <main className="app-shell">
    {mobileSidebar && <button aria-label="Close navigation" className="mobile-scrim" onClick={() => setMobileSidebar(false)}/>}
    <aside className={`sidebar ${mobileSidebar ? "sidebar-open" : ""}`}>
      <div className="sidebar-top"><div className="brand"><div className="brand-mark"><Sparkles size={18}/></div><span>MAYA</span></div><button className="icon-button mobile-close" aria-label="Close menu" onClick={() => setMobileSidebar(false)}><X size={18}/></button></div>
      <button className="new-chat-button" onClick={() => { setMessages([]); setSessionId(uuid()); setDraft(""); setMobileSidebar(false); inputRef.current?.focus(); }}><Plus size={17}/> New conversation <span>⌘ K</span></button>
      <div className="nav-label">WORKSPACE</div><button className="nav-item active"><Bot size={17}/> Assistant <span className="nav-dot"/></button><div className="nav-item disabled"><Globe2 size={17}/> Web research <span className="soon-label">BACKEND</span></div><div className="nav-item disabled"><Activity size={17}/> Memory <span className="soon-label">BACKEND</span></div>
      <div className="sidebar-spacer"/><div className="sidebar-status"><div className="status-line"><span className={`status-light ${apiStatus}`}/><span>Maya API</span><span className="status-value">{apiStatus === "checking" ? "Checking" : apiStatus === "online" ? "Connected" : "Offline"}</span></div><div className="status-line"><ShieldCheck size={14}/><span>Authenticated session</span><Check size={14} className="status-check"/></div></div>
      <div className="profile-row"><div className="avatar"><UserRound size={17}/></div><div className="profile-copy"><strong>{user.email?.split("@")[0] || "Maya user"}</strong><span>{user.email || "Signed in"}</span></div><button className="icon-button" title="Sign out" aria-label="Sign out" onClick={signOut}><LogOut size={17}/></button></div>
    </aside>
    <section className="main-panel">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMobileSidebar(true)}><Menu size={19}/></button><div className="crumb">Workspace <span>/</span> <strong>Assistant</strong></div></div><div className="topbar-right"><div className="connection-pill"><span className={`status-light ${apiStatus}`}/>{apiStatus === "online" ? "API connected" : apiStatus === "checking" ? "Connecting…" : "API unavailable"}</div><button className={`voice-toggle ${voiceMode ? "voice-active" : ""}`} onClick={() => setVoiceMode((value) => !value)} title="Sends voice_mode to the backend with each message">{voiceMode ? <Volume2 size={16}/> : <VolumeX size={16}/>}<span>Voice {voiceMode ? "on" : "off"}</span><span className="toggle-track"><span/></span></button><button className="icon-button" title="Settings not yet connected" onClick={() => setNotice("Settings UI is not connected to a backend endpoint yet.")}><Settings2 size={18}/></button></div></header>
      <div className={`conversation ${messages.length ? "has-messages" : ""}`}>
        {messages.length === 0 ? <div className="welcome"><div className="welcome-orb"><div className="orb-core"><Sparkles size={27}/></div><span className="orb-ring ring-a"/><span className="orb-ring ring-b"/></div><p className="eyebrow welcome-eyebrow">YOUR PERSONAL INTELLIGENCE</p><h1>Good to have you<br/><em>back.</em></h1><p className="welcome-copy">I'm Maya. Think out loud, ask a hard question, or bring me something you want to understand.</p><div className="suggestions"><button onClick={() => setDraft("Explain a complex idea to me in simple terms.")}><span className="suggestion-icon"><Sparkles size={17}/></span><span><strong>Make something clear</strong><small>Explain a complex idea simply</small></span><ArrowUp size={15}/></button><button onClick={() => setDraft("Help me plan my priorities for today.")}><span className="suggestion-icon"><Activity size={17}/></span><span><strong>Think it through</strong><small>Plan, reason, and make decisions</small></span><ArrowUp size={15}/></button><button onClick={() => setDraft("Summarize this page: ")}><span className="suggestion-icon"><Globe2 size={17}/></span><span><strong>Understand a webpage</strong><small>Ask Maya to summarize a URL</small></span><ArrowUp size={15}/></button></div></div> : <div className="message-list">{messages.map((message) => <article className={`message ${message.role}`} key={message.id}><div className={`message-avatar ${message.role}`}>{message.role === "assistant" ? <Sparkles size={16}/> : <UserRound size={16}/>}</div><div className="message-content"><div className="message-author">{message.role === "assistant" ? "Maya" : "You"}<span>{message.role === "assistant" ? "PERSONAL INTELLIGENCE" : "YOU"}</span></div><p>{message.content}</p></div></article>)}{sending && <article className="message assistant"><div className="message-avatar assistant"><Sparkles size={16}/></div><div className="message-content"><div className="message-author">Maya <span>THINKING</span></div><div className="typing-indicator"><i/><i/><i/></div></div></article>}<div ref={bottomRef}/></div>}
      </div>
      <div className="composer-wrap">{notice && <div className="inline-notice"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss"><X size={14}/></button></div>}<form className="composer" onSubmit={submitMessage}><textarea ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onComposerKeyDown} placeholder="Ask Maya anything…" rows={1} aria-label="Message Maya"/><div className="composer-bottom"><div className="composer-hints"><span><span className="keycap">↵</span> to send</span><span><span className="keycap">⇧ ↵</span> new line</span>{voiceMode && <span className="voice-hint"><AudioLines size={13}/> Voice mode on</span>}</div><div className="composer-actions"><button type="button" className="icon-button composer-mic" title="Voice input is not implemented in this frontend yet" onClick={() => setNotice("Voice input is not implemented yet. Voice toggle sends voice_mode to the backend.")}><Mic size={17}/></button><button className="send-button" type="submit" disabled={!draft.trim() || sending} aria-label="Send message"><ArrowUp size={18}/></button></div></div></form><p className="disclaimer"><Wifi size={12}/> Maya can make mistakes. Verify important information.</p></div>
    </section>
  </main>;
}
