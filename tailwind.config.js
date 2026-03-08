/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                orange: {
                    500: '#F97316',
                },
                gray: {
                    50: '#F9FAFB',
                    500: '#6B7280',
                    800: '#1F2937',
                    900: '#111827',
                },
                green: {
                    500: '#22C55E'
                },
                red: {
                    500: '#EF4444'
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
