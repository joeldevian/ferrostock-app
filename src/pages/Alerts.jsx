import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { AlertCircle, ArrowRight, MessageSquare, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Alerts() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const { profile } = useOutletContext();

    useEffect(() => {
        if (profile) {
            if (profile.ferreteria_id) {
                fetchAlerts();
            } else {
                setLoading(false);
            }
        }
    }, [profile]);

    const fetchAlerts = async () => {
        if (!profile?.ferreteria_id) return;
        setLoading(true);
        try {
            // Filtrar a nivel local para mejor manejo o desde bd (MVP lo hacemos JS-side fácil)
            const { data, error } = await supabase
                .from('productos')
                .select(`*, proveedores(nombre, whatsapp)`)
                .eq('ferreteria_id', profile.ferreteria_id)
                .eq('activo', true);

            if (error) throw error;

            const filtered = (data || [])
                .filter(p => p.stock_actual <= p.stock_minimo)
                .sort((a, b) => a.stock_actual - b.stock_actual); // Los que tienen menos stock primero

            setAlerts(filtered);
        } catch (e) {
            toast.error('Error cargando alertas');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 fade-in max-w-5xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-100 text-red-600 rounded-full">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-red-900">Alertas de Inventario</h2>
                        <p className="text-sm text-red-700">Productos que están cerca de agotarse o ya no hay.</p>
                    </div>
                </div>
                <div className="text-center sm:text-right bg-white px-6 py-3 rounded-lg shadow-sm border border-red-100">
                    <span className="block text-gray-500 text-xs font-medium uppercase tracking-wider">Total Urgentes</span>
                    <span className="text-3xl font-extrabold text-red-600">{alerts.length}</span>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center text-gray-500">Analizando inventario...</div>
                ) : alerts.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center text-center">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                        <h3 className="text-xl font-bold text-indigo-950 mb-2">¡Todo bajo control!</h3>
                        <p className="text-gray-500 max-w-sm">No tienes ningún producto con stock bajo o agotado. Tu inventario está saludable.</p>
                        <Link to="/inventory" className="mt-6 text-violet-600 font-medium hover:underline">Ver inventario de todos modos</Link>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {alerts.map(prod => {
                            const isOut = prod.stock_actual <= 0;
                            return (
                                <div key={prod.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-violet-50 transition-colors">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className={`mt-1 flex-shrink-0 w-3 h-3 rounded-full ${isOut ? 'bg-red-500 animate-pulse' : 'bg-yellow-400'}`}></div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-lg font-bold text-indigo-950">{prod.nombre}</h4>
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.75rem] font-semibold before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full ${isOut ? 'bg-[#FEE2E2] text-[#DC2626] before:bg-[#DC2626]' : 'bg-[#FEF9C3] text-[#CA8A04] before:bg-[#CA8A04]'}`}>
                                                    {isOut ? 'AGOTADO' : 'STOCK BAJO'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 font-mono mb-2">Código: {prod.codigo}</p>

                                            <div className="flex items-center gap-4 text-sm bg-white border border-gray-100 rounded-lg p-3 inline-flex">
                                                <div className="flex flex-col">
                                                    <span className="text-gray-400 text-xs">Stock Actual</span>
                                                    <span className={`font-black text-lg ${isOut ? 'text-red-600' : 'text-yellow-600'}`}>{prod.stock_actual}</span>
                                                </div>
                                                <div className="w-px h-8 bg-gray-200"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-gray-400 text-xs">Mínimo Permitido</span>
                                                    <span className="font-bold text-indigo-950">{prod.stock_minimo}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto mt-4 md:mt-0">
                                        <Link
                                            to="/entries"
                                            state={{ productToEntry: prod }}
                                            className="flex-1 sm:flex-none justify-center items-center inline-flex bg-violet-600 text-white rounded-[10px] px-5 py-2.5 font-semibold text-sm shadow-[0_4px_14px_rgba(124,58,237,0.35)] hover:bg-violet-700 hover:-translate-y-[1px] transition-all duration-200 active:scale-95"
                                        >
                                            Registrar Ingreso <ArrowRight className="w-4 h-4 ml-2" />
                                        </Link>

                                        {prod.proveedores?.whatsapp ? (
                                            <a
                                                href={`https://wa.me/${prod.proveedores.whatsapp.replace(/[^0-9]/g, '')}?text=Hola,%20necesito%20hacer%20un%20pedido%20urgente%20de%20${prod.nombre}.`}
                                                target="_blank" rel="noreferrer"
                                                className="flex-1 sm:flex-none justify-center items-center inline-flex border-2 border-violet-600 text-violet-600 bg-transparent hover:bg-violet-100/50 rounded-[10px] px-5 py-2 font-semibold transition-all duration-200 active:scale-95"
                                            >
                                                <MessageSquare className="w-4 h-4 mr-2" /> Pedir a {prod.proveedores.nombre.split(' ')[0]}
                                            </a>
                                        ) : (
                                            <div className="flex-1 sm:flex-none justify-center items-center inline-flex rounded-[10px] px-5 py-2.5 border border-gray-200 text-sm font-medium text-gray-400 bg-violet-50 opacity-70 cursor-not-allowed">
                                                <AlertTriangle className="w-4 h-4 mr-2" /> Sin WhatsApp
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
