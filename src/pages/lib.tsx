import { useState, type ReactNode } from 'react';
import { Download, Send, Eye, FileText, Image as ImageIcon, Landmark, Wrench, CreditCard, FlaskConical, CheckCircle2 } from 'lucide-react';
import { useStore, useLookups, money } from '../store';
import { ME_NAME, nowStamp, parseDate, daysFrom, type Job, type Line, type Invoice, type Property, type Tone, type Comm } from '../data';
import { Btn, Chip, Modal, Note, KV, Card, Empty, Field, Area, Text } from '../ui';

/* Shared pieces for the letting agent portal: what each status means to an agent, money maths, and the LSP paper templates.
   The agent never sees the contractor's cost, hours or LSP's margin: only the price on the quote and the invoice. */

export type S = ReturnType<typeof useStore>;
export const r2 = (n: number) => Math.round(n * 100) / 100;
export const num = (n: number) => n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const ddmm = (x: string) => { const t = parseDate(x); return `${String(t.getDate()).padStart(2, '0')}/${String(t.getMonth() + 1).padStart(2, '0')}/${t.getFullYear()}`; };
export const adminName = (s: S, id?: string) => s.staff.find(x => x.id === id)?.name ?? 'LSP';
export const myAdmin = (s: S) => s.staff.find(x => x.id === s.me.admin);
export const homeType = (p: Property) => p.type === 'HMO' ? `Shared house · ${p.rooms} rooms` : `${p.beds} bed ${p.type.toLowerCase()}`;
export const liveHomes = (s: S) => s.properties.filter(p => !p.archived);
export const lineSum = (ls?: Line[]) => r2((ls ?? []).reduce((a, l) => a + l.qty * l.rate, 0));
export const firstName = (n: string) => n.split(' ')[0];

/* ---------------- jobs, as the agent sees them ---------------- */
export const DONE_JOB = ['Approved', 'Invoiced', 'Declined'];
/** A quote past its "valid until" date. The agent asks LSP to update it. */
export const expired = (j: Job) => j.status === 'Quote sent' && !!j.validUntil && daysFrom(j.validUntil) < 0;
/** A quote waiting for the agent to accept or decline. */
export const needsMe = (j: Job) => j.status === 'Quote sent' && !expired(j);
export const isOpen = (j: Job) => !DONE_JOB.includes(j.status);
export function jobView(s: S, j: Job): { label: string; tone: Tone } {
  if (j.status === 'Quote sent') return expired(j) ? { label: 'Quote expired', tone: 'neutral' } : { label: 'Quote to accept', tone: 'warn' };
  if (j.status === 'Declined') return j.cancelled ? { label: 'Cancelled', tone: 'neutral' } : { label: 'Quote declined', tone: 'neutral' };
  if (j.status === 'Invoiced') { const i = s.invoices.find(x => x.id === j.invoice || x.jobs?.includes(j.id)); return i && i.paid >= i.amount ? { label: 'Paid', tone: 'ok' } : { label: 'Invoiced', tone: 'ok' }; }
  return ({
    New: { label: 'LSP is pricing it', tone: 'info' }, 'Quote accepted': { label: 'Booking a contractor', tone: 'info' }, Assigned: { label: 'Visit booked', tone: 'brand' },
    'In progress': { label: 'Work in progress', tone: 'brand' }, 'Proof uploaded': { label: 'LSP checking the work', tone: 'brand' }, 'Sent back': { label: 'Being put right', tone: 'warn' },
    Approved: { label: 'Done · invoice coming', tone: 'ok' },
  } as Record<string, { label: string; tone: Tone }>)[j.status] ?? { label: j.status, tone: 'neutral' };
}
export const STEPS = ['Requested', 'Quote sent', 'You accept', 'Contractor booked', 'Work in progress', 'Checked by LSP', 'Invoiced', 'Paid'];
export function stepAt(s: S, j: Job) {
  if (j.status === 'Invoiced') { const i = jobInvoice(s, j); return i && i.paid >= i.amount ? 8 : 7; }
  return ({ New: 1, 'Quote sent': 2, 'Quote accepted': 3, Assigned: 4, 'In progress': 4, 'Proof uploaded': 5, 'Sent back': 5, Approved: 6, Declined: j.cancelled ? 1 : 2 } as Record<string, number>)[j.status] ?? 1;
}
export const jobInvoice = (s: S, j: Job) => s.invoices.find(x => x.id === j.invoice || x.jobs?.includes(j.id));
/** Where a quote stands, for the quotes list. */
export function quoteView(j: Job): { label: string; tone: Tone } {
  if (j.status === 'Quote sent') return expired(j) ? { label: 'Expired', tone: 'neutral' } : { label: 'To accept', tone: 'warn' };
  if (j.status === 'Declined') return { label: j.cancelled ? 'Cancelled' : 'Declined', tone: 'neutral' };
  return { label: j.status === 'Invoiced' ? 'Accepted · invoiced' : 'Accepted', tone: 'ok' };
}
/** Add a line to a job's history (date, time and who). */
export function jobEvent(s: S, id: string, text: string, patch: Partial<Job> = {}, by = ME_NAME) {
  s.setJobs(js => js.map(x => x.id === id ? { ...x, ...patch, events: [...x.events, { at: nowStamp(), by, text }] } : x));
}

/* ---------------- money ---------------- */
export const left = (i: Invoice) => r2(i.amount - i.paid);
export const isOverdue = (i: Invoice) => left(i) > 0 && daysFrom(i.due) < 0;
/** The part of an invoice that belongs to one home (an invoice can cover jobs at several homes). */
export function homeShare(s: S, i: Invoice, p: Property) {
  const js = s.jobs.filter(j => j.id === i.job || i.jobs?.includes(j.id));
  if (!js.length) return i.site?.includes(p.address) ? 1 : 0;
  const all = js.reduce((a, j) => a + j.price, 0); return all ? js.filter(j => j.property === p.id).reduce((a, j) => a + j.price, 0) / all : 0;
}
export function invoiceView(i: Invoice): { label: string; tone: Tone } {
  if (left(i) <= 0) return { label: 'Paid', tone: 'ok' };
  if (i.reportedPaid) return { label: 'Payment sent · LSP checking', tone: 'info' };
  if (isOverdue(i)) return { label: `Overdue · ${money(left(i))}`, tone: 'err' };
  if (i.paid > 0) return { label: `Part-paid · ${money(left(i))} left`, tone: 'warn' };
  return { label: `To pay by ${i.due.replace(' 2026', '')}`, tone: 'warn' };
}
export function balanceOf(s: S) {
  const open = s.invoices.filter(i => left(i) > 0);
  const owed = r2(open.reduce((a, i) => a + left(i), 0));
  const overdue = r2(open.filter(isOverdue).reduce((a, i) => a + left(i), 0));
  const year = s.invoices.filter(i => i.issued.endsWith('2026'));
  const paidYear = r2(year.reduce((a, i) => a + i.paid, 0)); const billedYear = r2(year.reduce((a, i) => a + i.amount, 0));
  /** Accepted quotes that will be invoiced once the work is done. */
  const coming = r2(s.jobs.filter(j => ['Quote accepted', 'Assigned', 'In progress', 'Proof uploaded', 'Sent back', 'Approved'].includes(j.status)).reduce((a, j) => a + j.price, 0));
  return { owed, overdue, open, paidYear, billedYear, coming, nextDue: open.filter(i => !isOverdue(i)).sort((a, b) => daysFrom(a.due) - daysFrom(b.due))[0] };
}
/** Statement of account: every invoice and payment, oldest first, with a running balance. */
export function statementRows(s: S) {
  const rows: { at: string; what: string; ref: string; debit: number; credit: number; bal: number }[] = [];
  const items = [...s.invoices.map(i => ({ at: i.issued, what: `Invoice · ${i.site ?? ''}`, ref: i.id, debit: i.amount, credit: 0 })), ...s.invoices.flatMap(i => i.payments.map(p => ({ at: p.date, what: `Payment by ${p.how.toLowerCase()}`, ref: i.id, debit: 0, credit: p.amount })))]
    .sort((a, b) => parseDate(a.at).getTime() - parseDate(b.at).getTime() || b.debit - a.debit);
  let bal = 0; items.forEach(x => { bal = r2(bal + x.debit - x.credit); rows.push({ ...x, bal }); });
  return rows;
}

/* ---------------- messages ---------------- */
const comm = (by: string, subject: string, text: string, dir: 'in' | 'out'): Comm => ({ id: 'cm' + Date.now() + Math.round(Math.random() * 1000), at: nowStamp(), by, channel: dir === 'in' ? 'Portal' : 'Email', dir, subject, text });
/** The agent sends LSP a message. Saved in Messages with the date and time. */
export function sendMsg(s: S, subject: string, text: string) { s.setMe(a => ({ ...a, comms: [...a.comms, comm(ME_NAME, subject, text, 'in')] })); }
/** LSP's reply (prototype answers). */
export function lspSays(s: S, subject: string, text: string) { const c = comm(myAdmin(s)?.name ?? 'LSP', subject, text, 'out'); s.setMe(a => ({ ...a, comms: [...a.comms, c] })); }

/* ---------------- company details and the LSP paper template ---------------- */
export const COMPANY = {
  name: 'Landlord Service Plans Limited', address: ['1 Upper Street', 'London N1 0PQ'], email: 'accounts@lsp.co.uk',
  reg: 'Company Registration No. 13940065', bank: ['Sort Code: 04-03-70', 'Account No.: 45338201'],
};
/** Opens the browser's print dialog for the document only (Save as PDF). */
export function downloadPdf(s: S, name: string) {
  s.toast(`${name} ready. Choose "Save as PDF" to download.`);
  document.body.classList.add('printdoc');
  setTimeout(() => { try { window.print(); } catch { /* preview frames may block printing */ } document.body.classList.remove('printdoc'); }, 60);
}
export function DocSheet({ kind, to, meta, site, lines, foot, stamp, children }: {
  kind: string; to: { label: string; rows: string[] }; meta: [string, string][]; site?: string; lines?: Line[];
  foot?: [string, string][]; stamp?: { text: string; tone: 'ok' | 'info' | 'warn' }; children?: ReactNode;
}) {
  const total = lines ? lineSum(lines) : 0;
  return <div className="docwrap"><div className="paper">
    <div className="doc-h">
      <div className="stack" style={{ gap: 2 }}><b className="doc-co">{COMPANY.name}</b>{COMPANY.address.map(a => <span key={a}>{a}</span>)}<span>{COMPANY.email}</span><span className="doc-reg">{COMPANY.reg}</span></div>
      <img src="images/logo.svg" alt="Landlord Service Plans" className="doc-logo" />
    </div>
    <div className="doc-title">{kind}{stamp && <span className={`doc-stamp s-${stamp.tone}`}>{stamp.text}</span>}</div>
    <div className="doc-top">
      <div className="stack" style={{ gap: 2 }}><span className="doc-lab">{to.label}</span>{to.rows.filter(Boolean).map((r, i) => <span key={i} className={i === 0 ? 'strong' : ''}>{r}</span>)}
        {site && <><span className="doc-lab" style={{ marginTop: 14 }}>Site address</span><span>{site}</span></>}</div>
      <div className="doc-meta">{meta.map(([k, v]) => <div key={k}><span className="doc-lab">{k}</span><span>{v}</span></div>)}</div>
    </div>
    {lines && <>
      <table className="doc-t"><thead><tr><th>Product or service</th><th>Description</th><th className="r">Qty</th><th className="r">Rate</th><th className="r">Amount</th></tr></thead>
        <tbody>{lines.map((l, i) => <tr key={i}><td>{l.activity}</td><td>{l.desc}</td><td className="r">{l.qty}</td><td className="r">{num(l.rate)}</td><td className="r">{num(r2(l.qty * l.rate))}</td></tr>)}</tbody></table>
      <div className="doc-tot">{(foot ?? [['Total', '£' + num(total)]]).map(([k, v], i, a) => <div key={k} className={i === a.length - 1 ? 'big' : ''}><span>{k}</span><b>{v}</b></div>)}</div>
    </>}
    {children}
    <div className="doc-f"><div className="stack" style={{ gap: 2 }}><span>{COMPANY.name}</span>{COMPANY.bank.map(b => <span key={b}>{b}</span>)}</div><span>Page 1 of 1</span></div>
  </div></div>;
}
const billTo = (s: S) => [s.me.billing.name, s.me.billing.address, s.me.billing.email];

/** The quote on LSP paper, as the agent sees it. */
export function QuoteSheet({ j }: { j: Job }) {
  const s = useStore(); const L = useLookups(); const p = L.prop(j.property);
  const st = quoteView(j);
  return <DocSheet kind="QUOTE" to={{ label: 'Quote to', rows: [s.me.name, ...billTo(s).slice(1)] }} site={p ? `${p.address}, ${p.area} ${p.postcode}` : ''}
    meta={[['Quote', j.quoteNo ?? '—'], ['Date', j.quoted ? ddmm(j.quoted) : '—'], ['Valid until', j.validUntil ? ddmm(j.validUntil) : '—'], ...(j.ref ? [['Your order no.', j.ref] as [string, string]] : []), ...(j.acceptedBy ? [['Accepted by', `${j.acceptedBy}, ${j.acceptedAt?.split(',')[0]}`] as [string, string]] : [])]}
    lines={j.lines} stamp={st.label === 'To accept' ? { text: 'FOR APPROVAL', tone: 'warn' } : st.tone === 'ok' ? { text: 'ACCEPTED', tone: 'ok' } : { text: st.label.toUpperCase(), tone: 'info' }}>
    {j.quoteNote && <p className="doc-note">{j.quoteNote}</p>}
    <p className="doc-note">Payment terms: {s.me.terms} from the invoice date. The invoice is sent after the work is done and checked by LSP.</p>
  </DocSheet>;
}

/** The invoice as the agent sees it: the LSP paper, plus how to pay (card or bank transfer). */
export function InvoiceModal({ id, onClose }: { id: string; onClose: () => void }) {
  const s = useStore(); const i = s.invoices.find(x => x.id === id)!; const st = invoiceView(i);
  const [m, setM] = useState<'' | 'bank' | 'card'>('');
  const due = left(i); const jobs = s.jobs.filter(j => j.id === i.job || i.jobs?.includes(j.id));
  return <Modal wide title={`Invoice ${i.id}`} sub={`${i.site ?? ''} · ${st.label}`} onClose={onClose}
    footer={<>
      <Btn kind="outline" icon={<Download size={16} />} onClick={() => { s.log(`Downloaded invoice ${i.id}`, 'Invoices'); downloadPdf(s, `Invoice ${i.id}`); }}>Download PDF</Btn>
      {due > 0 && !i.reportedPaid && <><Btn kind="outline" icon={<Landmark size={16} />} onClick={() => setM('bank')}>I've paid by bank transfer</Btn><Btn icon={<CreditCard size={16} />} onClick={() => setM('card')}>Pay {money(due)} by card</Btn></>}
      {(due <= 0 || i.reportedPaid) && <Btn kind="outline" onClick={onClose}>Close</Btn>}
    </>}>
    <div className="flex wrap" style={{ gap: 8 }}><Chip tone={st.tone}>{st.label}</Chip>{i.paidAt && <span className="caption">Paid {i.paidAt}</span>}{jobs.map(j => <button key={j.id} className="link small" onClick={() => { onClose(); s.go('jobs', j.id); }}>Job: {j.title}</button>)}</div>
    {due > 0 && !i.reportedPaid && <Note>Pay by card now, or by bank transfer to {COMPANY.bank.join(', ')} using {i.id} as the reference. You can pay part of it; the rest stays on your account.</Note>}
    {i.reportedPaid && due > 0 && <Note>You told LSP you paid {money(i.reportedAmount ?? due)} on {i.reportedPaid}. LSP checks the bank, then marks it paid.</Note>}
    {i.payments.length > 0 && <KV rows={i.payments.map(p => [p.date, `${money(p.amount)} by ${p.how.toLowerCase()} · ref ${p.ref}`] as [string, string])} />}
    <DocSheet kind="INVOICE" to={{ label: 'Invoice to', rows: billTo(s) }} site={i.site}
      meta={[['Invoice', i.id.replace('INV-', '')], ['Date', ddmm(i.issued)], ['Terms', 'Net ' + i.terms.replace(' days', '')], ['Due date', ddmm(i.due)], ...(i.ref ? [['Your order no.', i.ref] as [string, string]] : [])]}
      lines={i.items.map(x => ({ activity: x.activity ?? 'Services', desc: x.desc, qty: x.qty ?? 1, rate: x.rate ?? x.amount }))}
      foot={i.paid > 0 ? [['Total', '£' + num(i.amount)], ['Paid', '−£' + num(i.paid)], ['Balance due', '£' + num(due)]] : [['Balance due', '£' + num(i.amount)]]}
      stamp={due <= 0 ? { text: 'PAID', tone: 'ok' } : isOverdue(i) ? { text: 'OVERDUE', tone: 'warn' } : { text: 'SENT', tone: 'info' }}>{i.note && <p className="doc-note">{i.note}</p>}</DocSheet>
    {m === 'bank' && <BankModal i={i} onClose={() => setM('')} />}
    {m === 'card' && <CardModal i={i} onClose={() => setM('')} />}
  </Modal>;
}
function AmountField({ i, v, set }: { i: Invoice; v: string; set: (v: string) => void }) {
  return <Field label="Amount (£)" hint={`Balance ${money(left(i))}. You can pay part of it.`}><Text value={v} onChange={x => set(x.replace(/[^0-9.]/g, ''))} /></Field>;
}
function BankModal({ i, onClose }: { i: Invoice; onClose: () => void }) {
  const s = useStore(); const [v, setV] = useState(String(left(i))); const a = Math.min(left(i), +v || 0);
  return <Modal title="Tell LSP you've paid" sub="LSP checks the bank and marks the invoice paid. Nothing changes until they do." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<Send size={16} />} disabled={a <= 0} onClick={() => {
      const at = nowStamp(); s.setInvoices(is => is.map(x => x.id === i.id ? { ...x, reportedPaid: at, reportedAmount: a } : x));
      sendMsg(s, `Paid invoice ${i.id}`, `We have paid ${money(a)} for invoice ${i.id} by bank transfer, reference ${i.id}.`);
      s.log(`Told LSP you paid ${money(a)} for invoice ${i.id} by bank transfer`, 'Invoices'); s.toast('Sent. LSP will check the bank.'); onClose();
    }}>Send to LSP</Btn></>}>
    <AmountField i={i} v={v} set={setV} />
    <KV rows={[['Pay to', COMPANY.name], ['Bank', COMPANY.bank.join(' · ')], ['Reference', i.id]]} />
  </Modal>;
}
function CardModal({ i, onClose }: { i: Invoice; onClose: () => void }) {
  const s = useStore(); const [v, setV] = useState(String(left(i))); const a = Math.min(left(i), +v || 0);
  const [card, setCard] = useState({ name: s.user.name, no: '', exp: '', cvc: '' });
  const ok = a > 0 && card.no.replace(/\s/g, '').length >= 16 && /^\d\d\/\d\d$/.test(card.exp) && card.cvc.length >= 3 && card.name.trim();
  return <Modal title={`Pay invoice ${i.id} by card`} sub="Paid straight away. A receipt goes to your accounts email." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<CreditCard size={16} />} disabled={!ok} onClick={() => {
      const at = nowStamp(); const d = at.split(',')[0];
      s.setInvoices(is => is.map(x => x.id === i.id ? { ...x, paid: r2(x.paid + a), paidAt: r2(x.paid + a) >= x.amount ? d : x.paidAt, overdue: r2(x.paid + a) < x.amount && x.overdue, payments: [...x.payments, { date: d, amount: a, ref: `Card ···· ${card.no.replace(/\s/g, '').slice(-4)}`, how: 'Card' }] } : x));
      s.log(`Paid ${money(a)} for invoice ${i.id} by card`, 'Invoices'); s.toast(`Paid ${money(a)}. Receipt sent to ${s.me.billing.email}.`); onClose();
    }}>Pay {money(a)}</Btn></>}>
    <AmountField i={i} v={v} set={setV} />
    <Field label="Name on card"><Text value={card.name} onChange={x => setCard({ ...card, name: x })} /></Field>
    <Field label="Card number"><Text value={card.no} onChange={x => setCard({ ...card, no: x.replace(/[^0-9 ]/g, '').slice(0, 19) })} placeholder="1234 5678 9012 3456" /></Field>
    <div className="grid g2"><Field label="Expiry (MM/YY)"><Text value={card.exp} onChange={x => setCard({ ...card, exp: x.slice(0, 5) })} placeholder="08/28" /></Field><Field label="Security code"><Text value={card.cvc} onChange={x => setCard({ ...card, cvc: x.replace(/\D/g, '').slice(0, 4) })} placeholder="123" /></Field></div>
    <span className="caption">Card details go straight to the payment provider. LSP never stores them.</span>
  </Modal>;
}

/** Job report for the agent: what happened, when, and the photo proof. No contractor cost. */
export function JobReportModal({ j, onClose }: { j: Job; onClose: () => void }) {
  const s = useStore(); const L = useLookups(); const p = L.prop(j.property); const c = L.contractor(j.contractor); const inv = jobInvoice(s, j);
  return <Modal wide title={`Job report · ${j.title}`} sub={`${p?.address} · every step with the date and time, and the photo proof.`} onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Close</Btn><Btn icon={<Download size={16} />} onClick={() => { s.log(`Downloaded the job report for ${j.title}`, 'Jobs'); downloadPdf(s, `Job report ${j.id}`); }}>Download PDF</Btn></>}>
    <DocSheet kind="JOB REPORT" to={{ label: 'Prepared for', rows: [s.me.name, ...(j.ref ? [`Your order no. ${j.ref}`] : [])] }} site={p ? `${p.address}, ${p.area} ${p.postcode}` : ''}
      meta={[['Job', j.id], ['Status', jobView(s, j).label], ['Requested', j.reported], ['LSP contact', adminName(s, j.admin)]]}>
      <div className="doc-sec"><span className="doc-lab">The job</span><b>{j.title}</b><span>{j.note ?? 'No details given.'}</span>
        <div className="doc-kv"><span>Requested by</span><b>{j.requestedBy ?? j.by}</b><span>Contractor</span><b>{c?.name ?? 'Not booked yet'}</b><span>Visit</span><b>{j.visit ?? '—'}</b><span>Quote</span><b>{j.quoteNo ? `${j.quoteNo} · ${money(j.price)}` : 'Not quoted yet'}</b><span>Invoice</span><b>{inv ? `${inv.id} · ${invoiceView(inv).label}` : 'Not invoiced'}</b>{j.cert && <><span>Certificate</span><b>{j.cert.name}{j.cert.expires ? `, valid until ${j.cert.expires}` : ''}</b></>}</div></div>
      <div className="doc-sec"><span className="doc-lab">What happened</span>{j.events.map((e, i) => <div key={i} className="doc-ev"><span>{e.at}</span><span>{e.text}<em> · {e.by}</em></span></div>)}</div>
      <div className="doc-sec"><span className="doc-lab">Photo proof</span>{j.proof?.length ? <div className="doc-ph">{j.proof.map((x, i) => <div key={i} style={{ backgroundImage: `url(images/home${(i % 3) + 1}.jpg)` }}><span>{x}</span></div>)}</div> : <span className="caption"><ImageIcon size={12} style={{ verticalAlign: -2 }} /> Photos are added when the work is finished.</span>}</div>
    </DocSheet>
  </Modal>;
}

/** Statement of account on LSP paper. */
export function StatementModal({ onClose }: { onClose: () => void }) {
  const s = useStore(); const rows = statementRows(s); const b = balanceOf(s);
  return <Modal wide title="Statement of account" sub={`Every invoice and payment for ${s.me.name}, with the running balance.`} onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Close</Btn><Btn icon={<Download size={16} />} onClick={() => { s.log('Downloaded the statement of account', 'Invoices'); downloadPdf(s, 'Statement of account'); }}>Download PDF</Btn></>}>
    <DocSheet kind="STATEMENT OF ACCOUNT" to={{ label: 'Account', rows: billTo(s) }} meta={[['Date', ddmm('15 Oct 2026')], ['Terms', s.me.terms], ['Balance', money(b.owed)], ['Overdue', money(b.overdue)]]}>
      <table className="doc-t sm"><thead><tr><th>Date</th><th>Details</th><th>Ref</th><th className="r">Charged</th><th className="r">Paid</th><th className="r">Balance</th></tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}><td>{r.at}</td><td>{r.what}</td><td>{r.ref}</td><td className="r">{r.debit ? num(r.debit) : ''}</td><td className="r">{r.credit ? num(r.credit) : ''}</td><td className="r">{num(r.bal)}</td></tr>)}</tbody></table>
      <div className="doc-tot"><div className="big"><span>Balance due</span><b>£{num(b.owed)}</b></div></div>
    </DocSheet>
  </Modal>;
}

/* ---------------- small shared blocks ---------------- */
/** Ask LSP something about a record. Saved in Messages with the date and time. */
export function AskModal({ title, about, onClose, onSent, sub }: { title: string; about: string; onClose: () => void; onSent?: (text: string) => void; sub?: string }) {
  const s = useStore(); const [t, setT] = useState('');
  return <Modal title={title} sub={sub ?? `Goes to ${myAdmin(s)?.name ?? 'LSP'}, who handles your jobs at LSP. You'll see the reply in Messages.`} onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<Send size={16} />} disabled={!t.trim()} onClick={() => {
      sendMsg(s, about, t.trim()); s.log(`Sent a message: ${about}`, 'Messages'); s.toast('Message sent to LSP'); onSent?.(t.trim()); onClose();
    }}>Send</Btn></>}>
    <Field label="About"><input className="input" readOnly value={about} /></Field>
    <Field label="Your message"><Area value={t} onChange={setT} placeholder="Type your message" /></Field>
  </Modal>;
}
/** Things only LSP does, shown so the next step of the flow can be tried without the staff portals. */
export function DemoAnswer({ children, note = 'In the live product LSP does this from the Office Admin portal. Use these to show what happens next.' }: { children: ReactNode; note?: string }) {
  return <div className="demo"><span className="flex" style={{ gap: 6 }}><FlaskConical size={14} /><b>Prototype: LSP's answer</b></span><span className="caption">{note}</span><div className="flex wrap" style={{ gap: 8 }}>{children}</div></div>;
}
export function JobIcon({ j, size = 32 }: { j: Job; size?: number }) {
  return <span className={`tile ${needsMe(j) ? 't-warn' : j.urgent && isOpen(j) ? 't-err' : j.status === 'Declined' ? 't-neutral' : DONE_JOB.includes(j.status) ? 't-ok' : 't-info'}`} style={{ width: size, height: size }}>{j.category === 'Safety check' ? <CheckCircle2 size={size / 2.1} /> : <Wrench size={size / 2.1} />}</span>;
}
export function MiniJobList({ jobs, empty = 'No jobs.' }: { jobs: Job[]; empty?: string }) {
  const s = useStore(); const L = useLookups();
  return jobs.length ? <div className="divlist">{jobs.map(j => { const v = jobView(s, j); return <button key={j.id} className="item click" onClick={() => s.go(needsMe(j) ? 'quotes' : 'jobs', j.id)}><JobIcon j={j} /><div className="stack grow"><b>{j.title}</b><span className="caption">{L.prop(j.property)?.address} · {j.visit && ['Assigned', 'In progress'].includes(j.status) ? `visit ${j.visit}` : j.reported.split(',')[0]}{j.price ? ' · ' + money(j.price) : ''}</span></div><Chip tone={v.tone}>{v.label}</Chip></button>; })}</div> : <Empty icon={<Wrench size={22} />}>{empty}</Empty>;
}
export function ViewBtn({ onClick, label = 'View' }: { onClick: () => void; label?: string }) { return <Btn sm kind="ghost" icon={<Eye size={14} />} onClick={onClick}>{label}</Btn>; }
export function DocIcon() { return <span className="tile t-brand" style={{ width: 32, height: 32 }}><FileText size={15} /></span>; }
export function SectionNote({ children }: { children: ReactNode }) { return <Card className="flat"><span className="small">{children}</span></Card>; }
export { daysFrom };
