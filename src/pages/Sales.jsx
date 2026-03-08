import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../config/supabaseClient';
import toast from 'react-hot-toast';
import { useOutletContext } from 'react-router-dom';
import { ShoppingCart, FileText, Search, X, CheckCircle2 } from 'lucide-react';
import { format, isToday, isThisWeek, isThisMonth } from 'date-fns';

export default function Sales() {
    const [products, setProducts] = useState([]);
    const [salesHistory, setSalesHistory] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('Hoy'); // Hoy, Esta semana, Este mes, Todo

    const { profile, session } = useOutletContext();

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
            const [prodRes, salesRes] = await Promise.all([
                supabase.from('productos').select('*').eq('ferreteria_id', profile.ferreteria_id).eq('activo', true),
                supabase.from('ventas').select('*, productos(nombre), usuarios(nombre)').eq('ferreteria_id', profile.ferreteria_id).order('fecha', { ascending: false }).limit(100)
            ]);
            setProducts(prodRes.data || []);
            setSalesHistory(salesRes.data || []);
        } catch (e) {
            toast.error('Error cargando datos de ventas');
        }
    };

    const handleProductSelect = (p) => {
        const existing = cart.find(item => item.id === p.id);
        if (existing) {
            toast.error('El producto ya está en el carrito. Ajusta la cantidad allí.');
        } else {
            setCart([...cart, {
                ...p,
                cantidad: 1,
                precio_unitario: p.precio_venta
            }]);
            setSearchQuery('');
        }
    };

    const updateCartItem = (id, field, value) => {
        setCart(cart.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                return updated;
            }
            return item;
        }));
    };

    const removeCartItem = (id) => {
        setCart(cart.filter(item => item.id !== id));
    };

    const grandTotal = cart.reduce((acc, item) => acc + ((parseFloat(item.cantidad) || 0) * (parseFloat(item.precio_unitario) || 0)), 0);

    const handleRegistrarVenta = async () => {
        if (cart.length === 0) return toast.error('El carrito está vacío');

        // Validation
        for (const item of cart) {
            const qty = parseFloat(item.cantidad);
            const price = parseFloat(item.precio_unitario);

            if (isNaN(qty) || qty <= 0) return toast.error(`Cantidad inválida para ${item.nombre}`);
            if (isNaN(price) || price < 0) return toast.error(`Precio inválido para ${item.nombre}`);
            if (qty > item.stock_actual) return toast.error(`Stock insuficiente de ${item.nombre}. Disp: ${item.stock_actual}`);
        }

        try {
            const timestamp = new Date().toISOString();

            const ventasData = cart.map(item => ({
                ferreteria_id: profile.ferreteria_id,
                usuario_id: session?.user?.id,
                producto_id: item.id,
                cantidad: parseFloat(item.cantidad),
                precio_unitario: parseFloat(item.precio_unitario),
                total: parseFloat(item.cantidad) * parseFloat(item.precio_unitario),
                fecha: timestamp, // Ensures same timestamp for multiple items
                nota: 'Venta Carrito'
            }));

            // 1. Insert Sales
            const { error: saleErr } = await supabase.from('ventas').insert(ventasData);
            if (saleErr) throw saleErr;

            // 2. Update Stock
            const stockUpdates = cart.map(item => {
                const newStock = item.stock_actual - parseFloat(item.cantidad);
                return supabase.from('productos')
                    .update({ stock_actual: newStock })
                    .eq('id', item.id);
            });
            await Promise.all(stockUpdates);

            toast.success(`Venta registrada exitosamente. Total: S/ ${grandTotal.toFixed(2)}`);
            setCart([]);
            fetchInitialData();
        } catch (e) {
            toast.error('Error al registrar la venta');
            console.error(e);
        }
    };

    const filteredSearch = products.filter(p =>
        searchQuery && (p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.codigo.toLowerCase().includes(searchQuery.toLowerCase()))
    ).slice(0, 5);

    // Filters logic
    const filteredHistory = useMemo(() => {
        return salesHistory.filter(sale => {
            if (dateFilter === 'Todo') return true;

            const date = new Date(sale.fecha);
            if (dateFilter === 'Hoy') return isToday(date);
            if (dateFilter === 'Esta semana') return isThisWeek(date);
            if (dateFilter === 'Este mes') return isThisMonth(date);
            return true;
        });
    }, [salesHistory, dateFilter]);

    const periodTotal = filteredHistory.reduce((acc, sale) => acc + sale.total, 0);
    const periodCount = filteredHistory.length;

    return (
        <div className="space-y-6 fade-in pb-20">
            <div>
                <h2 className="text-2xl font-bold text-indigo-950">Registro de Ventas</h2>
                <p className="text-sm text-violet-600/70">Caja y registro de salidas de mercadería</p>
            </div>

            {/* CARRITO DE COMPRAS */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 bg-violet-600 border-b border-violet-700 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5" />
                        <h3 className="font-semibold">Carrito de Ventas</h3>
                    </div>
                    <div className="text-sm font-medium bg-violet-700 px-3 py-1 rounded-full">
                        {cart.length} {cart.length === 1 ? 'ítem' : 'ítems'}
                    </div>
                </div>

                <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Buscador y Lista */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Producto para Agregar</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Escribe el nombre o código del producto..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 outline-none bg-gray-50/50"
                                />
                            </div>
                            {searchQuery && (
                                <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                    {filteredSearch.length === 0 ? (
                                        <li className="p-3 text-sm text-gray-500 text-center">No encontramos nada con ese nombre</li>
                                    ) : (
                                        filteredSearch.map(p => (
                                            <li
                                                key={p.id}
                                                onClick={() => p.stock_actual > 0 && handleProductSelect(p)}
                                                className={`p-3 border-b border-gray-100 last:border-0 text-sm hover:bg-violet-50 cursor-pointer ${p.stock_actual <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <div className="font-medium text-indigo-950">{p.nombre}</div>
                                                <div className="flex justify-between text-xs mt-1">
                                                    <span className="text-gray-500">
                                                        Stock disp: <b className={p.stock_actual <= 0 ? 'text-red-500' : 'text-green-600'}>{p.stock_actual}</b> {p.unidad}
                                                    </span>
                                                    <span className="font-semibold text-violet-700">S/ {p.precio_venta}</span>
                                                </div>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            )}
                        </div>

                        {/* Items del Carrito */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden flex-1 flex flex-col">
                            {cart.length === 0 ? (
                                <div className="p-8 text-center flex flex-col items-center justify-center h-full text-gray-400">
                                    <ShoppingCart className="w-12 h-12 mb-3 text-gray-300" />
                                    <p>El carrito está vacío</p>
                                    <span className="text-xs">Busca y selecciona productos arriba</span>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-200 max-h-[350px] overflow-y-auto">
                                    {cart.map(item => {
                                        const subtotal = (parseFloat(item.cantidad) || 0) * (parseFloat(item.precio_unitario) || 0);
                                        const qtyError = parseFloat(item.cantidad) > item.stock_actual;
                                        return (
                                            <div key={item.id} className="p-4 bg-white hover:bg-gray-50 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-indigo-950 truncate whitespace-normal text-sm">{item.nombre}</p>
                                                    <p className="text-[11px] text-gray-500 mt-0.5">Stock max: <span className={qtyError ? 'text-red-500 font-bold' : ''}>{item.stock_actual}</span> {item.unidad}</p>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-3">
                                                    <div>
                                                        <label className="text-[10px] text-gray-400 uppercase font-semibold mb-1 block">Cant.</label>
                                                        <input
                                                            type="number"
                                                            step="any"
                                                            value={item.cantidad}
                                                            onChange={e => updateCartItem(item.id, 'cantidad', e.target.value)}
                                                            className={`w-20 px-2 py-1.5 text-sm border rounded focus:ring-1 focus:outline-none ${qtyError ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-violet-600'}`}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-gray-400 uppercase font-semibold mb-1 block">Precio (S/)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={item.precio_unitario}
                                                            onChange={e => updateCartItem(item.id, 'precio_unitario', e.target.value)}
                                                            className="w-24 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-violet-600 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div className="w-24 text-right">
                                                        <label className="text-[10px] text-gray-400 uppercase font-semibold mb-1 block">Subtotal</label>
                                                        <div className="font-bold text-indigo-950 whitespace-nowrap">S/ {subtotal.toFixed(2)}</div>
                                                    </div>
                                                    <button onClick={() => removeCartItem(item.id)} className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-md transition-colors mt-4 sm:ml-2">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Resumen Total */}
                    <div className="lg:col-span-1 bg-violet-50 rounded-xl border border-violet-100 p-6 flex flex-col justify-between">
                        <div>
                            <h4 className="text-violet-800 font-bold uppercase tracking-wider text-xs mb-4">Resumen de Venta</h4>
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Total de Ítems</span>
                                    <span className="font-semibold">{cart.length}</span>
                                </div>
                                <div className="w-full h-px bg-violet-200/60 my-2"></div>
                                <div className="flex justify-between items-end">
                                    <span className="text-sm font-semibold text-indigo-950 mb-1">TOTAL</span>
                                    <span className="text-4xl font-black text-violet-700 tracking-tight">
                                        <span className="text-2xl mr-1 opacity-70">S/</span>{grandTotal.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleRegistrarVenta}
                            disabled={cart.length === 0}
                            className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white rounded-[10px] px-5 py-4 font-semibold text-base shadow-[0_4px_14px_rgba(124,58,237,0.35)] hover:bg-violet-700 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                            <CheckCircle2 className="w-5 h-5" /> Registrar Venta
                        </button>
                    </div>
                </div>
            </div>

            {/* Historial Reciente con Filtros Rápidos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
                <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h3 className="font-semibold text-indigo-950 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-gray-400" /> Historial de Ventas
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
                    <span className="font-semibold text-violet-700">
                        Total: S/ {periodTotal.toFixed(2)} <span className="text-gray-400 font-normal ml-1">({periodCount} transacciones)</span>
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead className="bg-violet-50 text-gray-500">
                            <tr>
                                <th className="p-4 font-medium">Fecha/Hora</th>
                                <th className="p-4 font-medium">Producto</th>
                                <th className="p-4 font-medium text-right">Cant.</th>
                                <th className="p-4 font-medium text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EDE9FE]">
                            {filteredHistory.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-12 text-center">
                                        <p className="font-bold text-indigo-950 text-base">Nada por aquí</p>
                                        <p className="text-sm text-gray-500 mt-1">No hay ventas registradas en este período</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredHistory.map(sale => (
                                    <tr key={sale.id} className="group hover:bg-[#F5F3FF] transition-colors duration-150 cursor-pointer">
                                        <td className="p-4 text-gray-500">
                                            {format(new Date(sale.fecha), 'dd/MM/yyyy HH:mm')}
                                        </td>
                                        <td className="p-4 font-medium text-indigo-950">
                                            {sale.productos?.nombre || 'Producto eliminado'}
                                            {sale.nota && <span className="block text-xs text-gray-400 font-normal">{sale.nota}</span>}
                                        </td>
                                        <td className="p-4 text-right">{sale.cantidad}</td>
                                        <td className="p-4 text-right font-bold text-green-600 tabular-nums">S/ {sale.total.toFixed(2)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
