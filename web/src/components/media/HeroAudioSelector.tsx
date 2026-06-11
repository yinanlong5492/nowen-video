import { useState, useCallback } from 'react'
import { AudioWaveform, ChevronDown, Check } from 'lucide-react'
import clsx from 'clsx'
import { useTranslation } from '@/i18n'
import type { StreamDetail } from '@/types'

interface HeroAudioSelectorProps {
  audioStreams: StreamDetail[]
  selectedIndex: number
  onSelect: (index: number) => void
}

export function HeroAudioSelector({ audioStreams, selectedIndex, onSelect }: HeroAudioSelectorProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  const selectedAudio = audioStreams.find((s) => s.index === selectedIndex)

  const langName = useCallback((code?: string) => {
    if (!code) return '-'
    const c = code.toLowerCase()
    const map: Record<string, string> = {
      chi: '中文', zho: '中文', chs: '简体中文', cht: '繁体中文',
      eng: '英语', jpn: '日语', jp: '日语', kor: '韩语', ko: '韩语',
      fre: '法语', fr: '法语', fra: '法语',
      ger: '德语', de: '德语', deu: '德语',
      spa: '西班牙语', es: '西班牙语',
      ita: '意大利语', it: '意大利语',
      por: '葡萄牙语', pt: '葡萄牙语',
      rus: '俄语', ru: '俄语',
      ara: '阿拉伯语', ar: '阿拉伯语',
      hin: '印地语', hi: '印地语',
      tha: '泰语', th: '泰语',
      vie: '越南语', vi: '越南语',
      ind: '印尼语', id: '印尼语',
      tur: '土耳其语', tr: '土耳其语',
      dut: '荷兰语', nl: '荷兰语', nld: '荷兰语',
      pol: '波兰语', pl: '波兰语',
      swe: '瑞典语', sv: '瑞典语',
      dan: '丹麦语', da: '丹麦语',
      fin: '芬兰语', fi: '芬兰语',
      nor: '挪威语', no: '挪威语',
      cze: '捷克语', cs: '捷克语',
      hun: '匈牙利语', hu: '匈牙利语',
      rum: '罗马尼亚语', ro: '罗马尼亚语',
      gre: '希腊语', el: '希腊语',
      heb: '希伯来语', he: '希伯来语',
      und: '未知语言',
    }
    return map[c] || code
  }, [])

  const extractChinese = useCallback((s?: string): string => {
    if (!s) return ''
    const m = s.match(/[\u4e00-\u9fff\u3400-\u4dbf]+/g)
    return m ? m.join('') : ''
  }, [])

  const handleSelect = (idx: number) => {
    onSelect(idx)
    setIsOpen(false)
  }

  return (
    <div className="group relative pb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm transition-all duration-200 hover:brightness-110"
        style={{ background: 'var(--neon-blue-4)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
      >
        <AudioWaveform size={13} />
        <span className="max-w-[180px] truncate">
          {selectedAudio
            ? `${extractChinese(selectedAudio.title) || langName(selectedAudio.language) || selectedAudio.title || '-'}音频${selectedAudio.channels ? ` (${selectedAudio.channels}ch)` : ''}`
            : t('hero.audio')}
        </span>
        <ChevronDown size={12} />
      </button>
      <div
        className={clsx(
          'absolute left-0 top-full z-50 mt-0.5 min-w-[220px] rounded-lg p-2 shadow-xl',
          isOpen ? 'block' : 'hidden'
        )}
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        <div className="space-y-0.5">
          {audioStreams.map((stream) => {
            const isSelected = stream.index === selectedIndex
            const audioLabel = `${extractChinese(stream.title) || langName(stream.language) || stream.title || '-'}音频`
            return (
              <button
                key={`audio-${stream.index}`}
                type="button"
                onClick={() => handleSelect(stream.index)}
                className={clsx(
                  'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors',
                  isSelected ? '' : 'hover:bg-white/5'
                )}
                style={isSelected ? { background: 'rgba(99, 102, 241, 0.15)', color: 'var(--neon-blue)' } : { color: 'var(--text-primary)' }}
              >
                <span className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]"
                  style={isSelected ? { background: 'rgba(99, 102, 241, 0.25)', color: 'var(--neon-blue)' } : { background: 'var(--neon-blue-4)', color: 'var(--text-secondary)' }}
                >
                  #{stream.index}
                </span>
                <span className="flex-1 truncate font-medium">
                  {audioLabel}
                </span>
                {stream.channels && (
                  <span className="shrink-0 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {stream.channels}ch
                  </span>
                )}
                {isSelected && <Check size={14} />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}