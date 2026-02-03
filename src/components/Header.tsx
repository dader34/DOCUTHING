import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'HOME' },
  { href: '/#pdf-tools', label: 'PDF TOOLS' },
  { href: '/#convert', label: 'CONVERT' },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="brutal-header fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="logo-link flex items-center gap-3 no-underline"
          >
            <div className="w-10 h-10 bg-[#ffff00] border-2 border-white flex items-center justify-center">
              <span className="text-black font-bold text-xl">D</span>
            </div>
            <span className="text-xl font-bold tracking-wider text-white">
              DOCUTHING
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`nav-link px-4 py-2 font-bold text-sm tracking-wider no-underline transition-colors ${
                  location.pathname === link.href
                    ? 'bg-[#ffff00] text-black'
                    : 'text-white hover:bg-white hover:text-black'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 bg-white text-black border-2 border-white"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t-4 border-white bg-black">
          <nav className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={`nav-link block px-4 py-3 font-bold text-sm tracking-wider no-underline ${
                  location.pathname === link.href
                    ? 'bg-[#ffff00] text-black'
                    : 'text-white hover:bg-white hover:text-black'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
