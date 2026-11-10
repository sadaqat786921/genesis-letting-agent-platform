import { useState } from 'react';
import { Building2, ShieldCheck, Pencil, Send, KeyRound, LogOut, FileText, UserPlus, Trash2, Mail, Hash } from 'lucide-react';
import { useStore } from '../store';
import { nowStamp, LSP_PHONE, type Member, type TeamRole } from '../data';
import { Btn, Card, Chip, Field, KV, Modal, Note, Text, Avatar, Select, Confirm } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { myAdmin, downloadPdf } from './lib';
import { RequestModal } from './Messages';

const ROLE_SUB: Record<TeamRole, string> = { Admin: 'Everything, including the team and account', 'Property manager': 'Book jobs, accept quotes, homes and messages', Accounts: 'Invoices, payments and statements' };
const GETS = ['Quotes', 'Invoices', 'Job updates'] as const;

export function Account() {
  const s = useStore(); const admin = s.user.role === 'Admin';
  const [m, setM] = useState<'' | 'company' | 'password' | 'invite' | 'billing' | 'close' | string>('');
  const setTeam = (fn: (t: Member[]) => Member[]) => s.setMe(a => ({ ...a, team: fn(a.team) }));
  return <>
    <PageHeader crumbs={crumbsFor('account', s.go)} title="Account & Team" />
    <div className="grid g2">
      <Card title="Your agency" action={admin && <Btn sm kind="ghost" icon={<Pencil size={14} />} onClick={() => setM('company')}>Edit</Btn>}>
        <div className="flex"><Avatar name={s.me.name} size="lg" /><div className="stack"><b style={{ fontSize: 15 }}>{s.me.name}</b><span className="caption">Letting agent · with LSP since {s.me.joined}</span></div><Chip tone="ok">{s.me.status}</Chip></div>
        <KV rows={[['Main contact', s.me.contact], ['Email', s.me.email], ['Phone', s.me.phone], ['Office', s.me.address], ['Company number', s.me.companyNo], ['LSP contact', myAdmin(s)?.name ?? 'LSP']]} />
      </Card>
      <Card title="Billing" action={admin && <Btn sm kind="ghost" icon={<Send size={14} />} onClick={() => setM('billing')}>Ask to change</Btn>}>
        <KV rows={[['Invoices to', s.me.billing.name], ['Invoice email', s.me.billing.email], ['Billing address', s.me.billing.address], ['Payment terms', s.me.terms]]} />
        <label className="item" style={{ cursor: admin ? 'pointer' : 'default', padding: '8px 0' }}><Hash size={18} color="var(--text-brand)" /><div className="stack grow"><b>Order number on every job</b><span className="caption">Your team must add an order number when booking a job or accepting a quote. It shows on the invoice.</span></div><input type="checkbox" checked={s.me.poRequired} disabled={!admin} aria-label="Order number on every job" onChange={() => { s.setMe(a => ({ ...a, poRequired: !a.poRequired })); s.log(`${s.me.poRequired ? 'Turned off' : 'Turned on'}: order number on every job`, 'Account'); s.toast('Saved'); }} /></label>
        <span className="caption">Billing details and payment terms are changed by LSP, so you send a request.</span>
      </Card>
    </div>
    <Card title="Your team" sub="Everyone at your agency who can sign in. Choose what each person can do and what LSP emails them." action={admin && <Btn sm icon={<UserPlus size={14} />} onClick={() => setM('invite')}>Invite someone</Btn>}>
      <div className="tablewrap"><table className="t"><thead><tr><th>Person</th><th>Role</th><th>Gets emails about</th><th>Status</th><th /></tr></thead><tbody>
        {s.me.team.map(t => <tr key={t.id} style={{ cursor: 'default' }}>
          <td><span className="cell"><Avatar name={t.name} photo={t.photo} /><span className="stack"><b className="strong">{t.name}{t.id === s.user.id ? ' (you)' : ''}</b><span className="caption">{t.email} · {t.phone}</span></span></span></td>
          <td>{admin && t.id !== s.user.id ? <select className="input" style={{ height: 36, width: 170 }} value={t.role} aria-label={`Role for ${t.name}`} onChange={e => { const r = e.target.value as TeamRole; setTeam(ts => ts.map(x => x.id === t.id ? { ...x, role: r } : x)); s.log(`Changed ${t.name}'s role to ${r}`, 'Team'); s.toast('Role changed'); }}>{(['Admin', 'Property manager', 'Accounts'] as TeamRole[]).map(r => <option key={r}>{r}</option>)}</select> : <b className="small">{t.role}</b>}<div className="caption">{ROLE_SUB[t.role]}</div></td>
          <td><div className="flex wrap" style={{ gap: 6 }}>{GETS.map(g => <button key={g} className={`chip ${t.gets.includes(g) ? 'info' : 'neutral'}`} style={{ cursor: admin || t.id === s.user.id ? 'pointer' : 'default', border: 0 }} disabled={!admin && t.id !== s.user.id} onClick={() => { setTeam(ts => ts.map(x => x.id === t.id ? { ...x, gets: x.gets.includes(g) ? x.gets.filter(y => y !== g) : [...x.gets, g] } : x)); s.log(`${t.gets.includes(g) ? 'Stopped' : 'Started'} ${g.toLowerCase()} emails for ${t.name}`, 'Team'); }}>{t.gets.includes(g) ? '✓ ' : ''}{g}</button>)}</div></td>
          <td><Chip tone={t.status === 'Active' ? 'ok' : 'warn'}>{t.status}</Chip>{t.status === 'Invite sent' && <div className="caption">sent {t.joined}</div>}</td>
          <td style={{ textAlign: 'right' }}>{admin && t.id !== s.user.id && <div className="flex" style={{ justifyContent: 'flex-end', gap: 4 }}>{t.status === 'Invite sent' && <Btn sm kind="ghost" icon={<Mail size={14} />} onClick={() => { s.log(`Sent the invite to ${t.name} again`, 'Team'); s.toast(`Invite sent again to ${t.email}`); }}>Resend</Btn>}<Btn sm kind="ghost" icon={<Trash2 size={14} />} onClick={() => setM('rm:' + t.id)}>Remove</Btn></div>}</td>
        </tr>)}
      </tbody></table></div>
      {!admin && <span className="caption">Only an Admin can invite or remove people.</span>}
    </Card>
    <div className="grid g2">
      <Card title="Sign-in and security">
        <KV rows={[['Signed in as', `${s.user.name} · ${s.user.role}`], ['Sign-in email', s.user.email], ['Password', 'Last changed 10 Feb 2026'], ['Security code', `Texted to the phone ending ${s.user.phone.slice(-4)}`]]} />
        <div className="flex wrap"><Btn sm kind="outline" icon={<KeyRound size={14} />} onClick={() => setM('password')}>Change password</Btn><Btn sm kind="ghost" icon={<LogOut size={14} />} onClick={() => { s.log('Signed out of all other devices', 'Account'); s.toast('Signed out of other devices'); }}>Sign out other devices</Btn></div>
        <span className="caption"><ShieldCheck size={12} style={{ verticalAlign: -2 }} /> Five wrong codes lock the account. Call {LSP_PHONE} to unlock it.</span>
      </Card>
      <Card title="Terms and your data">
        <div className="lrow"><FileText size={18} color="var(--text-brand)" /><div className="stack grow"><b>Terms of business for letting agents</b><span className="caption">Agreed {s.me.joined} · {s.me.terms} payment terms</span></div><Btn sm kind="ghost" onClick={() => { s.log('Downloaded the terms of business', 'Documents'); downloadPdf(s, 'Terms of business'); }}>Download</Btn></div>
        <div className="flex wrap"><Btn sm kind="ghost" onClick={() => { s.log('Asked for a copy of our data', 'Account'); s.toast('Request sent. LSP will email your data.'); }}>Ask for a copy of our data</Btn>{admin && <Btn sm kind="ghost" onClick={() => setM('close')}>Ask to close the account</Btn>}</div>
        <span className="caption"><Building2 size={12} style={{ verticalAlign: -2 }} /> Help: message {myAdmin(s)?.name ?? 'LSP'} or call {LSP_PHONE}, Monday to Friday, 9am to 5:30pm.</span>
      </Card>
    </div>
    {m === 'company' && <CompanyModal onClose={() => setM('')} />}
    {m === 'invite' && <InviteModal onClose={() => setM('')} />}
    {m === 'billing' && <RequestModal kind="Billing details" onClose={() => setM('')} onSent={() => s.go('messages', 'requests')} />}
    {m === 'close' && <RequestModal kind="Close the account" onClose={() => setM('')} onSent={() => s.go('messages', 'requests')} />}
    {m.startsWith('rm:') && (() => { const t = s.me.team.find(x => x.id === m.slice(3))!; return <Confirm title={`Remove ${t.name}?`} sub="They can no longer sign in. Their jobs, quotes and messages stay on the account." cta="Remove" danger onClose={() => setM('')} onConfirm={() => { setTeam(ts => ts.filter(x => x.id !== t.id)); s.log(`Removed ${t.name} from the team`, 'Team'); s.toast(`${t.name} removed`); setM(''); }} />; })()}
    {m === 'password' && <Modal title="Change password" sub="At least 10 characters, with a number and a capital letter." onClose={() => setM('')} footer={<><Btn kind="outline" onClick={() => setM('')}>Cancel</Btn><Btn onClick={() => { s.log('Changed your password', 'Account'); s.toast('Password changed'); setM(''); }}>Save</Btn></>}>
      <Field label="Current password"><input className="input" type="password" defaultValue="••••••••••" /></Field><Field label="New password"><input className="input" type="password" /></Field><Field label="Type it again"><input className="input" type="password" /></Field></Modal>}
  </>;
}

function CompanyModal({ onClose }: { onClose: () => void }) {
  const s = useStore(); const [f, setF] = useState({ contact: s.me.contact, email: s.me.email, phone: s.me.phone, address: s.me.address });
  return <Modal title="Edit your agency's details" sub="Saved straight away. LSP sees the new details on your account." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn disabled={!f.email.includes('@')} onClick={() => { s.setMe(a => ({ ...a, ...f })); s.log('Updated the agency details', 'Account'); s.toast('Saved'); onClose(); }}>Save</Btn></>}>
    <Field label="Main contact"><Text value={f.contact} onChange={v => setF({ ...f, contact: v })} /></Field>
    <div className="grid g2"><Field label="Email"><Text value={f.email} onChange={v => setF({ ...f, email: v })} /></Field><Field label="Phone"><Text value={f.phone} onChange={v => setF({ ...f, phone: v })} /></Field></div>
    <Field label="Office address"><Text value={f.address} onChange={v => setF({ ...f, address: v })} /></Field>
  </Modal>;
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const s = useStore(); const [f, setF] = useState({ name: '', email: '', phone: '', role: 'Property manager' as TeamRole });
  const dupe = s.me.team.some(t => t.email.toLowerCase() === f.email.trim().toLowerCase());
  return <Modal title="Invite someone to the portal" sub="They get an email to set a password, then sign in with a code sent to their phone." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<UserPlus size={16} />} disabled={!f.name.trim() || !f.email.includes('@') || dupe} onClick={() => {
      const gets = f.role === 'Accounts' ? ['Invoices'] : f.role === 'Admin' ? ['Quotes', 'Invoices', 'Job updates'] : ['Quotes', 'Job updates'];
      s.setMe(a => ({ ...a, team: [...a.team, { id: 'TM' + Date.now(), name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), role: f.role, status: 'Invite sent', gets: gets as Member['gets'], joined: nowStamp().split(',')[0] }] }));
      s.log(`Invited ${f.name.trim()} to the portal as ${f.role.toLowerCase()}`, 'Team'); s.toast(`Invite sent to ${f.email.trim()}`); onClose();
    }}>Send invite</Btn></>}>
    <Field label="Full name"><Text value={f.name} onChange={v => setF({ ...f, name: v })} /></Field>
    <div className="grid g2"><Field label="Work email"><Text value={f.email} onChange={v => setF({ ...f, email: v })} /></Field><Field label="Mobile (for the security code)"><Text value={f.phone} onChange={v => setF({ ...f, phone: v })} /></Field></div>
    {dupe && <Note tone="err">Someone on your team already uses this email.</Note>}
    <Field label="Role" hint={ROLE_SUB[f.role]}><Select value={f.role} onChange={v => setF({ ...f, role: v as TeamRole })} options={(['Admin', 'Property manager', 'Accounts'] as TeamRole[]).map(r => ({ value: r, label: r }))} /></Field>
  </Modal>;
}
