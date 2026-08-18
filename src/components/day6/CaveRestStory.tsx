import { StoryPlayer, type DialogueLine } from '../story/StoryPlayer'

const DIALOGUES: DialogueLine[] = [
  {
    speaker: '罗盘灵',
    text: '洞里的寒气还在骨头缝里打转……今晚别再折腾灵脉了，好好睡一觉。',
  },
  {
    speaker: '罗盘灵',
    text: '肉体是最诚实的容器。休整够了，明天去街心花园，把攒下的灵源换成人间烟火里的宝贝。',
  },
]

export interface CaveRestStoryProps {
  onComplete?: () => void
}

/** 肉体休整 — 剧情过渡 */
export function CaveRestStory({ onComplete }: CaveRestStoryProps) {
  return (
    <div className="w-full rounded-xl border border-mist-faint/10 bg-void-950/50 p-2">
      <p className="mb-2 text-center text-[10px] tracking-widest text-mist-muted">肉体休整</p>
      <StoryPlayer dialogues={DIALOGUES} onFinish={onComplete} />
    </div>
  )
}

export default CaveRestStory
