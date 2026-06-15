import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { injectPublicAssetStyles } from './utils/publicUrl'
import './index.css'
import App from './App.jsx'

injectPublicAssetStyles()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
