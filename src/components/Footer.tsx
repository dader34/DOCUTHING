import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="brutal-footer py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#ffff00] border-2 border-white flex items-center justify-center">
                <span className="text-black font-bold">D</span>
              </div>
              <span className="text-lg font-bold tracking-wider">DOCUTHING</span>
            </div>
            <p className="text-sm text-gray-300 font-mono">
              FREE PDF EDITOR & DOCUMENT CONVERTER
            </p>
          </div>

          {/* Tools */}
          <div>
            <h3 className="text-sm font-bold tracking-wider mb-4 text-[#ffff00]">
              TOOLS
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/merge" className="nav-link text-white hover:text-[#ffff00] hover:bg-transparent no-underline">
                  → MERGE PDF
                </Link>
              </li>
              <li>
                <Link to="/split" className="nav-link text-white hover:text-[#ffff00] hover:bg-transparent no-underline">
                  → SPLIT PDF
                </Link>
              </li>
              <li>
                <Link to="/compress" className="nav-link text-white hover:text-[#ffff00] hover:bg-transparent no-underline">
                  → COMPRESS PDF
                </Link>
              </li>
              <li>
                <Link to="/pdf-to-images" className="nav-link text-white hover:text-[#ffff00] hover:bg-transparent no-underline">
                  → PDF TO IMAGES
                </Link>
              </li>
            </ul>
          </div>

          {/* Privacy */}
          <div>
            <h3 className="text-sm font-bold tracking-wider mb-4 text-[#ffff00]">
              PRIVACY
            </h3>
            <div className="border-2 border-[#ffff00] p-4">
              <p className="text-sm font-mono text-gray-300">
                100% PRIVATE<br />
                ALL PROCESSING HAPPENS IN YOUR BROWSER<br />
                NO FILES UPLOADED TO SERVERS
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t-2 border-gray-700">
          <p className="text-center text-sm text-gray-400 font-mono">
            © {new Date().getFullYear()} DOCUTHING // BUILT WITH RAW FUNCTIONALITY
          </p>
        </div>
      </div>
    </footer>
  );
}
