import { NavLink } from 'react-router-dom';
import { Home, BarChart3, Sparkles, Layers, Settings as SettingsIcon } from 'lucide-react';
import clsx from 'clsx';

const items = [
  { to: '/', label: 'Today', icon: Home },
  { to: '/insights', label: 'Insights', icon: BarChart3 },
  { to: '/on-deck', label: 'On-deck', icon: Layers },
  { to: '/weekly', label: 'Weekly', icon: Sparkles },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function Nav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 mx-auto max-w-md bg-bg/85 backdrop-blur-xl border-t border-border safe-bottom">
      <div className="grid grid-cols-5 px-1 py-2">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-1 py-1 text-[10px] uppercase tracking-wider transition-colors',
                isActive ? 'text-text' : 'text-muted',
              )
            }
          >
            <Icon size={20} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
