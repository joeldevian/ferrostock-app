import fs from 'fs';
import path from 'path';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function (file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.svg') || file.endsWith('.html')) {
            results.push(file);
        }
    });
    return results;
}

const root = process.cwd();
const files = walk(path.join(root, 'src'));
files.push(path.join(root, 'index.html'));
files.push(path.join(root, 'logo-ferrostock.svg'));

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Naranjas -> Violetas
    content = content.replace(/orange-500/g, 'violet-600');
    content = content.replace(/orange-600/g, 'violet-600'); // main buttons
    content = content.replace(/orange-700/g, 'violet-700'); // hover buttons
    content = content.replace(/orange-50/g, 'violet-100'); // hover light bg
    content = content.replace(/orange-100/g, 'violet-200'); // initials bg

    // Grises -> Indigos (Secundarios y fondos)
    content = content.replace(/gray-900/g, 'indigo-950');
    content = content.replace(/gray-800/g, 'indigo-950');
    content = content.replace(/bg-gray-50/g, 'bg-violet-50');
    content = content.replace(/hover:bg-gray-50/g, 'hover:bg-violet-50');

    // Hex codes directly (para el SVG o CSS fallback)
    content = content.replace(/#F97316/gi, '#7C3AED');
    content = content.replace(/#111827/gi, '#1E1B4B');
    content = content.replace(/#1F2937/gi, '#1E1B4B');
    content = content.replace(/#F9FAFB/gi, '#F5F3FF');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
    }
});
