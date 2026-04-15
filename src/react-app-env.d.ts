/// <reference types="react-scripts" />

import type { setGameDate as setGameDateFn } from './lib/words'

declare global {
	interface Window {
		setGameDate: typeof setGameDateFn
	}
}

export {}
