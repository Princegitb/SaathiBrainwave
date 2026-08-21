import { NavLink } from 'react-router-dom';
const NAV_ITEMS = [
  { to: '/', label: 'Dashboard' }, { to: '/companion', label: 'Sara' }, { to: '/practice', label: 'Session' },
  { to: '/peer', label: 'Saathi' }, { to: '/community', label: 'Community' }, { to: '/progress', label: 'Progress' },
  { to: '/journal', label: 'Journal' }, { to: '/safety', label: 'Safety' },
];
export default function PillNav() {
  return <nav className="saathi-nav">{NAV_ITEMS.map(({to,label}) => <NavLink key={to} to={to}>{({isActive}) => <span className={isActive ? 'active' : ''}>{label}</span>}</NavLink>)}</nav>;
}
