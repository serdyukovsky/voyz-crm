import { BrowserRouter, Routes, Route } from 'react-router-dom'

function SimpleApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <div style={{ padding: '20px' }}>
            <h1>Test Page - Vite is Working!</h1>
            <p>If you see this, React and Vite are working correctly.</p>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default SimpleApp

