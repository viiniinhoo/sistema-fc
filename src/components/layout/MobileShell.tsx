import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Home, FileText, Package, Users, LogOut, WifiOff, Wifi } from 'lucide-react';

export default function MobileShell() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSignOut = async () => {
    if (confirm('Deseja realmente sair do sistema?')) {
      await signOut();
      navigate('/login');
    }
  };

  const navItems = [
    { to: '/', icon: Home, label: 'Início' },
    { to: '/orcamentos', icon: FileText, label: 'Orçamentos' },
    { to: '/listas', icon: Package, label: 'Materiais' },
    { to: '/clientes', icon: Users, label: 'Clientes' }
  ];

  return (
    <div className="flex flex-col h-[100dvh] bg-[#030712] text-slate-100 overflow-hidden">
      
      {/* Top Header */}
      <header className="shrink-0 bg-[#1a2b4b] border-b border-white/5 px-4 h-14 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="LVC Logo" className="h-6 w-auto" />
          <h1 className="text-lg font-black italic tracking-tighter leading-none">
            <span className="text-white">LVC</span> <span className="text-[#009ee3]">ELÉTRICA</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5" title={isOnline ? "Conectado" : "Offline - Salvando no aparelho"}>
            {isOnline ? (
              <Wifi size={16} className="text-emerald-400" />
            ) : (
              <WifiOff size={16} className="text-amber-500 animate-pulse" />
            )}
            <span className={`text-[10px] font-bold uppercase ${isOnline ? 'text-emerald-400' : 'text-amber-500'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          
          <button 
            onClick={handleSignOut} 
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Main Content Area (Scrollable) */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden touch-pan-y relative pb-safe">
        <Outlet />
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="shrink-0 bg-[#1a2b4b]/95 backdrop-blur-md border-t border-white/10 flex justify-around items-end h-16 pb-2 pt-1 px-2 z-50">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              flex flex-col items-center justify-center w-full py-1 gap-1 transition-all
              ${isActive ? 'text-[#009ee3] scale-105' : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            <item.icon size={22} strokeWidth={2.5} />
            <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
