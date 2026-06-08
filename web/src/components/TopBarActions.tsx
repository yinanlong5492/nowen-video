import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useTranslation } from '@/i18n'
import { Settings, Sun, Moon } from 'lucide-react'
import clsx from 'clsx'

export default function TopBarActions() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={toggleTheme}
        className="p-1.5 rounded-lg transition-colors hover:bg-[var(--nav-hover-bg)]"
        style={{ color: 'var(--text-secondary)' }}
        title={theme === 'dark' ? t('nav.switchToLight') : t('nav.switchToDark')}
      >
        <div className="relative flex h-[18px] w-[18px] items-center justify-center">
          <Sun size={18} className={clsx('absolute transition-all duration-500', theme === 'light' ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0')} style={theme === 'light' ? { color: '#f59e0b', filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.4))' } : undefined} />
          <Moon size={18} className={clsx('absolute transition-all duration-500', theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0')} style={theme === 'dark' ? { color: 'var(--neon)', filter: 'drop-shadow(0 0 4px var(--neon-blue-40))' } : undefined} />
        </div>
      </button>
      <div className="h-5 w-px" style={{ background: 'var(--border-default)' }} />
      {user?.role === 'admin' && (
        <button
          onClick={() => navigate('/admin')}
          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--nav-hover-bg)]"
          style={{ color: 'var(--text-secondary)' }}
          title={t('nav.admin')}
        >
          <Settings size={18} />
        </button>
      )}
    </div>
  )
}
