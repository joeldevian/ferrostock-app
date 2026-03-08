import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { supabase } from '../config/supabaseClient';
import Logo from '../components/ui/Logo';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Login() {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors } } = useForm();

    // Check if session exists on load
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                navigate('/dashboard', { replace: true });
            }
        });
    }, [navigate]);

    const onSubmit = async (data) => {
        setLoading(true);
        const { email, password } = data;

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            toast.success('¡Bienvenido a FerroStock!');
            navigate('/dashboard', { replace: true });
        } catch (error) {
            toast.error(error.message === 'Invalid login credentials'
                ? 'Correo o contraseña incorrectos'
                : error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        const email = prompt('Ingresa tu correo para recuperar la contraseña:');
        if (!email) return;

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/login`,
            });
            if (error) throw error;
            toast.success('Te hemos enviado un enlace para restablecer tu contraseña.');
        } catch (error) {
            toast.error('Error al enviar el correo. Intenta nuevamente.');
        }
    };

    return (
        <div className="min-h-screen bg-white flex fade-in">

            {/* Left Column: Visual Illustration (Hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 bg-indigo-950 relative flex-col justify-center items-center p-12 overflow-hidden">
                {/* Subtle orange glow */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-violet-600/10 to-transparent"></div>
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>

                <div className="relative z-10 w-full max-w-lg mb-12">
                    {/* Abstract Hardware / Construction SVG Illustration */}
                    <svg viewBox="0 0 500 400" className="w-full h-auto drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="500" height="400" rx="16" fill="#1E1B4B" />
                        {/* Hammer */}
                        <path d="M120 180 L180 120 L210 150 L150 210 Z" fill="#4B5563" />
                        <path d="M180 120 L260 200" stroke="#7C3AED" strokeWidth="24" strokeLinecap="round" />
                        {/* Wrench */}
                        <path d="M350 250 A 30 30 0 1 1 310 210 L330 230 Z" fill="#7C3AED" />
                        <path d="M220 340 L320 240" stroke="#4B5563" strokeWidth="18" strokeLinecap="round" />
                        <path d="M200 360 A 20 20 0 1 1 240 320 L220 340 Z" fill="#7C3AED" />
                        {/* Gears */}
                        <circle cx="100" cy="300" r="40" fill="none" stroke="#4B5563" strokeWidth="12" strokeDasharray="20 10" />
                        <circle cx="100" cy="300" r="20" fill="#7C3AED" />
                        <circle cx="380" cy="100" r="60" fill="none" stroke="#7C3AED" strokeWidth="8" strokeDasharray="30 15" />
                        <circle cx="380" cy="100" r="30" fill="#4B5563" />
                        {/* Floating particles */}
                        <circle cx="280" cy="80" r="4" fill="#F5F3FF" />
                        <circle cx="420" cy="280" r="6" fill="#7C3AED" />
                        <circle cx="80" cy="120" r="8" fill="#F5F3FF" opacity="0.5" />
                    </svg>
                </div>

                <div className="relative z-10 text-center max-w-md">
                    <h2 className="text-3xl font-extrabold text-white sm:text-4xl mb-4">
                        Bienvenido de vuelta. Tu ferretería te espera.
                    </h2>
                    <p className="text-lg text-gray-400">
                        Controla tu stock, registra tus ventas y toma mejores decisiones para tu negocio.
                    </p>
                </div>
            </div>

            {/* Right Column: Login Form */}
            <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">

                <div className="absolute top-6 left-6 lg:hidden">
                    <Link to="/" className="text-gray-500 hover:text-indigo-950 flex items-center gap-2 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="text-sm font-medium">Volver</span>
                    </Link>
                </div>

                <div className="mx-auto w-full max-w-sm lg:w-96">
                    <div className="mb-10 lg:mb-12 hidden lg:block text-left absolute top-10 left-[53%] xl:left-[55%]">
                        <Link to="/" className="text-gray-500 hover:text-indigo-950 flex items-center gap-2 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-sm font-medium">Volver al inicio</span>
                        </Link>
                    </div>

                    <div className="text-center lg:text-left mb-8">
                        <div className="flex justify-center lg:justify-start mb-6">
                            <Logo className="w-10 h-10" textClassName="text-3xl font-extrabold" />
                        </div>
                        <h2 className="mt-6 text-2xl font-bold text-indigo-950 tracking-tight">
                            Ingresa a tu cuenta
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            ¿No tienes cuenta?{' '}
                            <a href="#" className="font-medium text-violet-600 hover:text-violet-600 transition-colors">
                                Contacta a soporte
                            </a>
                        </p>
                    </div>

                    <div className="mt-8">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Correo electrónico
                                </label>
                                <div className="mt-1">
                                    <input
                                        {...register('email', {
                                            required: 'El correo es obligatorio',
                                            pattern: {
                                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                message: "Correo inválido"
                                            }
                                        })}
                                        type="email"
                                        autoComplete="email"
                                        className={`block w-full py-2.5 px-3 border rounded-lg shadow-sm focus:ring-violet-600 focus:border-violet-600 sm:text-sm transition-colors ${errors.email ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                        placeholder="admin@gmail.com"
                                    />
                                    {errors.email && (
                                        <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Contraseña
                                </label>
                                <div className="mt-1">
                                    <input
                                        {...register('password', { required: 'La contraseña es obligatoria' })}
                                        type="password"
                                        autoComplete="current-password"
                                        className={`block w-full py-2.5 px-3 border rounded-lg shadow-sm focus:ring-violet-600 focus:border-violet-600 sm:text-sm transition-colors ${errors.password ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                        placeholder="••••••••"
                                    />
                                    {errors.password && (
                                        <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        id="remember-me"
                                        name="remember-me"
                                        type="checkbox"
                                        className="h-4 w-4 text-violet-600 focus:ring-violet-600 border-gray-300 rounded"
                                    />
                                    <label htmlFor="remember-me" className="ml-2 block text-sm text-indigo-950">
                                        Recordarme
                                    </label>
                                </div>

                                <div className="text-sm">
                                    <button
                                        type="button"
                                        onClick={handleResetPassword}
                                        className="font-medium text-violet-600 hover:text-violet-600 transition-colors"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <span className="flex items-center">
                                            <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                            Ingresando...
                                        </span>
                                    ) : (
                                        'Ingresar'
                                    )}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            </div>

        </div>
    );
}
