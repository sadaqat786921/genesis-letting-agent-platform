// Sample data for the Genesis Letting Agent portal prototype. All names and figures are examples.
// Demo "today" is Wednesday 15 Oct 2026.

export type Tone = 'ok' | 'warn' | 'err' | 'info' | 'neutral' | 'brand';

/* ---------- who is signed in ---------- */
/** This portal is for one letting agent (an LSP "Client"). Their homes are unmanaged: LSP only does contractor work, with a quote first and then an invoice. */
export const PORTAL: 'supervisor' | 'oa' | 'landlord' | 'tenant' | 'agent' = 'agent';
export const ME = 'A1';
export const ME_NAME = 'Claire Rose';
/** LSP's main phone line, shown for emergencies. */
export const LSP_PHONE = '020 7946 0000';

/* ---------- dates ---------- */
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const TODAY = new Date(2026, 9, 15);
export const TODAY_LABEL = '15 Oct 2026';
/** "21 Oct 2026" or "21 Oct 2026, 10:30" → Date */
export function parseDate(s: string): Date {
  const [datePart, time] = s.split(',');
  const [d, m, y] = datePart.trim().split(' ');
  const out = new Date(+(y || 2026), MONTHS.indexOf(m), +d);
  if (time) { const [h, mi] = time.trim().split(':'); out.setHours(+h, +mi); }
  return out;
}
export const fmtDate = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
export const daysFrom = (s: string) => Math.round((parseDate(s).getTime() - TODAY.getTime()) / 864e5);
/** Real clock time on the demo date, e.g. "15 Oct 2026, 14:05" */
export function nowStamp() { const n = new Date(); return `${TODAY_LABEL}, ${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`; }

/* ---------- shared shapes ---------- */
export type Channel = 'Email' | 'Call' | 'Note' | 'Portal' | 'System' | 'SMS';
export interface Comm { id: string; at: string; by: string; channel: Channel; text: string; subject?: string; dir?: 'in' | 'out' }
export type DocStatus = 'Missing' | 'Uploaded' | 'Verified' | 'Rejected' | 'Expired';
export interface KycDoc { name: string; status: DocStatus; file?: string; at?: string; note?: string; expires?: string }
let cid = 0;
const c = (at: string, by: string, channel: Channel, text: string, dir: 'in' | 'out' = 'out', subject?: string): Comm => ({ id: 'cm' + ++cid, at, by, channel, text, dir, subject });

/* ---------- staff ---------- */
export interface Staff { id: string; name: string; role: 'Supervisor' | 'Office Admin'; photo?: string; initials: string; color: string; email: string; phone: string; active: boolean; joined: string; disabledReason?: string }
export const STAFF: Staff[] = [
  { id: 'sk', name: 'Sarah Khan', role: 'Supervisor', photo: 'images/sarah.jpg', initials: 'SK', color: '#153D91', email: 's.khan@lsp.co.uk', phone: '020 7946 0001', active: true, joined: '3 Jan 2024' },
  { id: 'et', name: 'Emma Thompson', role: 'Office Admin', photo: 'images/av3.jpg', initials: 'ET', color: '#099FFD', email: 'e.thompson@lsp.co.uk', phone: '020 7946 0011', active: true, joined: '14 Mar 2024' },
  { id: 'jc', name: 'James Carter', role: 'Office Admin', photo: 'images/av1.jpg', initials: 'JC', color: '#5BAF00', email: 'j.carter@lsp.co.uk', phone: '020 7946 0012', active: true, joined: '2 Sep 2024' },
  { id: 'ps', name: 'Priya Shah', role: 'Office Admin', initials: 'PS', color: '#153D91', email: 'p.shah@lsp.co.uk', phone: '020 7946 0013', active: true, joined: '20 Jan 2025' },
  { id: 'lm', name: 'Liam Murphy', role: 'Office Admin', photo: 'images/av5.jpg', initials: 'LM', color: '#0B6FB8', email: 'l.murphy@lsp.co.uk', phone: '020 7946 0014', active: true, joined: '7 Apr 2025' },
  { id: 'nb', name: 'Noah Bell', role: 'Office Admin', photo: 'images/av2.jpg', initials: 'NB', color: '#667085', email: 'n.bell@lsp.co.uk', phone: '020 7946 0015', active: false, joined: '11 Jun 2025', disabledReason: 'Left LSP on 30 Sep 2026. His work moved to Emma Thompson.' },
];
export const ADMINS = STAFF.filter(s => s.role === 'Office Admin' && s.active);
/* ---------- the letting agent (LSP calls them a Client) ---------- */
export type TeamRole = 'Admin' | 'Property manager' | 'Accounts';
/** People at the agency who can sign in. Admins manage the team and account; property managers book jobs and accept quotes; accounts see invoices and pay. */
export interface Member { id: string; name: string; role: TeamRole; email: string; phone: string; status: 'Active' | 'Invite sent'; gets: ('Quotes' | 'Invoices' | 'Job updates')[]; joined: string; photo?: string }
export interface Agent {
  id: string; name: string; contact: string; email: string; phone: string; address: string; status: 'Active' | 'Paused'; joined: string;
  /** Payment terms LSP gives this agent, e.g. "30 days". */ terms: string; companyNo: string; vatNo?: string;
  /** Who invoices go to. */ billing: { name: string; email: string; address: string };
  /** LSP's Office Admin who handles this agent's work. */ admin: string;
  /** The agent wants their own order number on every job. */ poRequired: boolean;
  comms: Comm[]; team: Member[];
}
export const AGENT: Agent = {
  id: 'A1', name: 'Rosewood Lettings', contact: 'Claire Rose', email: 'claire@rosewood.co.uk', phone: '020 7946 0101', address: '4 Albion Place, London N1 6JL', status: 'Active', joined: '10 Feb 2026',
  terms: '30 days', companyNo: '11873402', billing: { name: 'Rosewood Lettings Ltd · Accounts', email: 'accounts@rosewood.co.uk', address: '4 Albion Place, London N1 6JL' }, admin: 'et', poRequired: false,
  team: [
    { id: 'TM1', name: 'Claire Rose', role: 'Admin', email: 'claire@rosewood.co.uk', phone: '07700 905001', status: 'Active', gets: ['Quotes', 'Invoices', 'Job updates'], joined: '10 Feb 2026', photo: 'images/av4.jpg' },
    { id: 'TM2', name: 'Tom Price', role: 'Property manager', email: 'tom@rosewood.co.uk', phone: '07700 905002', status: 'Active', gets: ['Quotes', 'Job updates'], joined: '10 Feb 2026', photo: 'images/av1.jpg' },
    { id: 'TM3', name: 'Lucy Green', role: 'Accounts', email: 'accounts@rosewood.co.uk', phone: '07700 905003', status: 'Active', gets: ['Invoices'], joined: '3 Mar 2026', photo: 'images/av0.jpg' },
    { id: 'TM4', name: 'Ben Moss', role: 'Property manager', email: 'ben@rosewood.co.uk', phone: '07700 905004', status: 'Invite sent', gets: ['Job updates'], joined: '13 Oct 2026' },
  ],
  comms: [
    c('2 Sep 2026, 10:00', 'Emma Thompson', 'Email', 'Invoice INV-1037 for the boiler service and the smoke alarms is attached. Payment terms are 30 days.', 'out', 'Invoice INV-1037'),
    c('25 Sep 2026, 14:20', 'Claire Rose', 'Portal', 'We have paid £120 towards INV-1037 today. The rest will follow at the start of October.', 'in', 'Part payment for INV-1037'),
    c('6 Oct 2026, 09:30', 'Emma Thompson', 'Email', 'Friendly reminder: £200 is still owed on INV-1037, which was due on 2 Oct. Thanks for paying when you can.', 'out', 'Reminder: INV-1037'),
    c('14 Oct 2026, 12:00', 'Emma Thompson', 'Email', 'Quote Q-2401 for the shower at 27 Grange Avenue is ready to view in the portal: £180 including parts.', 'out', 'Quote Q-2401 · 27 Grange Avenue'),
    c('14 Oct 2026, 16:40', 'Emma Thompson', 'Email', 'Quote Q-2402 for the damp and mould treatment at Flat 6, 2 Wharf Street is ready to view.', 'out', 'Quote Q-2402 · Flat 6, 2 Wharf Street'),
  ],
};

/* ---------- homes ---------- */
/** An agent's home is unmanaged: the agent looks after the tenants and the rent; LSP only does the jobs the agent books. */
export interface Property {
  id: string; address: string; area: string; postcode: string; type: 'House' | 'Flat' | 'HMO'; rooms?: number; beds: number; baths: number; owner: string; photo: string; added: string;
  status: 'Let' | 'Vacant'; admin: string; gas: boolean;
  /** The agent's own reference for the home. */ ref?: string; /** The person living there, for access only. */ occupier?: { name: string; phone: string };
  /** How the contractor gets in. */ keys: string; /** The landlord the agent acts for (name only). */ landlord?: string; notes?: string;
  /** Asked to stop: LSP no longer takes jobs here. */ archived?: string;
}
export const PROPERTIES: Property[] = [
  { id: 'P9', address: '27 Grange Avenue', area: 'Crouch End, London', postcode: 'N8 9JT', type: 'House', beds: 3, baths: 1, owner: 'A1', photo: 'images/home3.jpg', added: '10 Feb 2026', status: 'Let', admin: 'et', gas: true, ref: 'RW-1182', occupier: { name: 'Hannah Lee', phone: '07700 905101' }, keys: 'Key safe by the side gate. Rosewood gives the code on the day.', landlord: 'Mr P. Andrews' },
  { id: 'P10', address: 'Flat 6, 2 Wharf Street', area: 'Holloway, London', postcode: 'N7 6QB', type: 'Flat', beds: 1, baths: 1, owner: 'A1', photo: 'images/home1.jpg', added: '10 Feb 2026', status: 'Let', admin: 'et', gas: false, ref: 'RW-1204', occupier: { name: 'Marcus Webb', phone: '07700 905102' }, keys: 'Collect from the Rosewood office (4 Albion Place).', landlord: 'Wharf Street Properties Ltd' },
  { id: 'P17', address: 'Flat 1, 45 Holloway Road', area: 'Holloway, London', postcode: 'N7 8JL', type: 'Flat', beds: 2, baths: 1, owner: 'A1', photo: 'images/home2.jpg', added: '1 Jun 2026', status: 'Let', admin: 'et', gas: true, ref: 'RW-1311', occupier: { name: 'Priya Nair', phone: '07700 905103' }, keys: 'The tenant lets the contractor in.', landlord: 'Ms J. Okoro' },
  { id: 'P18', address: '9 Rosemary Street', area: 'Islington, London', postcode: 'N1 3DR', type: 'House', beds: 4, baths: 2, owner: 'A1', photo: 'images/home1.jpg', added: '20 Aug 2026', status: 'Vacant', admin: 'et', gas: true, ref: 'RW-1340', keys: 'Key held by LSP (tag 18).', landlord: 'Mr and Mrs Hart', notes: 'Empty between tenants. New tenants move in on 1 Nov.' },
];

/* ---------- contractors (name and trade only; costs stay with LSP) ---------- */
export interface Contractor { id: string; name: string; trade: string }
export const CONTRACTORS: Contractor[] = [
  { id: 'C1', name: 'HeatRight Ltd', trade: 'Gas engineer' }, { id: 'C2', name: 'TopTile Roofing', trade: 'Roofer' }, { id: 'C4', name: 'QuickPlumb', trade: 'Plumber' },
  { id: 'C5', name: 'Volt Electrical', trade: 'Electrician' }, { id: 'C6', name: 'Clear View Inspections', trade: 'Site Inspector' }, { id: 'C7', name: 'FixIt Carpentry', trade: 'Carpenter & locks' },
];

/* ---------- jobs ---------- */
export const JOB_STATUS = ['New', 'Quote sent', 'Quote accepted', 'Assigned', 'In progress', 'Proof uploaded', 'Sent back', 'Approved', 'Invoiced', 'Declined'] as const;
export type JobStatus = typeof JOB_STATUS[number];
export type Category = 'Plumbing' | 'Heating' | 'Electrical' | 'Roofing' | 'Locks & doors' | 'Damp' | 'Safety check' | 'General';
export const CATEGORIES: Category[] = ['Plumbing', 'Heating', 'Electrical', 'Roofing', 'Locks & doors', 'Damp', 'Safety check', 'General'];
export interface JobEvent { at: string; by: string; text: string }
/** One row on a quote or invoice. */
export interface Line { activity: string; desc: string; qty: number; rate: number; code?: string }
export interface Job {
  id: string; title: string; property: string; status: JobStatus; urgent?: boolean; reported: string; by: string; admin: string; category: Category;
  note?: string; area?: string; access?: string; photos?: string[]; contractor?: string; proof?: string[]; events: JobEvent[]; invoice?: string;
  /** What the agent pays (the quote total). The contractor's cost is never shown here. */ price: number;
  lines?: Line[]; quoteNo?: string; quoted?: string; validUntil?: string; quoteNote?: string; acceptedBy?: string; acceptedAt?: string;
  /** The agent's own order or reference number. */ ref?: string; /** Who at the agency booked it. */ requestedBy?: string;
  /** Best days and times for the visit. */ preferred?: string; /** Booked visit, date and time. */ visit?: string;
  /** Who to call for access (the tenant). */ contact?: { name: string; phone: string };
  declined?: string; /** The agent cancelled the request before a quote. */ cancelled?: string;
  /** A certificate produced by the job (safety checks). */ cert?: { name: string; file: string; expires?: string };
  /** The agent raised a problem with the finished work. */ issue?: { text: string; at: string; answer?: string };
}
const ev = (at: string, by: string, text: string): JobEvent => ({ at, by, text });
const L = (activity: string, desc: string, qty: number, rate: number): Line => ({ activity, desc, qty, rate });
export const JOBS: Job[] = [
  { id: 'J8', title: 'Leaking shower', property: 'P9', status: 'Quote sent', price: 180, quoteNo: 'Q-2401', quoted: '14 Oct 2026, 12:00', validUntil: '13 Nov 2026', reported: '14 Oct 2026, 09:30', by: 'Claire Rose', requestedBy: 'Claire Rose', admin: 'et', category: 'Plumbing', area: 'Bathroom', note: 'Shower tray leaking into the kitchen ceiling below.', access: 'Key safe by the side gate', contact: { name: 'Hannah Lee', phone: '07700 905101' }, preferred: 'Weekdays after 10:00',
    lines: [L('Call-out', 'Attend site and trace leak under shower tray', 1, 60), L('Materials', 'Shower tray waste kit and silicone sealant', 1, 30), L('Labour', 'Reseal tray and replace waste (hourly)', 2, 45)], quoteNote: 'Includes making good the silicone around the tray. Ceiling repair below is not included.',
    events: [ev('14 Oct 2026, 09:30', 'Claire Rose', 'Requested from the letting agent portal'), ev('14 Oct 2026, 10:10', 'Emma Thompson', 'Checked the request and the photos'), ev('14 Oct 2026, 12:00', 'Emma Thompson', 'Quote Q-2401 sent: £180, valid until 13 Nov 2026')] },
  { id: 'J27', title: 'Damp and mould treatment', property: 'P10', status: 'Quote sent', price: 395, quoteNo: 'Q-2402', quoted: '14 Oct 2026, 16:40', validUntil: '21 Oct 2026', reported: '10 Oct 2026, 11:15', by: 'Tom Price', requestedBy: 'Tom Price', admin: 'et', category: 'Damp', area: 'Bedroom', note: 'Black mould on the bedroom wall behind the wardrobe. Tenant says it keeps coming back.', contact: { name: 'Marcus Webb', phone: '07700 905102' }, ref: 'PO-5530',
    lines: [L('Survey', 'Damp survey with moisture readings and report', 1, 120), L('Treatment', 'Mould wash and anti-mould treatment, bedroom wall', 1, 95), L('Labour', 'Fit a humidity-controlled extractor fan (hourly)', 3, 45), L('Materials', 'Humidity-controlled extractor fan 100mm', 1, 45)], quoteNote: 'Valid for 7 days because the survey slot is held for you.',
    events: [ev('10 Oct 2026, 11:15', 'Tom Price', 'Requested from the letting agent portal with 2 photos'), ev('13 Oct 2026, 14:00', 'Clear View Inspections', 'Site visit to see the damp'), ev('14 Oct 2026, 16:40', 'Emma Thompson', 'Quote Q-2402 sent: £395, valid until 21 Oct 2026')], photos: ['Bedroom wall', 'Behind wardrobe'] },
  { id: 'J28', title: 'Repaint communal hallway', property: 'P17', status: 'Quote sent', price: 540, quoteNo: 'Q-2391', quoted: '10 Sep 2026, 15:00', validUntil: '10 Oct 2026', reported: '5 Sep 2026, 10:00', by: 'Tom Price', requestedBy: 'Tom Price', admin: 'et', category: 'General', area: 'Hallway',
    lines: [L('Labour', 'Prepare and paint hallway walls and ceiling, 2 coats (day rate)', 1.5, 300), L('Materials', 'Paint, filler and sundries', 1, 90)], events: [ev('5 Sep 2026, 10:00', 'Tom Price', 'Requested from the letting agent portal'), ev('10 Sep 2026, 15:00', 'Emma Thompson', 'Quote Q-2391 sent: £540, valid until 10 Oct 2026')] },
  { id: 'J10', title: 'Door rehang', property: 'P10', status: 'New', price: 0, reported: '15 Oct 2026, 08:05', by: 'Claire Rose', requestedBy: 'Claire Rose', admin: 'et', category: 'Locks & doors', area: 'Bedroom', note: 'Bedroom door catches on the carpet and will not close.', contact: { name: 'Marcus Webb', phone: '07700 905102' }, preferred: 'Any weekday morning',
    events: [ev('15 Oct 2026, 08:05', 'Claire Rose', 'Requested from the letting agent portal')] },
  { id: 'J29', title: 'Dripping radiator valve', property: 'P10', status: 'Assigned', price: 85, contractor: 'C4', quoteNo: 'Q-2400', quoted: '13 Oct 2026, 11:00', validUntil: '12 Nov 2026', acceptedBy: 'Tom Price', acceptedAt: '13 Oct 2026, 15:20', visit: '17 Oct 2026, 10:00', reported: '12 Oct 2026, 17:40', by: 'Tom Price', requestedBy: 'Tom Price', admin: 'et', category: 'Heating', area: 'Living room', contact: { name: 'Marcus Webb', phone: '07700 905102' },
    lines: [L('Call-out', 'Attend site, replace radiator valve and bleed the system', 1, 60), L('Materials', 'Thermostatic radiator valve', 1, 25)],
    events: [ev('12 Oct 2026, 17:40', 'Tom Price', 'Requested from the letting agent portal'), ev('13 Oct 2026, 11:00', 'Emma Thompson', 'Quote Q-2400 sent: £85'), ev('13 Oct 2026, 15:20', 'Tom Price', 'Accepted quote Q-2400'), ev('14 Oct 2026, 09:00', 'Emma Thompson', 'QuickPlumb booked for 17 Oct 2026 at 10:00. Marcus Webb told.')] },
  { id: 'J21', title: 'Gas safety certificate (CP12)', property: 'P17', status: 'In progress', price: 85, contractor: 'C1', quoteNo: 'Q-2398', quoted: '9 Oct 2026, 10:00', validUntil: '8 Nov 2026', acceptedBy: 'Tom Price', acceptedAt: '9 Oct 2026, 12:30', ref: 'PO-5521', visit: '15 Oct 2026, 09:00', reported: '8 Oct 2026, 16:00', by: 'Tom Price', requestedBy: 'Tom Price', admin: 'et', category: 'Safety check', note: 'Yearly gas safety check. The current certificate ends on 30 Oct.', contact: { name: 'Priya Nair', phone: '07700 905103' },
    lines: [L('Service', 'Landlord gas safety check and certificate (CP12), 1 boiler and 1 hob', 1, 85)],
    events: [ev('8 Oct 2026, 16:00', 'Tom Price', 'Requested from the letting agent portal'), ev('9 Oct 2026, 10:00', 'Emma Thompson', 'Quote Q-2398 sent: £85'), ev('9 Oct 2026, 12:30', 'Tom Price', 'Accepted quote Q-2398, order PO-5521'), ev('10 Oct 2026, 09:15', 'Emma Thompson', 'HeatRight Ltd booked for 15 Oct 2026 at 09:00'), ev('15 Oct 2026, 09:05', 'HeatRight Ltd', 'Work started')] },
  { id: 'J22', title: 'Replace kitchen mixer tap', property: 'P17', status: 'Proof uploaded', price: 140, contractor: 'C4', quoteNo: 'Q-2397', quoted: '7 Oct 2026, 14:00', validUntil: '6 Nov 2026', acceptedBy: 'Claire Rose', acceptedAt: '7 Oct 2026, 16:05', visit: '13 Oct 2026, 13:00', reported: '6 Oct 2026, 18:20', by: 'Claire Rose', requestedBy: 'Claire Rose', admin: 'et', category: 'Plumbing', area: 'Kitchen', note: 'Kitchen tap drips all the time and the handle is loose.', access: 'The tenant lets the contractor in', contact: { name: 'Priya Nair', phone: '07700 905103' }, proof: ['Before · old tap', 'After · new tap', 'Under the sink'],
    lines: [L('Service', 'Kitchen mixer tap, supply and fit', 1, 95), L('Labour', 'Replace isolation valves (hourly)', 1, 45)],
    events: [ev('6 Oct 2026, 18:20', 'Claire Rose', 'Requested from the letting agent portal'), ev('7 Oct 2026, 14:00', 'Emma Thompson', 'Quote Q-2397 sent: £140'), ev('7 Oct 2026, 16:05', 'Claire Rose', 'Accepted quote Q-2397'), ev('8 Oct 2026, 10:00', 'Emma Thompson', 'QuickPlumb booked for 13 Oct 2026 at 13:00'), ev('13 Oct 2026, 13:10', 'QuickPlumb', 'Work started'), ev('13 Oct 2026, 15:40', 'QuickPlumb', 'Finished and uploaded 3 photos')] },
  { id: 'J23', title: 'Electrical safety check (EICR)', property: 'P18', status: 'Approved', price: 220, contractor: 'C5', quoteNo: 'Q-2395', quoted: '1 Oct 2026, 09:30', validUntil: '31 Oct 2026', acceptedBy: 'Claire Rose', acceptedAt: '1 Oct 2026, 11:00', visit: '9 Oct 2026, 09:00', reported: '30 Sep 2026, 15:00', by: 'Claire Rose', requestedBy: 'Claire Rose', admin: 'et', category: 'Safety check', note: 'Needed before the new tenants move in on 1 Nov.', proof: ['Consumer unit', 'Test results page', 'Certificate'], cert: { name: 'Electrical Installation Condition Report (EICR)', file: 'EICR-9-Rosemary-Street.pdf', expires: '9 Oct 2031' },
    lines: [L('Service', 'Electrical Installation Condition Report (EICR), 4 bed house', 1, 180), L('Service', 'Replace faulty accessory (cracked socket, bedroom 2)', 1, 40)],
    events: [ev('30 Sep 2026, 15:00', 'Claire Rose', 'Requested from the letting agent portal'), ev('1 Oct 2026, 09:30', 'Emma Thompson', 'Quote Q-2395 sent: £220'), ev('1 Oct 2026, 11:00', 'Claire Rose', 'Accepted quote Q-2395'), ev('2 Oct 2026, 09:00', 'Emma Thompson', 'Volt Electrical booked for 9 Oct 2026 at 09:00 (key held by LSP)'), ev('9 Oct 2026, 12:30', 'Volt Electrical', 'Finished. Report says Satisfactory. Uploaded 3 photos and the certificate'), ev('10 Oct 2026, 10:00', 'Emma Thompson', 'Checked the photos and the certificate. Work approved and record locked')] },
  { id: 'J24', title: 'Bathroom extractor fan and bath reseal', property: 'P18', status: 'Invoiced', price: 265, contractor: 'C5', quoteNo: 'Q-2392', quoted: '22 Sep 2026, 11:00', validUntil: '22 Oct 2026', acceptedBy: 'Claire Rose', acceptedAt: '22 Sep 2026, 14:00', visit: '6 Oct 2026, 10:00', reported: '20 Sep 2026, 12:00', by: 'Claire Rose', requestedBy: 'Claire Rose', admin: 'et', category: 'Electrical', area: 'Bathroom', invoice: 'INV-1045', proof: ['Before · fan', 'After · fan', 'After · bath'],
    lines: [L('Materials', 'Extractor fan 100mm with timer', 1, 54), L('Labour', 'Remove old fan, fit and test new fan (hourly)', 2, 48), L('Labour', 'Remove old sealant and reseal the bath (hourly)', 1.5, 45), L('Materials', 'Sanitary silicone', 1, 10.5)],
    events: [ev('20 Sep 2026, 12:00', 'Claire Rose', 'Requested from the letting agent portal'), ev('22 Sep 2026, 11:00', 'Emma Thompson', 'Quote Q-2392 sent: £265'), ev('22 Sep 2026, 14:00', 'Claire Rose', 'Accepted quote Q-2392'), ev('6 Oct 2026, 10:00', 'Volt Electrical', 'Work started'), ev('6 Oct 2026, 13:30', 'Volt Electrical', 'Finished and uploaded 3 photos'), ev('7 Oct 2026, 09:00', 'Emma Thompson', 'Work approved and record locked'), ev('10 Oct 2026, 09:00', 'Emma Thompson', 'Invoice INV-1045 sent: £265, due 9 Nov 2026')] },
  { id: 'J19', title: 'Boiler service', property: 'P9', status: 'Invoiced', price: 140, contractor: 'C1', quoteNo: 'Q-2380', quoted: '18 Aug 2026, 10:00', validUntil: '17 Sep 2026', acceptedBy: 'Claire Rose', acceptedAt: '18 Aug 2026, 12:00', visit: '27 Aug 2026, 09:00', reported: '17 Aug 2026, 15:00', by: 'Claire Rose', requestedBy: 'Claire Rose', admin: 'et', category: 'Heating', invoice: 'INV-1037', proof: ['Boiler service sheet', 'Flue check'],
    lines: [L('Service', 'Annual boiler service', 1, 140)], events: [ev('17 Aug 2026, 15:00', 'Claire Rose', 'Requested from the letting agent portal'), ev('18 Aug 2026, 10:00', 'Emma Thompson', 'Quote Q-2380 sent: £140'), ev('18 Aug 2026, 12:00', 'Claire Rose', 'Accepted quote Q-2380'), ev('27 Aug 2026, 11:00', 'HeatRight Ltd', 'Finished and uploaded 2 photos'), ev('28 Aug 2026, 10:00', 'Emma Thompson', 'Work approved and record locked'), ev('2 Sep 2026, 10:00', 'Emma Thompson', 'Invoice INV-1037 sent')] },
  { id: 'J20', title: 'Replace smoke alarms', property: 'P10', status: 'Invoiced', price: 180, contractor: 'C5', quoteNo: 'Q-2381', quoted: '18 Aug 2026, 10:30', validUntil: '17 Sep 2026', acceptedBy: 'Claire Rose', acceptedAt: '18 Aug 2026, 12:05', visit: '28 Aug 2026, 14:00', reported: '17 Aug 2026, 15:10', by: 'Claire Rose', requestedBy: 'Claire Rose', admin: 'et', category: 'Safety check', invoice: 'INV-1037', proof: ['Hallway alarm', 'Bedroom alarm', 'Test'],
    lines: [L('Service', 'Supply and fit mains smoke alarms, interlinked', 2, 75), L('Labour', 'Test and certify (hourly)', 1, 30)], events: [ev('17 Aug 2026, 15:10', 'Claire Rose', 'Requested from the letting agent portal'), ev('18 Aug 2026, 10:30', 'Emma Thompson', 'Quote Q-2381 sent: £180'), ev('18 Aug 2026, 12:05', 'Claire Rose', 'Accepted quote Q-2381'), ev('28 Aug 2026, 16:00', 'Volt Electrical', 'Finished and uploaded 3 photos'), ev('29 Aug 2026, 09:00', 'Emma Thompson', 'Work approved and record locked'), ev('2 Sep 2026, 10:00', 'Emma Thompson', 'Invoice INV-1037 sent')] },
  { id: 'J26', title: 'Change the front door locks', property: 'P18', status: 'Invoiced', price: 145, contractor: 'C7', quoteNo: 'Q-2378', quoted: '21 Aug 2026, 09:00', validUntil: '20 Sep 2026', acceptedBy: 'Claire Rose', acceptedAt: '21 Aug 2026, 09:30', visit: '22 Aug 2026, 10:00', reported: '20 Aug 2026, 17:00', by: 'Claire Rose', requestedBy: 'Claire Rose', admin: 'et', category: 'Locks & doors', invoice: 'INV-1031', proof: ['New lock', 'Keys'], note: 'Old tenants left without returning all keys.',
    lines: [L('Service', 'Replace euro cylinder and nightlatch, 3 sets of keys', 1, 145)], events: [ev('20 Aug 2026, 17:00', 'Claire Rose', 'Requested from the letting agent portal'), ev('21 Aug 2026, 09:00', 'Emma Thompson', 'Quote Q-2378 sent: £145'), ev('21 Aug 2026, 09:30', 'Claire Rose', 'Accepted quote Q-2378'), ev('22 Aug 2026, 11:00', 'FixIt Carpentry', 'Finished and uploaded 2 photos'), ev('22 Aug 2026, 15:00', 'Emma Thompson', 'Work approved. 3 key sets given to Rosewood'), ev('22 Aug 2026, 15:10', 'Emma Thompson', 'Invoice INV-1031 sent')] },
  { id: 'J25', title: 'Garden clearance', property: 'P9', status: 'Declined', price: 320, quoteNo: 'Q-2393', quoted: '24 Sep 2026, 10:00', validUntil: '24 Oct 2026', reported: '22 Sep 2026, 09:00', by: 'Tom Price', requestedBy: 'Tom Price', admin: 'et', category: 'General', area: 'Back garden', declined: 'The landlord will do it himself.',
    lines: [L('Labour', 'Garden clearance, 2 people (day rate)', 1, 260), L('Service', 'Green waste removal', 1, 60)], events: [ev('22 Sep 2026, 09:00', 'Tom Price', 'Requested from the letting agent portal'), ev('24 Sep 2026, 10:00', 'Emma Thompson', 'Quote Q-2393 sent: £320'), ev('25 Sep 2026, 11:00', 'Tom Price', 'Declined quote Q-2393: The landlord will do it himself.')] },
];

/* ---------- invoices ---------- */
export interface Payment { date: string; amount: number; ref: string; how: 'Bank transfer' | 'Card' }
export interface Invoice {
  id: string; to: string; job?: string; jobs?: string[]; amount: number; paid: number; terms: string; issued: string; due: string; overdue: boolean;
  items: { desc: string; amount: number; activity?: string; qty?: number; rate?: number }[]; site?: string; note?: string; paidAt?: string;
  payments: Payment[]; /** The agent told LSP they paid by bank transfer; LSP still checks the bank. */ reportedPaid?: string; reportedAmount?: number;
  /** The agent's order number shown on the invoice. */ ref?: string;
}
export const INVOICES: Invoice[] = [
  { id: 'INV-1045', to: 'A1', job: 'J24', amount: 265, paid: 0, terms: '30 days', issued: '10 Oct 2026', due: '9 Nov 2026', overdue: false, site: '9 Rosemary Street', payments: [],
    items: [{ activity: 'Materials', desc: 'Extractor fan 100mm with timer', qty: 1, rate: 54, amount: 54 }, { activity: 'Labour', desc: 'Remove old fan, fit and test new fan (hourly)', qty: 2, rate: 48, amount: 96 }, { activity: 'Labour', desc: 'Remove old sealant and reseal the bath (hourly)', qty: 1.5, rate: 45, amount: 67.5 }, { activity: 'Materials', desc: 'Sanitary silicone', qty: 1, rate: 10.5, amount: 10.5 }] },
  { id: 'INV-1037', to: 'A1', jobs: ['J19', 'J20'], amount: 320, paid: 120, terms: '30 days', issued: '2 Sep 2026', due: '2 Oct 2026', overdue: true, site: '27 Grange Avenue and Flat 6, 2 Wharf Street', payments: [{ date: '25 Sep 2026', amount: 120, ref: 'INV-1037', how: 'Bank transfer' }],
    items: [{ activity: 'Service', desc: 'Annual boiler service, 27 Grange Avenue', qty: 1, rate: 140, amount: 140 }, { activity: 'Service', desc: 'Replace smoke alarms, Flat 6, 2 Wharf Street', qty: 1, rate: 180, amount: 180 }] },
  { id: 'INV-1031', to: 'A1', job: 'J26', amount: 145, paid: 145, terms: '30 days', issued: '22 Aug 2026', due: '21 Sep 2026', overdue: false, site: '9 Rosemary Street', paidAt: '4 Sep 2026', payments: [{ date: '4 Sep 2026', amount: 145, ref: 'INV-1031', how: 'Bank transfer' }],
    items: [{ activity: 'Service', desc: 'Replace euro cylinder and nightlatch, 3 sets of keys', qty: 1, rate: 145, amount: 145 }] },
  { id: 'INV-1022', to: 'A1', amount: 170, paid: 170, terms: '30 days', issued: '28 Jun 2026', due: '28 Jul 2026', overdue: false, site: 'Flat 1, 45 Holloway Road', paidAt: '15 Jul 2026', payments: [{ date: '15 Jul 2026', amount: 170, ref: 'INV-1022', how: 'Card' }],
    items: [{ activity: 'Service', desc: 'Energy Performance Certificate (EPC), Flat 1, 45 Holloway Road', qty: 1, rate: 95, amount: 95 }, { activity: 'Service', desc: 'Check-in inventory with photos', qty: 1, rate: 75, amount: 75 }] },
];

/* ---------- requests the agent sends to LSP ---------- */
export type ReqKind = 'Add a home' | 'Stop work at a home' | 'Billing details' | 'Payment terms' | 'Order numbers' | 'Close the account' | 'Other';
export interface AgReq { id: string; kind: ReqKind; title: string; about: string; at: string; by: string; status: 'Sent' | 'Done' | 'Declined'; reply?: string; answered?: string }
export const REQUESTS: AgReq[] = [
  { id: 'R1', kind: 'Billing details', title: 'Send invoices to our accounts team', about: 'Please email every invoice to accounts@rosewood.co.uk as well as to me.', at: '3 Mar 2026, 10:00', by: 'Claire Rose', status: 'Done', reply: 'Done. Invoices now go to accounts@rosewood.co.uk with you copied in.', answered: '3 Mar 2026, 14:20' },
  { id: 'R2', kind: 'Payment terms', title: 'Ask for 45-day payment terms', about: 'Our landlords pay us monthly, so 45 days would help.', at: '1 Oct 2026, 09:40', by: 'Lucy Green', status: 'Declined', reply: 'Sorry, LSP keeps letting agents on 30 days. We can split a large invoice into two payments if that helps.', answered: '2 Oct 2026, 11:00' },
];

/* ---------- activity ---------- */
export interface Activity { id: string; at: string; who: string; what: string; area: string }
let hid = 0; const h = (at: string, who: string, what: string, area: string): Activity => ({ id: 'H' + ++hid, at, who, what, area });
export const ACTIVITY: Activity[] = [
  h('15 Oct 2026, 09:05', 'HeatRight Ltd', 'Started the gas safety check at Flat 1, 45 Holloway Road', 'Jobs'),
  h('15 Oct 2026, 08:05', 'Claire Rose', 'Booked a job: Door rehang at Flat 6, 2 Wharf Street', 'Jobs'),
  h('14 Oct 2026, 16:40', 'Emma Thompson', 'Sent quote Q-2402 (£395) for Damp and mould treatment', 'Quotes'),
  h('14 Oct 2026, 12:00', 'Emma Thompson', 'Sent quote Q-2401 (£180) for Leaking shower', 'Quotes'),
  h('14 Oct 2026, 09:00', 'Emma Thompson', 'Booked QuickPlumb for the radiator valve on 17 Oct at 10:00', 'Jobs'),
  h('13 Oct 2026, 15:40', 'QuickPlumb', 'Finished the kitchen tap at Flat 1, 45 Holloway Road and uploaded 3 photos', 'Jobs'),
  h('13 Oct 2026, 15:20', 'Tom Price', 'Accepted quote Q-2400 (£85) for Dripping radiator valve', 'Quotes'),
  h('13 Oct 2026, 10:00', 'Claire Rose', 'Invited Ben Moss to the portal as a property manager', 'Team'),
  h('10 Oct 2026, 10:00', 'Emma Thompson', 'Approved the EICR at 9 Rosemary Street. Certificate added to Documents', 'Jobs'),
  h('10 Oct 2026, 09:00', 'Emma Thompson', 'Sent invoice INV-1045 (£265), due 9 Nov 2026', 'Invoices'),
  h('6 Oct 2026, 09:30', 'Emma Thompson', 'Sent a reminder for INV-1037 (£200 still owed)', 'Invoices'),
  h('25 Sep 2026, 14:20', 'Claire Rose', 'Paid £120 towards INV-1037 by bank transfer', 'Invoices'),
  h('25 Sep 2026, 11:00', 'Tom Price', 'Declined quote Q-2393 (£320) for Garden clearance', 'Quotes'),
];

/* ---------- products and services (saved once, picked by code on quotes and invoices) ---------- */
export interface Product { code: string; name: string; desc: string; rate: number; kind: 'Service' | 'Material' | 'Labour' }
export const CATALOGUE: Product[] = [
  { code: 'CALL-OUT', name: 'Call-out', desc: 'Attend site and assess the problem', rate: 60, kind: 'Service' },
  { code: 'LABOUR', name: 'Labour', desc: 'Labour charge (hourly)', rate: 45, kind: 'Labour' },
  { code: 'LABOUR D/R', name: 'Labour day rate', desc: 'Labour charge day rate', rate: 350, kind: 'Labour' },
  { code: 'MISC', name: 'Miscellaneous', desc: 'Miscellaneous expenses', rate: 0, kind: 'Material' },
  { code: '18TH ED/SPD', name: 'Fuse board installation', desc: "18th Edition fuse board installation with SPD's", rate: 750, kind: 'Service' },
  { code: 'LED/5FT/FLOU', name: 'LED batten fitting', desc: '4ft LED batten fitting', rate: 21.35, kind: 'Material' },
  { code: '30WFL/PIR', name: 'LED floodlight with PIR', desc: 'LED floodlight 30W with PIR sensor', rate: 41.5, kind: 'Material' },
  { code: '2G/WEATHER', name: 'Weatherproof socket', desc: 'Socket, weatherproof 2 gang switched IP66', rate: 23, kind: 'Material' },
  { code: 'HEATER', name: 'Down flow heater', desc: 'Down flow heater', rate: 50.75, kind: 'Material' },
  { code: 'SWA/CLEAT/C9', name: 'SWA cable cleats', desc: 'Cleats: clip outside SWA cable', rate: 10, kind: 'Material' },
  { code: '10MM/EARTH', name: '10mm earth cable', desc: '10mm single earth cable: bond water or gas', rate: 1.8, kind: 'Material' },
  { code: 'NB1.5/2', name: '1.5mm 2 core earth cable', desc: 'FP200 1.5mm 2 core earth: rewire lean-to lights', rate: 1.41, kind: 'Material' },
  { code: 'DS/2G/INST', name: 'Double socket supply and fit', desc: '13 Amp 2 gang double switched socket, supply and fit', rate: 38, kind: 'Service' },
  { code: 'DS/2G/WHT/BG2', name: 'BG double socket', desc: 'BG white 13A double socket and 25mm metal pattress box', rate: 14.5, kind: 'Material' },
  { code: 'DS/2G/WHT/MK2', name: 'MK double socket', desc: 'MK white 13A double socket and 25mm metal pattress box', rate: 16.2, kind: 'Material' },
  { code: 'MT2', name: 'Mini trunking', desc: 'MT2 25x16mm trunking, self adhesive', rate: 13.41, kind: 'Material' },
  { code: 'T2/BENDS', name: 'Trunking bends', desc: 'MT2 trunking bends, pack of 5', rate: 5, kind: 'Material' },
  { code: 'EE081', name: 'Replace faulty accessory', desc: 'Disconnect faulty accessory, replace and reconnect including fuses and MCB/RCBO reset, and test the circuit', rate: 37.5, kind: 'Service' },
  { code: 'WH/3KW', name: 'Instant hand wash heater', desc: 'Triton Instaflow 3kW hand wash heater', rate: 81.9, kind: 'Material' },
  { code: 'TAP/MIX', name: 'Mixer tap', desc: 'Kitchen mixer tap, supply and fit', rate: 95, kind: 'Service' },
];