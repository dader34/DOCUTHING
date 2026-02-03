import Header from '../components/Header';
import Footer from '../components/Footer';
import ToolCard from '../components/ToolCard';
import { Button, Alert } from '@dader34/stylekit-ui';
import {
  FileStack,
  Scissors,
  FileDown,
  RotateCw,
  Trash2,
  ListOrdered,
  FileOutput,
  Image,
  FileImage,
  Type,
} from 'lucide-react';

interface ToolCategory {
  title: string;
  id: string;
  tools: {
    icon: typeof FileStack;
    title: string;
    description: string;
    href: string;
    color: 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'cyan';
  }[];
}

const toolCategories: ToolCategory[] = [
  {
    title: 'PDF TOOLS',
    id: 'pdf-tools',
    tools: [
      {
        icon: FileStack,
        title: 'Merge PDF',
        description: 'Combine multiple PDF files into one document',
        href: '/merge',
        color: 'blue',
      },
      {
        icon: Scissors,
        title: 'Split PDF',
        description: 'Split a PDF into multiple files by page ranges',
        href: '/split',
        color: 'purple',
      },
      {
        icon: FileDown,
        title: 'Compress PDF',
        description: 'Reduce PDF file size while maintaining quality',
        href: '/compress',
        color: 'green',
      },
      {
        icon: RotateCw,
        title: 'Rotate PDF',
        description: 'Rotate individual pages or entire documents',
        href: '/rotate',
        color: 'orange',
      },
      {
        icon: Trash2,
        title: 'Delete Pages',
        description: 'Remove unwanted pages from your PDF',
        href: '/delete-pages',
        color: 'pink',
      },
      {
        icon: ListOrdered,
        title: 'Reorder Pages',
        description: 'Rearrange pages in your PDF document',
        href: '/reorder',
        color: 'cyan',
      },
      {
        icon: FileOutput,
        title: 'Extract Pages',
        description: 'Extract specific pages to a new PDF',
        href: '/extract',
        color: 'blue',
      },
    ],
  },
  {
    title: 'CONVERT',
    id: 'convert',
    tools: [
      {
        icon: Image,
        title: 'PDF to Images',
        description: 'Convert PDF pages to high-quality images',
        href: '/pdf-to-images',
        color: 'purple',
      },
      {
        icon: FileImage,
        title: 'Images to PDF',
        description: 'Create a PDF from multiple images',
        href: '/images-to-pdf',
        color: 'green',
      },
    ],
  },
  {
    title: 'EDIT',
    id: 'edit',
    tools: [
      {
        icon: Type,
        title: 'Add Text',
        description: 'Add text annotations to your PDF pages',
        href: '/add-text',
        color: 'orange',
      },
    ],
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <section className="py-16 md:py-24">
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
                FREE PDF EDITOR & DOCUMENT CONVERTER
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

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a href="#pdf-tools">
                <Button variant="primary">
                  GET STARTED →
                </Button>
              </a>
              <a href="#convert">
                <Button variant="outline">
                  CONVERT FILES
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* Tools Categories */}
        {toolCategories.map((category) => (
          <section
            key={category.id}
            id={category.id}
            className="py-16 md:py-20"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-12">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tighter">
                  {category.title}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {category.tools.map((tool) => (
                  <ToolCard
                    key={tool.href}
                    icon={tool.icon}
                    title={tool.title}
                    description={tool.description}
                    href={tool.href}
                    color={tool.color}
                  />
                ))}
              </div>
            </div>
          </section>
        ))}

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
