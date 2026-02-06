import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-20 pb-12 flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-8xl md:text-9xl font-bold tracking-tighter mb-4">
            4<span className="bg-[#ffff00] text-black px-2">0</span>4
          </h1>
          <p className="text-lg font-mono uppercase tracking-wider mb-8 opacity-70">
            PAGE NOT FOUND
          </p>
          <Link
            to="/"
            className="logo-link inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-bold uppercase tracking-wider border-4 border-current hover:bg-[#ffff00] hover:text-black transition-colors no-underline"
          >
            BACK TO HOME
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
