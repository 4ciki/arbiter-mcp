import { useState } from 'react';
import Header          from '../components/Header';
import Sidebar         from '../components/Sidebar';
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

  const addLog = (msg, level = 'info') => {
    const time = new Date().toTimeString().slice(0,8);
    setLogs(l => [{ time, msg, level }, ...l].slice(0, 100));
  };

  const PAGE = {
    tickets:      <TicketsPage onNavigate={setActive} />,
    overview:     <OverviewPage onNavigate={setActive} />,
    simulator:    <SimulatorPage onNavigate={setActive} />,
    integrations: <CredentialsPage user={user} onLog={addLog} onNavigate={setActive} />,
    dashboard:    <CredentialsPage user={user} onLog={addLog} onNavigate={setActive} />,
    users:        <UsersPage user={user} onNavigate={setActive} />,
    logs:         <LogsPage logs={logs} />,
    settings:     <SettingsPage user={user} signOut={signOut} onNavigate={setActive} />,
  };

  return (
    <div className="app-dashboard" style={{ background: '#F4F6FA' }}>
      <Header user={user} signOut={signOut} active={active} setActive={setActive} logCount={logs.length} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar user={user} active={active} setActive={setActive} logCount={logs.length} />
        <main style={{
          flex: 1, overflowY: 'auto',
          background: '#F4F6FA',
          padding: '28px 32px',
        }}>
          {PAGE[active] || PAGE.tickets}
        </main>
      </div>
    </div>
  );
}