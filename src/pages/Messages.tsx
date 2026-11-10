import { useEffect, useState } from 'react';
import { Send, MessageSquare, Mail, Inbox, CheckCircle2, Clock, Plus } from 'lucide-react';
import { useStore } from '../store';
import { ME_NAME, LSP_PHONE, nowStamp, parseDate, type ReqKind } from '../data';
import { Btn, Card, Chip, Empty, Field, Area, Select, Note, PageTabs, When, Avatar, Modal, Text } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { myAdmin, DemoAnswer, lspSays } from './lib';

const TOPICS = ['General', 'A job', 'A quote', 'An invoice or payment', 'A home', 'Our account'];
const KINDS: ReqKind[] = ['Add a home', 'Stop work at a home', 'Billing details', 'Payment terms', 'Order numbers', 'Close the account', 'Other'];

export function Messages() {
  const s = useStore(); const admin = myAdmin(s);
  const [tab, setTab] = useState<'messages' | 'requests'>(s.detail === 'requests' ? 'requests' : 'messages');
  const [topic, setTopic] = useState(TOPICS[0]); const [text, setText] = useState(''); const [ask, setAsk] = useState(false);
  const all = [...s.me.comms].sort((a, b) => parseDate(b.at).getTime() - parseDate(a.at).getTime());
  const mine = (by: string) => s.me.team.some(m => m.name === by);
  const unread = all.filter(c => !mine(c.by) && !s.read.includes(c.id)).map(c => c.id);
  useEffect(() => { if (unread.length) { const t = setTimeout(() => s.markRead(unread), 1500); return () => clearTimeout(t); } }, [unread.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const send = () => {
    s.setMe(a => ({ ...a, comms: [...a.comms, { id: 'cm' + Date.now(), at: nowStamp(), by: ME_NAME, channel: 'Portal', dir: 'in', subject: topic, text: text.trim() }] }));
    s.log(`Sent a message: ${topic}`, 'Messages'); s.toast(`Sent to ${admin?.name ?? 'LSP'}`); setText('');
  };
  const waiting = s.requests.filter(r => r.status === 'Sent');
  return <>
    <PageHeader crumbs={crumbsFor('messages', s.go)} title="Messages" action={<Btn kind="outline" icon={<Plus size={18} />} onClick={() => setAsk(true)}>New request</Btn>} />
    <PageTabs value={tab} onChange={setTab} items={[{ id: 'messages', label: 'Messages with LSP', count: all.length }, { id: 'requests', label: 'Requests', count: s.requests.length }]} />
    {tab === 'messages' && <div className="dgrid">
      <Card title="Conversation" sub="Emails and portal messages between your team and LSP, newest first. Every message keeps its date and time.">
        {all.length ? <div className="divlist">{all.map(c => { const me = mine(c.by); const isNew = unread.includes(c.id); return <div key={c.id} className="item" style={{ alignItems: 'flex-start' }}>
          {me ? <Avatar name={c.by} photo={s.me.team.find(m => m.name === c.by)?.photo} /> : <img className="avatar" src={s.staff.find(x => x.name === c.by)?.photo ?? 'images/av3.jpg'} alt="" />}
          <div className="stack grow" style={{ gap: 4 }}>
            <div className="flex wrap" style={{ gap: 8 }}><b>{c.by === ME_NAME ? 'You' : c.by}</b><span className="caption">{me ? s.me.name : 'LSP'} · {c.channel === 'Email' ? <><Mail size={11} style={{ verticalAlign: -1 }} /> Email</> : 'Portal message'}</span>{isNew && <Chip tone="info">New</Chip>}</div>
            {c.subject && <b className="small" style={{ color: 'var(--text-primary)' }}>{c.subject}</b>}
            <span className="small" style={{ lineHeight: 1.55 }}>{c.text}</span>
          </div>
          <When at={c.at} />
        </div>; })}</div> : <Empty icon={<MessageSquare size={22} />}>No messages yet.</Empty>}
      </Card>
      <div className="col">
        <Card title="Send a message" sub={`Goes to ${admin?.name ?? 'LSP'}, who handles your jobs. Replies come here and by email to everyone on your team who gets them.`}>
          <Field label="About"><Select value={topic} onChange={setTopic} options={TOPICS.map(t => ({ value: t, label: t }))} /></Field>
          <Field label="Message"><Area value={text} onChange={setText} placeholder="Type your message" /></Field>
          <Btn icon={<Send size={16} />} disabled={!text.trim()} onClick={send}>Send</Btn>
        </Card>
        {admin && <Card title="Your LSP contact"><div className="flex"><img className="avatar md" src={admin.photo ?? 'images/av3.jpg'} alt="" /><div className="stack grow"><b>{admin.name}</b><span className="caption">Office Admin · {admin.phone}</span></div></div></Card>}
        <Note>Emergency, like a leak or no heating? Call LSP on {LSP_PHONE}.</Note>
      </div>
    </div>}
    {tab === 'requests' && <div className="dgrid">
      <Card title="Requests" sub="Changes you asked LSP to make to your account. Every answer keeps its date and time." action={<Btn sm icon={<Plus size={14} />} onClick={() => setAsk(true)}>New request</Btn>}>
        {s.requests.length ? <div className="divlist">{[...s.requests].sort((a, b) => parseDate(b.at).getTime() - parseDate(a.at).getTime()).map(q => <div key={q.id} className="item" style={{ alignItems: 'flex-start' }}>
          <span className={`tile ${q.status === 'Done' ? 't-ok' : q.status === 'Declined' ? 't-neutral' : 't-info'}`} style={{ width: 32, height: 32 }}>{q.status === 'Sent' ? <Clock size={15} /> : q.status === 'Done' ? <CheckCircle2 size={15} /> : <Inbox size={15} />}</span>
          <div className="stack grow" style={{ gap: 4 }}><b>{q.title}</b><span className="caption">{q.kind} · sent by {q.by} on {q.at}</span><span className="small">{q.about}</span>{q.reply && <span className="small" style={{ color: 'var(--text-primary)' }}>LSP: {q.reply} <span className="caption">({q.answered})</span></span>}</div>
          <Chip tone={q.status === 'Done' ? 'ok' : q.status === 'Declined' ? 'neutral' : 'info'}>{q.status === 'Sent' ? 'Waiting for LSP' : q.status}</Chip>
        </div>)}</div> : <Empty icon={<Inbox size={22} />}>No requests yet.</Empty>}
      </Card>
      <div className="col">
        <Card title="What you can ask"><span className="small" style={{ lineHeight: 1.6 }}>Billing details, payment terms, order numbers on every job, stopping work at a home or closing the account. Add a home yourself from Homes.</span></Card>
        {waiting.length > 0 && <DemoAnswer note="In the live product the Supervisor or Office Admin answers from the staff portal.">{waiting.map(r => <Btn key={r.id} sm kind="outline" onClick={() => { const reply = r.kind === 'Payment terms' ? 'Sorry, LSP keeps letting agents on 30 days.' : 'Done. Thanks for letting us know.'; const st = r.kind === 'Payment terms' ? 'Declined' as const : 'Done' as const; s.setRequests(rs => rs.map(x => x.id === r.id ? { ...x, status: st, reply, answered: nowStamp() } : x)); lspSays(s, `Re: ${r.title}`, reply); s.toast('LSP answered'); }}>LSP answers “{r.title}”</Btn>)}</DemoAnswer>}
      </div>
    </div>}
    {ask && <RequestModal onClose={() => setAsk(false)} onSent={() => setTab('requests')} />}
  </>;
}

export function RequestModal({ kind = 'Other', onClose, onSent }: { kind?: ReqKind; onClose: () => void; onSent?: () => void }) {
  const s = useStore(); const [k, setK] = useState<ReqKind>(kind); const [title, setTitle] = useState(''); const [about, setAbout] = useState('');
  return <Modal title="New request to LSP" sub="LSP answers here and by email. Nothing changes until they do." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<Send size={16} />} disabled={!about.trim()} onClick={() => {
      const t = title.trim() || k; s.setRequests(rs => [{ id: 'R' + Date.now(), kind: k, title: t, about: about.trim(), at: nowStamp(), by: s.user.name, status: 'Sent' }, ...rs]);
      s.log(`Sent a request: ${t}`, 'Messages'); s.toast('Request sent to LSP'); onSent?.(); onClose();
    }}>Send request</Btn></>}>
    <Field label="What is it about"><Select value={k} onChange={v => setK(v as ReqKind)} options={KINDS.map(x => ({ value: x, label: x }))} /></Field>
    <Field label="Title"><Text value={title} onChange={setTitle} placeholder={k} /></Field>
    <Field label="Details (required)"><Area value={about} onChange={setAbout} placeholder="Tell LSP what you need" /></Field>
  </Modal>;
}
