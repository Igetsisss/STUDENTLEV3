import './index.css'

import React from 'react'
import ReactDOM from 'react-dom'

import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AlertProvider } from './context/AlertContext'
import reportWebVitals from './reportWebVitals'

ReactDOM.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AlertProvider>
        <App />
      </AlertProvider>
    </ErrorBoundary>
  </React.StrictMode>,
  document.getElementById('root')
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
