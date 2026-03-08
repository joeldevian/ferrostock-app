import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, PackageSearch, BellRing, BarChart, Smartphone, Users, FileText, Zap, MessageSquare } from 'lucide-react';
import Logo from '../components/ui/Logo';

export default function Landing() {
    const WHATSAPP_NUMBER = "51999888777";
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=Hola%20FerroStock,%20deseo%20m%C3%A1s%20informaci%C3%B3n%20sobre%20el%20sistema.`;

    return (
        <div className="min-h-screen bg-violet-50 flex flex-col font-sans">

            {/* Navbar */}
            <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <Logo />
                        <div className="flex items-center space-x-4">
                            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-violet-600 transition-colors">
                                Ingresar
                            </Link>
                            <Link to="/login" className="text-sm font-medium bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-600 transition-colors shadow-sm">
                                Solicitar Acceso
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative overflow-hidden bg-white pt-16 pb-32">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-center">

                        <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
                            <h1 className="text-4xl tracking-tight font-extrabold text-indigo-950 sm:text-5xl md:text-6xl">
                                <span className="block xl:inline">Controla tu ferretería</span>{' '}
                                <span className="block text-violet-600">desde el celular</span>
                            </h1>
                            <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                                Sin papeles, sin Excel, sin líos. Todo tu inventario en un solo lugar.
                                Descubre la forma más fácil y rápida de gestionar tu negocio.
                            </p>
                            <div className="mt-8 sm:max-w-lg sm:mx-auto sm:text-center lg:text-left lg:mx-0 flex flex-col sm:flex-row gap-3">
                                <Link to="/login" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-violet-600 hover:bg-violet-600 transition-colors">
                                    Solicitar acceso
                                    <ArrowRight className="ml-2 -mr-1 h-5 w-5" aria-hidden="true" />
                                </Link>
                                <a href="#demo" className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-violet-50 transition-colors shadow-sm">
                                    Ver demo
                                </a>
                            </div>
                        </div>

                        {/* Illustration */}
                        <div className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0 lg:col-span-6 lg:flex lg:items-center">
                            <div className="relative mx-auto w-full rounded-2xl shadow-xl lg:max-w-md overflow-hidden bg-indigo-950 aspect-video flex items-center justify-center border-4 border-indigo-950">
                                <svg viewBox="0 0 400 300" className="w-full h-full text-indigo-950" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect width="400" height="300" fill="#1E1B4B" />
                                    {/* Mock Dashboard UI Graphic */}
                                    <rect x="20" y="20" width="360" height="40" rx="4" fill="#1E1B4B" />
                                    <rect x="20" y="80" width="110" height="60" rx="4" fill="#7C3AED" fillOpacity="0.2" stroke="#7C3AED" strokeWidth="2" />
                                    <rect x="145" y="80" width="110" height="60" rx="4" fill="#1E1B4B" />
                                    <rect x="270" y="80" width="110" height="60" rx="4" fill="#1E1B4B" />
                                    <rect x="20" y="160" width="360" height="120" rx="4" fill="#1E1B4B" />
                                    {/* Decorative chart lines */}
                                    <path d="M40 250 L100 200 L160 220 L220 180 L280 230 L340 170" stroke="#7C3AED" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                                    <circle cx="340" cy="170" r="6" fill="#7C3AED" />
                                </svg>
                                {/* Floating elements */}
                                <div className="absolute top-1/4 right-1/4 bg-white p-2 rounded-lg shadow-lg animate-bounce duration-3000">
                                    <PackageSearch className="w-6 h-6 text-violet-600" />
                                </div>
                                <div className="absolute bottom-1/4 left-1/4 bg-white p-2 rounded-lg shadow-lg animate-pulse">
                                    <BellRing className="w-6 h-6 text-red-500" />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* Beneficios */}
            <section className="py-16 bg-violet-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h2 className="text-base font-semibold text-violet-600 tracking-wide uppercase">Beneficios</h2>
                        <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-indigo-950 sm:text-4xl">
                            Diseñado para facilitarte la vida
                        </p>
                    </div>

                    <div className="mt-16">
                        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">

                            <div className="pt-6">
                                <div className="flow-root bg-white rounded-lg px-6 pb-8 h-full shadow-sm border border-gray-100 transition-transform hover:-translate-y-1">
                                    <div className="-mt-6">
                                        <div>
                                            <span className="inline-flex items-center justify-center p-3 bg-violet-600 rounded-md shadow-lg">
                                                <PackageSearch className="h-6 w-6 text-white" aria-hidden="true" />
                                            </span>
                                        </div>
                                        <h3 className="mt-8 text-lg font-medium text-indigo-950 tracking-tight">Sabe exactamente cuánto tienes</h3>
                                        <p className="mt-5 text-base text-gray-500">
                                            Olvídate de buscar en estantes. Busca cualquier producto en segundos y conoce tu stock real al instante.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6">
                                <div className="flow-root bg-white rounded-lg px-6 pb-8 h-full shadow-sm border border-gray-100 transition-transform hover:-translate-y-1">
                                    <div className="-mt-6">
                                        <div>
                                            <span className="inline-flex items-center justify-center p-3 bg-red-500 rounded-md shadow-lg">
                                                <BellRing className="h-6 w-6 text-white" aria-hidden="true" />
                                            </span>
                                        </div>
                                        <h3 className="mt-8 text-lg font-medium text-indigo-950 tracking-tight">Cero productos agotados</h3>
                                        <p className="mt-5 text-base text-gray-500">
                                            Te avisamos automáticamente antes de que se te acabe algo crítico. Mantén a tus clientes siempre felices.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6">
                                <div className="flow-root bg-white rounded-lg px-6 pb-8 h-full shadow-sm border border-gray-100 transition-transform hover:-translate-y-1">
                                    <div className="-mt-6">
                                        <div>
                                            <span className="inline-flex items-center justify-center p-3 bg-green-500 rounded-md shadow-lg">
                                                <BarChart className="h-6 w-6 text-white" aria-hidden="true" />
                                            </span>
                                        </div>
                                        <h3 className="mt-8 text-lg font-medium text-indigo-950 tracking-tight">Control de tus ganancias</h3>
                                        <p className="mt-5 text-base text-gray-500">
                                            Ve cuánto vendes cada día sin hacer cuentas manuales. Tu caja cuadrará perfecta todos los días.
                                        </p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </section>

            {/* Características */}
            <section className="py-16 bg-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl font-extrabold text-indigo-950">Todo lo que necesitas, nada de lo que no</h2>
                            <p className="mt-4 text-lg text-gray-500">
                                Creado específicamente para la realidad de las ferreterías peruanas.
                            </p>

                            <dl className="mt-10 space-y-6">
                                {[
                                    { name: 'Funciona en celular y computadora', icon: Smartphone, desc: 'Lleva el control de tu negocio en tu bolsillo o en la caja.' },
                                    { name: 'Para el dueño y el empleado', icon: Users, desc: 'Perfiles separados. Tu empleado solo vende, tú ves todo el panorama.' },
                                    { name: 'Reportes en PDF', icon: FileText, desc: 'Comparte o imprime reportes de ventas con un solo clic.' },
                                    { name: 'Súper fácil de usar', icon: Zap, desc: 'Sin capacitación técnica. Si sabes usar WhatsApp, sabes usar FerroStock.' },
                                ].map((feature) => (
                                    <div key={feature.name} className="relative">
                                        <dt>
                                            <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-violet-200 text-violet-600">
                                                <feature.icon className="h-6 w-6" aria-hidden="true" />
                                            </div>
                                            <p className="ml-16 text-lg leading-6 font-medium text-indigo-950">{feature.name}</p>
                                        </dt>
                                        <dd className="mt-2 ml-16 text-base text-gray-500">{feature.desc}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>

                        <div className="relative mt-10 lg:mt-0">
                            {/* Decorative background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-200 to-violet-100 rounded-3xl transform rotate-3 scale-105"></div>
                            <img
                                className="relative rounded-2xl shadow-xl ring-1 ring-indigo-950/10 object-cover w-full"
                                src="https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&q=80&w=800"
                                alt="Herramientas de ferretería"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                            <div className="relative rounded-2xl shadow-xl w-full h-80 bg-indigo-950 hidden items-center justify-center" style={{ display: 'none' }}>
                                <svg className="w-32 h-32 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="bg-indigo-950">
                <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
                    <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                        <span className="block">¿Tienes una ferretería en Ayacucho?</span>
                        <span className="block text-violet-600">Da el siguiente paso hoy mismo.</span>
                    </h2>
                    <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
                        <div className="inline-flex rounded-md shadow">
                            <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-indigo-950 bg-green-500 hover:bg-green-600 transition-colors"
                            >
                                <MessageSquare className="w-5 h-5 mr-2" />
                                Contáctanos por WhatsApp
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-auto">
                <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                    <div className="flex justify-center space-x-6 md:order-2">
                        <span className="text-gray-400 text-sm hover:text-gray-500">
                            Hecho para ferreterías peruanas 🇵🇪
                        </span>
                    </div>
                    <div className="mt-8 md:mt-0 md:order-1 flex items-center gap-4">
                        <Logo className="w-6 h-6" textClassName="text-lg font-bold" />
                        <p className="text-center text-sm text-gray-400">
                            &copy; {new Date().getFullYear()} FerroStock. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </footer>

        </div>
    );
}
