import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  LayoutDashboard, FileText, MessageSquare, Home, Wrench, Receipt, Tags, FolderOpen, History, Settings,
  PanelLeft, LogOut, Search, Bell, CalendarDays, ChevronRight, ArrowRight, ArrowLeft, Eye, EyeOff, ShieldAlert, KeyRound, Check, ShieldCheck,
} from 'lucide-react';
import { useStore, useLookups, money, type Route } from './store';
import { daysFrom, LSP_PHONE } from './data';
import { Btn, IBtn, Note, Avatar } from './ui';
import { needsMe, isOpen, expired, balanceOf, isOverdue, left, invoiceView } from './pages/lib';

export const NAV: { group: string; items: { id: Route; label: string; icon: typeof Home }[] }[] = [
  { group: 'Overview', items: [{ id: 'home', label: 'Home', icon: LayoutDashboard }, { id: 'quotes', label: 'Quotes to accept', icon: FileText }, { id: 'messages', label: 'Messages', icon: MessageSquare }] },
  { group: 'My Homes', items: [{ id: 'properties', label: 'Homes', icon: Home }] },
  { group: 'Work', items: [{ id: 'jobs', label: 'Jobs', icon: Wrench }, { id: 'services', label: 'Services & Prices', icon: Tags }] },
  { group: 'Money', items: [{ id: 'invoices', label: 'Invoices & Payments', icon: Receipt }] },
  { group: 'Records', items: [{ id: 'documents', label: 'Documents', icon: FolderOpen }, { id: 'activity', label: 'Activity', icon: History }, { id: 'account', label: 'Account & Team', icon: Settings }] },
];
export const LABEL: Record<Route, string> = Object.fromEntries(NAV.flatMap(g => g.items.map(i => [i.id, i.label]))) as Record<Route, string>;
const GROUP: Record<Route, string> = Object.fromEntries(NAV.flatMap(g => g.items.map(i => [i.id, g.group]))) as Record<Route, string>;

export function useCounts() {
  const s = useStore();
  return {
    quotes: s.jobs.filter(needsMe).length,
    messages: s.me.comms.filter(c => !s.me.team.some(m => m.name === c.by) && !s.read.includes(c.id)).length,
    jobs: s.jobs.filter(j => isOpen(j) && !needsMe(j)).length,
    invoices: s.invoices.filter(i => left(i) > 0 && !i.reportedPaid).length,
  } as Partial<Record<Route, number>>;
}

export function Sidebar({ onLogout }: { onLogout: () => void }) {
  const s = useStore(); const counts = useCounts();
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside className="sidebar" style={collapsed ? { width: 76 } : undefined} aria-label="Main menu">
      <div className="sb-logo">{!collapsed && <img src="images/logo.svg" alt="Landlord Service Plans" />}<button onClick={() => setCollapsed(c => !c)} aria-label="Collapse menu"><PanelLeft size={18} strokeWidth={1.8} /></button></div>
      <nav className="sb-nav">
        {NAV.map((g, gi) => <div key={g.group} className={gi > 0 ? 'sb-group' : undefined}>
          {g.items.map(it => { const Ic = it.icon; const n = counts[it.id]; return (
            <button key={it.id} className={`nav${s.route === it.id ? ' on' : ''}`} onClick={() => s.go(it.id)} title={it.label} aria-current={s.route === it.id ? 'page' : undefined}>
              <Ic size={20} strokeWidth={1.8} />{!collapsed && <span>{it.label}</span>}{!collapsed && !!n && <span className="count">{n}</span>}
            </button>); })}
        </div>)}
      </nav>
      <div className="sb-user"><Avatar name={s.user.name} photo={s.user.photo} size="md" />{!collapsed && <button className="stack" style={{ border: 0, background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }} onClick={() => s.go('account')}><b style={{ fontSize: 13, color: 'var(--text-primary)' }}>{s.user.name}</b><span className="caption">{s.user.role} · {s.me.name}</span></button>}<button onClick={onLogout} aria-label="Log out" title="Log out"><LogOut size={18} strokeWidth={1.8} /></button></div>
    </aside>
  );
}

export function PageHeader({ title, action, crumbs, back }: { title: ReactNode; action?: ReactNode; crumbs?: { label: string; onClick?: () => void }[]; back?: () => void }) {
  const s = useStore(); const L = useLookups();
  const [q, setQ] = useState('');
  const [pop, setPop] = useState<'' | 'bell' | 'cal'>('');
  const ref = useRef<HTMLDivElement>(null);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase(); if (t.length < 2) return [];
    const r: { label: string; sub: string; go: () => void }[] = [];
    s.properties.filter(x => (x.address + ' ' + x.area + ' ' + x.postcode + ' ' + (x.ref ?? '')).toLowerCase().includes(t)).forEach(x => r.push({ label: x.address, sub: `Home · ${x.postcode}${x.ref ? ' · ' + x.ref : ''}`, go: () => s.go('properties', x.id) }));
    s.jobs.filter(x => (x.title + ' ' + x.category + ' ' + (x.ref ?? '') + ' ' + (x.quoteNo ?? '')).toLowerCase().includes(t)).forEach(x => r.push({ label: x.title, sub: `${x.quoteNo && x.status === 'Quote sent' ? 'Quote ' + x.quoteNo : 'Job'} · ${L.prop(x.property)?.address ?? ''}`, go: () => s.go(needsMe(x) ? 'quotes' : 'jobs', x.id) }));
    s.invoices.filter(x => (x.id + ' ' + (x.site ?? '') + ' ' + (x.ref ?? '')).toLowerCase().includes(t)).forEach(x => r.push({ label: x.id, sub: 'Invoice · ' + (x.site ?? ''), go: () => s.go('invoices', x.id) }));
    return r.slice(0, 8);
  }, [q, s, L]);
  const b = balanceOf(s);
  const notes = [
    ...s.jobs.filter(needsMe).map(j => ({ t: `Quote to accept: ${j.title}`, d: `${money(j.price)} · valid until ${j.validUntil}`, r: 'quotes' as Route, id: j.id as string | null, tone: daysFrom(j.validUntil ?? '') <= 7 ? 'err' : 'warn' })),
    ...s.jobs.filter(expired).map(j => ({ t: `Quote ended: ${j.title}`, d: `${j.quoteNo} · ask LSP to update it`, r: 'quotes' as Route, id: j.id as string | null, tone: 'neutral' })),
    ...s.jobs.filter(j => j.status === 'Proof uploaded').map(j => ({ t: `Work finished: ${j.title}`, d: `${L.prop(j.property)?.address} · LSP is checking the photos`, r: 'jobs' as Route, id: j.id as string | null, tone: 'info' })),
    ...b.open.filter(isOverdue).map(i => ({ t: `Invoice overdue: ${i.id}`, d: invoiceView(i).label, r: 'invoices' as Route, id: i.id as string | null, tone: 'err' })),
    ...s.me.comms.filter(c => !s.me.team.some(m => m.name === c.by) && !s.read.includes(c.id)).map(c => ({ t: 'New message from LSP', d: c.subject ?? c.text.slice(0, 60), r: 'messages' as Route, id: null as string | null, tone: 'info' })),
  ];
  const cal = [
    ...s.jobs.filter(j => ['Assigned', 'In progress'].includes(j.status) && j.visit && daysFrom(j.visit) >= 0).map(j => ({ d: j.visit!.split(',')[0], t: `${j.title} · ${j.visit!.split(', ')[1] ?? ''}`, p: L.prop(j.property)?.address ?? '', r: 'jobs' as Route, id: j.id })),
    ...s.jobs.filter(needsMe).map(j => ({ d: j.validUntil!, t: `Quote ${j.quoteNo} ends`, p: j.title, r: 'quotes' as Route, id: j.id })),
    ...b.open.filter(i => !isOverdue(i)).map(i => ({ d: i.due, t: `Invoice ${i.id} due`, p: money(left(i)), r: 'invoices' as Route, id: i.id })),
  ].sort((a, c) => daysFrom(a.d) - daysFrom(c.d)).slice(0, 7);
  return (
    <header className="header">
      {back && <IBtn icon={<ArrowLeft size={18} />} onClick={back} label="Back" />}
      <div className="grow">
        {crumbs && <div className="crumbs">{crumbs.map((c, i) => <span key={i} className="flex" style={{ gap: 6 }}>{i > 0 && <ChevronRight size={12} />}{c.onClick ? <button onClick={c.onClick}>{c.label}</button> : <span>{c.label}</span>}</span>)}</div>}
        <h1 className="h1">{title}</h1>
      </div>
      <div className="searchwrap">
        <label className="search"><Search size={18} strokeWidth={1.8} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search homes, jobs, quotes, invoices" aria-label="Search everything" /><span className="kbd">⌘K</span></label>
        {results.length > 0 && <div className="pop" style={{ left: 0, right: 'auto', width: 300 }}>{results.map((r, i) => <button key={i} className="item click" style={{ padding: '8px 10px' }} onClick={() => { setQ(''); r.go(); }}><div className="stack"><b style={{ fontSize: 12.5 }}>{r.label}</b><span className="caption">{r.sub}</span></div></button>)}</div>}
      </div>
      <div style={{ position: 'relative' }} ref={ref}>
        <div className="flex" style={{ gap: 12 }}>
          <button className="ibtn" onClick={() => setPop(p => p === 'bell' ? '' : 'bell')} aria-label="Alerts"><Bell size={20} strokeWidth={1.8} />{notes.length > 0 && <span className="dot" />}</button>
          <button className="ibtn" onClick={() => setPop(p => p === 'cal' ? '' : 'cal')} aria-label="Calendar"><CalendarDays size={20} strokeWidth={1.8} /></button>
        </div>
        {pop === 'bell' && <div className="pop"><div className="flex between" style={{ padding: '2px 4px 6px' }}><b className="h2">Alerts</b><span className="caption">{notes.length} new</span></div>
          {notes.map((n, i) => <button key={i} className="item click" style={{ padding: '8px 10px' }} onClick={() => { setPop(''); s.go(n.r, n.id); }}><span className={`tile t-${n.tone}`} style={{ width: 30, height: 30 }}><Bell size={15} /></span><div className="stack grow"><b style={{ fontSize: 12.5 }}>{n.t}</b><span className="caption">{n.d}</span></div><ArrowRight size={14} color="#98A2B3" /></button>)}
          {!notes.length && <div className="empty">You are all caught up.</div>}</div>}
        {pop === 'cal' && <div className="pop"><b className="h2" style={{ padding: '2px 4px 6px' }}>Coming up</b>
          {cal.map((c, i) => { const [dd, mm] = c.d.split(' '); return <button key={i} className="item click" style={{ padding: '8px 10px' }} onClick={() => { setPop(''); s.go(c.r, c.id); }}><span className="datetile t-info" style={{ width: 40, height: 42 }}><b style={{ fontSize: 14 }}>{dd}</b><span>{(mm || '').toUpperCase()}</span></span><div className="stack"><b style={{ fontSize: 12.5 }}>{c.t}</b><span className="caption">{c.p}</span></div></button>; })}
          {!cal.length && <div className="empty">Nothing coming up.</div>}</div>}
      </div>
      {action}
    </header>
  );
}

export const crumbsFor = (r: Route, go: (r: Route) => void, extra?: string) => {
  const c: { label: string; onClick?: () => void }[] = [{ label: GROUP[r] }, { label: LABEL[r], onClick: extra ? () => go(r) : undefined }];
  if (extra) c.push({ label: extra });
  return c;
};

/** Sign in (email, password, then a 6-digit code). First time: set a password from the welcome email LSP sent from Outlook. */
export function Login({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<'in' | 'welcome' | 'code' | 'locked' | 'forgot'>('in');
  const [email, setEmail] = useState('claire@rosewood.co.uk');
  const [pw, setPw] = useState('••••••••••');
  const [np, setNp] = useState(''); const [np2, setNp2] = useState(''); const [agree, setAgree] = useState(false);
  const [show, setShow] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [wrong, setWrong] = useState(0);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const rules = [['At least 10 characters', np.length >= 10], ['A number', /\d/.test(np)], ['A capital letter', /[A-Z]/.test(np)], ['Both passwords match', !!np && np === np2]] as [string, boolean][];
  const verify = () => {
    if (code.join('') === '123456') return onDone();
    const w = wrong + 1; setWrong(w); setCode(['', '', '', '', '', '']); refs.current[0]?.focus();
    if (w >= 5) setStep('locked');
  };
  return (
    <div className="login">
      <aside className="login-art">
        <img src="images/logo-white.svg" alt="Landlord Service Plans" style={{ width: 250 }} />
        <h2 style={{ fontSize: 38, lineHeight: 1.18, fontWeight: 800, letterSpacing: '-.02em', marginTop: 64, maxWidth: 460 }}>Book the work, <span style={{ color: '#8FD64A' }}>we do the rest.</span></h2>
        <p style={{ color: '#C3CDE4', fontSize: 15, lineHeight: 1.6, maxWidth: 440 }}>Book repairs and safety checks for the homes you let, accept quotes, follow every job with photo proof and pay invoices, all in one place.</p>
        <div className="photo" style={{ height: 236, marginTop: 36, backgroundImage: 'url(images/home1.jpg)', boxShadow: '0 24px 48px rgba(0,0,0,.35)' }} />
        <div className="flex" style={{ gap: 24, marginTop: 'auto', color: '#DCE3F2', fontWeight: 600 }}><span className="flex"><FileText size={16} color="#8FD64A" />Quotes</span><span className="flex"><Wrench size={16} color="#8FD64A" />Jobs with photos</span><span className="flex"><Receipt size={16} color="#8FD64A" />Invoices</span></div>
      </aside>
      <main className="login-form"><div>
        {step === 'in' && <form onSubmit={e => { e.preventDefault(); setStep('code'); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0 }}>Welcome back</h1>
          <p className="small" style={{ margin: 0, fontSize: 14 }}>Letting agent portal. Sign in with your work email.</p>
          <label className="field"><span>Email</span><input className="input" value={email} onChange={e => setEmail(e.target.value)} type="email" /></label>
          <label className="field"><span>Password</span><div style={{ position: 'relative' }}><input className="input" value={pw} onChange={e => setPw(e.target.value)} type={show ? 'text' : 'password'} /><button type="button" onClick={() => setShow(v => !v)} aria-label="Show password" style={{ position: 'absolute', right: 10, top: 11, border: 0, background: 'none', color: '#667085' }}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
          <Btn type="submit">Sign in <ArrowRight size={18} /></Btn>
          <div className="flex between"><button type="button" className="link small" onClick={() => setStep('welcome')}>First time? Set your password</button><button type="button" className="link small" onClick={() => setStep('forgot')}>Forgot password?</button></div>
          <Note>LSP sets up your agency's account and sends the login email from Outlook. Your Admin can invite the rest of your team. You only see your agency's homes.</Note>
        </form>}
        {step === 'welcome' && <form onSubmit={e => { e.preventDefault(); setStep('code'); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="tile lg t-brand"><KeyRound size={22} /></span>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Set your password</h1>
          <p className="small" style={{ margin: 0, fontSize: 14 }}>You opened the link in your welcome email from LSP. Choose a password for <b style={{ color: '#0F1828' }}>{email}</b>.</p>
          <label className="field"><span>New password</span><input className="input" type="password" value={np} onChange={e => setNp(e.target.value)} /></label>
          <label className="field"><span>Type it again</span><input className="input" type="password" value={np2} onChange={e => setNp2(e.target.value)} /></label>
          <div className="col" style={{ gap: 6 }}>{rules.map(([t, ok]) => <span key={t} className="flex small" style={{ gap: 8, color: ok ? 'var(--ok)' : 'var(--text-tertiary)' }}><Check size={14} />{t}</span>)}</div>
          <label className="check" style={{ cursor: 'pointer' }}><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} /> I agree to the portal terms and LSP's privacy notice</label>
          <Btn type="submit" disabled={!rules.every(r => r[1]) || !agree}>Save and continue</Btn>
          <button type="button" className="btn ghost" onClick={() => setStep('in')}>Back to sign in</button>
        </form>}
        {step === 'forgot' && <form onSubmit={e => { e.preventDefault(); setStep('in'); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Reset your password</h1>
          <p className="small" style={{ margin: 0, fontSize: 14 }}>We'll email a reset link to the address LSP has for you.</p>
          <label className="field"><span>Email</span><input className="input" value={email} onChange={e => setEmail(e.target.value)} type="email" /></label>
          <Btn type="submit">Send reset link</Btn>
          <button type="button" className="btn ghost" onClick={() => setStep('in')}>Back to sign in</button>
        </form>}
        {step === 'code' && <form onSubmit={e => { e.preventDefault(); verify(); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="tile lg t-brand"><ShieldCheck size={22} /></span>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Enter your security code</h1>
          <p className="small" style={{ margin: 0, fontSize: 14 }}>We sent a 6-digit code to your phone ending in <b style={{ color: '#0F1828' }}>5001</b>. For this demo, use <b style={{ color: '#0F1828' }}>123456</b>.</p>
          <div className="otp">{code.map((c, i) => <input key={i} ref={el => { refs.current[i] = el; }} inputMode="numeric" maxLength={1} value={c} aria-label={`Digit ${i + 1}`} autoFocus={i === 0}
            onChange={e => { const v = e.target.value.replace(/\D/g, ''); const n = [...code]; n[i] = v; setCode(n); if (v && i < 5) refs.current[i + 1]?.focus(); }}
            onKeyDown={e => { if (e.key === 'Backspace' && !code[i] && i > 0) refs.current[i - 1]?.focus(); }} />)}</div>
          {wrong > 0 && <Note tone="err">That code is not right. {5 - wrong} {5 - wrong === 1 ? 'try' : 'tries'} left before the account locks.</Note>}
          <Btn type="submit" disabled={code.join('').length < 6}>Verify and continue</Btn>
          <button type="button" className="btn ghost" onClick={() => setStep('in')}>Back to sign in</button>
        </form>}
        {step === 'locked' && <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="tile lg t-err"><ShieldAlert size={22} /></span>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Your account is locked</h1>
          <p className="small" style={{ margin: 0, fontSize: 14 }}>There were too many wrong security codes, so the account is locked to keep it safe. Call LSP on {LSP_PHONE} to unlock it.</p>
          <Btn onClick={() => { setStep('in'); setWrong(0); }}>Back to sign in</Btn>
        </div>}
      </div></main>
    </div>
  );
}
