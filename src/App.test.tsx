import { render, screen } from '@testing-library/react'
import React from 'react'

import App from './App'
import { GAME_TITLE } from './constants/strings'
import { AlertProvider } from './context/AlertContext'

jest.mock('./lib/api', () => ({
  __esModule: true,
  computeMvp: jest.fn().mockReturnValue(null),
  fetchLeaderboard: jest.fn().mockResolvedValue([]),
  fetchPlayerStateFromCloud: jest.fn().mockResolvedValue(null),
  fetchTodayLeader: jest.fn().mockResolvedValue(null),
  isTrueDailyEntry: jest.fn(() => true),
  submitGameData: jest.fn(),
  syncPlayerStateToCloud: jest.fn().mockResolvedValue(undefined),
}))

beforeEach(() => {
  localStorage.clear()
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
})

test('renders App component', () => {
  render(
    <AlertProvider>
      <App />
    </AlertProvider>
  )
  const linkElement = screen.getByText(GAME_TITLE)
  expect(linkElement).toBeInTheDocument()
})
