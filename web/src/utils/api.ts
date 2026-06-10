import { adminApi } from '@/api'
import type { Series, Season } from '@/types'

/**
 * 创建剧集刷新函数
 * @param id - 剧集 ID
 * @param setSeries - 设置剧集数据的函数
 * @param setSeasons - 设置季列表数据的函数
 * @returns 刷新函数
 */
export function createSeriesRefresh(
  id: string | undefined,
  setSeries: (series: Series) => void,
  setSeasons: (seasons: Season[]) => void
) {
  return async () => {
    if (!id) return
    const [seriesRes, seasonsRes] = await Promise.all([
      adminApi.detail(id),
      adminApi.seasons(id),
    ])
    setSeries(seriesRes.data.data)
    setSeasons(seasonsRes.data.data || [])
  }
}