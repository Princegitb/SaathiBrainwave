import { Outlet } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import PillNav from '../ui/PillNav';

export default function AppLayout() {
  return (
    <div className="saathi-shell min-h-screen">
      <header className="saathi-header">
        <div className="saathi-logo"><span className="logo-mark">M</span><span>Saathi</span></div>
        <PillNav />
        <div className="header-actions">
          <button aria-label="Notifications"><Bell size={19}/></button>
          <button aria-label="Menu"><Menu size={20}/></button>
        </div>
      </header>
      <main className="saathi-main"><Outlet /></main>
    </div>
  );
}
