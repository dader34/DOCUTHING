import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import MergePDF from './pages/MergePDF';
import SplitPDF from './pages/SplitPDF';
import CompressPDF from './pages/CompressPDF';
import RotatePDF from './pages/RotatePDF';
import DeletePages from './pages/DeletePages';
import ReorderPages from './pages/ReorderPages';
import ExtractPages from './pages/ExtractPages';
import PDFToImages from './pages/PDFToImages';
import ImagesToPDF from './pages/ImagesToPDF';
import AddTextToPDF from './pages/AddTextToPDF';
import NotFound from './pages/NotFound';

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/merge" element={<MergePDF />} />
        <Route path="/split" element={<SplitPDF />} />
        <Route path="/compress" element={<CompressPDF />} />
        <Route path="/rotate" element={<RotatePDF />} />
        <Route path="/delete-pages" element={<DeletePages />} />
        <Route path="/reorder" element={<ReorderPages />} />
        <Route path="/extract" element={<ExtractPages />} />
        <Route path="/pdf-to-images" element={<PDFToImages />} />
        <Route path="/images-to-pdf" element={<ImagesToPDF />} />
        <Route path="/editor" element={<AddTextToPDF />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
