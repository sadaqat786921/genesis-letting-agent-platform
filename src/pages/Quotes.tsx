import { useState } from 'react';
import { FileText, CheckCircle2, XCircle, Clock, Download, RotateCcw, ArrowRight, Wrench, PenLine } from 'lucide-react';
import { useStore, useLookups, money } from '../store';
import { nowStamp, daysFrom, type Job } from '../data';
import { ActionCard, Btn, Card, Chip, DetailHead, Empty, Field, KV, Kpi, Modal, Note, Reason, Tabs, Text, Select, FilterBar, applyFlt, useFlt, yearsOf, When } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { needsMe, expired, quoteView, QuoteSheet, AskModal, jobEvent, sendMsg, lspSays, downloadPdf, adminName, homeType, DemoAnswer } from './lib';

/* Quotes: LSP prices every job first. The agent accepts (with their order number if they use them) or declines.
   No work is booked until a quote is accepted. Quotes have a "valid until" date; an expired quote can be updated by LSP. */

export function Quotes() {
  const s = useStore();
  if (s.detail && s.jobs.some(j => j.id === s.detail && j.quoteNo)) return <QuotePage id={s.detail} />;
  return <QuoteList />;
}

const quoted = (js: Job[]) => js.filter(j => !!j.quoteNo);
function QuoteList() {
  const s = useStore(); const L = useLookups(); const all = quoted(s.jobs); const [f, setF] = useFlt();
  const [tab, setTab] = useState<'wait' | 'acc' | 'closed' | 'all'>('wait');
  const pick = all.filter(j => tab === 'all' ? true : tab === 'wait' ? j.status === 'Quote sent' : tab === 'closed' ? j.status === 'Declined' : !['Quote sent', 'Declined'].includes(j.status))
    .sort((a, b) => (needsMe(b) ? 1 : 0) - (needsMe(a) ? 1 : 0));
  const list = applyFlt(pick, f, { text: j => `${j.quoteNo} ${j.title} ${j.ref ?? ''} ${L.prop(j.property)?.address ?? ''}`, type: j => j.category, date: j => j.quoted });
  const waiting = all.filter(needsMe);
  const soon = waiting.filter(j => j.validUntil && daysFrom(j.validUntil) <= 7);
  const accYear = all.filter(j => j.acceptedAt);
  return <>
    <PageHeader crumbs={crumbsFor('quotes', s.go)} title="Quotes" action={<Btn icon={<Wrench size={18} />} onClick={() => s.go('jobs', 'new')}>Book a job</Btn>} />
    <div className="grid g4">
      <Kpi icon={<Clock size={18} />} tone="warn" label="To accept" value={waiting.length} caption={waiting.length ? money(waiting.reduce((a, j) => a + j.price, 0)) + ' in total' : 'nothing waiting'} active={tab === 'wait'} onClick={() => setTab('wait')} />
      <Kpi icon={<Clock size={18} />} tone="err" label="Ending in 7 days" value={soon.length} caption="accept before they expire" onClick={() => setTab('wait')} />
      <Kpi icon={<CheckCircle2 size={18} />} tone="ok" label="Accepted" value={accYear.length} caption={money(accYear.reduce((a, j) => a + j.price, 0)) + ' this year'} active={tab === 'acc'} onClick={() => setTab('acc')} />
      <Kpi icon={<XCircle size={18} />} tone="neutral" label="Declined" value={all.filter(j => j.status === 'Declined').length} caption="nothing charged" active={tab === 'closed'} onClick={() => setTab('closed')} />
    </div>
    <Card title="Quotes from LSP" sub="Every job is priced first. Accept a quote and LSP books the work; decline it and nothing is charged."
      action={<Tabs value={tab} onChange={setTab} items={[{ id: 'wait', label: 'Waiting', count: all.filter(j => j.status === 'Quote sent').length }, { id: 'acc', label: 'Accepted' }, { id: 'closed', label: 'Declined' }, { id: 'all', label: 'All', count: all.length }]} />}>
      {pick.length > 2 && <FilterBar f={f} set={setF} placeholder="Search quotes, jobs, order numbers" types={[...new Set(all.map(j => j.category))].sort()} typeLabel="All types of work" years={yearsOf(all, j => j.quoted)} shown={list.length} total={pick.length} />}
      <div className="tablewrap"><table className="t"><thead><tr><th>Quote</th><th>Job</th><th>Home</th><th>Sent</th><th>Valid until</th><th>Total</th><th>Status</th><th /></tr></thead><tbody>
        {list.map(j => { const st = quoteView(j); const d = j.validUntil ? daysFrom(j.validUntil) : 99; return <tr key={j.id} onClick={() => s.go('quotes', j.id)}>
          <td><span className="cell"><span className={`tile ${needsMe(j) ? 't-warn' : 't-brand'}`} style={{ width: 32, height: 32 }}><FileText size={15} /></span><b className="strong">{j.quoteNo}</b></span></td>
          <td>{j.title}<div className="caption">{j.ref ? `Order ${j.ref}` : j.category}</div></td>
          <td>{L.prop(j.property)?.address}</td>
          <td>{j.quoted ? <When at={j.quoted} /> : '—'}</td>
          <td>{j.validUntil}{j.status === 'Quote sent' && <div className="caption" style={{ color: d < 0 ? 'var(--text-tertiary)' : d <= 7 ? 'var(--err)' : undefined }}>{d < 0 ? 'ended' : d === 0 ? 'ends today' : `${d} days left`}</div>}</td>
          <td><b>{money(j.price)}</b></td>
          <td><Chip tone={st.tone}>{st.label}</Chip></td>
          <td style={{ textAlign: 'right' }}>{needsMe(j) ? <Btn sm>Review</Btn> : <ArrowRight size={16} color="#98A2B3" />}</td></tr>; })}
      </tbody></table>{!list.length && <Empty icon={<FileText size={22} />}>{tab === 'wait' ? 'No quotes waiting for you.' : 'No quotes here.'}</Empty>}</div>
    </Card>
  </>;
}

function QuotePage({ id }: { id: string }) {
  const s = useStore(); const L = useLookups(); const j = s.jobs.find(x => x.id === id)!; const p = L.prop(j.property)!;
  const [m, setM] = useState<'' | 'accept' | 'decline' | 'change' | 'requote'>('');
  const st = quoteView(j); const d = j.validUntil ? daysFrom(j.validUntil) : 99;
  const ev = (text: string, patch: Partial<Job> = {}) => jobEvent(s, id, text, patch);
  return <>
    <PageHeader crumbs={crumbsFor('quotes', s.go, j.quoteNo)} back={() => s.go('quotes')} title={`Quote ${j.quoteNo}`}
      action={<div className="flex"><Btn kind="ghost" icon={<Wrench size={16} />} onClick={() => s.go('jobs', id)}>Open the job</Btn><Btn kind="outline" icon={<Download size={16} />} onClick={() => { s.log(`Downloaded quote ${j.quoteNo}`, 'Quotes'); downloadPdf(s, `Quote ${j.quoteNo}`); }}>Download PDF</Btn></div>} />
    <DetailHead media={<span className={`tile ${needsMe(j) ? 't-warn' : 't-brand'}`} style={{ width: 64, height: 64, borderRadius: 18 }}><FileText size={28} /></span>} title={j.title}
      chips={<><Chip tone={st.tone}>{st.label}</Chip><Chip tone="neutral" dot={false}>{j.category}</Chip>{j.ref && <Chip tone="brand" dot={false}>Order {j.ref}</Chip>}</>}
      meta={[['Home', p.address], ['Sent', j.quoted ?? '—'], ['Valid until', j.validUntil ?? '—'], ['From', adminName(s, j.admin)]]} />
    <div className="dgrid">
      <div className="col">
        <Card title="The quote" sub="What you see here is what you pay. The invoice matches this quote unless you agree extra work."><QuoteSheet j={j} /></Card>
      </div>
      <div className="col">
        {needsMe(j) && <ActionCard tone="warn" title="Your decision" text={`${money(j.price)} for ${j.title.toLowerCase()} at ${p.address}. ${d <= 7 ? `Ends in ${d} day${d === 1 ? '' : 's'}.` : `Valid until ${j.validUntil}.`} Nothing is booked until you accept.`}>
          <Btn block icon={<CheckCircle2 size={16} />} onClick={() => setM('accept')}>Accept {money(j.price)}</Btn>
          <Btn block kind="outline" icon={<PenLine size={16} />} onClick={() => setM('change')}>Ask for a change</Btn>
          <Btn block kind="ghost" icon={<XCircle size={16} />} onClick={() => setM('decline')}>Decline</Btn>
        </ActionCard>}
        {expired(j) && <><ActionCard tone="neutral" title="This quote has ended" text={`It was valid until ${j.validUntil}. Prices can change, so ask LSP for an updated quote before accepting.`}><Btn block icon={<RotateCcw size={16} />} onClick={() => setM('requote')}>Ask LSP to update it</Btn><Btn block kind="ghost" icon={<XCircle size={16} />} onClick={() => setM('decline')}>No longer needed</Btn></ActionCard>
          <DemoAnswer><Btn sm kind="outline" onClick={() => { const q = `${j.quoteNo}-2`; jobEvent(s, id, `Updated quote ${q} sent: ${money(j.price)}, valid until 14 Nov 2026`, { quoteNo: q, quoted: nowStamp(), validUntil: '14 Nov 2026' }, adminName(s, j.admin)); lspSays(s, `Updated quote ${q}`, `Here is the updated quote for ${j.title}, valid until 14 Nov 2026.`); s.toast('LSP sent an updated quote'); }}>LSP updates the quote</Btn></DemoAnswer></>}
        {!needsMe(j) && !expired(j) && <ActionCard tone={st.tone === 'ok' ? 'ok' : 'neutral'} title={st.label} text={j.status === 'Declined' ? `${j.cancelled ? 'Cancelled' : 'Declined'}: ${j.cancelled ?? j.declined ?? 'no reason given'}. Nothing was charged.` : `Accepted by ${j.acceptedBy} on ${j.acceptedAt}${j.ref ? `, order ${j.ref}` : ''}. Follow the work on the job page.`}>
          <Btn block kind="outline" icon={<Wrench size={16} />} onClick={() => s.go('jobs', id)}>Open the job</Btn></ActionCard>}
        <Card title="Home"><button className="item click" style={{ padding: 0 }} onClick={() => s.go('properties', p.id)}><span className="photo" style={{ width: 72, height: 54, borderRadius: 10, flex: 'none', backgroundImage: `url(${p.photo})` }} /><div className="stack grow"><b>{p.address}</b><span className="caption">{homeType(p)} · {p.ref ?? p.postcode}</span></div><ArrowRight size={16} color="#98A2B3" /></button></Card>
        <Card title="Good to know"><KV rows={[['Payment', `${s.me.terms} from the invoice date`], ['When you pay', 'After the work is done and checked by LSP'], ['Extra work', 'Only with a new quote you accept'], ['Contractor', 'Checked by LSP (ID, insurance, certificates)']]} /></Card>
      </div>
    </div>
    {m === 'accept' && <AcceptModal j={j} onClose={() => setM('')} />}
    {m === 'decline' && <Reason title={`Decline quote ${j.quoteNo}`} sub="LSP is told. Nothing is booked or charged." cta="Decline quote" danger options={['Too expensive', 'The landlord will arrange it', 'No longer needed', 'Getting another quote']} onClose={() => setM('')}
      onDone={r => { ev(`Declined quote ${j.quoteNo}: ${r}`, { status: 'Declined', declined: r }); sendMsg(s, `Declined quote ${j.quoteNo}`, `We are declining quote ${j.quoteNo} for ${j.title}. Reason: ${r}`); s.log(`Declined quote ${j.quoteNo} (${money(j.price)})`, 'Quotes'); s.toast('Quote declined. LSP has been told.'); setM(''); }} />}
    {m === 'change' && <AskModal title="Ask for a change to the quote" about={`Change to quote ${j.quoteNo}`} sub="For example a different date, fewer items or a cheaper option. LSP replies with an updated quote." onClose={() => setM('')} onSent={t => ev(`Asked for a change to quote ${j.quoteNo}: ${t}`)} />}
    {m === 'requote' && <AskModal title="Ask LSP to update the quote" about={`Updated quote please · ${j.quoteNo}`} sub="LSP checks the prices are still right and sends a new quote with a new date." onClose={() => setM('')} onSent={t => ev(`Asked for an updated quote: ${t}`)} />}
  </>;
}

/** Accept a quote: who is accepting, the order number, and a tick to confirm. */
function AcceptModal({ j, onClose }: { j: Job; onClose: () => void }) {
  const s = useStore(); const [ref, setRef] = useState(j.ref ?? ''); const [ok, setOk] = useState(false);
  const people = s.me.team.filter(m => m.status === 'Active' && m.role !== 'Accounts');
  const [by, setBy] = useState(people.some(m => m.name === s.user.name) ? s.user.name : people[0]?.name ?? s.user.name);
  const need = s.me.poRequired && !ref.trim();
  return <Modal title={`Accept quote ${j.quoteNo}`} sub={`${money(j.price)} for ${j.title}. LSP books a checked contractor and tells you the visit time.`} onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<CheckCircle2 size={16} />} disabled={!ok || need} onClick={() => {
      const at = nowStamp();
      jobEvent(s, j.id, `Accepted quote ${j.quoteNo}${ref.trim() ? `, order ${ref.trim()}` : ''}`, { status: 'Quote accepted', acceptedBy: by, acceptedAt: at, ref: ref.trim() || undefined }, by);
      sendMsg(s, `Accepted quote ${j.quoteNo}`, `We accept quote ${j.quoteNo} for ${j.title} (${money(j.price)})${ref.trim() ? `, our order number ${ref.trim()}` : ''}. Please book the work.`);
      s.log(`Accepted quote ${j.quoteNo} (${money(j.price)}) for ${j.title}`, 'Quotes', by); s.toast('Quote accepted. LSP will book the work.'); onClose(); s.go('jobs', j.id);
    }}>Accept {money(j.price)}</Btn></>}>
    <div className="feebox"><div><span>Quote total</span><b>{money(j.price)}</b></div><div><span>Payment terms</span><b>{s.me.terms} from the invoice</b></div><div className="tot"><span>You pay after the work is done</span><b>{money(j.price)}</b></div></div>
    <div className="grid g2">
      <Field label="Accepted by"><Select value={by} onChange={setBy} options={people.map(m => ({ value: m.name, label: `${m.name} · ${m.role}` }))} /></Field>
      <Field label={s.me.poRequired ? 'Your order number (needed)' : 'Your order number (optional)'} hint="Shown on the invoice."><Text value={ref} onChange={setRef} placeholder="e.g. PO-5540" /></Field>
    </div>
    <label className="check" style={{ cursor: 'pointer' }}><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} /> I can approve this work for the landlord and agree to pay LSP's invoice</label>
    <Note>Changed your mind later? Message LSP before the visit and they cancel it at no cost.</Note>
  </Modal>;
}
