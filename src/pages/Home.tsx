import { Wrench, MessageSquare, Receipt, TriangleAlert, Clock, CalendarDays, ArrowRight, Home as HomeIcon, FileText, Phone, Plus, CheckCircle2 } from 'lucide-react';
import { useStore, useLookups, money } from '../store';
import { daysFrom, ME_NAME, LSP_PHONE } from '../data';
import { Btn, Card, Chip, Kpi, Note, Empty } from '../ui';
import { PageHeader } from '../Shell';
import { needsMe, isOpen, MiniJobList, homeType, myAdmin, balanceOf, liveHomes, invoiceView, isOverdue, left, firstName } from './lib';

export default function HomePage() {
  const s = useStore(); const L = useLookups(); const b = balanceOf(s);
  const quotes = s.jobs.filter(needsMe).sort((a, c) => daysFrom(a.validUntil ?? '') - daysFrom(c.validUntil ?? ''));
  const open = s.jobs.filter(j => isOpen(j) && !needsMe(j));
  const homes = liveHomes(s);
  const unread = s.me.comms.filter(c => !s.me.team.some(m => m.name === c.by) && !s.read.includes(c.id)).length;
  const done = s.jobs.filter(j => ['Approved', 'Invoiced'].includes(j.status)).length; const total = s.jobs.filter(j => j.status !== 'Declined').length;
  const coming = [
    ...s.jobs.filter(j => ['Assigned', 'In progress'].includes(j.status) && j.visit && daysFrom(j.visit) >= 0).map(j => ({ d: j.visit!.split(',')[0], t: `${j.title} · ${j.visit!.split(', ')[1] ?? ''}`, p: L.prop(j.property)?.address ?? '', go: () => s.go('jobs', j.id), c: 't-brand' })),
    ...quotes.filter(j => j.validUntil).map(j => ({ d: j.validUntil!, t: `Quote ${j.quoteNo} ends`, p: `${j.title} · ${money(j.price)}`, go: () => s.go('quotes', j.id), c: 't-warn' })),
    ...b.open.filter(i => !isOverdue(i)).map(i => ({ d: i.due, t: `Invoice ${i.id} due`, p: money(left(i)), go: () => s.go('invoices', i.id), c: 't-info' })),
  ].sort((a, c) => daysFrom(a.d) - daysFrom(c.d)).slice(0, 5);
  return <>
    <PageHeader title={`Good morning, ${firstName(ME_NAME)}`} action={<div className="flex"><Btn kind="outline" icon={<MessageSquare size={18} />} onClick={() => s.go('messages')}>Message LSP</Btn><Btn icon={<Wrench size={18} />} onClick={() => s.go('jobs', 'new')}>Book a job</Btn></div>} />
    <div className="row">
      <div className="hero grow">
        <div className="col grow" style={{ gap: 14 }}>
          <span className="chip-dark" style={{ alignSelf: 'flex-start' }}>{s.me.name} · balance with LSP</span>
          <div className="flex" style={{ alignItems: 'flex-end', gap: 10 }}><span className="big">{money(b.owed)}</span><span className="chip accent nodot" style={{ marginBottom: 12 }}>{b.overdue ? `${money(b.overdue)} overdue` : 'Nothing overdue'}</span></div>
          <p style={{ margin: 0, color: '#C3CDE4', fontSize: 13, fontWeight: 500, maxWidth: 460 }}>To pay on {b.open.length} invoice{b.open.length === 1 ? '' : 's'}{b.nextDue ? `, next due ${b.nextDue.due}` : ''}. Work you accepted ({money(b.coming)}) is invoiced once it is done and checked.</p>
          <div className="flex" style={{ gap: 12 }}>{[[String(homes.length), 'Your homes'], [String(open.length), 'Jobs under way'], [String(quotes.length), 'Quotes to accept']].map(([v, l]) => <div className="mtile" key={l}><b>{v}</b><span>{l}</span></div>)}</div>
        </div>
        <div className="gring"><svg viewBox="0 0 176 176"><circle cx="88" cy="88" r="80" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="14" /><circle cx="88" cy="88" r="80" fill="none" stroke="#5BAF00" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 80 * (total ? done / total : 0)} 999`} transform="rotate(-90 88 88)" /></svg>
          <div className="stack" style={{ alignItems: 'center' }}><CheckCircle2 size={22} color="#5BAF00" /><b style={{ fontSize: 13 }}>{done} of {total} done</b><span style={{ fontSize: 10.5, color: '#AEBBDA' }}>jobs this year</span></div></div>
      </div>
      <Card title="Quotes to accept" sub="No work is booked until you accept." action={<Chip tone={quotes.length ? 'warn' : 'ok'}>{quotes.length} waiting</Chip>} style={{ width: 400, flex: 'none' }}>
        {quotes.map(j => { const d = daysFrom(j.validUntil ?? ''); return <div className="lrow" key={j.id}>
          <span className="tile t-white" style={{ width: 36, height: 36 }}><FileText size={18} /></span>
          <button className="stack grow" style={{ border: 0, background: 'none', textAlign: 'left', padding: 0, minWidth: 0 }} onClick={() => s.go('quotes', j.id)}><span className="flex" style={{ gap: 6 }}><b className="ellip">{j.title}</b><b style={{ color: 'var(--warn)' }}>{money(j.price)}</b></span><span className="caption ellip">{L.prop(j.property)?.address} · {d <= 7 ? `ends in ${d} day${d === 1 ? '' : 's'}` : `valid until ${j.validUntil}`}</span></button>
          <Btn sm onClick={() => s.go('quotes', j.id)}>Review</Btn>
        </div>; })}
        {!quotes.length && <Note tone="ok">Nothing waiting for you.</Note>}
        <button className="btn ghost sm" onClick={() => s.go('quotes')}>All quotes</button>
      </Card>
    </div>
    <div className="grid g4">
      <Kpi icon={<Wrench size={18} />} tone="info" label="Jobs under way" value={open.length} caption={`${s.jobs.filter(j => j.status === 'Proof uploaded').length} being checked by LSP`} onClick={() => s.go('jobs')} />
      <Kpi icon={<Clock size={18} />} tone="warn" label="Quotes to accept" value={quotes.length} caption={quotes.length ? money(quotes.reduce((a, j) => a + j.price, 0)) + ' in total' : 'nothing waiting'} onClick={() => s.go('quotes')} />
      <Kpi icon={<Receipt size={18} />} tone="warn" label="To pay" value={money(b.owed)} caption={b.nextDue ? `next due ${b.nextDue.due}` : 'nothing due'} onClick={() => s.go('invoices')} />
      <Kpi icon={<TriangleAlert size={18} />} tone={b.overdue ? 'err' : 'ok'} label="Overdue" value={money(b.overdue)} caption={b.overdue ? 'please pay soon' : 'all paid on time'} onClick={() => s.go('invoices')} />
    </div>
    <div className="row">
      <Card title="Jobs under way" sub="LSP books the contractor, checks the photos and sends the invoice." className="grow" action={<Btn sm kind="ghost" onClick={() => s.go('jobs')}>All jobs</Btn>}>
        <MiniJobList jobs={open.slice(0, 5)} empty="No jobs under way." />
      </Card>
      <Card title="Coming up" action={<CalendarDays size={18} color="#667085" />} style={{ width: 340, flex: 'none' }}>
        {coming.map(c => { const [d, m] = c.d.split(' '); return <button key={c.t + c.d} className="item click" style={{ padding: 0 }} onClick={c.go}><span className={`datetile ${c.c}`}><b>{d}</b><span>{m.toUpperCase()}</span></span><div className="stack"><b>{c.t}</b><span className="caption">{c.p}</span></div></button>; })}
        {!coming.length && <span className="caption">Nothing booked.</span>}
      </Card>
    </div>
    <div className="row">
      <Card title="Your homes" className="grow" action={<div className="flex"><Btn sm kind="ghost" icon={<Plus size={14} />} onClick={() => s.go('properties', 'add')}>Add a home</Btn><Btn sm kind="ghost" onClick={() => s.go('properties')}>All homes</Btn></div>}>
        <div className="divlist">{homes.map(p => { const n = s.jobs.filter(j => j.property === p.id && isOpen(j)).length; const q = s.jobs.filter(j => j.property === p.id && needsMe(j)).length; return (
          <button key={p.id} className="item click" onClick={() => s.go('properties', p.id)}>
            <span className="photo" style={{ width: 64, height: 48, borderRadius: 10, flex: 'none', backgroundImage: `url(${p.photo})` }} />
            <div className="stack grow"><b>{p.address}</b><span className="caption">{homeType(p)} · {p.occupier ? p.occupier.name : 'Empty'}{p.ref ? ` · ${p.ref}` : ''}</span></div>
            {n > 0 && <span className="caption"><Wrench size={12} style={{ verticalAlign: -2 }} /> {n}</span>}
            {q > 0 ? <Chip tone="warn">{q} quote{q > 1 ? 's' : ''}</Chip> : <Chip tone={p.status === 'Let' ? 'ok' : 'neutral'}>{p.status}</Chip>}
          </button>); })}</div>
        {!homes.length && <Empty icon={<HomeIcon size={22} />}>No homes yet. Add one to book jobs.</Empty>}
      </Card>
      <Card title="Your LSP contact" style={{ width: 340, flex: 'none' }}>
        {myAdmin(s) ? <div className="flex"><img className="avatar md" src={myAdmin(s)!.photo ?? 'images/av3.jpg'} alt="" /><div className="stack grow"><b>{myAdmin(s)!.name}</b><span className="caption">Handles your jobs, quotes and invoices</span></div></div> : <Empty>LSP handles your jobs.</Empty>}
        <Btn kind="outline" icon={<MessageSquare size={16} />} onClick={() => s.go('messages')}>{unread ? `Messages · ${unread} new` : 'Send a message'}</Btn>
        <Note>Emergency, like a leak or no heating? Call LSP on {LSP_PHONE} and book it here too.</Note>
        {b.open.filter(isOverdue).map(i => <button key={i.id} className="btn ghost sm" onClick={() => s.go('invoices', i.id)}><Phone size={14} /> {i.id}: {invoiceView(i).label} <ArrowRight size={14} /></button>)}
      </Card>
    </div>
  </>;
}
