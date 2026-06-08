import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { streamApi } from '@/api'
import type { MediaPerson } from '@/types'
import { User, Film, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from '@/i18n'

interface CastGridProps {
  persons: MediaPerson[]
  /** 初始展示数量，超出后折叠 */
  initialCount?: number
}

/** 获取角色类型的国际化标签 */
function useRoleLabel() {
  const { t } = useTranslation()
  return (role: string) => {
    const map: Record<string, string> = {
      director: t('castGrid.roleDirector'),
      actor: t('castGrid.roleActor'),
      writer: t('castGrid.roleWriter'),
      producer: t('castGrid.roleProducer'),
      composer: t('castGrid.roleComposer'),
      cinematographer: t('castGrid.roleCinematographer'),
    }
    return map[role] || role
  }
}

const rolePriority: Record<string, number> = {
  director: 0,
  writer: 1,
  actor: 2,
  producer: 3,
  composer: 4,
  cinematographer: 5,
}

const roleBadgeColors: Record<string, string> = {
  director: '#FBBF24',
  writer: '#93C5FD',
  producer: '#F472B6',
  composer: '#A78BFA',
  cinematographer: '#34D399',
}

function getRoleBadgeColor(role: string): string {
  return roleBadgeColors[role] || '#93C5FD'
}

export default function CastGrid({ persons }: CastGridProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 1)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const scrollAmount = 300
    el.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' })
  }, [])

  // 去重：相同 person_id + role 只保留第一条（兜底，后端合并时已去重）
  const dedupedPersons = useMemo(() => {
    const seen = new Set<string>()
    return persons.filter((mp) => {
      const key = `${mp.person_id}:${mp.role}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [persons])

  // 按角色排序：导演 > 编剧 > 演员，同角色按 sort_order 排序
  const sortedPersons = useMemo(() => {
    return [...dedupedPersons].sort((a, b) => {
      const pa = rolePriority[a.role] ?? 99
      const pb = rolePriority[b.role] ?? 99
      if (pa !== pb) return pa - pb
      return a.sort_order - b.sort_order
    })
  }, [dedupedPersons])

  // 初始化滚动状态
  useEffect(() => {
    updateScrollState()
  }, [sortedPersons, updateScrollState])

  // 点击演员头像 → 跳转到独立的演员详情页
  const handleCardClick = useCallback((person: MediaPerson) => {
    if (person.person_id) {
      navigate(`/person/${person.person_id}`)
    }
  }, [navigate])

  return (
    <section>
      {/* 标题 */}
      <h3
        className="mb-4 flex items-center gap-2 font-display text-base font-semibold tracking-wide"
        style={{ color: 'var(--text-primary)' }}
      >
        <Film size={16} className="text-neon/60" />
        {t('castGrid.title')}
        <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
          ({dedupedPersons.length})
        </span>
      </h3>

      {/* 空状态占位符 */}
      {dedupedPersons.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-8 rounded-xl"
          style={{ background: 'var(--bg-subtle)' }}
        >
          <User size={40} className="mb-3 opacity-40" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('castGrid.empty') || '暂无演职人员信息'}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {t('castGrid.emptyHint') || '可尝试刷新元数据获取'}
          </p>
        </div>
      ) : (
        /* 横向滚动布局 + 左右滚动按钮 */
        <div className="relative">
          {/* 左滚动按钮 */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute -left-1 top-1/2 z-10 -translate-y-1/2 rounded-full p-1.5 shadow-lg transition-all hover:scale-110"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
              aria-label="向左滚动"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          {/* 右滚动按钮 */}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute -right-1 top-1/2 z-10 -translate-y-1/2 rounded-full p-1.5 shadow-lg transition-all hover:scale-110"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
              aria-label="向右滚动"
            >
              <ChevronRight size={16} />
            </button>
          )}
          <div
            ref={scrollRef}
            onScroll={updateScrollState}
            className="flex gap-10 overflow-x-auto pb-2"
            style={{
              scrollbarWidth: 'none',
            }}
          >
            {sortedPersons.map((mp) => (
              <CastCard key={mp.id} mediaPerson={mp} onClick={handleCardClick} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

/** 单个演员卡片 */
function CastCard({
  mediaPerson,
  onClick,
}: {
  mediaPerson: MediaPerson
  onClick: (mp: MediaPerson) => void
}) {
  const { t } = useTranslation()
  const getRoleLabel = useRoleLabel()
  const [imgError, setImgError] = useState(false)
  const person = mediaPerson.person
  // 优先使用本地 API 代理头像（解决国内无法直连 TMDb 的问题）
  const profileSrc = person?.id ? streamApi.getPersonProfileUrl(person.id) : null

  return (
    <button
      onClick={() => onClick(mediaPerson)}
      className="group flex w-20 flex-shrink-0 flex-col items-center gap-2 transition-all duration-300 hover:scale-[1.05] sm:w-24"
    >
      {/* 圆形头像 */}
      <div
        className="relative aspect-square w-full overflow-hidden rounded-full"
        style={{
          background: 'var(--bg-surface)',
          border: '2px solid var(--border-default)',
        }}
      >
        {profileSrc && !imgError ? (
          <img
            src={profileSrc}
            alt={person?.name || ''}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center rounded-full"
            style={{
              background: 'linear-gradient(135deg, var(--neon-blue-4), var(--neon-purple-4, var(--neon-blue-8)))',
              color: 'var(--text-muted)',
            }}
          >
            <User size={28} strokeWidth={1.5} />
          </div>
        )}

        {/* 角色类型标签 */}
        {mediaPerson.role && mediaPerson.role !== 'actor' && (
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase whitespace-nowrap"
            style={{
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(4px)',
              color: getRoleBadgeColor(mediaPerson.role),
            }}
          >
            {getRoleLabel(mediaPerson.role)}
          </div>
        )}
      </div>

      {/* 姓名 */}
      <div className="w-full text-center">
        <p
          className="truncate text-xs font-medium transition-colors group-hover:text-neon"
          style={{ color: 'var(--text-primary)' }}
        >
          {person?.name || t('castGrid.unknown')}
        </p>
        {/* 饰演角色 */}
        {mediaPerson.character && (
          <p
            className="mt-0.5 truncate text-[10px]"
            style={{ color: 'var(--text-muted)' }}
            title={t('castGrid.asRole', { character: mediaPerson.character })}
          >
            {t('castGrid.asRole', { character: mediaPerson.character })}
          </p>
        )}
        {/* 导演/编剧没有 character 时显示角色类型 */}
        {!mediaPerson.character && mediaPerson.role !== 'actor' && (
          <p
            className="mt-0.5 truncate text-[10px]"
            style={{ color: 'var(--text-muted)' }}
          >
            {getRoleLabel(mediaPerson.role)}
          </p>
        )}
      </div>
    </button>
  )
}

