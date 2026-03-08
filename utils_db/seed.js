import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Setup de Variables usando dotenv ESM syntax
config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runSeed() {
    try {
        console.log('--- FERROSTOCK SEED SCRIPT ---');
        console.log('Insertando datos...');

        const { data: ferreterias, error: errFerr } = await supabase.from('ferreterias').select('id, nombre').limit(1);
        if (errFerr) throw errFerr;

        if (!ferreterias || ferreterias.length === 0) {
            console.error('❌ No se encontró ferretería. Usa el botón en el Dashboard de tu app primero.');
            process.exit(1);
        }
        const ferreteriaId = ferreterias[0].id;
        console.log(`✅ Ferretería encontrada: ${ferreterias[0].nombre}`);

        // Insertar Categorías
        const categoriasBase = [
            { ferreteria_id: ferreteriaId, nombre: 'Herramientas manuales' },
            { ferreteria_id: ferreteriaId, nombre: 'Herramientas eléctricas' },
            { ferreteria_id: ferreteriaId, nombre: 'Clavos y tornillos' },
            { ferreteria_id: ferreteriaId, nombre: 'Pinturas y barnices' },
            { ferreteria_id: ferreteriaId, nombre: 'Cables eléctricos' }
        ];

        const { data: cat, error: catErr } = await supabase.from('categorias').insert(categoriasBase).select();
        if (catErr) throw catErr;
        console.log(`✅ Categorías creadas.`);

        const catMap = cat.reduce((acc, c) => ({ ...acc, [c.nombre]: c.id }), {});

        // Insertar Proveedores
        const proveedoresBase = [
            { ferreteria_id: ferreteriaId, nombre: 'Distribuidora Constructor SAC', ruc: '20123456789', telefono: '01-445-5678', whatsapp: '51999888777', direccion: 'Lima, Breña', nota: 'Principal' },
            { ferreteria_id: ferreteriaId, nombre: 'Pinturas Andinas EIRL', ruc: '20876543210', telefono: '01-554-3210', whatsapp: '51988777666', direccion: 'Av. Argentina 543', nota: 'Martes' },
            { ferreteria_id: ferreteriaId, nombre: 'Herramientas Import', ruc: '20556677889', telefono: '01-233-4455', whatsapp: '51966555444', direccion: 'La Victoria', nota: 'Llamar' }
        ];

        const { data: prov, error: provErr } = await supabase.from('proveedores').insert(proveedoresBase).select();
        if (provErr) throw provErr;
        console.log(`✅ Proveedores creados.`);

        const provMap = prov.reduce((acc, p) => ({ ...acc, [p.nombre]: p.id }), {});

        // Insertar Productos
        const productosBase = [
            { ferreteria_id: ferreteriaId, codigo: 'HER001', nombre: 'Martillo de uña Stanley', categoria_id: catMap['Herramientas manuales'], proveedor_id: provMap['Herramientas Import'], unidad: 'unidad', stock_actual: 25, stock_minimo: 5, precio_compra: 20, precio_venta: 35 },
            { ferreteria_id: ferreteriaId, codigo: 'HER002', nombre: 'Taladro percutor Bosch 1/2', categoria_id: catMap['Herramientas eléctricas'], proveedor_id: provMap['Herramientas Import'], unidad: 'unidad', stock_actual: 4, stock_minimo: 3, precio_compra: 180, precio_venta: 250 },
            { ferreteria_id: ferreteriaId, codigo: 'CLA001', nombre: 'Clavo de 2 pulgadas sin cabeza', categoria_id: catMap['Clavos y tornillos'], proveedor_id: provMap['Distribuidora Constructor SAC'], unidad: 'kilo', stock_actual: 10, stock_minimo: 15, precio_compra: 4.5, precio_venta: 7 },
            { ferreteria_id: ferreteriaId, codigo: 'PIN001', nombre: 'Pintura Látex Blanco', categoria_id: catMap['Pinturas y barnices'], proveedor_id: provMap['Pinturas Andinas EIRL'], unidad: 'galon', stock_actual: 18, stock_minimo: 5, precio_compra: 25, precio_venta: 38 },
            { ferreteria_id: ferreteriaId, codigo: 'CAB001', nombre: 'Cable Mellizo 14 AWG', categoria_id: catMap['Cables eléctricos'], proveedor_id: provMap['Distribuidora Constructor SAC'], unidad: 'rollo', stock_actual: 2, stock_minimo: 5, precio_compra: 60, precio_venta: 85 }
        ];

        const { data: prod, error: prodErr } = await supabase.from('productos').insert(productosBase).select();
        if (prodErr) throw prodErr;

        console.log(`✅ ${prod.length} productos creados.`);
        console.log('\n🚀 ¡Todo listo! Recarga tu aplicación web');

    } catch (error) {
        console.error('❌ Error:', error.message || error);
    }
}

runSeed();
