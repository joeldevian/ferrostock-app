import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useOutletContext } from 'react-router-dom';
import { Store, Shield, ListTree, User, Save, Plus, Trash2 } from 'lucide-react';

export default function Settings() {
    const { profile } = useOutletContext();
    const [activeTab, setActiveTab] = useState('empresa');
    const [ferreteria, setFerreteria] = useState(null);
    const [categorias, setCategorias] = useState([]);
    const [employeeEmail, setEmployeeEmail] = useState('');

    const { register, handleSubmit, reset } = useForm();
    const { register: registerPwd, handleSubmit: handlePwdSubmit, reset: resetPwd } = useForm();

    useEffect(() => {
        if (profile) {
            if (profile.ferreteria_id) {
                fetchFerreteria();
                fetchCategorias();
            } else {
                setLoading(false);
                setLoadingCategories(false);
            }
        }
    }, [profile]);

    const fetchFerreteria = async () => {
        if (!profile?.ferreteria_id) return;
        const { data } = await supabase.from('ferreterias').select('*').eq('id', profile.ferreteria_id).single();
        if (data) {
            setFerreteria(data);
            reset(data);
        }
    };

    const fetchCategorias = async () => {
        if (!profile?.ferreteria_id) return;
        const { data } = await supabase.from('categorias').select('*').eq('ferreteria_id', profile.ferreteria_id).order('nombre');
        if (data) setCategorias(data);
    };

    const onEmpresaSubmit = async (data) => {
        try {
            if (ferreteria?.id) {
                const { error } = await supabase.from('ferreterias').update({
                    nombre: data.nombre,
                    ruc: data.ruc,
                    direccion: data.direccion,
                    telefono: data.telefono,
                    whatsapp: data.whatsapp
                }).eq('id', ferreteria.id);
                if (error) throw error;
                toast.success('Datos de empresa actualizados');
                fetchFerreteria();
            }
        } catch (e) {
            toast.error('Error al guardar datos');
        }
    };

    const onPasswordSubmit = async (data) => {
        try {
            if (data.new_password !== data.confirm_password) {
                return toast.error('Las contraseñas no coinciden');
            }
            const { error } = await supabase.auth.updateUser({ password: data.new_password });
            if (error) throw error;
            toast.success('Contraseña actualizada exitosamente');
            resetPwd();
        } catch (e) {
            toast.error('Error al actualizar contraseña. Inicie sesión nuevamente.');
        }
    };

    const addCategory = async (e) => {
        e.preventDefault();
        const name = e.target.catName.value;
        if (!name.trim()) return;

        try {
            const { error } = await supabase.from('categorias').insert({
                ferreteria_id: profile.ferreteria_id,
                nombre: name
            });
            if (error) throw error;
            toast.success('Categoría agregada');
            e.target.reset();
            fetchCategorias();
        } catch (err) {
            toast.error('Error guardando categoría');
        }
    };

    const deleteCategory = async (id) => {
        if (!window.confirm('¿Seguro que deseas eliminar esta categoría? Si tiene productos, no se podrá.')) return;
        try {
            const { error } = await supabase.from('categorias').delete().eq('id', id);
            if (error) throw error;
            toast.success('Categoría eliminada');
            fetchCategorias();
        } catch (e) {
            toast.error('Error: la categoría está en uso por algunos productos.');
        }
    };

    const inviteEmpleado = async (e) => {
        e.preventDefault();
        if (!employeeEmail) return;
        // En el MVP el Admin API no está habilitado directamente desde el frontend por seguridad.
        // Solo mostramos notificación.
        toast.success(`Se enviaría invitación a: ${employeeEmail} (Requiere Admin API en producción)`);
        setEmployeeEmail('');
    };

    const tabs = [
        { id: 'empresa', name: 'Datos de la Ferretería', icon: Store },
        { id: 'categorias', name: 'Categorías', icon: ListTree },
        { id: 'equipo', name: 'Equipo de Trabajo', icon: User },
        { id: 'seguridad', name: 'Seguridad', icon: Shield },
    ];

    return (
        <div className="space-y-6 fade-in max-w-6xl mx-auto h-full pb-10">
            <div>
                <h2 className="text-2xl font-bold text-indigo-950">Configuración</h2>
                <p className="text-sm text-gray-500">Ajustes generales del sistema y de tu cuenta</p>
            </div>

            <div className="flex flex-col md:flex-row gap-6">

                {/* Sidebar Tabs */}
                <div className="w-full md:w-64 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden shrink-0 h-fit">
                    <nav className="flex flex-col">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left border-l-4 ${activeTab === tab.id
                                    ? 'border-violet-600 bg-violet-100 text-violet-700'
                                    : 'border-transparent text-gray-600 hover:bg-violet-50 hover:text-indigo-950'
                                    }`}
                            >
                                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-violet-600' : 'text-gray-400'}`} />
                                {tab.name}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 min-h-[500px]">

                    {/* Tab 1: Empresa */}
                    {activeTab === 'empresa' && (
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-indigo-950 border-b pb-4 mb-6">Información del Negocio</h3>
                            <form onSubmit={handleSubmit(onEmpresaSubmit)} className="space-y-6 max-w-2xl">

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial</label>
                                        <input {...register('nombre', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">RUC (Opcional)</label>
                                        <input {...register('ruc')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Principal</label>
                                    <input {...register('direccion')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                        <input {...register('telefono')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp para Landing Page</label>
                                        <input {...register('whatsapp')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600" placeholder="Ej: 51987654321" />
                                        <p className="text-xs text-gray-500 mt-1">Este número se usará en el botón de contacto público.</p>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button type="submit" className="flex items-center px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium shadow-sm transition-colors">
                                        <Save className="w-4 h-4 mr-2" /> Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Tab 2: Categorías */}
                    {activeTab === 'categorias' && (
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-indigo-950 border-b pb-4 mb-6">Administrar Categorías</h3>

                            <div className="max-w-2xl">
                                <form onSubmit={addCategory} className="flex gap-4 mb-8">
                                    <input name="catName" type="text" placeholder="Nueva categoría..." required className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600" />
                                    <button type="submit" className="px-4 py-2 bg-indigo-950 hover:bg-indigo-950 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center">
                                        <Plus className="w-4 h-4 mr-1" /> Agregar
                                    </button>
                                </form>

                                <div className="bg-white border rounded-lg overflow-hidden">
                                    <ul className="divide-y divide-gray-100">
                                        {categorias.map(c => (
                                            <li key={c.id} className="p-3 pl-4 flex justify-between items-center hover:bg-violet-50">
                                                <span className="font-medium text-gray-700">{c.nombre}</span>
                                                <button onClick={() => deleteCategory(c.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Eliminar">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Equipo */}
                    {activeTab === 'equipo' && (
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-indigo-950 border-b pb-4 mb-6">Equipo de Trabajo</h3>

                            <div className="max-w-2xl space-y-8">
                                <div>
                                    <h4 className="font-medium text-indigo-950 mb-3">Invitar empleado</h4>
                                    <form onSubmit={inviteEmpleado} className="flex gap-4">
                                        <input
                                            type="email"
                                            value={employeeEmail}
                                            onChange={e => setEmployeeEmail(e.target.value)}
                                            placeholder="Correo electrónico del empleado"
                                            required
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600"
                                        />
                                        <button type="submit" className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium shadow-sm transition-colors">
                                            Enviar Invitación
                                        </button>
                                    </form>
                                    <p className="text-sm text-gray-500 mt-2">Los empleados solo podrán ver y registrar en Inventario, Entradas y Ventas.</p>
                                </div>

                                <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                                    <p className="text-sm text-yellow-800 font-medium">Nota para modo Demo / MVP:</p>
                                    <p className="text-xs text-yellow-700 mt-1">La creación automática de usuarios detrás de escena requiere configuraciones avanzadas de backend con Supabase Admin API. Para entornos de prueba, crea los usuarios manualmente en el Dashboard de Supabase y asígnales el rol 'empleado' en la tabla pública.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 4: Seguridad */}
                    {activeTab === 'seguridad' && (
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-indigo-950 border-b pb-4 mb-6">Seguridad de la Cuenta</h3>

                            <form onSubmit={handlePwdSubmit(onPasswordSubmit)} className="space-y-6 max-w-sm">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
                                    <input {...registerPwd('new_password', { required: true, minLength: 6 })} type="password" placeholder="••••••••" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
                                    <input {...registerPwd('confirm_password', { required: true })} type="password" placeholder="••••••••" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600" />
                                </div>

                                <button type="submit" className="w-full justify-center flex items-center px-4 py-2 bg-indigo-950 hover:bg-black text-white rounded-lg font-medium shadow-sm transition-colors">
                                    <Shield className="w-4 h-4 mr-2" /> Actualizar Contraseña
                                </button>
                            </form>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
