import {
  HARD_MODE_DESCRIPTION,
  HIGH_CONTRAST_MODE_DESCRIPTION,
} from '../../constants/strings'
import { BaseModal } from './BaseModal'
import { SettingsToggle } from './SettingsToggle'

type Props = {
  isOpen: boolean
  handleClose: () => void
  isHardMode: boolean
  handleHardMode: Function
  isDarkMode: boolean
  handleDarkMode: Function
  isHighContrastMode: boolean
  handleHighContrastMode: Function
}

export const SettingsModal = ({
  isOpen,
  handleClose,
  isHardMode,
  handleHardMode,
  isDarkMode,
  handleDarkMode,
  isHighContrastMode,
  handleHighContrastMode,
}: Props) => {
  const handleChangeGrade = () => {
    if (
      window.confirm(
        'Are you sure you want to reset grade? All Statistics will be lost forever!'
      )
    ) {
      // Save it!
      if (
        window.confirm(
          'Are you SURE that your SURE you want to reset grade? ALL STATISTICS WILL BE GONE, OUT THE WINDOW FOREVER!!!!'
        )
      ) {
        window.localStorage.clear()
        window.location.reload()
      } else {
        // Do nothing!
      }
    } else {
      // Do nothing!
    }
  }

  return (
    <BaseModal title="Settings" isOpen={isOpen} handleClose={handleClose}>
      <div className="mt-2 flex flex-col divide-y">
        <SettingsToggle
          settingName="Hard Mode"
          flag={isHardMode}
          handleFlag={handleHardMode}
          description={HARD_MODE_DESCRIPTION}
        />
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
        <SettingsToggle
          settingName="Change Grade"
          flag={false}
          handleFlag={handleChangeGrade}
          description={
            'WARNING: When changing this your Local Storage will be cleared meaning ALL Statistics will be lost!'
          }
        />
        <p className="mt-6 text-sm italic text-gray-500 dark:text-gray-300">
          ver 3.0
        </p>
      </div>
    </BaseModal>
  )
}
