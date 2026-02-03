import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { href: '/', hash: '', label: 'HOME' },
  { href: '/', hash: 'pdf-tools', label: 'PDF TOOLS' },
  { href: '/', hash: 'convert', label: 'CONVERT' },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = (href: string, hash: string) => {
    if (location.pathname === href && hash) {
      // Already on the page, just scroll to the section
      const element = document.getElementById(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (hash) {
      // Navigate to page then scroll
      navigate(href);
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      navigate(href);
    }
  };

  const isActive = (href: string, hash: string) => {
    if (hash) return false; // Hash links are never "active"
    return location.pathname === href;
  };

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
              <button
                key={link.href + link.hash}
                onClick={() => handleNavClick(link.href, link.hash)}
                className={`nav-link px-4 py-2 font-bold text-sm tracking-wider no-underline transition-colors cursor-pointer ${
                  isActive(link.href, link.hash)
                    ? 'bg-[#ffff00] text-black!'
                    : 'text-white hover:bg-white hover:text-black'
                }`}
              >
                {link.label}
              </button>
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
              <button
                key={link.href + link.hash}
                onClick={() => {
                  handleNavClick(link.href, link.hash);
                  setIsMenuOpen(false);
                }}
                className={`nav-link block w-full text-left px-4 py-3 font-bold text-sm tracking-wider no-underline cursor-pointer ${
                  isActive(link.href, link.hash)
                    ? 'bg-[#ffff00] text-black!'
                    : 'text-white hover:bg-white hover:text-black'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
