-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ferreterias
CREATE TABLE public.ferreterias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    ruc TEXT,
    direccion TEXT,
    telefono TEXT,
    whatsapp TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. usuarios
CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    ferreteria_id UUID REFERENCES public.ferreterias(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'empleado')),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. categorias
CREATE TABLE public.categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ferreteria_id UUID REFERENCES public.ferreterias(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. proveedores
CREATE TABLE public.proveedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ferreteria_id UUID REFERENCES public.ferreterias(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    ruc TEXT,
    telefono TEXT,
    whatsapp TEXT,
    direccion TEXT,
    nota TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. productos
CREATE TABLE public.productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ferreteria_id UUID REFERENCES public.ferreterias(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL,
    nombre TEXT NOT NULL,
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
    proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
    unidad TEXT NOT NULL DEFAULT 'unidad',
    stock_actual NUMERIC(10,2) DEFAULT 0,
    stock_minimo NUMERIC(10,2) DEFAULT 0,
    precio_compra NUMERIC(10,2) DEFAULT 0,
    precio_venta NUMERIC(10,2) DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. historial_precios
CREATE TABLE public.historial_precios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID REFERENCES public.productos(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    precio_anterior NUMERIC(10,2) NOT NULL,
    precio_nuevo NUMERIC(10,2) NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('compra', 'venta')),
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. ventas
CREATE TABLE public.ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ferreteria_id UUID REFERENCES public.ferreterias(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES public.productos(id) ON DELETE SET NULL,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    cantidad NUMERIC(10,2) NOT NULL,
    precio_unitario NUMERIC(10,2) NOT NULL,
    total NUMERIC(10,2) NOT NULL,
    nota TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. entradas_stock
CREATE TABLE public.entradas_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ferreteria_id UUID REFERENCES public.ferreterias(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES public.productos(id) ON DELETE SET NULL,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
    cantidad NUMERIC(10,2) NOT NULL,
    precio_compra NUMERIC(10,2),
    nota TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.ferreterias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_precios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entradas_stock ENABLE ROW LEVEL SECURITY;

-- Políticas base para usuarios autenticados
CREATE POLICY "Permitir todo a usuarios autenticados" ON public.ferreterias FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir todo a usuarios autenticados" ON public.usuarios FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir todo a usuarios autenticados" ON public.categorias FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir todo a usuarios autenticados" ON public.proveedores FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir todo a usuarios autenticados" ON public.productos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir todo a usuarios autenticados" ON public.historial_precios FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir todo a usuarios autenticados" ON public.ventas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir todo a usuarios autenticados" ON public.entradas_stock FOR ALL USING (auth.role() = 'authenticated');
