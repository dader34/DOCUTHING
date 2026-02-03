import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@dader34/stylekit-ui'
import '@dader34/stylekit-ui/styles.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="brutalist">
      <App />
    </ThemeProvider>
  </StrictMode>,
)
