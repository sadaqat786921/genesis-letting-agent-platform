import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import * as D from './data';
import { seedRooms, type Room } from './rooms';
import { useLocation, useNavigate } from 'react-router-dom';

/* Letting Agent portal: one agency (Rosewood Lettings, signed in as Claire Rose) is signed in.
   Only their homes and the jobs, quotes and invoices for those homes are loaded. */

export type Route = 'home' | 'quotes' | 'messages' | 'properties' | 'jobs' | 'invoices' | 'services' | 'documents' | 'activity' | 'account';
export const ROUTES: Route[] = ['home', 'quotes', 'messages', 'properties', 'jobs', 'invoices', 'services', 'documents', 'activity', 'account'];
type Setter<T> = (fn: (prev: T[]) => T[]) => void;

const PROPS = D.PROPERTIES.filter(p => p.owner === D.ME);
const PIDS = new Set(PROPS.map(p => p.id));
export const SCOPE = {
  properties: PROPS,
  jobs: D.JOBS.filter(j => PIDS.has(j.property)),
  invoices: D.INVOICES.filter(i => i.to === D.ME),
};

interface Store {
  route: Route; detail: string | null; go: (r: Route, detail?: string | null) => void;
  toast: (msg: string) => void; toasts: { id: number; msg: string }[];
  log: (what: string, area: string, who?: string) => void; activity: D.Activity[];
  me: D.Agent; setMe: (fn: (a: D.Agent) => D.Agent) => void;
  /** The person signed in (a team member). */ user: D.Member;
  properties: D.Property[]; setProperties: Setter<D.Property>;
  contractors: D.Contractor[]; staff: D.Staff[];
  jobs: D.Job[]; setJobs: Setter<D.Job>;
  invoices: D.Invoice[]; setInvoices: Setter<D.Invoice>;
  /** Rooms of the agent's homes (view only here; LSP adds them). */ rooms: Room[]; setRooms: Setter<Room>;
  requests: D.AgReq[]; setRequests: Setter<D.AgReq>;
  /** Message ids from LSP that the agent has opened. */ read: string[]; markRead: (ids: string[]) => void;
}
const Ctx = createContext<Store>(null as unknown as Store);
export const useStore = () => useContext(Ctx);

function useList<T>(init: T[]): [T[], Setter<T>] {
  const [v, setV] = useState<T[]>(init);
  return [v, useCallback((fn: (prev: T[]) => T[]) => setV(prev => fn(prev)), [])];
}

/** Messages from LSP before this date count as read. */
const SEEN_BEFORE = D.parseDate('14 Oct 2026, 00:00').getTime();

export function StoreProvider({ children }: { children: ReactNode }) {
  const loc = useLocation(); const nav = useNavigate();
  const parts = loc.pathname.split('/').filter(Boolean);
  const route = (ROUTES.includes(parts[0] as Route) ? parts[0] : 'home') as Route;
  const detail = parts[1] ? decodeURIComponent(parts[1]) : null;
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [activity, setActivity] = useState<D.Activity[]>(D.ACTIVITY);
  const [me, setMeState] = useState<D.Agent>(D.AGENT);
  const [properties, setProperties] = useList(SCOPE.properties);
  const [jobs, setJobs] = useList(SCOPE.jobs);
  const [invoices, setInvoices] = useList(SCOPE.invoices);
  const [requests, setRequests] = useList(D.REQUESTS);
  const [rooms, setRooms] = useList(seedRooms(SCOPE.properties));
  const [read, setRead] = useState<string[]>(D.AGENT.comms.filter(c => c.by !== D.ME_NAME && D.parseDate(c.at).getTime() < SEEN_BEFORE).map(c => c.id));

  const go = useCallback((r: Route, d: string | null = null) => { nav('/' + r + (d ? '/' + encodeURIComponent(d) : '')); window.scrollTo({ top: 0 }); }, [nav]);
  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800);
  }, []);
  const log = useCallback((what: string, area: string, who: string = D.ME_NAME) => {
    setActivity(a => [{ id: 'H' + Date.now() + Math.random(), at: D.nowStamp(), who, what, area }, ...a]);
  }, []);
  const setMe = useCallback((fn: (a: D.Agent) => D.Agent) => setMeState(a => fn(a)), []);
  const markRead = useCallback((ids: string[]) => setRead(r => [...new Set([...r, ...ids])]), []);
  const user = me.team.find(m => m.name === D.ME_NAME) ?? me.team[0];

  const value = useMemo(() => ({
    route, detail, go, toast, toasts, log, activity, me, setMe, user,
    properties, setProperties, contractors: D.CONTRACTORS, staff: D.STAFF,
    jobs, setJobs, invoices, setInvoices, rooms, setRooms, requests, setRequests, read, markRead,
  }), [route, detail, go, toast, toasts, log, activity, me, setMe, user, properties, setProperties, jobs, setJobs, invoices, setInvoices, rooms, setRooms, requests, setRequests, read, markRead]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// ---------- lookups ----------
export const staff = (id?: string) => D.STAFF.find(s => s.id === id);
export const money = (n: number): string => n < 0 ? '−' + money(-n) : '£' + n.toLocaleString('en-GB', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
export function useLookups() {
  const s = useStore();
  return {
    prop: (id?: string) => s.properties.find(p => p.id === id),
    contractor: (id?: string) => s.contractors.find(c => c.id === id),
  };
}
export type Lookups = ReturnType<typeof useLookups>;
