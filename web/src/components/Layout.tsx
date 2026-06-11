import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import TopBarActions from './TopBarActions'
import PageTransition from './PageTransition'
import MusicPlayerSidebar from './MusicPlayerSidebar'
import MusicPlayerBar from './MusicPlayerBar'
import GlobalMusicPlayer from './GlobalMusicPlayer'
import AudioBookPlayerSidebar from './AudioBookPlayerSidebar'
import AudioBookPlayerBar from './AudioBookPlayerBar'
import GlobalAudioBookPlayer from './GlobalAudioBookPlayer'
import { useAudioBookPlayerStore } from '@/stores/audioBookPlayer'
import { libraryApi } from '@/api'
import { Menu, ArrowLeft } from 'lucide-react'

// 滚动位置保存 key 前缀
const SCROLL_KEY_PREFIX = 'nowen_scroll_'

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [currentLibraryType, setCurrentLibraryType] = useState<string | null>(null)
  const [currentLibraryName, setCurrentLibraryName] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const mainRef = useRef<HTMLDivElement>(null)
  const prevPathRef = useRef(location.pathname)
  const stopBook = useAudioBookPlayerStore((s) => s.stopBook)

  // 获取当前库的类型
  useEffect(() => {
    const pathParts = location.pathname.split('/')
    const libraryId = pathParts[2]

    if (location.pathname.startsWith('/library') && libraryId) {
      libraryApi.list().then((libRes) => {
        const foundLibrary = libRes.data.data.find(lib => lib.id === libraryId)
        setCurrentLibraryType(foundLibrary?.type || null)
        setCurrentLibraryName(foundLibrary?.name || '')
      }).catch(() => {
        setCurrentLibraryType(null)
        setCurrentLibraryName('')
      })
    } else {
      setCurrentLibraryType(null)
      setCurrentLibraryName('')
    }
  }, [location.pathname])

  // 判断是否是音乐库页面
  const isMusicLibrary = location.pathname.startsWith('/library') && currentLibraryType === 'music'

  // 判断是否是有声书库页面
  const isAudioBookLibrary = location.pathname.startsWith('/library') && currentLibraryType === 'audiobook'

  // 判断是否是详情页
  const isDetailPage = /^\/(series|season|episode|media|movie|person|music|collections)\//.test(location.pathname)

  // 退出有声书页面时停止播放
  useEffect(() => {
    if (!isAudioBookLibrary) {
      stopBook()
    }
  }, [isAudioBookLibrary, stopBook])

  // 路由切换时自动关闭移动端侧边栏
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // 路由切换时恢复目标页面的滚动位置
  // 使用 requestAnimationFrame + setTimeout 确保 DOM 完全渲染和样式应用后再恢复，避免抖动
  useEffect(() => {
    const mainEl = mainRef.current
    if (!mainEl) return

    // 仅用 pathname 作为滚动位置 key（search 参数变化不应影响滚动位置）
    const currentKey = SCROLL_KEY_PREFIX + location.pathname
    const savedPos = sessionStorage.getItem(currentKey)

    // 使用双重延迟：
    // 1. 第一个 requestAnimationFrame 等待 DOM 渲染
    // 2. setTimeout 等待 CSS 样式和动画完成（包括侧边栏宽度动画）
    // 这样可以避免侧边栏宽度变化和页面过渡动画导致的抖动
    const restoreScroll = () => {
      const timer = setTimeout(() => {
        if (savedPos) {
          mainEl.scrollTop = parseInt(savedPos, 10)
        } else {
          mainEl.scrollTop = 0
        }
      }, 150)
      return () => clearTimeout(timer)
    }

    const rafId = requestAnimationFrame(() => {
      const cleanup = restoreScroll()
      return () => cleanup()
    })

    prevPathRef.current = location.pathname

    return () => cancelAnimationFrame(rafId)
  }, [location.pathname])

  // 持续保存滚动位置（节流）
  useEffect(() => {
    const mainEl = mainRef.current
    if (!mainEl) return

    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(() => {
          const key = SCROLL_KEY_PREFIX + location.pathname
          sessionStorage.setItem(key, String(mainEl.scrollTop))
          ticking = false
        })
      }
    }

    mainEl.addEventListener('scroll', handleScroll, { passive: true })
    return () => mainEl.removeEventListener('scroll', handleScroll)
  }, [location.pathname])

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden"
      style={{ backgroundColor: 'transparent' }}
    >
      <GlobalMusicPlayer />
      {isAudioBookLibrary && <GlobalAudioBookPlayer />}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* 深空背景光效 */}
        <div className="pointer-events-none absolute inset-0 z-0 bg-deep-space" />
        <div className="pointer-events-none absolute inset-0 z-0 noise-bg" />

        {/* 侧边导航（遮罩层已移入 Sidebar 内部，确保 z-index 层叠上下文正确） */}
        <Sidebar isMobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

        {/* 主内容区 */}
        <main className="relative z-10 flex-1 min-w-0 flex flex-col overflow-hidden">

          {/* 桌面端顶部工具条 — 无背景色，绝对定位悬浮于内容之上 */}
          <div className="absolute top-0 left-0 right-0 z-20 hidden md:flex items-center justify-between px-6 py-3 pointer-events-none">
            <div className="flex items-center gap-3 min-w-0 pointer-events-auto">
              {location.pathname === '/' ? null : isDetailPage ? (
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center justify-center h-9 w-9 rounded-full text-white transition-all duration-300 hover:bg-white/10 hover:scale-105 backdrop-blur-md"
                  title="返回"
                >
                  <ArrowLeft size={18} />
                </button>
              ) : location.pathname.startsWith('/library') ? (
                <h1 className="font-display text-lg font-bold tracking-wider truncate" style={{ color: 'var(--text-primary)' }}>
                  {currentLibraryName || (
                    <>
                      <span className="text-neon text-neon-glow">N</span>
                      <span>OWEN</span>
                    </>
                  )}
                </h1>
              ) : (
                <h1 className="font-display text-lg font-bold tracking-wider">
                  <span className="text-neon text-neon-glow">N</span>
                  <span style={{ color: 'var(--text-primary)' }}>OWEN</span>
                </h1>
              )}
            </div>
            <div className="pointer-events-auto">
              <TopBarActions />
            </div>
          </div>

          <div ref={mainRef} id="main-scroll-container" className="flex-1 overflow-y-auto" style={{ willChange: 'scroll-position', contain: 'layout paint' }}>
            {/* 移动端顶部栏 */}
            <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 md:hidden"
              style={{
                background: 'var(--bg-base)',
                borderBottom: '1px solid var(--border-default)',
              }}
            >
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-lg p-2 transition-colors hover:bg-[var(--nav-hover-bg)]"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Menu size={22} />
              </button>
              <h1 className="font-display text-base font-bold tracking-wider flex-1">
                <span className="text-neon text-neon-glow">N</span>
                <span style={{ color: 'var(--text-primary)' }}>OWEN</span>
              </h1>
            </div>

            <div className="relative">
              <div className={`px-4 pt-16 pb-6 sm:px-6 lg:px-8 ${
                // 需要全宽展示的页面（文件管理、预处理、音乐库等）不限制最大宽度
                ['/files', '/preprocess', '/subtitle-preprocess', '/admin', '/collections', '/library'].some(p => location.pathname.startsWith(p))
                  ? 'w-full'
                  : 'mx-auto'
              }`}>
                <AnimatePresence mode="wait">
                  <PageTransition key={location.pathname}>
                    <Outlet />
                  </PageTransition>
                </AnimatePresence>
              </div>
            </div>
          </div>
          {/* 音乐库底部播放器 */}
          {isMusicLibrary && <MusicPlayerBar />}
          {/* 有声书库底部播放器 */}
          {isAudioBookLibrary && <AudioBookPlayerBar />}
        </main>

        {/* 音乐播放器右侧边栏 */}
        {isMusicLibrary && <MusicPlayerSidebar />}
        {/* 有声书播放器右侧边栏 */}
        {isAudioBookLibrary && <AudioBookPlayerSidebar />}
      </div>
    </div>
  )
}