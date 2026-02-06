import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Alert } from '@dader34/stylekit-ui';
import {
  Type,
  RotateCw,
  Scissors,
  FileDown,
  Trash2,
  ListOrdered,
  FileOutput,
  ArrowRight,
} from 'lucide-react';

const tools = [
  { icon: Type, label: 'ADD TEXT' },
  { icon: RotateCw, label: 'ROTATE' },
  { icon: Trash2, label: 'DELETE' },
  { icon: ListOrdered, label: 'REORDER' },
  { icon: FileOutput, label: 'EXTRACT' },
  { icon: Scissors, label: 'SPLIT' },
  { icon: FileDown, label: 'COMPRESS' },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <section className="py-20 md:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Main Title */}
            <div className="mb-8">
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold leading-none tracking-tighter">
                DOCU<span className="bg-[#ffff00] text-black px-2">THING</span>
              </h1>
            </div>

            {/* Subtitle */}
            <div className="mb-8">
              <p className="text-xl md:text-2xl font-mono uppercase tracking-wider">
                FREE PDF EDITOR & DOCUMENT TOOLKIT
              </p>
            </div>

            {/* Privacy Badge */}
            <div className="max-w-xl mx-auto mb-12">
              <Alert status="success">
                <span className="font-mono uppercase">
                  100% PRIVATE — ALL PROCESSING HAPPENS IN YOUR BROWSER
                </span>
              </Alert>
            </div>

            {/* CTA */}
            <Link
              to="/editor"
              className="logo-link inline-flex items-center gap-3 px-8 py-4 bg-black text-white font-bold text-lg uppercase tracking-wider border-4 border-current hover:bg-[#ffff00] hover:text-black transition-colors no-underline"
            >
              OPEN EDITOR
              <ArrowRight className="w-5 h-5" />
            </Link>

            {/* Tool Icons Row */}
            <div className="mt-16 flex flex-wrap items-center justify-center gap-6">
              {tools.map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-2 opacity-60">
                  <div className="w-12 h-12 border-2 border-current flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl md:text-5xl font-bold mb-12 tracking-tighter">
              WHY DOCUTHING?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 border-4 border-current">
                <div className="w-16 h-16 bg-[#ffff00] border-4 border-current flex items-center justify-center mb-6">
                  <span className="text-3xl text-black">🔒</span>
                </div>
                <h3 className="text-2xl font-bold mb-4 uppercase tracking-wider">
                  100% PRIVATE
                </h3>
                <p className="opacity-70 font-mono">
                  YOUR FILES NEVER LEAVE YOUR DEVICE. ALL PROCESSING HAPPENS LOCALLY IN YOUR BROWSER.
                </p>
              </div>
              <div className="p-8 border-4 border-current">
                <div className="w-16 h-16 bg-[#ffff00] border-4 border-current flex items-center justify-center mb-6">
                  <span className="text-3xl text-black">⚡</span>
                </div>
                <h3 className="text-2xl font-bold mb-4 uppercase tracking-wider">
                  COMPLETELY FREE
                </h3>
                <p className="opacity-70 font-mono">
                  NO SUBSCRIPTIONS, NO HIDDEN FEES. ALL TOOLS ARE FREE TO USE WITHOUT LIMITS.
                </p>
              </div>
              <div className="p-8 border-4 border-current">
                <div className="w-16 h-16 bg-[#ffff00] border-4 border-current flex items-center justify-center mb-6">
                  <span className="text-3xl text-black">🚀</span>
                </div>
                <h3 className="text-2xl font-bold mb-4 uppercase tracking-wider">
                  FAST & EASY
                </h3>
                <p className="opacity-70 font-mono">
                  SIMPLE DRAG-AND-DROP INTERFACE. GET YOUR WORK DONE IN SECONDS.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
