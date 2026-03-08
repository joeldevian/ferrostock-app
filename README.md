# FerroStock - Sistema de Control de Inventario 🛠️📦

FerroStock es una aplicación web moderna diseñada específicamente para el control de inventarios, ventas y abastecimiento de pequeñas y medianas ferreterías en Perú.

## 🚀 Características Principales

1. **Gestión de Inventario (CRUD)**: Control total sobre los productos, precios (compra y venta), stock actual y mínimo, categorías e historial de precios.
2. **Alertas Inteligentes**: Identificación rápida de productos con stock bajo o agotado con opciones directas de abastecimiento por WhatsApp.
3. **Punto de Venta Dinámico**: Registro rápido de ventas que descuenta automáticamente el stock y registra todo en el historial transaccional.
4. **Entradas de Mercadería**: Fácil ingreso de nuevo inventario que actualiza cantidades, recalcula el costo base (si varía) y asigna un proveedor.
5. **Dashboard Gerencial**: Resumen ejecutivo con las cifras clave: valorización total, ventas del último mes, alertas y gráfico de rendimiento en 7 días (Recharts).
6. **Módulo de Reportes PDF**: Generación en tiempo real de reportes de ventas, productos más vendidos, y valorización de inventario con opción a descarga PDF.
7. **Control de Proveedores**: Directorio de proveedores con enlaces directos a WhatsApp para hacer pedidos ágiles con un solo clic.
8. **Asignación de Roles e Identidad Integrada**: Acceso protegido con Autenticación a través de Supabase (Admin vs Empleado) y Landing publicitaria para captar nuevos socios comerciales (con links reales de contacto).

## 🛠️ Stack Tecnológico

- **Frontend Core**: React 18, Vite (Empaquetador rápido)
- **Estilos**: Tailwind CSS 3 (Personalizado con identidad visual naranja/gris/oscuro)
- **Componentes UI y Lógica**: 
  - `react-router-dom`: SPA Routing
  - `@tanstack/react-table` v8: Tablas avanzadas y filtros de inventario
  - `react-hook-form`: Validación de formularios de ingreso, ventas y configuración
  - `lucide-react`: Iconografía vectorial limpia
  - `react-hot-toast`: Notificaciones emergentes UX-friendly
  - `recharts`: Visualización de datos y estadísticas
  - `html2pdf.js`: Exportación en front-end a PDF para documentos contables.
  - `html5-qrcode`: Integración de escáner en vivo usando la cámara del dispositivo.
- **Backend & Base de Datos**: Supabase (PostgreSQL + Auth + Row Level Security).
- **Hosting recomendado**: Vercel o Netlify.

## ⚙️ Instalación y Configuración Local

1. Clona el repositorio.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Crea un proyecto en **Supabase** y ejecuta el archivo `schema.sql` en el SQL Editor para crear las tablas y las políticas de seguridad (RLS).
4. Luego de crear el esquema, ejecuta el archivo `seed.sql` para poblar la base de datos con información de prueba relevante (productos, categorías, movimientos).
5. Crea un archivo `.env` en la raíz (mírate la plantilla `.env.example`) y asigna tus claves de Supabase:
   ```env
   VITE_SUPABASE_URL=tu-url-de-supabase
   VITE_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
   ```
6. Inicializa el servidor de desarrollo local:
   ```bash
   npm run dev
   ```

## 🔐 Usuarios de Prueba (Si se integró Auth)

Asegúrate de registrar tus correos en la pestaña de **Authentication** en el dashboard de tu proyecto de Supabase para poder iniciar sesión y ver las pantallas principales. Una vez creado el usuario, recuerda colocar su UUID dentro de la tabla pública de `usuarios`.

## 📦 Despliegue (Build)

Para mandar el proyecto a producción, Vite genera los estáticos hiper-optimizados:

```bash
npm run build
```

La carpeta `/dist` quedará lista para subirse a cualquier servicio moderno de hosting como Vercel, Firebase Hosting o Cloudflare Pages.

---

Desarrollado con ❤️ para las PYMES ferreteras del Perú.
