import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../config/supabaseClient';
import {
    useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, flexRender
} from '@tanstack/react-table';
import { useOutletContext } from 'react-router-dom';
import { Plus, Search, Filter, Camera, Trash2, Edit, X, RefreshCw, Minus, CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';

export default function Inventory() {
    const { profile, session, isOffline } = useOutletContext();
    const [data, setData] = useState([]);
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, normal, low, out
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Quick Edit State
    const [quickEdit, setQuickEdit] = useState({ id: null, type: null, qty: '' });

    // History Modal State
    const [historyModal, setHistoryModal] = useState({
        isOpen: false,
        product: null,
        activeTab: 'entradas', // entradas, ventas, precios
        loading: false,
        data: { entradas: [], ventas: [], precios: [] }
    });

    const { register, handleSubmit, reset, setValue } = useForm();

    useEffect(() => {
        if (profile) {
            if (profile.ferreteria_id) {
                fetchInitialData();
            } else {
                setLoading(false);
            }
        }
    }, [profile]);

    const fetchInitialData = async () => {
        if (!profile?.ferreteria_id) return;
        setLoading(true);
        try {
            const [prodRes, catRes, supRes] = await Promise.all([
                supabase.from('productos').select(`*, categorias(nombre), proveedores(nombre)`).eq('ferreteria_id', profile.ferreteria_id).eq('activo', true).order('nombre'),
                supabase.from('categorias').select('*').eq('ferreteria_id', profile.ferreteria_id).order('nombre'),
                supabase.from('proveedores').select('id, nombre').eq('ferreteria_id', profile.ferreteria_id).order('nombre')
            ]);

            if (prodRes.error) throw prodRes.error;
            setData(prodRes.data || []);
            setCategories(catRes.data || []);
            setSuppliers(supRes.data || []);
        } catch (error) {
            toast.error('Error al cargar datos del inventario');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getStockStatus = (actual, min) => {
        if (actual <= 0) return 'out';
        if (actual <= min) return 'low';
        return 'normal';
    };

    const badgeProps = {
        normal: { b: 'bg-[#DCFCE7]', t: 'text-[#16A34A]', label: 'Normal', dot: 'before:bg-[#16A34A]' },
        low: { b: 'bg-[#FEF9C3]', t: 'text-[#CA8A04]', label: 'Bajo', dot: 'before:bg-[#CA8A04]' },
        out: { b: 'bg-[#FEE2E2]', t: 'text-[#DC2626]', label: 'Agotado', dot: 'before:bg-[#DC2626]' },
    };

    // Filter Data
    const filteredData = useMemo(() => {
        let filtered = data;
        if (statusFilter !== 'all') {
            filtered = filtered.filter(item => getStockStatus(item.stock_actual, item.stock_minimo) === statusFilter);
        }
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(item => item.categoria_id === categoryFilter);
        }
        return filtered;
    }, [data, statusFilter, categoryFilter]);

    const handleQuickEditSubmit = async (product) => {
        if (isOffline) {
            toast.error('Necesitas conexión para registrar ajustes');
            return;
        }

        const qty = parseFloat(quickEdit.qty);
        if (isNaN(qty) || qty <= 0) {
            toast.error('Cantidad inválida');
            return;
        }

        try {
            let newStock = product.stock_actual;
            if (quickEdit.type === '+') {
                newStock += qty;
                // Registrar entrada
                await supabase.from('entradas_stock').insert({
                    ferreteria_id: profile.ferreteria_id,
                    usuario_id: session?.user?.id,
                    producto_id: product.id,
                    cantidad: qty,
                    nota: 'Ajuste rápido de stock'
                });
            } else {
                if (qty > newStock) return toast.error('Stock insuficiente para restar esa cantidad');
                newStock -= qty;
                // Registrar venta
                await supabase.from('ventas').insert({
                    ferreteria_id: profile.ferreteria_id,
                    usuario_id: session?.user?.id,
                    producto_id: product.id,
                    cantidad: qty,
                    precio_unitario: product.precio_venta,
                    total: qty * product.precio_venta,
                    nota: 'Ajuste rápido de stock'
                });
            }

            // Actualizar producto
            const { error } = await supabase.from('productos').update({ stock_actual: newStock }).eq('id', product.id);
            if (error) throw error;

            toast.success(`Stock actualizado a ${newStock}`);
            setQuickEdit({ id: null, type: null, qty: '' });
            fetchInitialData();

        } catch (e) {
            toast.error('Error al actualizar stock rápidamente');
        }
    };

    const handleViewHistory = async (product) => {
        setHistoryModal({
            isOpen: true,
            product,
            activeTab: 'entradas',
            loading: true,
            data: { entradas: [], ventas: [], precios: [] }
        });

        try {
            const [entRes, venRes, preRes] = await Promise.all([
                supabase.from('entradas_stock').select('*, usuarios(nombre), proveedores(nombre)').eq('producto_id', product.id).order('fecha', { ascending: false }),
                supabase.from('ventas').select('*, usuarios(nombre)').eq('producto_id', product.id).order('fecha', { ascending: false }),
                supabase.from('historial_precios').select('*, usuarios(nombre)').eq('producto_id', product.id).order('fecha', { ascending: false })
            ]);

            setHistoryModal(prev => ({
                ...prev,
                loading: false,
                data: {
                    entradas: entRes.data || [],
                    ventas: venRes.data || [],
                    precios: preRes.data || []
                }
            }));
        } catch (e) {
            toast.error('Error cargando historial');
            setHistoryModal(prev => ({ ...prev, loading: false }));
        }
    };

    const columns = useMemo(() => [
        {
            accessorKey: 'codigo',
            header: 'Código',
            cell: info => <span className="font-mono text-xs text-gray-400">{info.getValue()}</span>
        },
        {
            accessorKey: 'nombre',
            header: 'Producto',
            cell: info => <span className="font-medium text-indigo-950">{info.getValue()}</span>
        },
        {
            accessorKey: 'categorias.nombre',
            header: 'Categoría',
            cell: info => <span className="text-gray-500 text-sm">{info.getValue() || '-'}</span>
        },
        {
            accessorKey: 'stock_actual',
            header: 'Stock',
            cell: ({ row }) => {
                const actual = row.original.stock_actual;
                const min = row.original.stock_minimo;
                const status = getStockStatus(actual, min);
                const b = badgeProps[status];
                const isQuickEditing = quickEdit.id === row.original.id;

                return (
                    <div className="flex items-center gap-2 group/stock relative min-h-[32px]">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.75rem] font-semibold before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full ${b.b} ${b.t} ${b.dot}`}>
                            {actual} {row.original.unidad}
                        </span>

                        {/* Hover Quick actions */}
                        {!isQuickEditing && (
                            <div className="hidden group-hover/stock:flex items-center bg-white shadow-md border border-gray-200 rounded-md p-0.5 absolute left-full ml-1 z-10 
                                transition-all animate-in fade-in slide-in-from-left-2">
                                <button onClick={() => setQuickEdit({ id: row.original.id, type: '+', qty: '' })} className="p-1.5 hover:bg-green-100 text-green-600 rounded transition-colors" title="Agregar stock">
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                                <div className="w-px h-4 bg-gray-200 mx-0.5"></div>
                                <button onClick={() => setQuickEdit({ id: row.original.id, type: '-', qty: '' })} className="p-1.5 hover:bg-red-100 text-red-600 rounded transition-colors" title="Restar stock">
                                    <Minus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}

                        {/* Inline Popover */}
                        {isQuickEditing && (
                            <div className="absolute left-full ml-1 z-20 bg-white shadow-lg border border-gray-200 rounded-lg p-1.5 flex items-center gap-2 w-max animate-in zoom-in-95">
                                <span className={`text-sm ${quickEdit.type === '+' ? 'text-green-600' : 'text-red-600'} font-bold`}>{quickEdit.type}</span>
                                <input
                                    autoFocus
                                    type="number"
                                    min="0.01"
                                    step="any"
                                    placeholder="Cant..."
                                    className={`w-20 px-2 py-1 text-xs border rounded focus:ring-1 outline-none ${quickEdit.type === '+' ? 'focus:ring-green-500 border-green-200' : 'focus:ring-red-500 border-red-200'}`}
                                    value={quickEdit.qty}
                                    onChange={(e) => setQuickEdit({ ...quickEdit, qty: e.target.value })}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleQuickEditSubmit(row.original);
                                        if (e.key === 'Escape') setQuickEdit({ id: null, type: null, qty: '' });
                                    }}
                                />
                                <button onClick={() => handleQuickEditSubmit(row.original)} className="p-1 bg-violet-600 text-white rounded hover:bg-violet-700 ml-1">
                                    <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setQuickEdit({ id: null, type: null, qty: '' })} className="p-1 bg-gray-100 text-gray-500 rounded hover:bg-gray-200">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            accessorKey: 'precio_venta',
            header: 'P. Venta',
            cell: info => <span className="font-semibold text-gray-700">S/ {info.getValue()?.toFixed(2) || '0.00'}</span>
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <div className="flex justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
                    <button onClick={() => handleViewHistory(row.original)} className="p-1.5 text-gray-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-md transition-colors shadow-sm" title="Ver historial">
                        <Clock className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleEdit(row.original)} className="p-1.5 text-gray-400 hover:text-blue-600 bg-white hover:bg-blue-50 rounded-md transition-colors shadow-sm" title="Editar">
                        <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(row.original.id)} className="p-1.5 text-gray-400 hover:text-red-600 bg-white hover:bg-red-50 rounded-md transition-colors shadow-sm" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ], [quickEdit]);

    const table = useReactTable({
        data: filteredData,
        columns,
        state: { globalFilter },
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 15 } }
    });

    // Modal Handlers
    const handleEdit = (product) => {
        setEditingId(product.id);
        Object.keys(product).forEach(key => {
            setValue(key, product[key]);
        });
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingId(null);
        reset({
            codigo: '', nombre: '', categoria_id: '', proveedor_id: '',
            unidad: 'unidad', stock_actual: 0, stock_minimo: 0,
            precio_compra: 0, precio_venta: 0
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este producto (se ocultará lógicamente)?')) return;
        try {
            const { error } = await supabase.from('productos').update({ activo: false }).eq('id', id);
            if (error) throw error;
            toast.success('Producto eliminado');
            fetchInitialData();
        } catch (e) {
            toast.error('Error al eliminar');
        }
    };

    const onSubmit = async (formData) => {
        const isEditing = !!editingId;
        try {
            let submitData = { ...formData };
            delete submitData.categorias;
            delete submitData.proveedores;

            // Asegurar números
            ['stock_actual', 'stock_minimo', 'precio_compra', 'precio_venta'].forEach(key => {
                submitData[key] = parseFloat(submitData[key]) || 0;
            });

            if (isEditing) {
                const currentProd = data.find(p => p.id === editingId);
                const { error } = await supabase.from('productos').update({ ...submitData, updated_at: new Date() }).eq('id', editingId);
                if (error) throw error;

                if (submitData.precio_venta !== currentProd.precio_venta) {
                    await supabase.from('historial_precios').insert({
                        producto_id: editingId,
                        precio_anterior: currentProd.precio_venta,
                        precio_nuevo: submitData.precio_venta,
                        tipo: 'venta'
                    });
                }
                toast.success('Producto actualizado');
            } else {
                submitData.ferreteria_id = profile.ferreteria_id;
                const { error } = await supabase.from('productos').insert([submitData]).select();
                if (error) throw error;
                toast.success('Producto agregado');
            }
            setIsModalOpen(false);
            fetchInitialData();
        } catch (e) {
            toast.error(e.message || 'Error guardando datos');
        }
    };

    useEffect(() => {
        let scanner;
        if (isScannerOpen) {
            setTimeout(() => {
                scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 100 } });
                scanner.render(
                    (text) => {
                        setGlobalFilter(text);
                        setIsScannerOpen(false);
                        toast.success(`Código: ${text}`);
                    },
                    (err) => { }
                );
            }, 100);
        }
        return () => {
            if (scanner) {
                scanner.clear().catch(console.error);
            }
        };
    }, [isScannerOpen]);

    return (
        <div className="space-y-6 fade-in pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-indigo-950">Inventario</h2>
                    <p className="text-sm text-violet-600/70">Gestiona todos los productos de tu ferretería</p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="bg-violet-600 text-white rounded-[10px] px-5 py-2.5 font-semibold text-sm shadow-[0_4px_14px_rgba(124,58,237,0.35)] hover:bg-violet-700 hover:-translate-y-[1px] transition-all duration-200 active:scale-95 flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> Agregar Producto
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible text-sm z-10 relative">

                {/* Filters bar */}
                <div className="p-4 border-b border-gray-200 bg-violet-50/50 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar producto o código..."
                            value={globalFilter ?? ''}
                            onChange={e => setGlobalFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:border-violet-600 outline-none"
                        />
                        {globalFilter && (
                            <button onClick={() => setGlobalFilter('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => setIsScannerOpen(true)}
                        className="flex items-center justify-center gap-2 bg-indigo-950 text-white rounded-lg px-4 py-2 font-medium text-sm hover:bg-indigo-900 transition-colors shrink-0"
                    >
                        <Camera className="w-4 h-4" /> Escanear
                    </button>

                    <select
                        className="px-4 py-2 border border-gray-300 rounded-lg bg-white shrink-0 outline-none focus:ring-2 focus:ring-violet-600 focus:border-violet-600"
                        value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                    >
                        <option value="all">Todas las Categorías</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>

                    <select
                        className="px-4 py-2 border border-gray-300 rounded-lg bg-white shrink-0 outline-none focus:ring-2 focus:ring-violet-600 focus:border-violet-600"
                        value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Estado: Todos</option>
                        <option value="normal">Stock Normal</option>
                        <option value="low">Stock Bajo</option>
                        <option value="out">Agotado</option>
                    </select>

                    <button onClick={fetchInitialData} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600 bg-white transition-colors" title="Actualizar datos">
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-violet-600' : ''}`} />
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id} className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id} className="p-4 whitespace-nowrap">
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {table.getRowModel().rows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="p-12 text-center text-gray-500">
                                        {loading ? (
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mb-4"></div>
                                                <p>Cargando inventario...</p>
                                            </div>
                                        ) : 'No se encontraron productos.'}
                                    </td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map(row => (
                                    <tr key={row.id} className="group hover:bg-[#F5F3FF] transition-colors duration-150 relative">
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id} className="p-4 relative">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {table.getPageCount() > 1 && (
                    <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-white text-gray-600">
                        <span className="text-sm">
                            Página <span className="font-semibold text-indigo-950">{table.getState().pagination.pageIndex + 1}</span> de <span className="font-semibold">{table.getPageCount()}</span>
                        </span>
                        <div className="flex gap-2">
                            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-violet-50 hover:text-violet-600 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-600 transition-colors">
                                Anterior
                            </button>
                            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-violet-50 hover:text-violet-600 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-600 transition-colors">
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Scanner Modal */}
            {isScannerOpen && (
                <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden animate-in zoom-in-95">
                        <div className="p-4 border-b flex justify-between items-center bg-indigo-950 text-white">
                            <h3 className="font-semibold flex items-center gap-2"><Camera className="w-5 h-5" /> Escanear Código</h3>
                            <button onClick={() => setIsScannerOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-4 bg-violet-50">
                            <div id="reader" className="w-full"></div>
                            <p className="text-center text-xs text-gray-500 mt-4">Apunta la cámara al código de barras del producto</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Product CRUD Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-sm z-50 flex flex-col justify-center items-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-indigo-950">
                                {editingId ? 'Editar Producto' : 'Nuevo Producto'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="productForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Código / Barras</label>
                                        <input {...register('codigo', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 outline-none" placeholder="Ej: HER001" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del producto</label>
                                        <input {...register('nombre', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 outline-none" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                                        <select {...register('categoria_id', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 outline-none">
                                            <option value="">Seleccionar...</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                                        <select {...register('proveedor_id')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 outline-none">
                                            <option value="">Opcional...</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                                        <select {...register('unidad', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 outline-none">
                                            <option value="unidad">Unidad</option>
                                            <option value="metro">Metro</option>
                                            <option value="kilo">Kilo</option>
                                            <option value="caja">Caja</option>
                                            <option value="bolsa">Bolsa</option>
                                            <option value="galon">Galón</option>
                                            <option value="rollo">Rollo</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-gray-100">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Stock Actual</label>
                                        <input type="number" step="0.01" {...register('stock_actual', { required: true, min: 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 text-right pr-6 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 text-red-600">Stock Mínimo</label>
                                        <input type="number" step="0.01" {...register('stock_minimo', { required: true, min: 0 })} className="w-full px-3 py-2 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-400 text-right pr-6 outline-none bg-red-50/50" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">P. Compra (S/)</label>
                                        <input type="number" step="0.01" {...register('precio_compra', { min: 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 text-right pr-6 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 text-green-700">P. Venta (S/)</label>
                                        <input type="number" step="0.01" {...register('precio_venta', { required: true, min: 0 })} className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 text-right pr-6 font-bold text-green-700 outline-none bg-green-50" />
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="p-5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-end gap-3 shrink-0">
                            <button onClick={() => setIsModalOpen(false)} type="button" className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[10px] hover:bg-gray-50 transition-colors active:scale-95">
                                Cancelar
                            </button>
                            <button form="productForm" type="submit" disabled={isOffline} title={isOffline ? "Necesitas conexión para registrar" : ""} className="bg-violet-600 text-white rounded-[10px] px-6 py-2.5 font-semibold text-sm shadow-[0_4px_14px_rgba(124,58,237,0.35)] hover:bg-violet-700 hover:-translate-y-[1px] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                                {editingId ? 'Guardar Cambios' : 'Registrar Producto'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {historyModal.isOpen && (
                <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-sm z-50 flex flex-col justify-end sm:justify-center items-center sm:p-4">
                    <div className="bg-white w-full sm:max-w-3xl sm:rounded-2xl shadow-2xl flex flex-col h-[85vh] sm:h-auto sm:max-h-[85vh] animate-in slide-in-from-bottom-8 sm:zoom-in-95">

                        <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-start">
                            <div>
                                <h3 className="text-xl sm:text-2xl font-bold text-indigo-950 flex items-center gap-2">
                                    <Clock className="w-6 h-6 text-violet-600" /> Historial del Producto
                                </h3>
                                <p className="text-gray-500 mt-1 font-medium">{historyModal.product?.nombre} <span className="text-xs text-gray-400 font-mono ml-2 border px-2 py-0.5 rounded">{historyModal.product?.codigo}</span></p>
                            </div>
                            <button onClick={() => setHistoryModal(prev => ({ ...prev, isOpen: false }))} className="text-gray-400 hover:text-gray-600 p-1.5 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Tabs */}
                        <div className="flex px-6 border-b border-gray-200 gap-6 overflow-x-auto shrink-0">
                            {[
                                { id: 'entradas', label: 'Entradas de Stock' },
                                { id: 'ventas', label: 'Ventas Realizadas' },
                                { id: 'precios', label: 'Cambios de Precio' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setHistoryModal(prev => ({ ...prev, activeTab: tab.id }))}
                                    className={`py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${historyModal.activeTab === tab.id ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="p-0 overflow-y-auto flex-1 bg-gray-50/50">
                            {historyModal.loading ? (
                                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div></div>
                            ) : (
                                <div className="p-6">
                                    {/* ENTRADAS TAB */}
                                    {historyModal.activeTab === 'entradas' && (
                                        <div className="space-y-4">
                                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800 font-medium">
                                                Total Ingresado: <span className="font-bold text-blue-900">{historyModal.data.entradas.reduce((a, b) => a + b.cantidad, 0)}</span> unidades
                                            </div>
                                            {historyModal.data.entradas.length === 0 ? <p className="text-center text-gray-500 py-10">No hay entradas registradas</p> : (
                                                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                                                    <table className="w-full text-left text-sm">
                                                        <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                                                            <tr><th className="p-3 font-medium">Fecha</th><th className="p-3 font-medium text-right">Cantidad</th><th className="p-3 font-medium">Nota / Guía</th><th className="p-3 font-medium">Usuario</th></tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {historyModal.data.entradas.map(e => (
                                                                <tr key={e.id} className="hover:bg-gray-50">
                                                                    <td className="p-3 text-gray-600">{format(new Date(e.fecha), 'dd/MM/yyyy HH:mm')}</td>
                                                                    <td className="p-3 font-bold text-blue-600 text-right">+{e.cantidad}</td>
                                                                    <td className="p-3 text-gray-500 max-w-[150px] truncate">{e.nota || '-'}</td>
                                                                    <td className="p-3 text-gray-400 text-xs">{e.usuarios?.nombre || 'Sistema'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* VENTAS TAB */}
                                    {historyModal.activeTab === 'ventas' && (
                                        <div className="space-y-4">
                                            <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-sm text-green-800 font-medium flex justify-between">
                                                <span>Total Vendido: <span className="font-bold text-green-900">{historyModal.data.ventas.reduce((a, b) => a + b.cantidad, 0)}</span> unidades</span>
                                                <span>Recaudado: <span className="font-bold text-green-900">S/ {historyModal.data.ventas.reduce((a, b) => a + b.total, 0).toFixed(2)}</span></span>
                                            </div>
                                            {historyModal.data.ventas.length === 0 ? <p className="text-center text-gray-500 py-10">No hay ventas registradas</p> : (
                                                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                                                    <table className="w-full text-left text-sm">
                                                        <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                                                            <tr><th className="p-3 font-medium">Fecha</th><th className="p-3 font-medium text-right">Cantidad</th><th className="p-3 font-medium text-right">Total</th><th className="p-3 font-medium">Nota</th></tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {historyModal.data.ventas.map(v => (
                                                                <tr key={v.id} className="hover:bg-gray-50">
                                                                    <td className="p-3 text-gray-600">{format(new Date(v.fecha), 'dd/MM/yyyy HH:mm')}</td>
                                                                    <td className="p-3 font-bold text-red-500 text-right">-{v.cantidad}</td>
                                                                    <td className="p-3 text-gray-900 font-semibold text-right">S/ {v.total.toFixed(2)}</td>
                                                                    <td className="p-3 text-gray-500 text-xs max-w-[150px] truncate">{v.nota || '-'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* PRECIOS TAB */}
                                    {historyModal.activeTab === 'precios' && (
                                        <div className="space-y-4">
                                            {historyModal.data.precios.length === 0 ? <p className="text-center text-gray-500 py-10">No se han registrado cambios de precio</p> : (
                                                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                                                    <table className="w-full text-left text-sm">
                                                        <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                                                            <tr><th className="p-3 font-medium">Fecha</th><th className="p-3 font-medium text-center">Tipo</th><th className="p-3 font-medium text-right">Anterior</th><th className="p-3 font-medium text-right">Nuevo</th></tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {historyModal.data.precios.map(p => (
                                                                <tr key={p.id} className="hover:bg-gray-50">
                                                                    <td className="p-3 text-gray-600">{format(new Date(p.fecha), 'dd/MM/yyyy HH:mm')}</td>
                                                                    <td className="p-3 text-center"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${p.tipo === 'venta' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>{p.tipo}</span></td>
                                                                    <td className="p-3 text-gray-400 text-right line-through">S/ {p.precio_anterior.toFixed(2)}</td>
                                                                    <td className="p-3 font-bold text-indigo-950 text-right">S/ {p.precio_nuevo.toFixed(2)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
