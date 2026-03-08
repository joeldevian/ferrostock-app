import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, Calendar, TrendingUp, BarChart3, Clock } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import html2pdf from 'html2pdf.js';
import toast from 'react-hot-toast';
import { useOutletContext } from 'react-router-dom';

export default function Reports() {
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({ start: format(subDays(new Date(), 30), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') });

    // Data States
    const [salesData, setSalesData] = useState({ total: 0, count: 0, chart: [] });
    const [topProducts, setTopProducts] = useState([]);
    const [inventoryValue, setInventoryValue] = useState({ cost: 0, retail: 0, profit: 0 });
    const [priceHistory, setPriceHistory] = useState([]);
    const { profile } = useOutletContext();

    useEffect(() => {
        if (profile) {
            if (profile.ferreteria_id) {
                fetchReportData();
            } else {
                setLoading(false);
            }
        }
    }, [dateRange, profile]);

    const fetchReportData = async () => {
        if (!profile?.ferreteria_id) return;
        setLoading(true);
        try {
            const startDate = startOfDay(new Date(dateRange.start)).toISOString();
            const endDate = endOfDay(new Date(dateRange.end)).toISOString();

            // 1. Ventas por período
            const { data: salesRes } = await supabase
                .from('ventas')
                .select('total, fecha, cantidad, producto_id, productos(nombre)')
                .eq('ferreteria_id', profile.ferreteria_id)
                .gte('fecha', startDate)
                .lte('fecha', endDate);

            let sTotal = 0;
            let chartMap = {};
            let prodMap = {};

            if (salesRes) {
                salesRes.forEach(sale => {
                    sTotal += Number(sale.total);

                    // Line Chart aggregation
                    const day = format(new Date(sale.fecha), 'dd MMM', { locale: es });
                    if (!chartMap[day]) chartMap[day] = 0;
                    chartMap[day] += Number(sale.total);

                    // Top Products
                    const pid = sale.producto_id;
                    if (!prodMap[pid]) {
                        prodMap[pid] = { nombre: sale.productos?.nombre || '?', cantidad: 0, total: 0 };
                    }
                    prodMap[pid].cantidad += Number(sale.cantidad);
                    prodMap[pid].total += Number(sale.total);
                });
            }

            setSalesData({
                total: sTotal,
                count: salesRes?.length || 0,
                chart: Object.keys(chartMap).map(k => ({ fecha: k, ventas: chartMap[k] }))
            });

            setTopProducts(Object.values(prodMap).sort((a, b) => b.cantidad - a.cantidad).slice(0, 10));

            // 2. Valorización de inventario global
            const { data: prods } = await supabase.from('productos').select('stock_actual, precio_compra, precio_venta').eq('ferreteria_id', profile.ferreteria_id).eq('activo', true);
            let tCost = 0, tRetail = 0;
            if (prods) {
                prods.forEach(p => {
                    if (p.stock_actual > 0) {
                        tCost += (p.stock_actual * (p.precio_compra || 0));
                        tRetail += (p.stock_actual * (p.precio_venta || 0));
                    }
                });
            }
            setInventoryValue({ cost: tCost, retail: tRetail, profit: tRetail - tCost });

            // 3. Historial precios
            const { data: hist } = await supabase
                .from('historial_precios')
                .select('*, productos!inner(nombre, ferreteria_id), usuarios(nombre)')
                .eq('productos.ferreteria_id', profile.ferreteria_id)
                .gte('fecha', startDate)
                .lte('fecha', endDate)
                .order('fecha', { ascending: false });

            setPriceHistory(hist || []);

        } catch (error) {
            toast.error('Error cargando reportes');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = val => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val || 0);

    const exportPDF = (elementId, filename) => {
        const originalElement = document.getElementById(elementId);
        if (!originalElement) return;

        toast.loading('Preparando PDF...', { id: 'pdf-toast' });

        const logoPath = '/logo-ferrostock.svg';

        // 1. Crear Nodos Temporales
        const headerNode = document.createElement('div');
        headerNode.id = 'pdf-temp-header';
        headerNode.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 3px solid #7C3AED; padding-bottom: 15px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <img src="${logoPath}" style="width: 48px; height: 48px;" alt="Logo" onerror="this.style.display='none'" />
                    <div>
                        <h2 style="margin: 0; color: #1E1B4B; font-size: 24px; font-weight: bold; font-family: sans-serif;">${profile?.ferreterias?.nombre || 'FerroStock'}</h2>
                        <p style="margin: 4px 0 0 0; color: #6B7280; font-size: 13px; font-family: sans-serif;">Reporte Gerencial Oficial</p>
                    </div>
                </div>
                <div style="text-align: right; color: #4B5563; font-family: sans-serif;">
                    <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Fecha de Generación</p>
                    <p style="margin: 4px 0 0 0; font-weight: bold; color: #1E1B4B; font-size: 16px;">${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                </div>
            </div>
        `;

        const footerNode = document.createElement('div');
        footerNode.id = 'pdf-temp-footer';
        footerNode.innerHTML = `
            <div style="margin-top: 40px; padding-top: 15px; border-top: 1px solid #E5E7EB; text-align: center; color: #9CA3AF; font-family: sans-serif; font-size: 11px;">
                Generado por FerroStock el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm")} — Documento de uso interno.
            </div>
        `;

        // 2. Preparar el DOM Real (SIN clonar para que Recharts no falle)
        const originalStyles = {
            padding: originalElement.style.padding,
            backgroundColor: originalElement.style.backgroundColor
        };

        originalElement.style.padding = '30px';
        originalElement.style.backgroundColor = '#ffffff';

        // Insertar cabecera y pie
        originalElement.insertBefore(headerNode, originalElement.firstChild);
        originalElement.appendChild(footerNode);

        // Ocultar temporalmente los botones de toda la zona a exportar
        const buttons = originalElement.querySelectorAll('button');
        const originalDisplays = [];
        buttons.forEach((b, i) => {
            originalDisplays[i] = b.style.display;
            b.style.display = 'none';
        });

        const formattedDate = format(new Date(), 'dd-MM-yyyy');
        const finalFilename = `reporte-${filename.toLowerCase()}-${formattedDate}.pdf`;

        // 3. Pequeña espera para que el DOM pinte los nodos inyectados y luego capturar
        setTimeout(() => {
            html2pdf().set({
                margin: [10, 10, 10, 10],
                filename: finalFilename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
            }).from(originalElement).save().then(() => {
                // 4. Limpieza: Restaurar el DOM original
                originalElement.removeChild(headerNode);
                originalElement.removeChild(footerNode);
                originalElement.style.padding = originalStyles.padding;
                originalElement.style.backgroundColor = originalStyles.backgroundColor;

                buttons.forEach((b, i) => {
                    b.style.display = originalDisplays[i];
                });

                toast.success('Reporte descargado en PDF', { id: 'pdf-toast' });
            }).catch(e => {
                // Limpieza en caso de error
                if (originalElement.contains(headerNode)) originalElement.removeChild(headerNode);
                if (originalElement.contains(footerNode)) originalElement.removeChild(footerNode);
                originalElement.style.padding = originalStyles.padding;
                originalElement.style.backgroundColor = originalStyles.backgroundColor;
                buttons.forEach((b, i) => {
                    b.style.display = originalDisplays[i];
                });
                toast.error('Error generando PDF', { id: 'pdf-toast' });
                console.error(e);
            });
        }, 300); // 300ms de espera asegura que el DOM se haya refrescado
    };

    return (
        <div className="space-y-6 fade-in max-w-7xl mx-auto pb-10">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div>
                    <h2 className="text-2xl font-bold text-indigo-950 flex items-center gap-2"><BarChart3 className="w-6 h-6 text-violet-600" /> Reportes Gerenciales</h2>
                    <p className="text-sm text-gray-500">Analiza el rendimiento de tu ferretería</p>
                </div>
                <div className="flex items-center gap-3 bg-violet-50 p-2 rounded-lg border border-gray-200 w-full md:w-auto overflow-x-auto">
                    <Calendar className="w-5 h-5 text-gray-500 ml-2" />
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))}
                        className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer"
                    />
                    <span className="text-gray-400">hasta</span>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))}
                        className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
                </div>
            ) : (
                <div className="space-y-6">

                    {/* Reporte 1: Ventas y Gráfico */}
                    <div id="reporte-ventas" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
                        <button onClick={() => exportPDF('reporte-ventas', 'Reporte_Ventas')} className="absolute top-4 right-4 text-gray-400 hover:text-violet-600 transition-colors p-2 bg-violet-50 rounded-lg" title="Exportar a PDF">
                            <Download className="w-5 h-5" />
                        </button>
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-indigo-950 mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-violet-600" /> Ventas del Período</h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                                <div className="bg-violet-100 p-4 rounded-lg border border-violet-200">
                                    <p className="text-violet-600 text-sm font-medium mb-1">Total Ingresos</p>
                                    <p className="text-3xl font-black text-violet-700">{formatCurrency(salesData.total)}</p>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <p className="text-blue-600 text-sm font-medium mb-1">N° Transacciones</p>
                                    <p className="text-3xl font-black text-blue-700">{salesData.count}</p>
                                </div>
                            </div>

                            <div className="h-80 w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={salesData.chart} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="fecha" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} dy={10} />
                                        <YAxis tickFormatter={v => `S/${v}`} tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                                        <Tooltip formatter={v => [formatCurrency(v), 'Ventas']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Line type="monotone" dataKey="ventas" stroke="#7C3AED" strokeWidth={3} dot={{ r: 4, fill: '#7C3AED', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Reporte 2: Productos Más Vendidos */}
                        <div id="reporte-top-productos" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
                            <button onClick={() => exportPDF('reporte-top-productos', 'Top_Productos')} className="absolute top-4 right-4 text-gray-400 hover:text-violet-600 transition-colors p-2 bg-violet-50 rounded-lg">
                                <Download className="w-5 h-5" />
                            </button>
                            <div className="p-6">
                                <h3 className="text-lg font-bold text-indigo-950 mb-6">Top 10 Más Vendidos</h3>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart layout="vertical" data={topProducts} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                                            <XAxis type="number" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                                            <YAxis dataKey="nombre" type="category" width={120} tick={{ fontSize: 11, fill: '#4B5563' }} axisLine={false} tickLine={false} />
                                            <Tooltip formatter={v => [`${v} und.`, 'Cantidad']} cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Bar dataKey="cantidad" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Reporte 3: Valorización de Inventario */}
                        <div id="reporte-valorizacion" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative flex flex-col justify-between">
                            <button onClick={() => exportPDF('reporte-valorizacion', 'Valorizacion_Inventario')} className="absolute top-4 right-4 text-gray-400 hover:text-violet-600 transition-colors p-2 bg-violet-50 rounded-lg">
                                <Download className="w-5 h-5" />
                            </button>
                            <div className="p-6">
                                <h3 className="text-lg font-bold text-indigo-950 mb-2">Valorización Actual del Stock</h3>
                                <p className="text-gray-500 text-sm mb-8">El valor total de toda la mercadería física almacenada (no depende del filtro de fechas).</p>

                                <div className="space-y-6">
                                    <div className="flex justify-between items-center p-4 bg-violet-50 rounded-lg border border-gray-200">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 mb-1">Inversión (Precio Compra)</p>
                                            <p className="text-2xl font-bold text-indigo-950">{formatCurrency(inventoryValue.cost)}</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center p-4 bg-violet-50 rounded-lg border border-gray-200">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 mb-1">Valor Venta Esperado</p>
                                            <p className="text-2xl font-bold text-indigo-950">{formatCurrency(inventoryValue.retail)}</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center p-5 bg-green-50 rounded-lg border border-green-200">
                                        <div>
                                            <p className="text-sm font-bold text-green-800 mb-1">Ganancia Potencial Bruta</p>
                                            <p className="text-3xl font-black text-green-600">+{formatCurrency(inventoryValue.profit)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Reporte 4: Historial de Precios */}
                    <div id="reporte-precios" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
                        <button onClick={() => exportPDF('reporte-precios', 'Historial_Precios')} className="absolute top-4 right-4 text-gray-400 hover:text-violet-600 transition-colors p-2 bg-violet-50 rounded-lg">
                            <Download className="w-5 h-5" />
                        </button>
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-indigo-950 mb-6 flex items-center gap-2"><Clock className="w-5 h-5 text-gray-500" /> Historial de Cambios de Precio</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead className="bg-violet-50 text-gray-500 border-b border-gray-200">
                                        <tr>
                                            <th className="p-3 font-medium">Fecha</th>
                                            <th className="p-3 font-medium">Producto</th>
                                            <th className="p-3 font-medium">Tipo Precio</th>
                                            <th className="p-3 font-medium text-right">Anterior</th>
                                            <th className="p-3 font-medium text-right">Nuevo</th>
                                            <th className="p-3 font-medium text-center">Variación</th>
                                            <th className="p-3 font-medium">Usuario</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {priceHistory.length === 0 ? (
                                            <tr><td colSpan="7" className="p-6 text-center text-gray-500">No hay registros de cambios de precio en este período.</td></tr>
                                        ) : (
                                            priceHistory.map(h => {
                                                const isUp = h.precio_nuevo > h.precio_anterior;
                                                const diff = Math.abs(h.precio_nuevo - h.precio_anterior);
                                                const percent = ((diff / h.precio_anterior) * 100).toFixed(1);
                                                return (
                                                    <tr key={h.id} className="hover:bg-violet-50 transition-colors">
                                                        <td className="p-3 text-gray-500 whitespace-nowrap">{format(new Date(h.fecha), 'dd/MM/yyyy HH:mm')}</td>
                                                        <td className="p-3 font-medium text-indigo-950">{h.productos?.nombre || 'Desconocido'}</td>
                                                        <td className="p-3 text-gray-600 capitalize">{h.tipo === 'compra' ? 'Costo' : 'Venta'}</td>
                                                        <td className="p-3 text-right text-gray-500 line-through">S/ {h.precio_anterior.toFixed(2)}</td>
                                                        <td className="p-3 text-right font-bold text-indigo-950">S/ {h.precio_nuevo.toFixed(2)}</td>
                                                        <td className="p-3 text-center">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isUp ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                                {isUp ? '▲' : '▼'} {percent}%
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-gray-500 text-xs">{h.usuarios?.nombre || 'Sistema'}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
