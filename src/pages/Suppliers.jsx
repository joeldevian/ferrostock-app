import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useOutletContext } from 'react-router-dom';
import { Users, Plus, Edit, Trash2, X, MessageSquare, Package } from 'lucide-react';

export default function Suppliers() {
    const { profile } = useOutletContext();
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const { register, handleSubmit, reset, setValue } = useForm();

    useEffect(() => {
        if (profile) {
            if (profile.ferreteria_id) {
                fetchSuppliers();
            } else {
                setLoading(false);
            }
        }
    }, [profile]);

    const fetchSuppliers = async () => {
        if (!profile?.ferreteria_id) return;
        setLoading(true);
        try {
            // Cargamos proveedores con sus productos (solo cuenta para vista visual)
            const { data, error } = await supabase
                .from('proveedores')
                .select('*, productos!proveedor_id(id, nombre)')
                .eq('ferreteria_id', profile.ferreteria_id)
                .order('nombre');

            if (error) throw error;
            setSuppliers(data || []);
        } catch (e) {
            toast.error('Error cargando proveedores');
        } finally {
            setLoading(false);
        }
    };

    const handleAddNew = () => {
        setEditingId(null);
        reset({ nombre: '', ruc: '', telefono: '', whatsapp: '', direccion: '', nota: '' });
        setIsModalOpen(true);
    };

    const handleEdit = (prov) => {
        setEditingId(prov.id);
        reset(prov);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Seguro que deseas eliminar a este proveedor?')) return;
        try {
            const { error } = await supabase.from('proveedores').delete().eq('id', id);
            if (error) throw error;
            toast.success('Proveedor eliminado exitosamente');
            fetchSuppliers();
        } catch (e) {
            toast.error('Error al eliminar');
        }
    };

    const onSubmit = async (data) => {
        try {
            if (editingId) {
                const { error } = await supabase.from('proveedores').update(data).eq('id', editingId);
                if (error) throw error;
                toast.success('Proveedor actualizado');
            } else {
                data.ferreteria_id = profile.ferreteria_id;
                const { error } = await supabase.from('proveedores').insert([data]);
                if (error) throw error;
                toast.success('Proveedor registrado');
            }
            setIsModalOpen(false);
            fetchSuppliers();
        } catch (e) {
            toast.error('Error al guardar datos');
        }
    };

    return (
        <div className="space-y-6 fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#EDE9FE]">
                <div>
                    <h2 className="text-2xl font-bold text-indigo-950">Proveedores</h2>
                    <p className="text-sm text-violet-600/70">Administra tus contactos y listados de abastecimiento</p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="bg-violet-600 text-white rounded-[10px] px-5 py-2.5 font-semibold text-sm shadow-[0_4px_14px_rgba(124,58,237,0.35)] hover:bg-violet-700 hover:-translate-y-[1px] transition-all duration-200 active:scale-95 flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> Agregar Proveedor
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center py-10 text-gray-500">Cargando...</div>
                ) : suppliers.length === 0 ? (
                    <div className="col-span-full text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-indigo-950">Sin proveedores aún</h3>
                        <p className="text-gray-500">Agrega el primero para mantener el control de tus compras.</p>
                    </div>
                ) : (
                    suppliers.map(prov => (
                        <div key={prov.id} className="bg-white rounded-xl shadow-sm border border-[#EDE9FE] overflow-hidden flex flex-col hover:-translate-y-[2px] hover:shadow-[0_8px_25px_rgba(124,58,237,0.15)] transition-all duration-200">
                            <div className="p-5 flex-1 relative">

                                <div className="absolute top-4 right-4 flex gap-1">
                                    <button onClick={() => handleEdit(prov)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(prov.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br from-violet-600 to-purple-500 shadow-[0_4px_12px_rgba(124,58,237,0.25)] flex items-center justify-center mb-4 text-white font-bold text-[1.2rem]">
                                    {prov.nombre.charAt(0).toUpperCase()}
                                </div>
                                <h3 className="text-lg font-bold text-indigo-950 pr-16">{prov.nombre}</h3>
                                {prov.ruc && <p className="text-sm text-gray-500 mt-1">RUC: {prov.ruc}</p>}

                                <div className="mt-4 space-y-2 text-sm text-gray-600">
                                    {prov.telefono && <p>Tel: {prov.telefono}</p>}
                                    {prov.direccion && <p className="line-clamp-2">Dir: {prov.direccion}</p>}
                                    {prov.nota && <p className="italic text-gray-400 line-clamp-2">"{prov.nota}"</p>}
                                </div>

                                <div className="mt-4 pt-4 border-t border-[#EDE9FE] flex items-center text-sm font-medium text-gray-700">
                                    <Package className="w-4 h-4 mr-2 text-gray-400" />
                                    <span title={prov.productos?.map(p => p.nombre).join(', ')}>
                                        {prov.productos?.length || 0} Productos vinculados
                                    </span>
                                </div>
                            </div>

                            <div className="bg-[#F5F3FF] border-t border-[#EDE9FE] p-4 text-center">
                                {prov.whatsapp ? (
                                    <a
                                        href={`https://wa.me/${prov.whatsapp.replace(/[^0-9]/g, '')}?text=Hola%20proveedor`}
                                        target="_blank" rel="noreferrer"
                                        className="w-full flex items-center justify-center py-2.5 px-4 bg-[#25D366] hover:-translate-y-[1px] text-white rounded-[10px] shadow-[0_4px_14px_rgba(37,211,102,0.35)] font-semibold transition-all duration-200 active:scale-95"
                                    >
                                        <MessageSquare className="w-4 h-4 mr-2" /> Contactar al WhatsApp
                                    </a>
                                ) : (
                                    <button disabled className="w-full flex items-center justify-center p-2 bg-gray-200 text-gray-400 rounded-lg font-medium cursor-not-allowed">
                                        <MessageSquare className="w-4 h-4 mr-2" /> Sin WhatsApp registrado
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex flex-col justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-5 border-b flex justify-between items-center">
                            <h3 className="text-xl font-bold text-indigo-950">
                                {editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                        </div>

                        <div className="p-6">
                            <form id="provForm" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre / Razón Social *</label>
                                    <input {...register('nombre', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">RUC</label>
                                        <input {...register('ruc')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                        <input {...register('telefono')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (Ej: 51999888777)</label>
                                    <input {...register('whatsapp')} placeholder="Con código de país, sin +" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                                    <input {...register('direccion')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nota / Observación</label>
                                    <textarea {...register('nota')} rows="2" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600"></textarea>
                                </div>
                            </form>
                        </div>

                        <div className="p-5 border-t bg-violet-50 flex justify-end gap-3 rounded-b-xl">
                            <button onClick={() => setIsModalOpen(false)} type="button" className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[10px] hover:bg-gray-50 transition-colors active:scale-95">
                                Cancelar
                            </button>
                            <button form="provForm" type="submit" className="bg-violet-600 text-white rounded-[10px] px-5 py-2.5 font-semibold text-sm shadow-[0_4px_14px_rgba(124,58,237,0.35)] hover:bg-violet-700 hover:-translate-y-[1px] transition-all duration-200 active:scale-95">
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
