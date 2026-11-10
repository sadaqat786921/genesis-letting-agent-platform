import { useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useStore } from './store';
import { Sidebar, Login } from './Shell';
import { Toasts } from './ui';
import HomePage from './pages/Home';
import { Quotes } from './pages/Quotes';
import { Messages } from './pages/Messages';
import { Properties } from './pages/Properties';
import { Jobs } from './pages/Jobs';
import { Invoices } from './pages/Invoices';
import { Services } from './pages/Services';
import { Documents } from './pages/Documents';
import { Activity } from './pages/Activity';
import { Account } from './pages/Account';

const PAGES = { home: HomePage, quotes: Quotes, messages: Messages, properties: Properties, jobs: Jobs, invoices: Invoices, services: Services, documents: Documents, activity: Activity, account: Account };

const KEY = 'genesis-la-signed-in';
const read = () => { try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; } };
const write = (v: boolean) => { try { v ? sessionStorage.setItem(KEY, '1') : sessionStorage.removeItem(KEY); } catch { /* ignore */ } };

function Platform({ onLogout }: { onLogout: () => void }) {
  const s = useStore();
  const Page = PAGES[s.route];
  return <div className="app">
    <Sidebar onLogout={onLogout} />
    <main className="content" key={s.route + (s.detail ?? '')}><Page /></main>
  </div>;
}

export default function App() {
  const [auth, setAuth] = useState(read);
  const nav = useNavigate();
  const signIn = () => { write(true); setAuth(true); const h = location.hash.replace('#', ''); if (!h || h === '/' || h === '/login') nav('/home', { replace: true }); };
  if (!auth) return <><Login onDone={signIn} /><Toasts /></>;
  return <>
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/login" element={<Navigate to="/home" replace />} />
      <Route path="/*" element={<Platform onLogout={() => { write(false); setAuth(false); nav('/login', { replace: true }); }} />} />
    </Routes>
    <Toasts />
  </>;
}
