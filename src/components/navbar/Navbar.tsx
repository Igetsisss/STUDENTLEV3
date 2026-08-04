import {
  ChartBarIcon,
  CogIcon,
  InformationCircleIcon,
  StarIcon,
} from '@heroicons/react/outline'

import { GAME_TITLE } from '../../constants/strings'

type Props = {
  setIsInfoModalOpen: (value: boolean) => void
  setIsStatsModalOpen: (value: boolean) => void
  setIsSettingsModalOpen: (value: boolean) => void
  setIsLeaderboardModalOpen: (value: boolean) => void
  onTitleTap?: () => void
  isMvp?: boolean
}

export const Navbar = ({
  setIsInfoModalOpen,
  setIsStatsModalOpen,
  setIsSettingsModalOpen,
  setIsLeaderboardModalOpen,
  onTitleTap,
  isMvp = false,
}: Props) => {
  // Blur on click (like the on-screen game keyboard does) so Headless UI's
  // dialog doesn't capture this button as the element to restore focus to
  // when the modal closes. Left focused, a physical Enter keypress meant to
  // submit a word guess would re-click this button and reopen the modal.
  const openModal =
    (setOpen: (value: boolean) => void) =>
    (event: React.MouseEvent<HTMLButtonElement>) => {
      setOpen(true)
      event.currentTarget.blur()
    }

  return (
    <div className={`navbar${isMvp ? ' navbar-mvp' : ''}`}>
      <div className="navbar-content px-5 short:h-auto">
        <div className="navbar-side flex items-center">
          <button
            className="flex cursor-pointer flex-col items-center gap-0.5 border-0 bg-transparent p-0"
            onClick={openModal(setIsInfoModalOpen)}
            aria-label="How to play"
          >
            <InformationCircleIcon className="h-6 w-6 dark:stroke-white" />
            <span className="text-[9px] font-medium leading-none text-gray-500 dark:text-gray-400">
              How to play
            </span>
          </button>
        </div>
        <div className="navbar-title-group">
          <p
            className={`cursor-pointer select-none text-xl font-bold${
              isMvp ? ' mvp-title' : ' dark:text-white'
            }`}
            onClick={onTitleTap}
            title="Studentle"
          >
            {GAME_TITLE}
          </p>
          {isMvp && (
            <span className="mvp-crown" title="All-Time MVP">
              👑
            </span>
          )}
        </div>
        <div className="navbar-side right-icons flex items-end gap-3">
          <button
            className="flex cursor-pointer flex-col items-center gap-0.5 border-0 bg-transparent p-0"
            onClick={openModal(setIsLeaderboardModalOpen)}
            aria-label="Leaderboard"
          >
            <StarIcon className="h-6 w-6 dark:stroke-white" />
            <span className="text-[9px] font-medium leading-none text-gray-500 dark:text-gray-400">
              Leaderboard
            </span>
          </button>
          <button
            className="flex cursor-pointer flex-col items-center gap-0.5 border-0 bg-transparent p-0"
            onClick={openModal(setIsStatsModalOpen)}
            aria-label="My Stats"
          >
            <ChartBarIcon className="h-6 w-6 dark:stroke-white" />
            <span className="text-[9px] font-medium leading-none text-gray-500 dark:text-gray-400">
              My Stats
            </span>
          </button>
          <button
            className="flex cursor-pointer flex-col items-center gap-0.5 border-0 bg-transparent p-0"
            onClick={openModal(setIsSettingsModalOpen)}
            aria-label="Settings"
          >
            <CogIcon className="h-6 w-6 dark:stroke-white" />
            <span className="text-[9px] font-medium leading-none text-gray-500 dark:text-gray-400">
              Settings
            </span>
          </button>
        </div>
      </div>
      <hr></hr>
    </div>
  )
}
