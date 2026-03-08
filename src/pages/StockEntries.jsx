import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../config/supabaseClient';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';
import { ArrowDownToLine, PackagePlus, Search, FileText, ArrowLeft } from 'lucide-react';
import { format, isToday, isThisWeek, isThisMonth } from 'date-fns';

export default function StockEntries() {
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [entriesHistory, setEntriesHistory] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('Hoy'); // Hoy, Esta semana, Este mes, Todo
    const [fromAlerts, setFromAlerts] = useState(false);

    const { register, handleSubmit, reset, watch, setValue } = useForm();
    const { profile, session, isOffline } = useOutletContext();
    const location = useLocation();
    const navigate = useNavigate();
    const qtyInputRef = useRef(null);

    useEffect(() => {
        if (profile) {
            if (profile.ferreteria_id) {
                fetchInitialData();
            }
        }
    }, [profile]);

    const fetchInitialData = async () => {
        if (!profile?.ferreteria_id) return;
        try {
            const [prodRes, supRes, entriesRes] = await Promise.all([
                supabase.from('productos').select('*').eq('ferreteria_id', profile.ferreteria_id).eq('activo', true),
                supabase.from('proveedores').select('id, nombre').eq('ferreteria_id', profile.ferreteria_id),
                supabase.from('entradas_stock').select('*, productos(nombre), proveedores(nombre)').eq('ferreteria_id', profile.ferreteria_id).order('fecha', { ascending: false }).limit(100)
            ]);
            setProducts(prodRes.data || []);
            setSuppliers(supRes.data || []);
            setEntriesHistory(entriesRes.data || []);
        } catch (e) {
            toast.error('Error cargando datos de entradas');
        }
    };

    // Auto-select from alerts
    useEffect(() => {
        if (location.state?.productToEntry && products.length > 0) {
            const p = location.state.productToEntry;
            const found = products.find(x => x.id === p.id);
            if (found) {
                handleProductSelect(found);
                setFromAlerts(true);
                // clean state to prevent loop on reload
                navigate(location.pathname, { replace: true });

                // Focus quantity field after a short delay
                setTimeout(() => {
                    if (qtyInputRef.current) qtyInputRef.current.focus();
                }, 100);
            }
        }
    }, [location.state, products, navigate]);

    const handleProductSelect = (p) => {
        setSelectedProduct(p);
        setValue('precio_compra', p.precio_compra);
        setValue('proveedor_id', p.proveedor_id || '');
        setValue('cantidad', 1);
        setSearchQuery('');

        setTimeout(() => {
            if (qtyInputRef.current) qtyInputRef.current.focus();
        }, 50);
    };

    const onSubmit = async (data) => {
        if (!selectedProduct) return toast.error('Selecciona un producto');

        const qty = parseFloat(data.cantidad);
        const newPrice = parseFloat(data.precio_compra);

        try {
            // 1. Insert Entry
            const { error: entryErr } = await supabase.from('entradas_stock').insert({
                ferreteria_id: profile.ferreteria_id,
                usuario_id: session?.user?.id,
                producto_id: selectedProduct.id,
                proveedor_id: data.proveedor_id || null,
                cantidad: qty,
                precio_compra: newPrice,
                nota: data.nota || null
            });
            if (entryErr) throw entryErr;

            // 2. Update Product Stock and Price History
            const newStock = parseFloat(selectedProduct.stock_actual) + qty;
            let updates = { stock_actual: newStock };

            if (newPrice !== selectedProduct.precio_compra) {
                updates.precio_compra = newPrice;
                await supabase.from('historial_precios').insert({
                    producto_id: selectedProduct.id,
                    precio_anterior: selectedProduct.precio_compra,
                    precio_nuevo: newPrice,
                    tipo: 'compra'
                });
            }

            const { error: stockErr } = await supabase.from('productos')
                .update(updates)
                .eq('id', selectedProduct.id);
            if (stockErr) throw stockErr;

            toast.success('Ingreso registrado. Stock actualizado.');

            if (fromAlerts) {
                toast.success(`✅ Alerta resuelta para ${selectedProduct.nombre}`);
                navigate('/alerts');
            } else {
                setSelectedProduct(null);
                reset();
                fetchInitialData();
            }

        } catch (e) {
            toast.error('Error al registrar almacén');
            console.error(e);
        }
    };

    const filteredSearch = products.filter(p =>
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.codigo.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5);

    // Filters logic
    const filteredHistory = useMemo(() => {
        return entriesHistory.filter(entry => {
            if (dateFilter === 'Todo') return true;

            const date = new Date(entry.fecha);
            if (dateFilter === 'Hoy') return isToday(date);
            if (dateFilter === 'Esta semana') return isThisWeek(date);
            if (dateFilter === 'Este mes') return isThisMonth(date);
            return true;
        });
    }, [entriesHistory, dateFilter]);

    const periodCount = filteredHistory.length;
    const periodTotalUnits = filteredHistory.reduce((acc, entry) => acc + entry.cantidad, 0);

    return (
        <div className="space-y-6 fade-in pb-20">
            <div>
                <h2 className="text-2xl font-bold text-indigo-950 flex items-center gap-3">
                    Entradas de Stock
                    {fromAlerts && (
                        <button onClick={() => navigate('/alerts')} className="ml-4 text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full font-medium inline-flex items-center hover:bg-indigo-200 transition-colors">
                            <ArrowLeft className="w-3 h-3 mr-1" /> Volviendo desde Alertas
                        </button>
                    )}
                </h2>
                <p className="text-sm text-violet-600/70">Registrar llegada de mercadería nueva</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Formulario Ingreso */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 h-fit">
                    <div className={fromAlerts ? "p-4 bg-red-600 rounded-t-xl text-white flex items-center gap-2" : "p-4 bg-indigo-950 rounded-t-xl text-white flex items-center gap-2"}>
                        <PackagePlus className="w-5 h-5" />
                        <h3 className="font-semibold">{fromAlerts ? 'Resolviendo Alerta' : 'Nuevo Ingreso'}</h3>
                    </div>
                    <div className="p-5">
                        {!selectedProduct ? (
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Producto</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Escribe nombre o código..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 outline-none"
                                    />
                                </div>
                                {searchQuery && (
                                    <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {filteredSearch.length === 0 ? (
                                            <li className="p-3 text-sm text-gray-500 text-center">No encontrado</li>
                                        ) : (
                                            filteredSearch.map(p => (
                                                <li
                                                    key={p.id}
                                                    onClick={() => handleProductSelect(p)}
                                                    className={`p-3 border-b last:border-0 text-sm hover:bg-violet-50 cursor-pointer`}
                                                >
                                                    <div className="font-medium">{p.nombre}</div>
                                                    <div className="text-xs text-gray-500">Stock Actual: {p.stock_actual}</div>
                                                </li>
                                            ))
                                        )}
                                    </ul>
                                )}
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div className={`${fromAlerts ? 'bg-red-50 border-red-200' : 'bg-violet-50 border-gray-200'} p-3 rounded-lg border relative`}>
                                    {!fromAlerts && (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedProduct(null)}
                                            className="absolute top-2 right-2 text-xs text-red-500 font-medium hover:underline"
                                        >
                                            Editar Selección
                                        </button>
                                    )}
                                    <p className="text-sm font-medium text-indigo-950 pr-20">{selectedProduct.nombre}</p>
                                    <p className="text-xs text-gray-500 mt-1">Stock antes: <b>{selectedProduct.stock_actual}</b> {selectedProduct.unidad}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad Ingresa</label>
                                        <input
                                            type="number"
                                            step="any"
                                            {...register('cantidad', {
                                                required: true,
                                                min: 0.01
                                            })}
                                            ref={(e) => {
                                                register('cantidad').ref(e);
                                                qtyInputRef.current = e; // Sync ref for auto-focus
                                            }}
                                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none ${fromAlerts ? 'bg-red-50 focus:ring-red-500 border-red-300' : 'bg-blue-50 focus:ring-violet-600'}`}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">P. Compra Unit.</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            {...register('precio_compra', { min: 0 })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor (Opcional)</label>
                                    <select {...register('proveedor_id')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:outline-none text-sm">
                                        <option value="">Seleccionar proveedor...</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">N. Guía o Factura (Opcional)</label>
                                    <input type="text" {...register('nota')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:outline-none text-sm" placeholder="Ej: F001-1234" />
                                </div>

                                <button type="submit" disabled={isOffline} title={isOffline ? "Necesitas conexión para registrar" : ""} className={`w-full text-white rounded-[10px] px-5 py-3 font-semibold text-[0.875rem] shadow-[0_4px_14px_rgba(124,58,237,0.35)] hover:-translate-y-[1px] transition-all duration-200 active:scale-95 mt-2 disabled:opacity-50 disabled:cursor-not-allowed ${fromAlerts ? 'bg-red-600 hover:bg-red-700' : 'bg-violet-600 hover:bg-violet-700'}`}>
                                    {fromAlerts ? 'Guardar y Resolver Alerta' : 'Guardar Ingreso'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {/* Historial Reciente */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6 lg:mt-0">
                    <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h3 className="font-semibold text-indigo-950 flex items-center gap-2">
                            <ArrowDownToLine className="w-5 h-5 text-gray-400" /> Historial de Ingresos
                        </h3>

                        {/* Filtros Rápidos (Pills) */}
                        <div className="flex flex-wrap gap-2">
                            {['Hoy', 'Esta semana', 'Este mes', 'Todo'].map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setDateFilter(filter)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200 border ${dateFilter === filter
                                        ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                                        : 'bg-white text-gray-600 border-gray-300 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700'
                                        }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Resumen de período seleccionado */}
                    <div className="bg-gray-50/50 p-3 px-5 border-b border-gray-100 flex justify-between items-center text-sm">
                        <span className="text-gray-500">
                            Resultados para <span className="font-semibold text-indigo-950">"{dateFilter}"</span>
                        </span>
                        <span className="font-semibold text-blue-700">
                            Total: +{periodTotalUnits} unidades <span className="text-gray-400 font-normal ml-1">({periodCount} ingresos)</span>
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead className="bg-violet-50 text-gray-500">
                                <tr>
                                    <th className="p-4 font-medium">Fecha</th>
                                    <th className="p-4 font-medium">Producto</th>
                                    <th className="p-4 font-medium">Proveedor</th>
                                    <th className="p-4 font-medium text-right">Cant.</th>
                                    <th className="p-4 font-medium text-right">P. Com.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EDE9FE]">
                                {filteredHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center">
                                            <p className="font-bold text-indigo-950 text-base">Nada por aquí</p>
                                            <p className="text-sm text-gray-500 mt-1">No hay entradas registradas en este período</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredHistory.map(entry => (
                                        <tr key={entry.id} className="group hover:bg-[#F5F3FF] transition-colors duration-150 cursor-pointer">
                                            <td className="p-4 text-gray-500 whitespace-nowrap">
                                                {format(new Date(entry.fecha), 'dd/MM/yyyy HH:mm')}
                                            </td>
                                            <td className="p-4 font-medium text-indigo-950">
                                                {entry.productos?.nombre || 'Producto eliminado'}
                                                {entry.nota && <span className="block text-xs text-gray-400 font-normal mt-0.5">Guía: {entry.nota}</span>}
                                            </td>
                                            <td className="p-4 text-gray-600">{entry.proveedores?.nombre || '-'}</td>
                                            <td className="p-4 text-right font-bold text-blue-600 tabular-nums">+{entry.cantidad}</td>
                                            <td className="p-4 text-right tabular-nums">
                                                {entry.precio_compra ? `S/ ${entry.precio_compra.toFixed(2)}` : '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
