import { useState } from 'react';
import { ShieldCheck, Wrench, Flame, Zap, Droplets, KeyRound, ClipboardList, Search, ArrowRight, Info } from 'lucide-react';
import { useStore, money } from '../store';
import { Btn, Card, Chip, Empty, MiniSearch, Note, Tabs } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';

/* What LSP can do for a letting agent, with guide prices. The real price is always on the quote, which the agent accepts first. */
type Group = 'Safety checks' | 'Repairs' | 'Tenancy changeover';
interface Service { name: string; group: Group; from: number; per?: string; desc: string; icon: typeof Wrench; often?: string }
export const SERVICES: Service[] = [
  { name: 'Gas safety certificate (CP12)', group: 'Safety checks', from: 85, desc: 'Yearly gas safety check by a Gas Safe engineer, 1 boiler and up to 3 appliances. Certificate added to your documents.', icon: Flame, often: 'Every year' },
  { name: 'Electrical safety check (EICR)', group: 'Safety checks', from: 180, desc: 'Electrical Installation Condition Report for a home up to 4 bedrooms, with the certificate.', icon: Zap, often: 'Every 5 years' },
  { name: 'Energy Performance Certificate (EPC)', group: 'Safety checks', from: 95, desc: 'EPC by an accredited assessor. Needed before you advertise a home.', icon: ShieldCheck, often: 'Every 10 years' },
  { name: 'Smoke and carbon monoxide alarms', group: 'Safety checks', from: 75, per: 'each', desc: 'Supply, fit and test alarms on every floor and in rooms with a gas appliance.', icon: ShieldCheck },
  { name: 'Fire risk assessment (shared houses)', group: 'Safety checks', from: 220, desc: 'For HMOs and communal areas, with the written report.', icon: ShieldCheck, often: 'Every year' },
  { name: 'Boiler service', group: 'Repairs', from: 140, desc: 'Yearly service of the boiler, with the service sheet.', icon: Flame, often: 'Every year' },
  { name: 'Plumbing repair', group: 'Repairs', from: 60, per: 'call-out + £45 an hour', desc: 'Leaks, taps, toilets, showers and blocked sinks. Parts on the quote.', icon: Droplets },
  { name: 'Electrical repair', group: 'Repairs', from: 60, per: 'call-out + £48 an hour', desc: 'Sockets, lights, fuse boards and extractor fans.', icon: Zap },
  { name: 'Heating repair', group: 'Repairs', from: 60, per: 'call-out + £60 an hour', desc: 'No heating or hot water, radiators and valves.', icon: Flame },
  { name: 'Damp and mould treatment', group: 'Repairs', from: 120, desc: 'Survey with moisture readings, then treatment and ventilation if needed.', icon: Droplets },
  { name: 'Lock change', group: 'Repairs', from: 145, desc: 'New euro cylinder and nightlatch with 3 sets of keys.', icon: KeyRound },
  { name: 'General handyman', group: 'Repairs', from: 45, per: 'an hour', desc: 'Doors, shelves, curtain rails, small fixes.', icon: Wrench },
  { name: 'Check-in inventory', group: 'Tenancy changeover', from: 75, desc: 'Room-by-room inventory with photos, meter readings and keys, signed on the day.', icon: ClipboardList },
  { name: 'Check-out inspection', group: 'Tenancy changeover', from: 75, desc: 'Compared with the check-in inventory, with photos, to help with the deposit.', icon: ClipboardList },
  { name: 'End of tenancy clean', group: 'Tenancy changeover', from: 180, desc: 'Full clean ready for the next tenants. Price depends on the size of the home.', icon: Wrench },
];
export function Services() {
  const s = useStore(); const [q, setQ] = useState(''); const [g, setG] = useState<'all' | Group>('all');
  const list = SERVICES.filter(x => (g === 'all' || x.group === g) && (x.name + ' ' + x.desc).toLowerCase().includes(q.toLowerCase()));
  const book = (name: string) => s.go('jobs', `new~~${encodeURIComponent(name)}`);
  return <>
    <PageHeader crumbs={crumbsFor('services', s.go)} title="Services & Prices" action={<Btn icon={<Wrench size={18} />} onClick={() => s.go('jobs', 'new')}>Book a job</Btn>} />
    <Card title="What LSP can do for you" sub="Guide prices. You always get a quote first and nothing is booked until you accept it."
      action={<div className="toolbar"><MiniSearch value={q} onChange={setQ} placeholder="Search services" /><Tabs value={g} onChange={setG} items={[{ id: 'all', label: 'All' }, { id: 'Safety checks', label: 'Safety checks' }, { id: 'Repairs', label: 'Repairs' }, { id: 'Tenancy changeover', label: 'Changeover' }]} /></div>}>
      <div className="grid g3">{list.map(x => { const Ic = x.icon; return <div key={x.name} className="kcard" style={{ cursor: 'default' }}>
        <div className="flex"><span className={`tile ${x.group === 'Safety checks' ? 't-ok' : x.group === 'Repairs' ? 't-info' : 't-brand'}`}><Ic size={18} /></span><div className="stack grow"><b>{x.name}</b><span className="caption">{x.group}{x.often ? ` · ${x.often}` : ''}</span></div></div>
        <span className="small" style={{ lineHeight: 1.5 }}>{x.desc}</span>
        <div className="flex between"><span><span className="caption">From </span><b style={{ fontSize: 18, color: 'var(--text-brand)' }}>{money(x.from)}</b>{x.per && <span className="caption"> {x.per}</span>}</span><Btn sm icon={<ArrowRight size={14} />} onClick={() => book(x.name)}>Book</Btn></div>
      </div>; })}</div>
      {!list.length && <Empty icon={<Search size={22} />}>No services match. Book a job and describe what you need.</Empty>}
    </Card>
    <div className="grid g2">
      <Note><Info size={13} style={{ verticalAlign: -2 }} /> Every contractor is checked by LSP: photo ID, right to work, insurance and trade certificates, all in date. Expired documents mean they cannot be booked.</Note>
      <Card className="flat"><span className="flex small" style={{ gap: 8 }}><Chip tone="ok">Certificates</Chip>Safety certificates from LSP's work are saved in Documents and on the home, with the end date.</span></Card>
    </div>
  </>;
}
