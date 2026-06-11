export default function LibrarySkeleton() {
  return (
    <div className="space-y-6">
      {/* 工具栏骨架屏 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="skeleton h-9 w-48 rounded-lg" />
          <div className="skeleton h-9 w-32 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <div className="skeleton h-9 w-9 rounded-lg" />
          <div className="skeleton h-9 w-9 rounded-lg" />
        </div>
      </div>

      {/* 筛选栏骨架屏 */}
      <div className="flex items-center gap-2 overflow-hidden pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-7 w-20 rounded-lg flex-shrink-0" />
        ))}
      </div>

      {/* 内容网格骨架屏：与 LibraryGridView 完全一致 */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-9">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton aspect-[2/3] rounded-xl" />
            <div className="skeleton mt-2 h-4 w-3/4 rounded" />
            <div className="skeleton mt-1 h-3 w-1/2 rounded" />
          </div>
        ))}
      </div>

      {/* 分页骨架屏 */}
      <div className="flex items-center justify-center gap-4 py-6">
        <div className="skeleton h-9 w-9 rounded-lg" />
        <div className="skeleton h-9 w-16 rounded-lg" />
        <div className="skeleton h-9 w-9 rounded-lg" />
      </div>
    </div>
  )
}
