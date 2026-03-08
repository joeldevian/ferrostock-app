import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, ArrowDownToLine, Users, Bell, BarChart3, Settings, LogOut, Menu, X, Search, WifiOff, Wifi } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../config/supabaseClient';
import toast from 'react-hot-toast';
import Logo from '../ui/Logo';
import { format } from 'date-fns';

export default function AppLayout() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    // Auth & User Profile
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    // Búsqueda Global
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ productos: [], proveedores: [], ventas: [] });
    const [isSearching, setIsSearching] = useState(false);
    const searchInputRef = useRef(null);

    // Modo Offline
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [showRestored, setShowRestored] = useState(false);

    useEffect(() => {
        const handleOffline = () => setIsOffline(true);
        const handleOnline = () => {
            setIsOffline(false);
            setShowRestored(true);
            setTimeout(() => {
                setShowRestored(false);
                window.location.reload(); // Recargar datos auto
            }, 3000);
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    const navigationGroups = [
        {
            label: 'PRINCIPAL',
            items: [
                { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }
            ]
        },
        {
            label: 'GESTIÓN',
            items: [
                { name: 'Inventario', href: '/inventory', icon: Package },
                { name: 'Ventas', href: '/sales', icon: ShoppingCart },
                { name: 'Entradas', href: '/entries', icon: ArrowDownToLine },
                { name: 'Proveedores', href: '/suppliers', icon: Users }
            ]
        },
        {
            label: 'CONTROL',
            items: [
                { name: 'Alertas', href: '/alerts', icon: Bell, badge: 2 }, // MVP UI
                { name: 'Reportes', href: '/reports', icon: BarChart3 }
            ]
        },
        {
            label: 'SISTEMA',
            items: [
                { name: 'Configuración', href: '/settings', icon: Settings }
            ]
        }
    ];

    const getCurrentPageName = () => {
        for (const group of navigationGroups) {
            const found = group.items.find(n => location.pathname.startsWith(n.href));
            if (found) return found.name;
        }
        return 'Dashboard';
    };

    useEffect(() => {
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/login', { replace: true });
                return;
            }
            setSession(session);

            const { data: userData } = await supabase
                .from('usuarios')
                .select('*, ferreterias(nombre)')
                .eq('id', session.user.id)
                .single();

            if (userData) {
                setProfile(userData);
            }
            setLoadingAuth(false);
        };
        initAuth();
    }, [navigate]);

    // Búsqueda en Header
    useEffect(() => {
        if (!searchOpen) {
            setSearchQuery('');
            setSearchResults({ productos: [], proveedores: [], ventas: [] });
            return;
        }
        if (searchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [searchOpen]);

    useEffect(() => {
        if (!searchQuery.trim() || !profile?.ferreteria_id) {
            setSearchResults({ productos: [], proveedores: [], ventas: [] });
            setIsSearching(false);
            return;
        }

        const debounce = setTimeout(async () => {
            setIsSearching(true);
            const q = `%${searchQuery}%`;

            try {
                const [prod, prov, vent] = await Promise.all([
                    supabase.from('productos').select('id, nombre, stock_actual, precio_venta').eq('ferreteria_id', profile.ferreteria_id).ilike('nombre', q).limit(4),
                    supabase.from('proveedores').select('id, nombre, telefono').eq('ferreteria_id', profile.ferreteria_id).ilike('nombre', q).limit(4),
                    supabase.from('ventas').select('id, fecha, total, productos!inner(nombre)').eq('ferreteria_id', profile.ferreteria_id).ilike('productos.nombre', q).order('fecha', { ascending: false }).limit(4)
                ]);

                setSearchResults({
                    productos: prod.data || [],
                    proveedores: prov.data || [],
                    ventas: vent.data || []
                });
            } catch (e) {
                console.error("Error searching", e);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(debounce);
    }, [searchQuery, profile]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
    };

    // Cerrar esc con modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setSearchOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (loadingAuth) {
        return (
            <div className="flex h-screen items-center justify-center bg-violet-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-violet-50 overflow-hidden relative">

            {/* Offline Banners */}
            {isOffline && (
                <div className="bg-[#FEF9C3] text-[#92400E] px-4 py-2 text-center text-sm flex justify-center items-center gap-2 border-b border-[#FDE047] font-medium z-50">
                    <WifiOff className="w-4 h-4" /> ⚠️ Sin conexión — mostrando últimos datos
                </div>
            )}
            {showRestored && (
                <div className="bg-green-500 text-white px-4 py-2 text-center text-sm flex justify-center items-center gap-2 font-medium z-50 animate-in slide-in-from-top border-b border-green-600">
                    <Wifi className="w-4 h-4" /> ✅ Conexión restaurada. Actualizando...
                </div>
            )}

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Desktop */}
                <aside className="hidden md:flex w-64 flex-col bg-indigo-950 shadow-[4px_0_20px_rgba(0,0,0,0.15)] z-20 shrink-0">
                    <div className="p-4 flex items-center h-16 border-b border-white/5">
                        <Logo textClassName="text-white text-xl font-bold tracking-tight" />
                    </div>
                    <div className="flex-1 overflow-y-auto py-6">
                        <nav className="space-y-6 px-3 min-h-0">
                            {navigationGroups.map((group) => (
                                <div key={group.label}>
                                    <h3 className="px-3 text-[0.7rem] font-bold text-gray-500 uppercase tracking-wider mb-2">
                                        {group.label}
                                    </h3>
                                    <div className="space-y-1">
                                        {group.items.map((item) => {
                                            const isActive = location.pathname.startsWith(item.href);
                                            return (
                                                <Link
                                                    key={item.name}
                                                    to={item.href}
                                                    className={`group flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${isActive
                                                        ? 'bg-violet-100/10 text-violet-400 border-l-[3px] border-violet-600 rounded-r-lg'
                                                        : 'text-gray-400 hover:text-white rounded-lg'
                                                        }`}
                                                >
                                                    <div className="flex items-center">
                                                        <item.icon
                                                            className={`mr-3 flex-shrink-0 h-5 w-5 ${isActive ? 'text-violet-400' : 'text-gray-500 group-hover:text-violet-400'
                                                                }`}
                                                            aria-hidden="true"
                                                        />
                                                        {item.name}
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </nav>
                    </div>

                    {/* User profile / Logout bottom pinned */}
                    <div className="p-4 border-t border-white/10 shrink-0">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-violet-600 to-purple-500 text-white flex items-center justify-center font-bold text-sm shadow-md uppercase">
                                {profile?.nombre?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{profile?.nombre || 'Usuario'}</p>
                                <p className="text-[0.7rem] text-violet-400 truncate capitalize">{profile?.rol || 'Rol'}</p>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="flex w-full items-center justify-start px-2 py-2 text-sm font-medium text-violet-400 hover:text-red-400 transition-colors duration-200">
                            <LogOut className="h-4 w-4 mr-3" />
                            Cerrar Sesión
                        </button>
                    </div>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

                    {/* Header Mobile / Desktop Top Bar */}
                    <header className="bg-white border-b border-violet-100 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10 shadow-sm shrink-0">
                        <div className="md:hidden">
                            <Logo className="w-6 h-6" textClassName="text-lg font-bold" />
                        </div>

                        <div className="hidden md:flex h-full items-center">
                            <h1 className="text-2xl font-bold text-indigo-950">
                                {getCurrentPageName()}
                            </h1>
                        </div>

                        <div className="flex items-center space-x-3 sm:space-x-4">
                            <div className="relative">
                                <button onClick={() => setSearchOpen(true)} className="text-gray-400 hover:text-violet-600 transition-colors p-2 rounded-full hover:bg-violet-50 bg-gray-50 border border-gray-100 shadow-sm">
                                    <Search className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="text-sm font-medium text-violet-600 hidden sm:block">
                                {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                            <button className="md:hidden text-gray-500 hover:text-violet-600 transition-colors bg-gray-50 border border-gray-100 p-2 rounded-full" onClick={() => setMobileMenuOpen(true)}>
                                <Menu className="h-5 w-5" />
                            </button>
                        </div>
                    </header>

                    {/* Page Content */}
                    <main className="flex-1 overflow-y-auto bg-violet-50 p-4 sm:p-6 lg:p-8 relative">
                        {/* Passes current offline status so pages can disable buttons */}
                        <Outlet context={{ session, profile, isOffline }} />
                    </main>
                </div>
            </div>

            {/* Global Search Overlay */}
            {searchOpen && (
                <div className="fixed inset-0 z-50 flex flex-col pt-16 sm:pt-24 px-4 items-center">
                    <div className="fixed inset-0 bg-indigo-950/60 backdrop-blur-sm transition-opacity" onClick={() => setSearchOpen(false)}></div>
                    <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-top-4 fade-in duration-200">
                        <div className="flex items-center border-b border-gray-100 px-4 py-3 bg-white relative z-10">
                            <Search className={`h-6 w-6 mr-3 ${isSearching ? 'text-violet-600 animate-pulse' : 'text-gray-400'}`} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                className="flex-1 bg-transparent border-none text-lg outline-none text-indigo-950 placeholder-gray-400 h-10"
                                placeholder="Buscar productos, proveedores, ventas..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            <button onClick={() => setSearchOpen(false)} className="mx-2 text-gray-400 hover:bg-gray-100 p-1.5 rounded-md transition-colors">
                                <span className="text-xs font-semibold px-1 border border-gray-300 rounded shadow-sm">ESC</span>
                            </button>
                        </div>

                        {searchQuery.trim() !== '' && (
                            <div className="overflow-y-auto max-h-[60vh] bg-gray-50/50 p-2">
                                {!isSearching && searchResults.productos.length === 0 && searchResults.proveedores.length === 0 && searchResults.ventas.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        <p>No encontramos nada con ese nombre "{searchQuery}"</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 p-2">
                                        {/* Result Groups */}
                                        {searchResults.productos.length > 0 && (
                                            <div>
                                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2 flex items-center"><Package className="w-3.5 h-3.5 mr-1" /> Productos</h3>
                                                <ul className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                                    {searchResults.productos.map(p => (
                                                        <li key={`p-${p.id}`} className="border-b border-gray-50 last:border-0 hover:bg-violet-50 transition-colors">
                                                            <button
                                                                onClick={() => { setSearchOpen(false); navigate('/inventory'); }}
                                                                className="w-full text-left p-3 flex justify-between items-center"
                                                            >
                                                                <span className="font-medium text-indigo-950 text-sm">{p.nombre}</span>
                                                                <div className="flex items-center gap-3 text-xs">
                                                                    <span className="text-gray-500">Stock: <b className="text-indigo-900">{p.stock_actual}</b></span>
                                                                    <span className="font-bold text-violet-700">S/ {p.precio_venta}</span>
                                                                </div>
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {searchResults.proveedores.length > 0 && (
                                            <div>
                                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2 mt-4 flex items-center"><Users className="w-3.5 h-3.5 mr-1" /> Proveedores</h3>
                                                <ul className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                                    {searchResults.proveedores.map(prov => (
                                                        <li key={`prov-${prov.id}`} className="border-b border-gray-50 last:border-0 hover:bg-violet-50 transition-colors">
                                                            <button
                                                                onClick={() => { setSearchOpen(false); navigate('/suppliers'); }}
                                                                className="w-full text-left p-3 flex justify-between items-center"
                                                            >
                                                                <span className="font-medium text-indigo-950 text-sm">{prov.nombre}</span>
                                                                <span className="text-gray-500 text-xs font-mono">{prov.telefono || 'Sin Teléfono'}</span>
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {searchResults.ventas.length > 0 && (
                                            <div>
                                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2 mt-4 flex items-center"><ShoppingCart className="w-3.5 h-3.5 mr-1" /> Ventas Recientes</h3>
                                                <ul className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                                    {searchResults.ventas.map(v => (
                                                        <li key={`v-${v.id}`} className="border-b border-gray-50 last:border-0 hover:bg-violet-50 transition-colors">
                                                            <button
                                                                onClick={() => { setSearchOpen(false); navigate('/sales'); }}
                                                                className="w-full text-left p-3 flex justify-between items-center"
                                                            >
                                                                <span className="font-medium text-indigo-950 text-sm truncate max-w-[200px] sm:max-w-xs">{v.productos?.nombre}</span>
                                                                <div className="flex items-center gap-3 text-xs">
                                                                    <span className="text-gray-400">{format(new Date(v.fecha), 'dd/MM/yyyy HH:mm')}</span>
                                                                    <span className="font-bold text-green-600 shrink-0">S/ {v.total.toFixed(2)}</span>
                                                                </div>
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        {/* Footer Help */}
                        <div className="bg-gray-50 border-t border-gray-100 p-2 text-center text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
                            FERROSTOCK Búsqueda Global
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Drawer Menu */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-40 flex md:hidden">
                    <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
                    <div className="relative flex-1 flex flex-col max-w-xs w-full bg-indigo-950 shadow-2xl">
                        <div className="absolute top-0 right-0 -mr-12 pt-2">
                            <button
                                type="button"
                                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <X className="h-6 w-6 text-white" aria-hidden="true" />
                            </button>
                        </div>

                        <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                            <div className="flex-shrink-0 flex items-center px-4 mb-6">
                                <Logo textClassName="text-white text-xl font-bold" />
                            </div>
                            <nav className="px-3 space-y-6">
                                {navigationGroups.map((group) => (
                                    <div key={group.label}>
                                        <h3 className="px-3 text-[0.7rem] font-bold text-gray-500 uppercase tracking-wider mb-2">
                                            {group.label}
                                        </h3>
                                        <div className="space-y-1">
                                            {group.items.map((item) => {
                                                const isActive = location.pathname.startsWith(item.href);
                                                return (
                                                    <Link
                                                        key={item.name}
                                                        to={item.href}
                                                        onClick={() => setMobileMenuOpen(false)}
                                                        className={`group flex items-center px-3 py-2.5 text-base font-medium transition-colors duration-200 ${isActive
                                                            ? 'bg-violet-100/10 text-violet-400 border-l-[3px] border-violet-600 rounded-r-lg'
                                                            : 'text-gray-400 hover:text-white rounded-lg'
                                                            }`}
                                                    >
                                                        <item.icon
                                                            className={`mr-4 flex-shrink-0 h-5 w-5 ${isActive ? 'text-violet-400' : 'text-gray-500 group-hover:text-violet-400'
                                                                }`}
                                                            aria-hidden="true"
                                                        />
                                                        {item.name}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </nav>
                        </div>
                        <div className="flex-shrink-0 flex flex-col border-t border-white/10 p-4">
                            <button onClick={handleLogout} className="flex items-center w-full px-2 py-2 text-base font-medium text-violet-400 hover:text-red-400 transition-colors duration-200">
                                <LogOut className="mr-4 h-5 w-5" />
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
