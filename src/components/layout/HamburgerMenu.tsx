import { ArrowLeftRight, Megaphone, Menu, Settings, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../router/paths'
import { DropdownMenu, type DropdownItem } from '../ui/DropdownMenu'
import { SwitchAccountModal } from './SwitchAccountModal'

/**
 * The shell's main menu: the four things that are about the app rather than
 * about a conversation.
 */
export function HamburgerMenu() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [switcherOpen, setSwitcherOpen] = useState(false)

  const items: DropdownItem[] = [
    {
      id: 'settings',
      label: t('menu.settings'),
      icon: Settings,
      onSelect: () => {
        void navigate(ROUTES.settings)
      },
    },
    {
      id: 'create-group',
      label: t('menu.createGroup'),
      icon: Users,
      onSelect: () => {
        void navigate(ROUTES.createGroup)
      },
    },
    {
      id: 'create-channel',
      label: t('menu.createChannel'),
      icon: Megaphone,
      onSelect: () => {
        void navigate(ROUTES.createChannel)
      },
    },
    {
      id: 'switch-account',
      label: t('menu.switchAccount'),
      icon: ArrowLeftRight,
      onSelect: () => {
        setSwitcherOpen(true)
      },
    },
  ]

  return (
    <>
      <DropdownMenu
        trigger={<Menu className="size-5" aria-hidden />}
        triggerLabel={t('menu.label')}
        items={items}
        align="start"
      />
      <SwitchAccountModal
        open={switcherOpen}
        onClose={() => {
          setSwitcherOpen(false)
        }}
      />
    </>
  )
}
