import { useState } from 'react'

import { HIGH_CONTRAST_MODE_DESCRIPTION } from '../../constants/strings'
import { BaseModal } from './BaseModal'
import { SettingsToggle } from './SettingsToggle'

type Props = {
  isOpen: boolean
  handleClose: () => void
  isDarkMode: boolean
  handleDarkMode: Function
  isHighContrastMode: boolean
  handleHighContrastMode: Function
}

export const SettingsModal = ({
  isOpen,
  handleClose,
  isDarkMode,
  handleDarkMode,
  isHighContrastMode,
  handleHighContrastMode,
}: Props) => {
  const [showBugInfo, setShowBugInfo] = useState(false)

  return (
    <BaseModal title="Settings" isOpen={isOpen} handleClose={handleClose}>
      <div className="mt-2 flex flex-col divide-y">
        <SettingsToggle
          settingName="Dark Mode"
          flag={isDarkMode}
          handleFlag={handleDarkMode}
        />
        <SettingsToggle
          settingName="High Contrast Mode"
          flag={isHighContrastMode}
          handleFlag={handleHighContrastMode}
          description={HIGH_CONTRAST_MODE_DESCRIPTION}
        />
        <div className="pt-4">
          <button
            onClick={() => setShowBugInfo((v) => !v)}
            className="w-full rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
          >
            🐛 Report a Bug
          </button>
          {showBugInfo && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              <p className="font-semibold">Tell Jack Underwood!</p>
              <p className="mt-1">
                Find me in person, or shoot me an email at{' '}
                <a
                  href="mailto:underwoodja@bearsmail.org"
                  className="font-medium underline"
                >
                  underwoodja@bearsmail.org
                </a>
              </p>
            </div>
          )}
        </div>
        <p className="mt-6 text-sm italic text-gray-500 dark:text-gray-300">
          ver. 5.0
        </p>
      </div>
    </BaseModal>
  )
}
