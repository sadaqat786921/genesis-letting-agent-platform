import { useState } from 'react';
import { Receipt, TriangleAlert, CheckCircle2, Clock, FileText, Download, CreditCard, Landmark, Copy, Wrench } from 'lucide-react';
import { useStore, useLookups, money } from '../store';
import { daysFrom, nowStamp } from '../data';
import { Btn, Card, Chip, Empty, Kpi, KV, Note, Tabs, FilterBar, applyFlt, useFlt, yearsOf, When } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { InvoiceModal, StatementModal, invoiceView, isOverdue, left, balanceOf, statementRows, COMPANY, DemoAnswer, lspSays, r2, num, adminName } from './lib';

/* Invoices & Payments: LSP invoices the agent after each job is done and checked. Terms are the agent's own (e.g. 30 days).
   Pay by card (straight away) or by bank transfer (LSP checks the bank). Part payments are fine; the rest stays on the account. */

export function Invoices() {
  const s = useStore(); const L = useLookups(); const b = balanceOf(s); const [f, setF] = useFlt();
  const [tab, setTab] = useState<'open' | 'paid' | 'all' | 'statement'>('open');
  const [open, setOpen] = useState<string | null>(s.detail); const [stmt, setStmt] = useState(false);
  const pick = s.invoices.filter(i => tab === 'all' || tab === 'statement' ? true : tab === 'paid' ? left(i) <= 0 : left(i) > 0).sort((a, b2) => daysFrom(a.due) - daysFrom(b2.due));
  const list = applyFlt(pick, f, { text: i => `${i.id} ${i.site ?? ''} ${i.ref ?? ''} ${i.items.map(x => x.desc).join(' ')}`, date: i => i.issued });
  const checking = s.invoices.filter(i => i.reportedPaid && left(i) > 0);
  const rows = statementRows(s);
  return <>
    <PageHeader crumbs={crumbsFor('invoices', s.go)} title="Invoices & Payments" action={<Btn kind="outline" icon={<FileText size={18} />} onClick={() => setStmt(true)}>Statement of account</Btn>} />
    <div className="grid g4">
      <Kpi icon={<Receipt size={18} />} tone="warn" label="To pay" value={money(b.owed)} caption={b.nextDue ? `next due ${b.nextDue.due}` : 'nothing due'} active={tab === 'open'} onClick={() => setTab('open')} />
      <Kpi icon={<TriangleAlert size={18} />} tone={b.overdue ? 'err' : 'ok'} label="Overdue" value={money(b.overdue)} caption={b.overdue ? 'please pay as soon as you can' : 'nothing overdue'} onClick={() => setTab('open')} />
      <Kpi icon={<CheckCircle2 size={18} />} tone="ok" label="Paid this year" value={money(b.paidYear)} caption={`of ${money(b.billedYear)} invoiced`} active={tab === 'paid'} onClick={() => setTab('paid')} />
      <Kpi icon={<Wrench size={18} />} tone="info" label="Work accepted" value={money(b.coming)} caption="invoiced once done and checked" onClick={() => s.go('jobs')} />
    </div>
    <div className="dgrid">
      <Card title={tab === 'statement' ? 'Statement of account' : 'Invoices from LSP'} sub={tab === 'statement' ? 'Every invoice and payment, oldest first, with the running balance.' : `Sent after the work is done and checked. Your terms: ${s.me.terms}.`}
        action={<Tabs value={tab} onChange={setTab} items={[{ id: 'open', label: 'To pay', count: s.invoices.filter(i => left(i) > 0).length }, { id: 'paid', label: 'Paid' }, { id: 'all', label: 'All', count: s.invoices.length }, { id: 'statement', label: 'Statement' }]} />}>
        {tab !== 'statement' ? <>
          {pick.length > 2 && <FilterBar f={f} set={setF} placeholder="Search invoices, homes, order numbers" years={yearsOf(s.invoices, i => i.issued)} shown={list.length} total={pick.length} />}
          <div className="tablewrap"><table className="t"><thead><tr><th>Invoice</th><th>For</th><th>Issued</th><th>Due</th><th>Total</th><th>Left to pay</th><th>Status</th><th /></tr></thead><tbody>
            {list.map(i => { const v = invoiceView(i); const jobs = s.jobs.filter(j => j.id === i.job || i.jobs?.includes(j.id)); return <tr key={i.id} onClick={() => setOpen(i.id)}>
              <td><span className="cell"><span className={`tile ${isOverdue(i) ? 't-err' : left(i) > 0 ? 't-warn' : 't-ok'}`} style={{ width: 32, height: 32 }}><Receipt size={15} /></span><b className="strong">{i.id}</b></span></td>
              <td>{jobs.length ? jobs.map(j => j.title).join(', ') : i.items[0]?.desc}<div className="caption">{i.site}{i.ref ? ` · order ${i.ref}` : ''}</div></td>
              <td><When at={i.issued} /></td><td>{i.due}{left(i) > 0 && <div className="caption" style={{ color: isOverdue(i) ? 'var(--err)' : undefined }}>{isOverdue(i) ? `${-daysFrom(i.due)} days late` : `in ${daysFrom(i.due)} days`}</div>}</td>
              <td><b>{money(i.amount)}</b></td><td>{left(i) > 0 ? <b style={{ color: isOverdue(i) ? 'var(--err)' : 'var(--warn)' }}>{money(left(i))}</b> : <span className="muted">—</span>}</td>
              <td><Chip tone={v.tone}>{v.label}</Chip></td>
              <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>{left(i) > 0 && !i.reportedPaid ? <Btn sm onClick={() => setOpen(i.id)}>Pay</Btn> : <Btn sm kind="ghost" onClick={() => setOpen(i.id)}>View</Btn>}</td></tr>; })}
          </tbody></table>{!list.length && <Empty icon={<Receipt size={22} />}>{tab === 'open' ? 'Nothing to pay. Thank you!' : 'No invoices here.'}</Empty>}</div>
        </> : <div className="tablewrap"><table className="t"><thead><tr><th>Date</th><th>Details</th><th>Invoice</th><th style={{ textAlign: 'right' }}>Charged</th><th style={{ textAlign: 'right' }}>Paid</th><th style={{ textAlign: 'right' }}>Balance</th></tr></thead><tbody>
          {rows.map((r, k) => <tr key={k} onClick={() => setOpen(r.ref)}><td>{r.at}</td><td>{r.what}</td><td>{r.ref}</td><td style={{ textAlign: 'right' }}>{r.debit ? '£' + num(r.debit) : ''}</td><td style={{ textAlign: 'right', color: 'var(--ok)' }}>{r.credit ? '£' + num(r.credit) : ''}</td><td style={{ textAlign: 'right' }}><b>£{num(r.bal)}</b></td></tr>)}
        </tbody></table><div className="flex between" style={{ marginTop: 12 }}><span className="label">Balance due today</span><b style={{ fontSize: 18 }}>{money(b.owed)}</b></div><Btn sm kind="outline" icon={<Download size={14} />} onClick={() => setStmt(true)}>Download statement</Btn></div>}
      </Card>
      <div className="col">
        <Card title="How to pay">
          <div className="lrow"><CreditCard size={18} color="var(--text-brand)" /><div className="stack grow"><b>Card</b><span className="caption">Open an invoice and pay. Paid straight away.</span></div></div>
          <div className="lrow"><Landmark size={18} color="var(--text-brand)" /><div className="stack grow"><b>Bank transfer</b><span className="caption">{COMPANY.bank.join(' · ')}. Use the invoice number as the reference, then tell LSP.</span></div><button className="link" aria-label="Copy bank details" onClick={() => { try { navigator.clipboard?.writeText(COMPANY.bank.join(', ')); } catch { /* ignore */ } s.toast('Bank details copied'); }}><Copy size={14} /></button></div>
          <KV rows={[['Payment terms', s.me.terms], ['Reference', 'The invoice number'], ['Pay to', COMPANY.name]]} />
        </Card>
        {b.overdue > 0 && <Note tone="err">{money(b.overdue)} is overdue. LSP sends a reminder after the due date. Can't pay it all? Pay part now and message {adminName(s, s.me.admin)}.</Note>}
        {checking.length > 0 && <DemoAnswer note="In the live product LSP records the payment when it reaches the bank.">{checking.map(i => <Btn key={i.id} sm kind="outline" onClick={() => {
          const a = Math.min(left(i), i.reportedAmount ?? left(i)); const d = nowStamp().split(',')[0];
          s.setInvoices(is => is.map(x => x.id === i.id ? { ...x, paid: r2(x.paid + a), reportedPaid: undefined, reportedAmount: undefined, paidAt: r2(x.paid + a) >= x.amount ? d : x.paidAt, overdue: r2(x.paid + a) < x.amount && x.overdue, payments: [...x.payments, { date: d, amount: a, ref: x.id, how: 'Bank transfer' }] } : x));
          lspSays(s, `Payment received · ${i.id}`, `Thanks, we received ${money(a)} for ${i.id}.${left(i) - a > 0 ? ` ${money(r2(left(i) - a))} is still to pay.` : ''}`); s.log(`LSP received ${money(a)} for ${i.id}`, 'Invoices', adminName(s, s.me.admin)); s.toast('LSP recorded the payment');
        }}>LSP receives {i.id}</Btn>)}</DemoAnswer>}
        <Card title="Coming next" sub="Work you accepted. Invoiced once done and checked.">{s.jobs.filter(j => ['Quote accepted', 'Assigned', 'In progress', 'Proof uploaded', 'Sent back', 'Approved'].includes(j.status)).map(j => <button key={j.id} className="item click" style={{ padding: '6px 0' }} onClick={() => s.go('jobs', j.id)}><Clock size={16} color="var(--info)" /><div className="stack grow"><b className="small">{j.title}</b><span className="caption">{L.prop(j.property)?.address}</span></div><b className="small">{money(j.price)}</b></button>)}
          {!b.coming && <span className="caption">Nothing coming.</span>}</Card>
      </div>
    </div>
    {open && s.invoices.some(i => i.id === open) && <InvoiceModal id={open} onClose={() => setOpen(null)} />}
    {stmt && <StatementModal onClose={() => setStmt(false)} />}
  </>;
}
