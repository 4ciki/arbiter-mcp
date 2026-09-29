import { useState } from 'react';
import Header          from '../components/Header';
import Sidebar         from '../components/Sidebar';
import RightPanel      from '../components/RightPanel';
import TicketsPage     from './TicketsPage';
import OverviewPage    from './OverviewPage';
import SimulatorPage   from './SimulatorPage';
import CredentialsPage from './CredentialsPage';
import UsersPage       from './UsersPage';
import LogsPage        from './LogsPage';
import SettingsPage    from './SettingsPage';

export default function Dashboard({ user, signOut }) {
  const [active, setActive] = useState('tickets');
  const [logs, setLogs] = useState([
    { time: new Date().toTimeString().slice(0,8), msg: 'Arbiter MCP Engine connected (Render + AI Engine)', level: 'success' },
    { time: new Date().toTimeString().slice(0,8), msg: 'ChromaDB vector store indexed 65 benchmark cases', level: 'info' },
    { time: new Date().toTimeString().slice(0,8), msg: 'Dual webhook listeners active for Jira & Slack', level: 'info' },
  ]);

  const addLog = (msg, level='info') => {
    const time = new Date().toTimeString().slice(0,8);
    setLogs(l => [{ time, msg, level }, ...l].slice(0, 100));
  };

  const handleNavigate = to => setActive(to);

  const PAGE = {
    tickets:      <TicketsPage onNavigate={handleNavigate} />,
    overview:     <OverviewPage onNavigate={handleNavigate} />,
    simulator:    <SimulatorPage onNavigate={handleNavigate} />,
    integrations: <CredentialsPage user={user} onLog={addLog} onNavigate={handleNavigate} />,
    dashboard:    <CredentialsPage user={user} onLog={addLog} onNavigate={handleNavigate} />,
    users:        <UsersPage user={user} onNavigate={handleNavigate} />,
    logs:         <LogsPage logs={logs} />,
    settings:     <SettingsPage user={user} signOut={signOut} onNavigate={handleNavigate} />,
  };

  return (
    <div className="app-dashboard" style={{
      display: 'flex', flexDirection: 'column', background: '#F0F4FA',
      height: '100vh', width: '100vw', overflow: 'hidden'
    }}>
      <Header user={user} signOut={signOut} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar user={user} active={active} setActive={setActive} logCount={logs.length} />
        <main style={{
          flex: 1, overflowY: 'auto', padding: '24px 28px',
          background: '#F8FAFC'
        }}>
          {PAGE[active] || PAGE.tickets}
        </main>
        <RightPanel logs={logs} />
      </div>
    </div>
  );
}