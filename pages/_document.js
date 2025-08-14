import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en" className="scroll-smooth">
      <Head>
        <script src="https://cdn.tailwindcss.com"></script>
        <script dangerouslySetInnerHTML={{ __html: `tailwind.config = { darkMode: 'class', theme: { extend: { colors: { primary: '#0ea5e9', secondary: '#06b6d4', dark: '#0f172a', light: '#f8fafc', accent: '#818cf8' }, fontFamily: { inter: ['Inter','sans-serif'], roboto: ['Roboto','sans-serif'] }, animation: { 'text-gradient': 'text-gradient 6s ease infinite', 'float': 'float 6s ease-in-out infinite', 'fade-in': 'fadeIn 0.5s ease-in' }, keyframes: { 'text-gradient': { '0%,100%': { 'background-position': '0% 50%' }, '50%': { 'background-position': '100% 50%' } }, 'float': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } }, 'fadeIn': { '0%': { opacity: 0 }, '100%': { opacity: 1 } } } } } };` }} />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" integrity="sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck+w+/U6swU2Im1vVX0SVk9ABhg==" crossOrigin="anonymous" referrerPolicy="no-referrer" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
      </Head>
      <body className="bg-light dark:bg-dark">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
