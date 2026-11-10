import { useRef, useState } from 'react';
import { Plus, Wrench, Clock, CheckCircle2, AlertTriangle, MessageSquare, FileText, Upload, ArrowRight, Receipt, Image as ImageIcon, CalendarDays, XCircle, KeyRound, Phone, ShieldCheck, Download, Flag, RotateCcw, FileCheck2 } from 'lucide-react';
import { useStore, useLookups, money } from '../store';
import { ME_NAME, LSP_PHONE, CATEGORIES, nowStamp, type Job, type Category, type Line } from '../data';
import { ActionCard, Btn, Card, Chip, DetailHead, Empty, Field, HSteps, KV, Kpi, Note, Select, Tabs, Text, Area, Timeline, FilterBar, applyFlt, useFlt, yearsOf, When, Reason, Modal } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { DONE_JOB, jobView, needsMe, expired, isOpen, STEPS, stepAt, adminName, JobReportModal, InvoiceModal, AskModal, invoiceView, homeType, jobInvoice, jobEvent, lspSays, sendMsg, DemoAnswer, JobIcon, liveHomes, lineSum, r2, downloadPdf } from './lib';

export function Jobs() {
  const s = useStore();
  if (s.detail?.startsWith('new')) return <BookJob preset={s.detail} />;
  if (s.detail && s.jobs.some(j => j.id === s.detail)) return <JobPage id={s.detail} />;
  return <JobList />;
}

/** The job table, used here and on each home page. Search, type of work and year. */
export function JobTable({ list: all, hideHome }: { list: Job[]; hideHome?: boolean }) {
  const s = useStore(); const L = useLookups(); const [f, setF] = useFlt();
  const list = applyFlt(all, f, { text: j => `${j.title} ${j.category} ${j.requestedBy ?? ''} ${j.ref ?? ''} ${j.quoteNo ?? ''} ${L.prop(j.property)?.address ?? ''} ${jobView(s, j).label}`, type: j => j.category, date: j => j.reported });
  return <>{all.length > 2 && <FilterBar f={f} set={setF} placeholder="Search jobs, order numbers, quotes" types={[...new Set(all.map(j => j.category))].sort()} typeLabel="All types of work" years={yearsOf(all, j => j.reported)} shown={list.length} total={all.length} />}
    <div className="tablewrap"><table className="t"><thead><tr><th>Job</th>{!hideHome && <th>Home</th>}<th>Requested</th><th>Price</th><th>Status</th><th /></tr></thead><tbody>
      {list.map(j => { const v = jobView(s, j); return <tr key={j.id} onClick={() => s.go('jobs', j.id)}>
        <td><span className="cell"><JobIcon j={j} /><span className="stack"><b className="strong">{j.title}</b><span className="caption">{j.category}{j.area ? ' · ' + j.area : ''} · {j.requestedBy ?? j.by}{j.ref ? ' · ' + j.ref : ''}</span></span></span></td>
        {!hideHome && <td>{L.prop(j.property)?.address}</td>}
        <td><When at={j.reported} /></td>
        <td>{j.price ? <span className="stack"><b>{money(j.price)}</b><span className="caption">{j.quoteNo}</span></span> : <span className="muted">Being priced</span>}</td>
        <td><Chip tone={v.tone}>{v.label}</Chip></td>
        <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>{needsMe(j) ? <Btn sm onClick={() => s.go('quotes', j.id)}>Review quote</Btn> : <ArrowRight size={16} color="#98A2B3" />}</td></tr>; })}
    </tbody></table>{!list.length && <Empty icon={<Wrench size={22} />}>No jobs here.</Empty>}</div></>;
}

function JobList() {
  const s = useStore(); const J = s.jobs;
  const [tab, setTab] = useState<'open' | 'quotes' | 'done' | 'all'>('open');
  const list = J.filter(j => tab === 'all' ? true : tab === 'quotes' ? needsMe(j) : tab === 'done' ? DONE_JOB.includes(j.status) : isOpen(j));
  const visits = J.filter(j => j.status === 'Assigned' && j.visit);
  return <>
    <PageHeader crumbs={crumbsFor('jobs', s.go)} title="Jobs" action={<Btn icon={<Plus size={18} />} onClick={() => s.go('jobs', 'new')}>Book a job</Btn>} />
    <div className="grid g4">
      <Kpi icon={<Wrench size={18} />} tone="info" label="Open jobs" value={J.filter(isOpen).length} caption="from request to done" active={tab === 'open'} onClick={() => setTab('open')} />
      <Kpi icon={<Clock size={18} />} tone="warn" label="Quotes to accept" value={J.filter(needsMe).length} caption="no work starts until you accept" active={tab === 'quotes'} onClick={() => setTab('quotes')} />
      <Kpi icon={<CalendarDays size={18} />} tone="brand" label="Visits booked" value={visits.length} caption={visits[0] ? `next ${visits[0].visit}` : 'none booked'} />
      <Kpi icon={<CheckCircle2 size={18} />} tone="ok" label="Done" value={J.filter(j => ['Approved', 'Invoiced'].includes(j.status)).length} caption="checked by LSP, with photos" active={tab === 'done'} onClick={() => setTab('done')} />
    </div>
    <Card title="Your jobs" sub="Book a job, accept the quote, and LSP books a checked contractor, checks the photos and sends the invoice." action={<Tabs value={tab} onChange={setTab} items={[{ id: 'open', label: 'Open' }, { id: 'quotes', label: 'Quotes to accept', count: J.filter(needsMe).length }, { id: 'done', label: 'Done' }, { id: 'all', label: 'All', count: J.length }]} />}>
      <JobTable list={list} />
    </Card>
  </>;
}

/* ---------------- book a job ---------------- */
function BookJob({ preset }: { preset: string }) {
  const s = useStore(); const L = useLookups();
  const [, pHome, pTitle] = preset.split('~');
  const homes = liveHomes(s);
  const first = L.prop(pHome) && !L.prop(pHome)!.archived ? L.prop(pHome)! : homes[0];
  const svc = pTitle ? decodeURIComponent(pTitle) : '';
  const [f, setF] = useState({ property: first?.id ?? '', title: svc, category: (svc ? guessCat(svc) : 'General') as Category, area: '', note: '', urgency: 'Routine', access: first?.keys ?? '', cName: first?.occupier?.name ?? '', cPhone: first?.occupier?.phone ?? '', preferred: '', ref: '', by: s.user.name });
  const [photos, setPhotos] = useState<string[]>([]); const ref = useRef<HTMLInputElement>(null);
  const p = L.prop(f.property);
  const pick = (id: string) => { const h = L.prop(id)!; setF({ ...f, property: id, access: h.keys, cName: h.occupier?.name ?? '', cPhone: h.occupier?.phone ?? '' }); };
  const okRef = !s.me.poRequired || f.ref.trim();
  if (!p) return <><PageHeader crumbs={crumbsFor('jobs', s.go, 'Book a job')} back={() => s.go('jobs')} title="Book a job" /><Card><Empty icon={<Wrench size={22} />}><span className="stack" style={{ alignItems: 'center', gap: 10 }}>Add a home first, then book jobs for it.<Btn sm icon={<Plus size={14} />} onClick={() => s.go('properties', 'add')}>Add a home</Btn></span></Empty></Card></>;
  const submit = () => {
    const id = 'J' + (Date.now() % 100000); const at = nowStamp();
    s.setJobs(js => [{ id, title: f.title.trim(), property: f.property, status: 'New', price: 0, urgent: f.urgency === 'Emergency', reported: at, by: f.by, requestedBy: f.by, admin: p.admin, category: f.category, note: f.note.trim() || undefined, area: f.area || undefined, access: f.access || undefined, photos, preferred: f.preferred || undefined, ref: f.ref.trim() || undefined, contact: f.cName ? { name: f.cName, phone: f.cPhone } : undefined,
      events: [{ at, by: f.by, text: `Requested from the letting agent portal${f.urgency !== 'Routine' ? ` as ${f.urgency.toLowerCase()}` : ''}${photos.length ? ` with ${photos.length} photo${photos.length > 1 ? 's' : ''}` : ''}${f.ref.trim() ? `, order ${f.ref.trim()}` : ''}` }] }, ...js]);
    s.log(`Booked a job: ${f.title.trim()} at ${p.address}`, 'Jobs');
    s.toast(`Sent to ${adminName(s, p.admin)} at LSP. You'll get a quote.`); s.go('jobs', id);
  };
  return <>
    <PageHeader crumbs={crumbsFor('jobs', s.go, 'Book a job')} back={() => s.go('jobs')} title="Book a job" />
    <div className="dgrid">
      <div className="col">
        <Card title="1 · What needs doing" sub="LSP checks it, sends you a quote and only books the work once you accept it.">
          <div className="grid g2">
            <Field label="Home"><Select value={f.property} onChange={pick} options={homes.map(h => ({ value: h.id, label: `${h.address}${h.ref ? ` (${h.ref})` : ''}` }))} /></Field>
            <Field label="Room or area"><Text value={f.area} onChange={v => setF({ ...f, area: v })} placeholder="e.g. Kitchen, bathroom, front door" /></Field>
          </div>
          <Field label="What is the job"><Text value={f.title} onChange={v => setF({ ...f, title: v, category: f.title ? f.category : guessCat(v) })} placeholder="e.g. Leaking tap, gas safety certificate, lock change" /></Field>
          <div className="grid g2">
            <Field label="Type of work"><Select value={f.category} onChange={v => setF({ ...f, category: v as Category })} options={CATEGORIES.map(x => ({ value: x, label: x }))} /></Field>
            <Field label="How urgent"><Select value={f.urgency} onChange={v => setF({ ...f, urgency: v })} options={[{ value: 'Routine', label: 'Routine · within 28 days' }, { value: 'Urgent', label: 'Urgent · within 7 days' }, { value: 'Emergency', label: 'Emergency · today (no heat, water, unsafe)' }]} /></Field>
          </div>
          {f.urgency === 'Emergency' && <Note tone="err">For an emergency, also call LSP now on {LSP_PHONE}. LSP can make the home safe before the quote is agreed.</Note>}
          <Field label="Details"><Area value={f.note} onChange={v => setF({ ...f, note: v })} placeholder="What the tenant told you, when it started, anything already tried" /></Field>
          <Field label="Photos or documents"><div className="flex wrap">{photos.map(x => <Chip key={x} tone="neutral" dot={false}>{x}</Chip>)}<Btn sm kind="outline" icon={<Upload size={14} />} onClick={() => ref.current?.click()}>Add photos</Btn></div></Field>
          <input ref={ref} type="file" accept="image/*,.pdf" multiple hidden aria-label="Photos" onChange={e => { const fs = Array.from(e.target.files ?? []); if (fs.length) setPhotos(ps => [...ps, ...fs.map(x => x.name.replace(/\.[^.]+$/, ''))]); e.target.value = ''; }} />
        </Card>
        <Card title="2 · Getting in" sub="The contractor uses this on the day. LSP tells the person living there when the visit is booked.">
          <Field label="Access and keys"><Text value={f.access} onChange={v => setF({ ...f, access: v })} /></Field>
          <div className="grid g2">
            <Field label="Who to call for access"><Text value={f.cName} onChange={v => setF({ ...f, cName: v })} placeholder="Tenant's name" /></Field>
            <Field label="Their phone"><Text value={f.cPhone} onChange={v => setF({ ...f, cPhone: v })} /></Field>
          </div>
          <Field label="Best days and times"><Text value={f.preferred} onChange={v => setF({ ...f, preferred: v })} placeholder="e.g. Weekdays after 10:00" /></Field>
        </Card>
        <Card title="3 · Your details">
          <div className="grid g2">
            <Field label={s.me.poRequired ? 'Your order number (needed)' : 'Your order number (optional)'} hint="Shown on the quote and the invoice."><Text value={f.ref} onChange={v => setF({ ...f, ref: v })} placeholder="e.g. PO-5540" /></Field>
            <Field label="Booked by"><Select value={f.by} onChange={v => setF({ ...f, by: v })} options={s.me.team.filter(m => m.status === 'Active' && m.role !== 'Accounts').map(m => ({ value: m.name, label: `${m.name} · ${m.role}` }))} /></Field>
          </div>
          <div className="flex" style={{ justifyContent: 'flex-end' }}><Btn kind="outline" onClick={() => s.go('jobs')}>Cancel</Btn><Btn icon={<Wrench size={16} />} disabled={!f.title.trim() || !okRef} onClick={submit}>Send to LSP for a quote</Btn></div>
        </Card>
      </div>
      <div className="col">
        <ActionCard title="What happens next" text={<span className="stack" style={{ gap: 8, fontWeight: 600 }}><span>1. {adminName(s, p.admin)} at LSP checks it and sends you a quote, usually within 1 working day.</span><span>2. You accept or decline the quote here. Nothing is booked until you accept.</span><span>3. LSP books a checked contractor and tells you the visit time.</span><span>4. The contractor does the work and uploads photos.</span><span>5. LSP checks the photos, then sends the invoice ({s.me.terms} to pay).</span></span>} />
        <Card title="Home"><div className="flex"><span className="photo" style={{ width: 72, height: 54, borderRadius: 10, flex: 'none', backgroundImage: `url(${p.photo})` }} /><div className="stack"><b>{p.address}</b><span className="caption">{homeType(p)} · {p.postcode}</span></div></div>
          <KV rows={[['Your ref', p.ref ?? '—'], ['Living there', p.occupier ? `${p.occupier.name} · ${p.occupier.phone}` : 'Empty']]} /></Card>
        <button className="btn ghost sm" onClick={() => s.go('services')}>See LSP's services and prices <ArrowRight size={14} /></button>
      </div>
    </div>
  </>;
}
export function guessCat(t: string): Category {
  const x = t.toLowerCase();
  if (/gas|eicr|electrical (safety|check)|epc|alarm|certificate|cp12|fire/.test(x)) return 'Safety check';
  if (/boiler|heating|radiator/.test(x)) return 'Heating';
  if (/tap|leak|sink|toilet|shower|pipe|drain|plumb/.test(x)) return 'Plumbing';
  if (/socket|light|fuse|wiring|electric|fan/.test(x)) return 'Electrical';
  if (/roof|gutter|tile/.test(x)) return 'Roofing';
  if (/lock|door|key|window/.test(x)) return 'Locks & doors';
  if (/damp|mould|condensation/.test(x)) return 'Damp';
  return 'General';
}

/* ---------------- what LSP does (prototype answers) ---------------- */
const CONTRACTOR_FOR: Record<Category, string> = { Plumbing: 'C4', Heating: 'C1', Electrical: 'C5', Roofing: 'C2', 'Locks & doors': 'C7', Damp: 'C6', 'Safety check': 'C5', General: 'C7' };
const nextNo = (list: string[], prefix: string, start: number) => `${prefix}${Math.max(start, ...list.map(x => +x.replace(/\D/g, '') || 0)) + 1}`;
function demoLines(j: Job): Line[] {
  if (j.category === 'Safety check') return [{ activity: 'Service', desc: `${j.title}, including the certificate`, qty: 1, rate: /gas/i.test(j.title) ? 85 : 180 }];
  return [{ activity: 'Call-out', desc: 'Attend site and assess the problem', qty: 1, rate: 60 }, { activity: 'Labour', desc: `${j.title} (hourly)`, qty: 2, rate: 45 }, { activity: 'Materials', desc: 'Parts and sundries', qty: 1, rate: 25 }];
}

/* ---------------- one job ---------------- */
function JobPage({ id }: { id: string }) {
  const s = useStore(); const L = useLookups(); const j = s.jobs.find(x => x.id === id)!;
  const p = L.prop(j.property)!; const c = L.contractor(j.contractor); const inv = jobInvoice(s, j);
  const [m, setM] = useState<'' | 'report' | 'inv' | 'ask' | 'cancel' | 'problem' | 'time' | 'requote'>('');
  const v = jobView(s, j); const done = DONE_JOB.includes(j.status); const lsp = adminName(s, j.admin);
  const ev = (text: string, patch: Partial<Job> = {}, by = ME_NAME) => jobEvent(s, id, text, patch, by);
  const paid = inv ? inv.paid >= inv.amount : false;
  const next = (() => {
    switch (j.status) {
      case 'New': return `${lsp} at LSP is checking it and will send you a quote, usually within 1 working day.`;
      case 'Quote sent': return expired(j) ? `Quote ${j.quoteNo} ended on ${j.validUntil}. Ask LSP to update it, then accept the new one.` : `Quote ${j.quoteNo}: ${money(j.price)}. Accept it by ${j.validUntil} so LSP can book the work.`;
      case 'Quote accepted': return `You accepted on ${j.acceptedAt}. LSP is booking a checked contractor and will tell you the visit time.`;
      case 'Assigned': return `${c?.name ?? 'The contractor'} visits on ${j.visit ?? 'a date LSP is confirming'}. ${j.contact ? `LSP has told ${j.contact.name}.` : ''}`;
      case 'In progress': return `${c?.name} is doing the work. They upload photos when it is finished.`;
      case 'Proof uploaded': return `${c?.name} has finished. LSP is checking the photos${j.category === 'Safety check' ? ' and the certificate' : ''}.`;
      case 'Sent back': return `LSP asked ${c?.name} to put something right before it is signed off.`;
      case 'Approved': return `Finished and checked by LSP. The invoice for ${money(j.price)} comes next (${s.me.terms} to pay).`;
      case 'Invoiced': return paid ? `Paid. Invoice ${inv?.id} is settled.` : `Invoice ${inv?.id}: ${money((inv?.amount ?? 0) - (inv?.paid ?? 0))} to pay by ${inv?.due}.`;
      default: return j.cancelled ? `You cancelled this request: ${j.cancelled}` : `You declined the quote: ${j.declined ?? 'no reason given'}.`;
    }
  })();
  const demo = (() => {
    switch (j.status) {
      case 'New': return <Btn sm kind="outline" onClick={() => { const lines = demoLines(j); const q = nextNo(s.jobs.map(x => x.quoteNo ?? ''), 'Q-', 2402); ev(`Quote ${q} sent: ${money(lineSum(lines))}, valid until 14 Nov 2026`, { status: 'Quote sent', lines, price: lineSum(lines), quoteNo: q, quoted: nowStamp(), validUntil: '14 Nov 2026' }, lsp); lspSays(s, `Quote ${q} · ${p.address}`, `Your quote for ${j.title} is ready to view: ${money(lineSum(lines))}.`); s.toast('LSP sent the quote'); }}>LSP sends the quote</Btn>;
      case 'Quote sent': return expired(j) ? <Btn sm kind="outline" onClick={() => { const q = `${j.quoteNo}-2`; ev(`Updated quote ${q} sent: ${money(j.price)}, valid until 14 Nov 2026`, { quoteNo: q, quoted: nowStamp(), validUntil: '14 Nov 2026' }, lsp); lspSays(s, `Updated quote ${q}`, `Here is the updated quote for ${j.title}, valid until 14 Nov 2026.`); s.toast('LSP sent an updated quote'); }}>LSP updates the quote</Btn> : null;
      case 'Quote accepted': { const cid = /gas|boiler/i.test(j.title) ? 'C1' : CONTRACTOR_FOR[j.category]; const cn = L.contractor(cid)?.name; return <Btn sm kind="outline" onClick={() => { ev(`${cn} booked for 20 Oct 2026 at 10:00${j.contact ? `. ${j.contact.name} told` : ''}`, { status: 'Assigned', contractor: cid, visit: '20 Oct 2026, 10:00' }, lsp); lspSays(s, `Visit booked · ${j.title}`, `${cn} will visit ${p.address} on 20 Oct 2026 at 10:00.`); s.toast('LSP booked the contractor'); }}>LSP books the contractor</Btn>; }
      case 'Assigned': return <Btn sm kind="outline" onClick={() => { ev('Work started', { status: 'In progress' }, c?.name ?? 'Contractor'); s.toast('Work started'); }}>Contractor starts the work</Btn>;
      case 'In progress': case 'Sent back': return <Btn sm kind="outline" onClick={() => { ev(j.status === 'Sent back' ? 'Put it right and uploaded new photos' : `Finished and uploaded 3 photos${j.category === 'Safety check' ? ' and the certificate' : ''}`, { status: 'Proof uploaded', proof: ['Before', 'After', j.category === 'Safety check' ? 'Certificate' : 'Close-up'], ...(j.category === 'Safety check' && !j.cert ? { cert: { name: j.title.replace(/ ?\(.*\)/, ''), file: `${j.title.split(' ')[0]}-${p.address.replace(/[ ,]+/g, '-')}.pdf`, expires: /gas/i.test(j.title) ? '15 Oct 2027' : '15 Oct 2031' } } : {}) }, c?.name ?? 'Contractor'); s.toast('Photos uploaded'); }}>Contractor uploads photos</Btn>;
      case 'Proof uploaded': return <><Btn sm kind="outline" onClick={() => { ev('Checked the photos. Work approved and record locked', { status: 'Approved' }, lsp); lspSays(s, `Work done · ${j.title}`, `${j.title} at ${p.address} is finished and checked. The invoice follows.`); s.toast('LSP approved the work'); }}>LSP approves the work</Btn><Btn sm kind="ghost" onClick={() => { ev('Sent back: the photos do not show the finished work clearly', { status: 'Sent back' }, lsp); s.toast('LSP sent it back to the contractor'); }}>LSP sends it back</Btn></>;
      case 'Approved': return <Btn sm kind="outline" onClick={() => { const no = nextNo(s.invoices.map(i => i.id), 'INV-', 1045); const ls = j.lines ?? []; s.setInvoices(is => [{ id: no, to: s.me.id, job: j.id, amount: j.price, paid: 0, terms: s.me.terms, issued: '15 Oct 2026', due: '14 Nov 2026', overdue: false, site: p.address, ref: j.ref, payments: [], items: ls.map(l => ({ activity: l.activity, desc: l.desc, qty: l.qty, rate: l.rate, amount: r2(l.qty * l.rate) })) }, ...is]); ev(`Invoice ${no} sent: ${money(j.price)}, due 14 Nov 2026`, { status: 'Invoiced', invoice: no }, lsp); lspSays(s, `Invoice ${no}`, `Invoice ${no} for ${j.title} is attached: ${money(j.price)}, due 14 Nov 2026.`); s.toast('LSP sent the invoice'); }}>LSP sends the invoice</Btn>;
      default: return j.issue && !j.issue.answer ? <Btn sm kind="outline" onClick={() => { const a = 'Sorry about that. We have asked the contractor to go back at no cost, and we will confirm the time.'; ev(`Answered the problem: ${a}`, { issue: { ...j.issue!, answer: a } }, lsp); lspSays(s, `Re: problem with ${j.title}`, a); s.toast('LSP answered'); }}>LSP answers the problem</Btn> : null;
    }
  })();
  return <>
    <PageHeader crumbs={crumbsFor('jobs', s.go, j.title)} back={() => s.go('jobs')} title={j.title}
      action={<div className="flex"><Btn kind="ghost" icon={<MessageSquare size={16} />} onClick={() => setM('ask')}>Message LSP</Btn>{(done || j.proof?.length) && j.status !== 'Declined' && <Btn kind="outline" icon={<FileText size={16} />} onClick={() => setM('report')}>Job report</Btn>}{needsMe(j) && <Btn icon={<CheckCircle2 size={16} />} onClick={() => s.go('quotes', id)}>Review quote</Btn>}</div>} />
    <DetailHead media={<JobIcon j={j} size={64} />} title={j.title}
      chips={<><Chip tone={v.tone}>{v.label}</Chip>{j.urgent && <Chip tone="err">Emergency</Chip>}<Chip tone="neutral" dot={false}>{j.category}</Chip>{j.ref && <Chip tone="brand" dot={false}>Order {j.ref}</Chip>}</>}
      meta={[['Home', p.address], ['Requested', j.reported], ['Booked by', j.requestedBy ?? j.by], ['LSP contact', lsp]]} />
    <Card><HSteps items={STEPS} at={stepAt(s, j)} stopped={j.status === 'Declined' ? (j.cancelled ? 'Cancelled' : 'Quote declined') : undefined} /></Card>
    <div className="dgrid">
      <div className="col">
        {(j.proof?.length || j.status === 'Proof uploaded') && <Card title="Photo proof" sub={j.status === 'Proof uploaded' ? 'Uploaded by the contractor. LSP is checking them.' : 'Checked by LSP and kept with the job.'}>
          <div className="photos">{(j.proof ?? []).map((x, i) => <div key={x + i} className="ph" style={{ backgroundImage: `url(images/home${(i % 3) + 1}.jpg)` }}><span>{x}</span></div>)}</div></Card>}
        {j.cert && <Card title="Certificate" sub={j.status === 'Proof uploaded' ? 'LSP is checking it.' : 'Checked by LSP. Also in Documents.'}><div className="lrow"><FileCheck2 size={18} color="var(--ok)" /><div className="stack grow"><b>{j.cert.name}</b><span className="caption">{j.cert.file}{j.cert.expires ? ` · valid until ${j.cert.expires}` : ''}</span></div><Btn sm kind="ghost" icon={<Download size={14} />} onClick={() => { s.log(`Downloaded ${j.cert!.name} for ${p.address}`, 'Documents'); downloadPdf(s, j.cert!.name); }}>Download</Btn></div></Card>}
        <Card title="What's needed"><p style={{ margin: 0, lineHeight: 1.6 }}>{j.note ?? 'No details given.'}</p>
          {j.photos?.length ? <div className="photos">{j.photos.map((x, i) => <div key={x} className="ph" style={{ backgroundImage: `url(images/home${((i + 1) % 3) + 1}.jpg)` }}><span>{x}</span></div>)}</div> : null}
          <KV rows={[['Room or area', j.area ?? '—'], ['Type of work', j.category], ['Best days and times', j.preferred ?? '—'], ['Your order number', j.ref ?? '—']]} /></Card>
        {j.quoteNo && <Card title={`Quote ${j.quoteNo}`} sub={`Sent ${j.quoted}${j.validUntil ? ' · valid until ' + j.validUntil : ''}${j.acceptedBy ? ` · accepted by ${j.acceptedBy} on ${j.acceptedAt}` : ''}`} action={<Btn sm kind="ghost" onClick={() => s.go('quotes', id)}>{needsMe(j) ? 'Review and accept' : 'View quote'}</Btn>}>
          <div className="flex between"><span className="label">Quote total</span><b style={{ fontSize: 18 }}>{money(j.price)}</b></div>
          <span className="caption">{j.lines?.length ?? 0} lines · prices LSP agreed for you. The invoice matches the quote unless you agree extra work.</span></Card>}
        {inv && <Card title="Invoice" sub={invoiceView(inv).label}><div className="lrow"><Receipt size={18} color="var(--text-brand)" /><div className="stack grow"><b>{inv.id}</b><span className="caption">{money(inv.amount)} · issued {inv.issued} · due {inv.due}</span></div><Chip tone={invoiceView(inv).tone}>{invoiceView(inv).label}</Chip><Btn sm kind="ghost" onClick={() => setM('inv')}>{inv.paid < inv.amount ? 'View and pay' : 'View'}</Btn></div></Card>}
        {j.issue && <Card title="Problem you raised" sub={j.issue.at}><p style={{ margin: 0 }}>{j.issue.text}</p>{j.issue.answer ? <Note tone="ok">LSP: {j.issue.answer}</Note> : <Note>LSP is looking into it and will reply in Messages.</Note>}</Card>}
        <Card title="Job history" sub="Every step, with the date and time."><Timeline items={[...j.events].reverse().map(e => ({ at: e.at, text: e.text, by: e.by }))} /></Card>
      </div>
      <div className="col">
        <ActionCard tone={needsMe(j) ? 'warn' : j.status === 'Declined' ? 'neutral' : done ? 'ok' : 'brand'} title={needsMe(j) ? 'Your next step' : done ? 'Where it is' : 'What happens next'} text={next}>
          {needsMe(j) && <Btn block icon={<CheckCircle2 size={16} />} onClick={() => s.go('quotes', id)}>Review and accept the quote</Btn>}
          {expired(j) && <Btn block icon={<RotateCcw size={16} />} onClick={() => setM('requote')}>Ask LSP to update the quote</Btn>}
          {j.status === 'Invoiced' && inv && !paid && <Btn block icon={<Receipt size={16} />} onClick={() => setM('inv')}>View and pay invoice</Btn>}
          {j.status === 'Assigned' && <Btn block kind="outline" icon={<CalendarDays size={16} />} onClick={() => setM('time')}>Ask for another visit time</Btn>}
          {['Approved', 'Invoiced'].includes(j.status) && !j.issue && <Btn block kind="outline" icon={<Flag size={16} />} onClick={() => setM('problem')}>Report a problem with the work</Btn>}
          {j.status === 'New' && <Btn block kind="ghost" icon={<XCircle size={16} />} onClick={() => setM('cancel')}>Cancel this request</Btn>}
          {j.status === 'Declined' && <Btn block kind="outline" icon={<Plus size={16} />} onClick={() => s.go('jobs', `new~${j.property}~${encodeURIComponent(j.title)}`)}>Book it again</Btn>}
        </ActionCard>
        {demo && <DemoAnswer>{demo}</DemoAnswer>}
        <Card title="Visit and access">
          <KV rows={[['Contractor', c ? `${c.name} · ${c.trade}` : 'LSP books one after you accept'], ['Visit', j.visit ?? 'Not booked yet'], ['Access', j.access ?? p.keys], ['Who to call', j.contact ? `${j.contact.name} · ${j.contact.phone}` : '—']]} />
          {c && <span className="caption"><ShieldCheck size={12} style={{ verticalAlign: -2 }} /> Checked by LSP: ID, insurance and trade certificates in date. LSP talks to the contractor for you.</span>}
        </Card>
        <Card title="Home"><button className="item click" style={{ padding: 0 }} onClick={() => s.go('properties', p.id)}><span className="photo" style={{ width: 72, height: 54, borderRadius: 10, flex: 'none', backgroundImage: `url(${p.photo})` }} /><div className="stack grow"><b>{p.address}</b><span className="caption">{homeType(p)} · {p.ref ?? p.postcode}</span></div><ArrowRight size={16} color="#98A2B3" /></button>
          <span className="caption"><KeyRound size={12} style={{ verticalAlign: -2 }} /> {p.keys}</span></Card>
        {j.urgent && isOpen(j) && <Note tone="err"><Phone size={13} style={{ verticalAlign: -2 }} /> Emergency: call LSP on {LSP_PHONE}.</Note>}
      </div>
    </div>
    {!j.photos?.length && !j.proof?.length && j.status === 'New' && <Card className="flat"><span className="flex small" style={{ gap: 8 }}><ImageIcon size={16} />Photos help LSP price it faster. Send them with “Message LSP”.</span></Card>}
    {m === 'report' && <JobReportModal j={j} onClose={() => setM('')} />}
    {m === 'inv' && inv && <InvoiceModal id={inv.id} onClose={() => setM('')} />}
    {m === 'ask' && <AskModal title="Message LSP about this job" about={`${j.title} at ${p.address}`} onClose={() => setM('')} onSent={t => ev(`Sent a message: ${t}`)} />}
    {m === 'time' && <AskModal title="Ask for another visit time" about={`New visit time · ${j.title}`} sub={`Booked for ${j.visit}. Say which days and times work. LSP rebooks and tells ${j.contact?.name ?? 'the tenant'}.`} onClose={() => setM('')} onSent={t => ev(`Asked for another visit time: ${t}`)} />}
    {m === 'requote' && <AskModal title="Ask LSP to update the quote" about={`Updated quote please · ${j.quoteNo}`} sub="LSP checks the prices are still right and sends a new quote with a new date." onClose={() => setM('')} onSent={t => ev(`Asked for an updated quote: ${t}`)} />}
    {m === 'cancel' && <Reason title="Cancel this request" sub="LSP stops working on it. Nothing is charged." cta="Cancel request" danger options={['Fixed already', 'The landlord will arrange it', 'Booked by mistake', 'Tenant has moved out']} onClose={() => setM('')} onDone={r => { ev(`Cancelled the request: ${r}`, { status: 'Declined', cancelled: r }); sendMsg(s, `Cancelled · ${j.title}`, `Please cancel ${j.title} at ${p.address}. Reason: ${r}`); s.toast('Request cancelled'); setM(''); }} />}
    {m === 'problem' && <ProblemModal onClose={() => setM('')} onSend={t => { ev(`Reported a problem with the work: ${t}`, { issue: { text: t, at: nowStamp() } }); sendMsg(s, `Problem with ${j.title}`, t); s.log(`Reported a problem with ${j.title}`, 'Jobs'); s.toast('Sent to LSP'); setM(''); }} />}
  </>;
}
function ProblemModal({ onClose, onSend }: { onClose: () => void; onSend: (t: string) => void }) {
  const [t, setT] = useState('');
  return <Modal title="Report a problem with the work" sub="LSP checks it with the contractor. If the work was not done properly, they put it right at no cost." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<Flag size={16} />} disabled={!t.trim()} onClick={() => onSend(t.trim())}>Send to LSP</Btn></>}>
    <Field label="What is wrong"><Area value={t} onChange={setT} placeholder="e.g. The tenant says the tap is still dripping" /></Field>
  </Modal>;
}
