import { Outlet } from 'react-router-dom';
import PillNav from '../ui/PillNav';

export default function AppLayout() {
  return (
    <div className="saathi-shell min-h-screen">
      <header className="saathi-header">
        <div className="saathi-logo"><span className="logo-mark">M</span><span>Saathi</span></div>
        <PillNav />
      </header>
      <main className="saathi-main"><Outlet /></main>
    </div>
  );
}
