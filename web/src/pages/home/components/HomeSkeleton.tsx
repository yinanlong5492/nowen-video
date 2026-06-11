export default function HomeSkeleton() {
  // 模拟文本行数：与真实内容保持一致
  const SkeletonText = ({ lines = 1, className = '' }: { lines?: number; className?: string }) => (
    <div className={`space-y-1.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`skeleton rounded ${i === 0 ? 'h-4 w-3/4' : 'h-3 w-1/2'}`}
        />
      ))}
    </div>
  )

  // 模拟媒体卡片：与真实 MediaCard 保持一致
  const SkeletonCard = () => (
    <div className="flex-shrink-0 w-[calc(50%-8px)] sm:w-[calc(33.333%-10.67px)] md:w-[calc(25%-12px)] lg:w-[calc(20%-12.8px)] xl:w-[calc(16.666%-13.33px)]">
      <div className="skeleton aspect-video w-full rounded-xl" />
      <SkeletonText lines={2} className="mt-2 px-1" />
    </div>
  )

  return (
    <section className="space-y-8">
      {/* 媒体库网格骨架屏 */}
      <div className="space-y-4">
        {/* 标题：text-xl font-bold 对应 h-6 */}
        <h2 className="skeleton h-6 w-32 rounded-lg" />
        {/* 网格布局：与 LibraryGrid 保持一致 */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col overflow-hidden rounded-xl" style={{ border: '1px solid var(--border-default)' }}>
              <div className="skeleton aspect-[16/9] rounded-xl" style={{ background: 'var(--bg-surface)' }} />
              <div className="space-y-1.5 p-2.5">
                <div className="skeleton h-4 w-full rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 继续观看骨架屏 */}
      <div className="space-y-4">
        <h2 className="skeleton h-6 w-40 rounded-lg" />
        {/* 使用与 HorizontalScrollRow 一致的结构 */}
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>

      {/* 最近添加骨架屏（模拟多个媒体库） */}
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="space-y-4">
          <h2 className="skeleton h-6 w-32 rounded-lg" />
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {Array.from({ length: 6 }).map((_, j) => (
              <SkeletonCard key={j} />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}