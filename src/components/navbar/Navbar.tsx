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
  return (
    <div className={`navbar${isMvp ? ' navbar-mvp' : ''}`}>
      <div className="navbar-content px-5 short:h-auto">
        <div className="flex items-center">
          <button
            className="flex flex-col items-center gap-0.5 cursor-pointer bg-transparent border-0 p-0"
            onClick={() => setIsInfoModalOpen(true)}
            aria-label="How to play"
          >
            <InformationCircleIcon className="h-6 w-6 dark:stroke-white" />
            <span className="text-[9px] font-medium text-gray-500 dark:text-gray-400 leading-none">How to play</span>
          </button>
        </div>
        <div className="navbar-title-group flex items-center gap-1">
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
        <div className="right-icons flex items-end gap-3">
          <button
            className="flex flex-col items-center gap-0.5 cursor-pointer bg-transparent border-0 p-0"
            onClick={() => setIsLeaderboardModalOpen(true)}
            aria-label="Leaderboard"
          >
            <StarIcon className="h-6 w-6 dark:stroke-white" />
            <span className="text-[9px] font-medium text-gray-500 dark:text-gray-400 leading-none">Leaderboard</span>
          </button>
          <button
            className="flex flex-col items-center gap-0.5 cursor-pointer bg-transparent border-0 p-0"
            onClick={() => setIsStatsModalOpen(true)}
            aria-label="My Stats"
          >
            <ChartBarIcon className="h-6 w-6 dark:stroke-white" />
            <span className="text-[9px] font-medium text-gray-500 dark:text-gray-400 leading-none">My Stats</span>
          </button>
          <button
            className="flex flex-col items-center gap-0.5 cursor-pointer bg-transparent border-0 p-0"
            onClick={() => setIsSettingsModalOpen(true)}
            aria-label="Settings"
          >
            <CogIcon className="h-6 w-6 dark:stroke-white" />
            <span className="text-[9px] font-medium text-gray-500 dark:text-gray-400 leading-none">Settings</span>
          </button>
        </div>
      </div>
      <hr></hr>
    </div>
  )
}
