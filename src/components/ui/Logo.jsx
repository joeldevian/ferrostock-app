import React from 'react';

export default function Logo({ className = "w-8 h-8", textClassName = "text-xl font-bold tracking-tight text-indigo-950" }) {
    return (
        <div className="flex items-center gap-2">
            {/* Icono de Tuerca/Tornillo en SVG */}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`text-violet-600 ${className}`}
            >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                {/* Tuerca geométrica hexagonal */}
                <polygon points="12 2 19 6 19 18 12 22 5 18 5 6 12 2" stroke="currentColor" fill="none" />
                <circle cx="12" cy="12" r="3" />
            </svg>
            <span className={textClassName}>
                Ferro<span className="text-violet-600">Stock</span>
            </span>
        </div>
    );
}
