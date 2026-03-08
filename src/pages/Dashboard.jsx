import { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { ComposedChart, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, AlertTriangle, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalProducts: 0,
        lowStock: 0,
        salesToday: 0,
        salesMonth: 0
    });
    const [chartData, setChartData] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const { profile } = useOutletContext();

    useEffect(() => {
        if (profile) {
            if (profile.ferreteria_id) {
                fetchDashboardData();
            } else {
                setLoading(false);
            }
        }
    }, [profile]);

    const fetchDashboardData = async () => {
        if (!profile?.ferreteria_id) return;
        setLoading(true);
        try {
            // 1. Productos y Alertas
            const { data: products } = await supabase
                .from('productos')
                .select('id, nombre, stock_actual, stock_minimo')
                .eq('ferreteria_id', profile.ferreteria_id)
                .eq('activo', true);

            let totalP = 0;
            let lowS = 0;
            let alertsList = [];

            if (products) {
                totalP = products.length;
                products.forEach(p => {
                    if (p.stock_actual <= p.stock_minimo) {
                        lowS++;
                        alertsList.push(p);
                    }
                });
            }

            // 2. Ventas (Hoy y Mes)
            const now = new Date();
            const stToday = startOfDay(now).toISOString();
            const edToday = endOfDay(now).toISOString();
            const stMonth = startOfMonth(now).toISOString();
            const edMonth = endOfMonth(now).toISOString();

            const { data: sales } = await supabase
                .from('ventas')
                .select('total, fecha, producto_id, cantidad, productos(nombre)')
                .eq('ferreteria_id', profile.ferreteria_id)
                .gte('fecha', stMonth)
                .lte('fecha', edMonth);

            let sToday = 0;
            let sMonth = 0;
            let prodSalesCount = {};
            let chartMap = {};

            // Inicializar últimos 7 días
            for (let i = 6; i >= 0; i--) {
                const d = format(subDays(now, i), 'EEE dd', { locale: es });
                chartMap[d] = 0;
            }

            if (sales) {
                sales.forEach(sale => {
                    sMonth += Number(sale.total);

                    if (sale.fecha >= stToday && sale.fecha <= edToday) {
                        sToday += Number(sale.total);
                    }

                    // Para Top Productos
                    const pid = sale.producto_id;
                    if (!prodSalesCount[pid]) {
                        prodSalesCount[pid] = {
                            nombre: sale.productos?.nombre || 'Desconocido',
                            cantidad: 0,
                            total: 0
                        };
                    }
                    prodSalesCount[pid].cantidad += Number(sale.cantidad);
                    prodSalesCount[pid].total += Number(sale.total);

                    // Para Gráfico 7 días
                    const dayDiff = Math.floor((now.getTime() - new Date(sale.fecha).getTime()) / (1000 * 3600 * 24));
                    if (dayDiff < 7) {
                        const label = format(new Date(sale.fecha), 'EEE dd', { locale: es });
                        if (chartMap[label] !== undefined) {
                            chartMap[label] += Number(sale.total);
                        }
                    }
                });
            }

            const formattedChartData = Object.keys(chartMap).map(k => ({
                name: k,
                ventas: chartMap[k]
            }));

            const top = Object.values(prodSalesCount)
                .sort((a, b) => b.cantidad - a.cantidad)
                .slice(0, 5);

            setStats({
                totalProducts: totalP,
                lowStock: lowS,
                salesToday: sToday,
                salesMonth: sMonth
            });
            setAlerts(alertsList.sort((a, b) => a.stock_actual - b.stock_actual).slice(0, 5));
            setTopProducts(top);
            setChartData(formattedChartData);

        } catch (error) {
            console.error('Error fetching dashboard info', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
    };

    const handleFixDatabase = async () => {
        try {
            toast.loading('Creando ferretería...', { id: 'fixer' });

            // 1. Crear Ferreteria
            const { data: newFerr, error: errFerr } = await supabase
                .from('ferreterias')
                .insert([{ nombre: 'Ferretería de ' + profile.nombre }])
                .select()
                .single();

            if (errFerr) throw errFerr;

            // 2. Asociar a Usuario
            const { error: errUsr } = await supabase
                .from('usuarios')
                .update({ ferreteria_id: newFerr.id })
                .eq('id', profile.id);

            if (errUsr) throw errUsr;

            toast.success('¡Datos solucionados! Recargando aplicación...', { id: 'fixer' });
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error) {
            toast.error('Ocurrió un error: ' + error.message, { id: 'fixer' });
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in">
            {profile && !profile.ferreteria_id && (
                <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h3 className="text-red-800 font-bold text-lg flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Acción Requerida: Base de Datos Incompleta
                        </h3>
                        <p className="text-red-700 text-sm mt-1">
                            Tu usuario no tiene vinculada ninguna "ferretería" en la plataforma, por ello esta pantalla (y las demás) no cargan registros.
                            Haz clic en el botón para que el sistema cree una ferretería automáticamente y te la asigne.
                        </p>
                    </div>
                    <button
                        onClick={handleFixDatabase}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-lg shadow whitespace-nowrap transition-colors"
                    >
                        Arreglar mi cuenta automáticamente
                    </button>
                </div>
            )}

            {/* 4 Cards Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(124,58,237,0.08)] border border-gray-100 border-l-4 border-l-blue-500 p-4 lg:p-5 flex items-center space-x-3 lg:space-x-4 transition-transform hover:-translate-y-1">
                    <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 rounded-full shrink-0">
                        <Package className="w-6 h-6 lg:w-7 lg:h-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[0.65rem] font-bold text-gray-500 uppercase tracking-wider mb-1 truncate">Productos en Stock</p>
                        <h3 className="text-xl lg:text-2xl xl:text-2xl font-extrabold text-indigo-950 tabular-nums tracking-tight truncate">{stats.totalProducts}</h3>
                    </div>
                </div>

                <div className={`bg-white rounded-xl shadow-[0_4px_20px_rgba(124,58,237,0.08)] border border-gray-100 border-l-4 ${stats.lowStock > 0 ? 'border-l-red-500' : 'border-l-green-500'} p-4 lg:p-5 flex items-center space-x-3 lg:space-x-4 transition-transform hover:-translate-y-1`}>
                    <div className={`p-3 rounded-full bg-gradient-to-br shrink-0 ${stats.lowStock > 0 ? 'from-red-100 to-red-50 text-red-600' : 'from-green-100 to-green-50 text-green-600'}`}>
                        {stats.lowStock > 0 ? <AlertTriangle className="w-6 h-6 lg:w-7 lg:h-7" /> : <Activity className="w-6 h-6 lg:w-7 lg:h-7" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[0.65rem] font-bold text-gray-500 uppercase tracking-wider mb-1 truncate">Stock Bajo/Agotado</p>
                        <div className={`text-xl lg:text-2xl xl:text-2xl font-extrabold flex flex-wrap items-center gap-1 tabular-nums tracking-tight truncate ${stats.lowStock > 0 ? 'text-red-500' : 'text-indigo-950'}`}>
                            {stats.lowStock}
                            {stats.lowStock > 0 && <span className="text-[10px] font-semibold px-2 py-0.5 whitespace-nowrap bg-red-100 text-red-600 rounded-full animate-pulse">¡Revisar!</span>}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(124,58,237,0.08)] border border-gray-100 border-l-4 border-l-green-500 p-4 lg:p-5 flex items-center space-x-3 lg:space-x-4 transition-transform hover:-translate-y-1">
                    <div className="p-3 bg-gradient-to-br from-green-100 to-green-50 text-green-600 rounded-full shrink-0">
                        <DollarSign className="w-6 h-6 lg:w-7 lg:h-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[0.65rem] font-bold text-gray-500 uppercase tracking-wider mb-1 truncate">Ventas Hoy</p>
                        <h3 className="text-xl lg:text-2xl xl:text-2xl font-extrabold text-indigo-950 tabular-nums tracking-tight truncate" title={formatCurrency(stats.salesToday)}>{formatCurrency(stats.salesToday)}</h3>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(124,58,237,0.08)] border border-gray-100 border-l-4 border-l-violet-500 p-4 lg:p-5 flex items-center space-x-3 lg:space-x-4 transition-transform hover:-translate-y-1">
                    <div className="p-3 bg-gradient-to-br from-violet-200 to-violet-50 text-violet-700 rounded-full shrink-0">
                        <TrendingUp className="w-6 h-6 lg:w-7 lg:h-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[0.65rem] font-bold text-gray-500 uppercase tracking-wider mb-1 truncate">Ventas del Mes</p>
                        <h3 className="text-xl lg:text-2xl xl:text-2xl font-extrabold text-indigo-950 tabular-nums tracking-tight truncate" title={formatCurrency(stats.salesMonth)}>{formatCurrency(stats.salesMonth)}</h3>
                    </div>
                </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Gráfico 7 Días */}
                <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(124,58,237,0.04)] border border-gray-100 p-6 lg:col-span-2">
                    <h3 className="text-base font-semibold text-indigo-950 mb-6 flex items-center">
                        <Activity className="w-4 h-4 mr-2 text-violet-600" />
                        Ventas de los últimos 7 días
                    </h3>
                    <div className="h-72">
                        {chartData.length === 0 || chartData.every(d => d.ventas === 0) ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-6">
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-[#EDE9FE] mb-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
                                    <path strokeLinecap="round" strokeLinejoin="round" className="text-violet-600" strokeWidth="2" strokeDasharray="4 4" d="M7 14l4-4 4 4 6-6" />
                                </svg>
                                <p className="font-bold text-indigo-950 text-base">Aún no hay ventas registradas</p>
                                <p className="text-sm text-gray-500 mt-1">Las ventas aparecerán aquí</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#7C3AED" />
                                            <stop offset="100%" stopColor="#C4B5FD" />
                                        </linearGradient>
                                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.15} />
                                            <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} tickFormatter={(val) => `S/${val}`} />
                                    <Tooltip
                                        cursor={{ fill: '#F3F4F6', opacity: 0.4 }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px -1px rgba(124,58,237,0.1)' }}
                                        formatter={(value) => [formatCurrency(value), 'Ventas']}
                                    />
                                    <Area type="monotone" dataKey="ventas" fill="url(#areaGrad)" stroke="none" />
                                    <Bar dataKey="ventas" fill="url(#barGrad)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Top 5 y Alertas */}
                <div className="space-y-6">

                    {/* Top 5 Productos */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-base font-semibold text-indigo-950 mb-4 flex items-center">
                            <TrendingUp className="w-4 h-4 mr-2 text-violet-600" />
                            Más vendidos (Mes)
                        </h3>
                        {topProducts.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No hay ventas registradas este mes.</p>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {topProducts.map((p, idx) => (
                                    <li key={idx} className="py-3 flex justify-between items-center">
                                        <div className="flex items-center">
                                            <span className="w-5 h-5 rounded-full bg-violet-200 text-violet-600 flex items-center justify-center text-xs font-bold mr-3">
                                                {idx + 1}
                                            </span>
                                            <span className="text-sm font-medium text-gray-700 truncate max-w-[140px]" title={p.nombre}>
                                                {p.nombre}
                                            </span>
                                        </div>
                                        <span className="text-sm font-bold text-indigo-950">{p.cantidad} und.</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Alertas */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-base font-semibold text-indigo-950 mb-4 flex items-center">
                            <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
                            Alertas de Stock
                        </h3>
                        {alerts.length === 0 ? (
                            <div className="text-center py-4">
                                <div className="inline-flex rounded-full bg-green-100 p-2 mb-2">
                                    <Activity className="w-5 h-5 text-green-600" />
                                </div>
                                <p className="text-sm text-gray-500 font-medium">Todo tu stock está saludable</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {alerts.map((a, idx) => (
                                    <li key={idx} className="py-3">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-sm font-medium text-gray-700 truncate pr-2">{a.nombre}</span>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.stock_actual <= 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {a.stock_actual <= 0 ? 'Agotado' : 'Bajo'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Stock: <span className="font-bold text-indigo-950">{a.stock_actual}</span> (Mín: {a.stock_minimo})
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                </div>

            </div>

        </div>
    );
}
