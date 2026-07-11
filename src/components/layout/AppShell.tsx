import { NavLink, Outlet } from 'react-router-dom';

import { Home, BookOpen, LogOut, PieChart, Settings, HelpCircle } from 'lucide-react';

import { ToastHost } from '../shared/ToastHost';

import { AppLogo } from '../shared/AppLogo';

import { QuickAddFab } from './QuickAddFab';
import { PwaUpdateBanner } from './PwaUpdateBanner';

import { useAuthStore } from '../../store/authStore';



const links = [

  { to: '/', icon: Home, label: 'Главная' },

  { to: '/ledger', icon: BookOpen, label: 'Журнал' },

  { to: '/analytics', icon: PieChart, label: 'Аналитика' },

  { to: '/settings', icon: Settings, label: 'Настройки' },

  { to: '/faq', icon: HelpCircle, label: 'FAQ' },

];



export function BottomNav() {

  return (

    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--app-border)] bg-[var(--app-card-strong)] backdrop-blur-md md:hidden">

      <div className="flex justify-around py-2">

        {links.map(({ to, icon: Icon, label }) => (

          <NavLink

            key={to}

            to={to}

            end={to === '/'}

            className={({ isActive }) =>

              `flex min-w-0 flex-col items-center gap-0.5 px-1.5 py-1 text-[9px] ${

                isActive

                  ? 'font-semibold text-[var(--app-primary)]'

                  : 'text-[var(--app-text-muted)]'

              }`

            }

          >

            <Icon size={20} />

            <span className="truncate">{label}</span>

          </NavLink>

        ))}

      </div>

    </nav>

  );

}



export function Sidebar() {

  const user = useAuthStore((s) => s.user);

  const logout = useAuthStore((s) => s.logout);



  return (

    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-[var(--app-border)] bg-[var(--app-card-strong)] backdrop-blur-md">

      <div className="border-b border-[var(--app-border)] px-5 py-5">

        <AppLogo size={36} />

      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">

        {links.map(({ to, icon: Icon, label }) => (

          <NavLink

            key={to}

            to={to}

            end={to === '/'}

            className={({ isActive }) =>

              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${

                isActive

                  ? 'nav-link-active'

                  : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-soft)]'

              }`

            }

          >

            <Icon size={20} />

            {label}

          </NavLink>

        ))}

        <div className="mt-auto border-t border-[var(--app-border)] pt-4">

          {user && (

            <p className="mb-2 truncate px-4 text-xs text-[var(--app-text-muted)]">{user.username}</p>

          )}

          <button

            type="button"

            onClick={() => void logout()}

            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-[var(--app-text-muted)] hover:bg-[var(--app-bg-soft)]"

          >

            <LogOut size={20} />

            Выйти

          </button>

        </div>

      </nav>

    </aside>

  );

}



export function AppShell() {

  return (

    <>

      <Sidebar />

      <main className="md:ml-64 pb-20 md:pb-8">

        <div className="mx-auto w-3/4 max-w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10">

          <Outlet />

        </div>

      </main>

      <BottomNav />

      <QuickAddFab />

      <PwaUpdateBanner />

      <ToastHost />

    </>

  );

}


