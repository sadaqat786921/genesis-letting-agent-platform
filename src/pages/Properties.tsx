import { useState } from 'react';
import { Home, Wrench, Plus, KeyRound, Phone, FileText, Receipt, Pencil, Archive, RotateCcw, FileCheck2, Clock, UserRound, ArrowRight } from 'lucide-react';
import { useStore, money } from '../store';
import { nowStamp, parseDate, type Property } from '../data';
import { ActionCard, Btn, Card, Chip, DetailHead, Empty, Field, KV, Kpi, Modal, Note, PageTabs, Select, Text, Area, Timeline, Confirm, PhotoPicker, Stat, When } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { RoomsCard } from './Rooms';
import { JobTable } from './Jobs';
import { needsMe, isOpen, homeType, adminName, quoteView, invoiceView, InvoiceModal, JobReportModal, MiniJobList, sendMsg, left, liveHomes, homeShare, r2 } from './lib';

export function Properties() {
  const s = useStore();
  if (s.detail === 'add') return <><PropertyList /><HomeModal onClose={() => s.go('properties')} /></>;
  if (s.detail && s.properties.some(p => p.id === s.detail)) return <PropertyPage id={s.detail} />;
  return <PropertyList />;
}

function HomeCard({ p }: { p: Property }) {
  const s = useStore();
  const jobs = s.jobs.filter(j => j.property === p.id); const open = jobs.filter(isOpen).length; const q = jobs.filter(needsMe).length;
  const owed = r2(s.invoices.reduce((a, i) => a + left(i) * homeShare(s, i, p), 0));
  return <button className="kcard pcard" onClick={() => s.go('properties', p.id)}>
    <div className="photo" style={{ height: 140, backgroundImage: `url(${p.photo})` }}><span className="flex" style={{ gap: 6 }}>{p.archived ? <Chip tone="neutral">Removed</Chip> : <Chip tone={p.status === 'Let' ? 'ok' : 'warn'}>{p.status}</Chip>}</span></div>
    <div className="stack"><b style={{ fontSize: 14 }}>{p.address}</b><span className="caption">{p.area} {p.postcode} · {homeType(p)}</span></div>
    <div className="flex between"><span className="small">{p.occupier ? p.occupier.name : 'Empty'}</span>{p.ref && <b className="small" style={{ color: 'var(--text-brand)' }}>{p.ref}</b>}</div>
    <div className="pstats">
      <span className={open ? 'soon' : 'good'}><Wrench size={13} />{open ? `${open} open job${open > 1 ? 's' : ''}` : 'No open jobs'}</span>
      {q > 0 && <span className="bad"><Clock size={13} />{q} quote{q > 1 ? 's' : ''} to accept</span>}
      <span className={owed ? 'soon' : 'good'}><Receipt size={13} />{owed ? `${money(owed)} to pay` : 'Nothing to pay'}</span>
      <span><KeyRound size={13} />{p.keys.length > 34 ? p.keys.slice(0, 34) + '…' : p.keys}</span>
    </div>
  </button>;
}

function PropertyList() {
  const s = useStore();
  const [tab, setTab] = useState<'live' | 'let' | 'empty' | 'gone'>('live');
  const live = liveHomes(s); const gone = s.properties.filter(p => p.archived);
  const list = tab === 'gone' ? gone : tab === 'let' ? live.filter(p => p.status === 'Let') : tab === 'empty' ? live.filter(p => p.status === 'Vacant') : live;
  return <>
    <PageHeader crumbs={crumbsFor('properties', s.go)} title="Homes" action={<div className="flex"><Btn kind="outline" icon={<Wrench size={18} />} onClick={() => s.go('jobs', 'new')}>Book a job</Btn><Btn icon={<Plus size={18} />} onClick={() => s.go('properties', 'add')}>Add a home</Btn></div>} />
    <div className="grid g4">
      <Kpi icon={<Home size={18} />} tone="brand" label="Your homes" value={live.length} caption="LSP does contractor work here" active={tab === 'live'} onClick={() => setTab('live')} />
      <Kpi icon={<UserRound size={18} />} tone="ok" label="Let" value={live.filter(p => p.status === 'Let').length} caption="someone living there" active={tab === 'let'} onClick={() => setTab('let')} />
      <Kpi icon={<KeyRound size={18} />} tone="warn" label="Empty" value={live.filter(p => p.status === 'Vacant').length} caption="between tenants" active={tab === 'empty'} onClick={() => setTab('empty')} />
      <Kpi icon={<Wrench size={18} />} tone="info" label="Open jobs" value={s.jobs.filter(isOpen).length} caption={`across ${new Set(s.jobs.filter(isOpen).map(j => j.property)).size} homes`} onClick={() => s.go('jobs')} />
    </div>
    <Card title="Your homes" sub="Homes you look after for your landlords. You manage the tenants and the rent; LSP does the jobs you book, with a quote first." action={<PageTabs value={tab} onChange={setTab} items={[{ id: 'live', label: 'All', count: live.length }, { id: 'let', label: 'Let' }, { id: 'empty', label: 'Empty' }, { id: 'gone', label: 'Removed', count: gone.length }]} />}>
      <div className="grid g3">{list.map(p => <HomeCard key={p.id} p={p} />)}
        {tab === 'live' && <button className="kcard roomadd" onClick={() => s.go('properties', 'add')}><span className="tile t-brand" style={{ width: 40, height: 40 }}><Plus size={18} /></span><b>Add a home</b><span className="caption">Address, access and who lives there</span></button>}</div>
      {!list.length && tab !== 'live' && <Empty icon={<Home size={22} />}>No homes here.</Empty>}
    </Card>
  </>;
}

/** Add or edit a home. Added homes go straight onto the agent's list and LSP is told. */
function HomeModal({ p, onClose }: { p?: Property; onClose: () => void }) {
  const s = useStore();
  const [f, setF] = useState({ address: p?.address ?? '', area: p?.area ?? '', postcode: p?.postcode ?? '', type: p?.type ?? 'Flat', beds: String(p?.beds ?? 2), baths: String(p?.baths ?? 1), rooms: String(p?.rooms ?? 5), ref: p?.ref ?? '', landlord: p?.landlord ?? '', status: p?.status ?? 'Let', oName: p?.occupier?.name ?? '', oPhone: p?.occupier?.phone ?? '', keys: p?.keys ?? '', notes: p?.notes ?? '', photo: p?.photo ?? '', gas: p?.gas ?? true });
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const dupe = !p && s.properties.some(x => x.address.toLowerCase().replace(/\W/g, '') === f.address.toLowerCase().replace(/\W/g, '') && x.postcode.replace(/\s/g, '').toLowerCase() === f.postcode.replace(/\s/g, '').toLowerCase());
  const ok = f.address.trim() && f.postcode.trim() && f.keys.trim() && !dupe && (f.status === 'Vacant' || f.oName.trim());
  const save = () => {
    const data: Partial<Property> = { address: f.address.trim(), area: f.area.trim() || 'London', postcode: f.postcode.trim().toUpperCase(), type: f.type as Property['type'], beds: +f.beds || 1, baths: +f.baths || 1, rooms: f.type === 'HMO' ? +f.rooms || undefined : undefined, ref: f.ref.trim() || undefined, landlord: f.landlord.trim() || undefined, status: f.status as Property['status'], occupier: f.status === 'Let' && f.oName.trim() ? { name: f.oName.trim(), phone: f.oPhone.trim() } : undefined, keys: f.keys.trim(), notes: f.notes.trim() || undefined, photo: f.photo || 'images/home2.jpg', gas: f.gas };
    if (p) { s.setProperties(ps => ps.map(x => x.id === p.id ? { ...x, ...data } : x)); s.log(`Updated the details of ${data.address}`, 'Homes'); s.toast('Saved'); onClose(); return; }
    const id = 'P' + (Date.now() % 100000);
    s.setProperties(ps => [...ps, { id, owner: s.me.id, admin: s.me.admin, added: nowStamp().split(',')[0], ...data } as Property]);
    sendMsg(s, `New home added · ${data.address}`, `We added ${data.address}, ${data.postcode} to our homes on the portal.`);
    s.log(`Added a home: ${data.address}, ${data.postcode}`, 'Homes'); s.toast('Home added. LSP has been told.'); onClose(); s.go('properties', id);
  };
  return <Modal wide title={p ? `Edit ${p.address}` : 'Add a home'} sub={p ? 'Changes are saved on the home and used for every new job.' : 'A home you look after for a landlord. LSP does jobs here when you book them, with a quote first.'} onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={p ? <Pencil size={16} /> : <Plus size={16} />} disabled={!ok} onClick={save}>{p ? 'Save changes' : 'Add home'}</Btn></>}>
    <div className="grid g2">
      <Field label="Address"><Text value={f.address} onChange={set('address')} placeholder="e.g. Flat 2, 10 Hornsey Road" /></Field>
      <div className="grid g2" style={{ gap: 12 }}><Field label="Area"><Text value={f.area} onChange={set('area')} placeholder="e.g. Holloway, London" /></Field><Field label="Postcode"><Text value={f.postcode} onChange={set('postcode')} placeholder="N7 7AA" /></Field></div>
    </div>
    {dupe && <Note tone="err">This address and postcode are already in your homes.</Note>}
    <div className="grid g4" style={{ gap: 12 }}>
      <Field label="Type"><Select value={f.type} onChange={set('type')} options={[{ value: 'Flat', label: 'Flat' }, { value: 'House', label: 'House' }, { value: 'HMO', label: 'Shared house (HMO)' }]} /></Field>
      {f.type === 'HMO' ? <Field label="Lettable rooms"><Text value={f.rooms} onChange={set('rooms')} /></Field> : <Field label="Bedrooms"><Text value={f.beds} onChange={set('beds')} /></Field>}
      <Field label="Bathrooms"><Text value={f.baths} onChange={set('baths')} /></Field>
      <Field label="Gas supply"><Select value={f.gas ? 'yes' : 'no'} onChange={v => setF({ ...f, gas: v === 'yes' })} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No gas' }]} /></Field>
    </div>
    <div className="grid g2">
      <Field label="Your reference for this home"><Text value={f.ref} onChange={set('ref')} placeholder="e.g. RW-1400" /></Field>
      <Field label="Landlord (name only)" hint="LSP does not contact your landlord."><Text value={f.landlord} onChange={set('landlord')} placeholder="e.g. Mr P. Andrews" /></Field>
    </div>
    <div className="grid g3" style={{ gap: 12 }}>
      <Field label="Is someone living there"><Select value={f.status} onChange={set('status')} options={[{ value: 'Let', label: 'Yes, it is let' }, { value: 'Vacant', label: 'No, it is empty' }]} /></Field>
      {f.status === 'Let' && <><Field label="Tenant to call for access"><Text value={f.oName} onChange={set('oName')} /></Field><Field label="Their phone"><Text value={f.oPhone} onChange={set('oPhone')} /></Field></>}
    </div>
    <Field label="Access and keys" hint="How the contractor gets in. Used on every job unless you change it."><Text value={f.keys} onChange={set('keys')} placeholder="e.g. Key safe by the door, code given on the day" /></Field>
    <Field label="Notes for LSP"><Area value={f.notes} onChange={set('notes')} placeholder="Parking, alarms, pets, anything the contractor should know" /></Field>
    <Field label="Photo of the home"><PhotoPicker value={f.photo} onChange={v => setF({ ...f, photo: v })} /></Field>
  </Modal>;
}

type PTab = 'overview' | 'rooms' | 'jobs' | 'money' | 'documents' | 'history';
function PropertyPage({ id }: { id: string }) {
  const s = useStore(); const p = s.properties.find(x => x.id === id)!;
  const [tab, setTab] = useState<PTab>('overview'); const [m, setM] = useState<'' | 'edit' | 'remove' | 'restore' | string>('');
  const jobs = s.jobs.filter(j => j.property === id); const open = jobs.filter(isOpen);
  const quotes = jobs.filter(j => j.quoteNo);
  const invs = s.invoices.filter(i => homeShare(s, i, p) > 0);
  const owed = r2(invs.reduce((a, i) => a + left(i) * homeShare(s, i, p), 0));
  const spent = r2(invs.reduce((a, i) => a + i.paid * homeShare(s, i, p), 0));
  const docs = [
    ...jobs.filter(j => j.cert && ['Approved', 'Invoiced'].includes(j.status)).map(j => ({ id: 'c' + j.id, name: j.cert!.name, kind: 'Certificate', at: j.events[j.events.length - 1].at, note: `${j.cert!.file}${j.cert!.expires ? ` · valid until ${j.cert!.expires}` : ''}`, open: () => s.go('jobs', j.id) })),
    ...jobs.filter(j => j.proof?.length && j.status !== 'Declined').map(j => ({ id: 'r' + j.id, name: `Job report · ${j.title}`, kind: 'Job report', at: j.events[j.events.length - 1].at, note: `${j.proof!.length} photos`, open: () => setM('rep:' + j.id) })),
    ...quotes.map(j => ({ id: 'q' + j.id, name: `Quote ${j.quoteNo} · ${j.title}`, kind: 'Quote', at: j.quoted ?? j.reported, note: `${money(j.price)} · ${quoteView(j).label}`, open: () => s.go('quotes', j.id) })),
    ...invs.map(i => ({ id: 'i' + i.id, name: `Invoice ${i.id}`, kind: 'Invoice', at: i.issued, note: `${money(i.amount)} · ${invoiceView(i).label}`, open: () => setM('inv:' + i.id) })),
  ].sort((a, b) => parseDate(b.at).getTime() - parseDate(a.at).getTime());
  const hist = [...jobs.flatMap(j => j.events.map(e => ({ at: e.at, text: `${j.title}: ${e.text}`, by: e.by }))), ...s.activity.filter(a => a.what.includes(p.address) && !jobs.some(j => a.what.includes(j.title))).map(a => ({ at: a.at, text: a.what, by: a.who }))]
    .sort((a, b) => parseDate(b.at).getTime() - parseDate(a.at).getTime());
  const rooms = s.rooms.filter(r => r.property === id).length;
  return <>
    <PageHeader crumbs={crumbsFor('properties', s.go, p.address)} back={() => s.go('properties')} title={p.address}
      action={<div className="flex"><Btn kind="outline" icon={<Pencil size={16} />} onClick={() => setM('edit')}>Edit details</Btn>{!p.archived && <Btn icon={<Wrench size={16} />} onClick={() => s.go('jobs', `new~${id}`)}>Book a job here</Btn>}</div>} />
    <DetailHead media={<span className="photo" style={{ width: 120, height: 88, borderRadius: 16, flex: 'none', backgroundImage: `url(${p.photo})` }} />} title={p.address}
      chips={<>{p.archived ? <Chip tone="neutral">Removed {p.archived}</Chip> : <Chip tone={p.status === 'Let' ? 'ok' : 'warn'}>{p.status}</Chip>}<Chip tone="neutral" dot={false}>{homeType(p)}</Chip>{p.ref && <Chip tone="brand" dot={false}>{p.ref}</Chip>}</>}
      meta={[['Area', `${p.area} ${p.postcode}`], ['Landlord', p.landlord ?? '—'], ['Added', p.added], ['LSP contact', adminName(s, p.admin)]]} />
    <div className="grid g4"><Stat label="Open jobs" value={open.length} tone={open.length ? 'info' : 'ok'} /><Stat label="Quotes to accept" value={jobs.filter(needsMe).length} tone={jobs.filter(needsMe).length ? 'warn' : 'ok'} /><Stat label="To pay" value={money(owed)} tone={owed ? 'warn' : 'ok'} /><Stat label="Paid to LSP this year" value={money(spent)} /></div>
    <PageTabs value={tab} onChange={setTab} items={[{ id: 'overview', label: 'Overview' }, { id: 'rooms', label: 'Rooms', count: rooms }, { id: 'jobs', label: 'Jobs', count: jobs.length }, { id: 'money', label: 'Quotes & invoices', count: quotes.length + invs.length }, { id: 'documents', label: 'Documents', count: docs.length }, { id: 'history', label: 'History' }]} />
    {tab === 'overview' && <div className="dgrid">
      <div className="col">
        <Card title="Getting in" sub="Used on every job at this home unless you change it when you book." action={<Btn sm kind="ghost" icon={<Pencil size={14} />} onClick={() => setM('edit')}>Edit</Btn>}>
          <div className="lrow"><KeyRound size={18} color="var(--text-brand)" /><div className="stack grow"><b>Access and keys</b><span className="caption">{p.keys}</span></div></div>
          <div className="lrow"><Phone size={18} color="var(--text-brand)" /><div className="stack grow"><b>{p.occupier ? p.occupier.name : 'Nobody living there'}</b><span className="caption">{p.occupier ? `${p.occupier.phone ? p.occupier.phone + ' · ' : ''}LSP calls them to book visits` : 'Empty home: use the keys above'}</span></div></div>
          {p.notes && <Note>{p.notes}</Note>}
        </Card>
        <Card title="Jobs under way" action={<Btn sm kind="ghost" onClick={() => setTab('jobs')}>All jobs</Btn>}><MiniJobList jobs={open} empty="No open jobs at this home." /></Card>
        <Card title="About the home"><KV rows={[['Type', homeType(p)], ['Bathrooms', String(p.baths)], ['Gas supply', p.gas ? 'Yes' : 'No gas'], ['Your reference', p.ref ?? '—'], ['Landlord', p.landlord ?? '—'], ['With LSP since', p.added]]} /></Card>
      </div>
      <div className="col">
        {p.archived ? <ActionCard tone="neutral" title="Removed from your homes" text={`Removed on ${p.archived}. LSP takes no new jobs here. Its jobs, quotes, invoices and documents are kept.`}><Btn block kind="outline" icon={<RotateCcw size={16} />} onClick={() => setM('restore')}>Add it back</Btn></ActionCard>
          : <ActionCard title="Need something done?" text={`Book a job and ${adminName(s, p.admin)} sends you a quote. Nothing is booked until you accept it.`}><Btn block icon={<Wrench size={16} />} onClick={() => s.go('jobs', `new~${id}`)}>Book a job here</Btn><Btn block kind="outline" icon={<FileCheck2 size={16} />} onClick={() => s.go('services')}>Safety checks and services</Btn></ActionCard>}
        <Card title="What LSP does here"><KV rows={[['You look after', 'Tenants, rent, deposits and the landlord'], ['LSP does', 'The jobs you book, with checked contractors'], ['How you pay', `A quote first, then an invoice (${s.me.terms})`]]} /></Card>
        {!p.archived && <button className="btn ghost sm" onClick={() => setM('remove')}><Archive size={14} /> Remove this home</button>}
      </div>
    </div>}
    {tab === 'rooms' && <RoomsCard p={p as never} title="Rooms" />}
    {tab === 'jobs' && <Card title="Jobs at this home" action={!p.archived && <Btn sm icon={<Plus size={14} />} onClick={() => s.go('jobs', `new~${id}`)}>Book a job</Btn>}><JobTable list={jobs} hideHome /></Card>}
    {tab === 'money' && <div className="col">
      <Card title="Quotes"><div className="divlist">{quotes.map(j => <button key={j.id} className="item click" onClick={() => s.go('quotes', j.id)}><span className={`tile ${needsMe(j) ? 't-warn' : 't-brand'}`} style={{ width: 32, height: 32 }}><FileText size={15} /></span><div className="stack grow"><b>{j.quoteNo} · {j.title}</b><span className="caption">Sent {j.quoted?.split(',')[0]} · valid until {j.validUntil}</span></div><b>{money(j.price)}</b><Chip tone={quoteView(j).tone}>{quoteView(j).label}</Chip></button>)}</div>{!quotes.length && <Empty icon={<FileText size={22} />}>No quotes yet.</Empty>}</Card>
      <Card title="Invoices"><div className="divlist">{invs.map(i => <button key={i.id} className="item click" onClick={() => setM('inv:' + i.id)}><span className="tile t-info" style={{ width: 32, height: 32 }}><Receipt size={15} /></span><div className="stack grow"><b>{i.id}</b><span className="caption">Issued {i.issued} · due {i.due}</span></div><b>{money(i.amount)}</b><Chip tone={invoiceView(i).tone}>{invoiceView(i).label}</Chip></button>)}</div>{!invs.length && <Empty icon={<Receipt size={22} />}>No invoices yet.</Empty>}</Card>
    </div>}
    {tab === 'documents' && <Card title="Documents" sub="Certificates, job reports, quotes and invoices for this home."><div className="divlist">{docs.map(d => <button key={d.id} className="item click" onClick={d.open}><span className={`tile ${d.kind === 'Certificate' ? 't-ok' : 't-brand'}`} style={{ width: 32, height: 32 }}>{d.kind === 'Certificate' ? <FileCheck2 size={15} /> : <FileText size={15} />}</span><div className="stack grow"><b>{d.name}</b><span className="caption">{d.kind} · {d.note}</span></div><When at={d.at} /><ArrowRight size={16} color="#98A2B3" /></button>)}</div>{!docs.length && <Empty icon={<FileText size={22} />}>No documents yet.</Empty>}</Card>}
    {tab === 'history' && <Card title="History" sub="Every step on every job here, with the date and time.">{hist.length ? <Timeline items={hist} /> : <span className="caption">Nothing yet.</span>}</Card>}
    {m === 'edit' && <HomeModal p={p} onClose={() => setM('')} />}
    {m === 'remove' && <Confirm title={`Remove ${p.address}?`} sub={open.length ? 'Finish or cancel its open jobs first.' : 'LSP takes no new jobs here. Its jobs, quotes, invoices and documents are kept, and you can add it back.'} cta="Remove home" danger onClose={() => setM('')} onConfirm={() => { if (open.length) { s.toast('Finish or cancel the open jobs first'); setM(''); return; } const at = nowStamp().split(',')[0]; s.setProperties(ps => ps.map(x => x.id === id ? { ...x, archived: at } : x)); sendMsg(s, `Home removed · ${p.address}`, `We no longer look after ${p.address}. Please take no new jobs there.`); s.log(`Removed ${p.address} from your homes`, 'Homes'); s.toast('Home removed. LSP has been told.'); setM(''); }}>{open.length > 0 && <Note tone="err">{open.length} open job{open.length > 1 ? 's' : ''}: {open.map(j => j.title).join(', ')}.</Note>}</Confirm>}
    {m === 'restore' && <Confirm title={`Add ${p.address} back?`} sub="You can book jobs here again." cta="Add it back" onClose={() => setM('')} onConfirm={() => { s.setProperties(ps => ps.map(x => x.id === id ? { ...x, archived: undefined } : x)); s.log(`Added ${p.address} back to your homes`, 'Homes'); s.toast('Home added back'); setM(''); }} />}
    {m.startsWith('inv:') && <InvoiceModal id={m.slice(4)} onClose={() => setM('')} />}
    {m.startsWith('rep:') && <JobReportModal j={s.jobs.find(j => j.id === m.slice(4))!} onClose={() => setM('')} />}
  </>;
}
