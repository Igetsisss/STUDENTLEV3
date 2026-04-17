import {
  CalendarIcon,
  ChartBarIcon,
  CogIcon,
  InformationCircleIcon,
  StarIcon,
} from '@heroicons/react/outline'

import { ENABLE_ARCHIVED_GAMES } from '../../constants/settings'
import { GAME_TITLE } from '../../constants/strings'

type Props = {
  setIsInfoModalOpen: (value: boolean) => void
  setIsStatsModalOpen: (value: boolean) => void
  setIsDatePickerModalOpen: (value: boolean) => void
  setIsSettingsModalOpen: (value: boolean) => void
  setIsLeaderboardModalOpen: (value: boolean) => void
  onTitleTap?: () => void
  isMvp?: boolean
}

export const Navbar = ({
  setIsInfoModalOpen,
  setIsStatsModalOpen,
  setIsDatePickerModalOpen,
  setIsSettingsModalOpen,
  setIsLeaderboardModalOpen,
  onTitleTap,
  isMvp = false,
}: Props) => {
  return (
    <div className={`navbar${isMvp ? ' navbar-mvp' : ''}`}>
      <div className="navbar-content px-5 short:h-auto">
        <div className="flex items-center">
          <InformationCircleIcon
            className="h-6 w-6 cursor-pointer dark:stroke-white"
            onClick={() => setIsInfoModalOpen(true)}
          />
          {ENABLE_ARCHIVED_GAMES && (
            <CalendarIcon
              className="ml-3 h-6 w-6 cursor-pointer dark:stroke-white"
              onClick={() => setIsDatePickerModalOpen(true)}
            />
          )}
        </div>
        <div className="navbar-title-group flex items-center gap-1">
          <p
            className={`cursor-pointer select-none text-xl font-bold${isMvp ? ' mvp-title' : ' dark:text-white'}`}
            onClick={onTitleTap}
            title="Studentle"
          >
            {GAME_TITLE}
          </p>
          {isMvp && <span className="mvp-crown" title="All-Time MVP">👑</span>}
        </div>
        <div className="right-icons">
          <StarIcon
            className="mr-3 h-6 w-6 cursor-pointer dark:stroke-white"
            onClick={() => setIsLeaderboardModalOpen(true)}
          />
          <ChartBarIcon
            className="mr-3 h-6 w-6 cursor-pointer dark:stroke-white"
            onClick={() => setIsStatsModalOpen(true)}
          />
          <CogIcon
            className="h-6 w-6 cursor-pointer dark:stroke-white"
            onClick={() => setIsSettingsModalOpen(true)}
          />
        </div>
      </div>
      <hr></hr>
    </div>
  )
}
