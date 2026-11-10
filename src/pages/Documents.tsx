import { useState } from 'react';
import { FileText, FileCheck2, Receipt, Download, FolderOpen, ScrollText } from 'lucide-react';
import { useStore, useLookups, money } from '../store';
import { parseDate } from '../data';
import { Btn, Card, Chip, Empty, Kpi, FilterBar, applyFlt, useFlt, yearsOf, When } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { InvoiceModal, JobReportModal, StatementModal, invoiceView, quoteView, downloadPdf, balanceOf } from './lib';

type Kind = 'Certificate' | 'Job report' | 'Quote' | 'Invoice' | 'Statement' | 'Terms';
interface Doc { id: string; name: string; kind: Kind; home: string; date: string; note: string; open: () => void }

/** Every document for the agent: safety certificates from LSP's work, job reports with photos, quotes, invoices, statements and terms. */
export function Documents() {
  const s = useStore(); const L = useLookups(); const [f, setF] = useFlt();
  const [m, setM] = useState('');
  const home = (id: string) => L.prop(id)?.address ?? '';
  const docs: Doc[] = [
    ...s.jobs.filter(j => j.cert && ['Approved', 'Invoiced'].includes(j.status)).map(j => ({ id: 'c' + j.id, name: j.cert!.name, kind: 'Certificate' as Kind, home: home(j.property), date: j.events[j.events.length - 1].at, note: `${j.cert!.file}${j.cert!.expires ? ` · valid until ${j.cert!.expires}` : ''}`, open: () => { s.log(`Downloaded ${j.cert!.name} for ${home(j.property)}`, 'Documents'); downloadPdf(s, j.cert!.name); } })),
    ...s.jobs.filter(j => j.proof?.length && j.status !== 'Declined').map(j => ({ id: 'r' + j.id, name: `Job report · ${j.title}`, kind: 'Job report' as Kind, home: home(j.property), date: j.events[j.events.length - 1].at, note: `${j.proof!.length} photos · every step with date and time`, open: () => setM('rep:' + j.id) })),
    ...s.jobs.filter(j => j.quoteNo).map(j => ({ id: 'q' + j.id, name: `Quote ${j.quoteNo} · ${j.title}`, kind: 'Quote' as Kind, home: home(j.property), date: j.quoted ?? j.reported, note: `${money(j.price)} · ${quoteView(j).label}`, open: () => s.go('quotes', j.id) })),
    ...s.invoices.map(i => ({ id: 'i' + i.id, name: `Invoice ${i.id}`, kind: 'Invoice' as Kind, home: i.site ?? '', date: i.issued, note: `${money(i.amount)} · ${invoiceView(i).label}`, open: () => setM('inv:' + i.id) })),
    { id: 'st', name: 'Statement of account', kind: 'Statement' as Kind, home: 'All homes', date: '15 Oct 2026', note: `Balance ${money(balanceOf(s).owed)}`, open: () => setM('stmt') },
    { id: 'tb', name: 'LSP terms of business for letting agents', kind: 'Terms' as Kind, home: 'All homes', date: s.me.joined, note: `Signed when ${s.me.name} joined · ${s.me.terms} payment terms`, open: () => { s.log('Downloaded the terms of business', 'Documents'); downloadPdf(s, 'Terms of business'); } },
  ].sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
  const list = applyFlt(docs, f, { text: d => `${d.name} ${d.home} ${d.note}`, type: d => d.kind, date: d => d.date });
  const icon = (k: Kind) => k === 'Certificate' ? <FileCheck2 size={15} /> : k === 'Invoice' ? <Receipt size={15} /> : k === 'Terms' ? <ScrollText size={15} /> : <FileText size={15} />;
  const n = (k: Kind) => docs.filter(d => d.kind === k).length;
  return <>
    <PageHeader crumbs={crumbsFor('documents', s.go)} title="Documents" />
    <div className="grid g4">
      <Kpi icon={<FileCheck2 size={18} />} tone="ok" label="Certificates" value={n('Certificate')} caption="from safety checks LSP did" onClick={() => setF({ ...f, type: 'Certificate' })} active={f.type === 'Certificate'} />
      <Kpi icon={<FileText size={18} />} tone="brand" label="Job reports" value={n('Job report')} caption="with photo proof" onClick={() => setF({ ...f, type: 'Job report' })} active={f.type === 'Job report'} />
      <Kpi icon={<FileText size={18} />} tone="info" label="Quotes" value={n('Quote')} caption="accepted, waiting and declined" onClick={() => setF({ ...f, type: 'Quote' })} active={f.type === 'Quote'} />
      <Kpi icon={<Receipt size={18} />} tone="warn" label="Invoices" value={n('Invoice')} caption="paid and to pay" onClick={() => setF({ ...f, type: 'Invoice' })} active={f.type === 'Invoice'} />
    </div>
    <Card title="All documents" sub="Search by name, home or number. Filter by type and year.">
      <FilterBar f={f} set={setF} placeholder="Search documents" types={['Certificate', 'Job report', 'Quote', 'Invoice', 'Statement', 'Terms']} typeLabel="All types" years={yearsOf(docs, d => d.date)} shown={list.length} total={docs.length} />
      <div className="tablewrap"><table className="t"><thead><tr><th>Document</th><th>Type</th><th>Home</th><th>Date</th><th /></tr></thead><tbody>
        {list.map(d => <tr key={d.id} onClick={d.open}>
          <td><span className="cell"><span className={`tile ${d.kind === 'Certificate' ? 't-ok' : d.kind === 'Invoice' ? 't-warn' : 't-brand'}`} style={{ width: 32, height: 32 }}>{icon(d.kind)}</span><span className="stack"><b className="strong">{d.name}</b><span className="caption">{d.note}</span></span></span></td>
          <td><Chip tone="neutral" dot={false}>{d.kind}</Chip></td><td>{d.home}</td><td><When at={d.date} /></td>
          <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}><Btn sm kind="ghost" icon={<Download size={14} />} onClick={d.open}>{d.kind === 'Certificate' || d.kind === 'Terms' ? 'Download' : 'Open'}</Btn></td></tr>)}
      </tbody></table>{!list.length && <Empty icon={<FolderOpen size={22} />}>No documents match.</Empty>}</div>
    </Card>
    {m.startsWith('inv:') && <InvoiceModal id={m.slice(4)} onClose={() => setM('')} />}
    {m.startsWith('rep:') && <JobReportModal j={s.jobs.find(j => j.id === m.slice(4))!} onClose={() => setM('')} />}
    {m === 'stmt' && <StatementModal onClose={() => setM('')} />}
  </>;
}
