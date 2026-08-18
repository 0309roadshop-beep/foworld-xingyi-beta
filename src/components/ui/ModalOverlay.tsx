import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalOverlayProps {
  open: boolean
  children: ReactNode
  className?: string
  onBackdropClick?: () => void
  /** 弹窗打开时锁定页面滚动 */
  lockScroll?: boolean
}

const BODY_LOCK_CLASS = 'modal-scroll-lock'
const SCROLL_ROOT_LOCK_CLASS = 'scroll-root-lock'
const SCROLL_ROOT_SELECTOR = '.scroll-root, [data-scroll-lock]'

/** 强制 fixed 全屏遮罩 — 内联样式兜底，避免父级 transform 或样式覆盖 */
const OVERLAY_FIXED_STYLE: CSSProperties = {
  position: 'fixed',
  inset: 0,
  width: '100vw',
  height: '100dvh',
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0, 0, 0, 0.7)',
  overflow: 'hidden',
  boxSizing: 'border-box',
  transform: 'none',
}

/**
 * 全屏居中弹窗遮罩 — Portal 到 body，fixed + 100dvh，避免父级 transform/overflow 错位
 */
export function ModalOverlay({
  open,
  children,
  className = '',
  onBackdropClick,
  lockScroll = true,
}: ModalOverlayProps) {
  useEffect(() => {
    if (!open || !lockScroll) return

    const scrollY = window.scrollY
    const scrollRoots = Array.from(
      document.querySelectorAll<HTMLElement>(SCROLL_ROOT_SELECTOR),
    )
    const savedRootScrollTops = scrollRoots.map((el) => el.scrollTop)

    document.documentElement.classList.add(BODY_LOCK_CLASS)
    document.body.classList.add(BODY_LOCK_CLASS)
    document.body.style.top = `-${scrollY}px`
    document.body.dataset.modalScrollY = String(scrollY)

    scrollRoots.forEach((el) => el.classList.add(SCROLL_ROOT_LOCK_CLASS))

    return () => {
      document.documentElement.classList.remove(BODY_LOCK_CLASS)
      document.body.classList.remove(BODY_LOCK_CLASS)
      document.body.style.top = ''
      const savedY = Number(document.body.dataset.modalScrollY ?? scrollY)
      delete document.body.dataset.modalScrollY
      scrollRoots.forEach((el, index) => {
        el.classList.remove(SCROLL_ROOT_LOCK_CLASS)
        el.scrollTop = savedRootScrollTops[index] ?? 0
      })
      window.scrollTo(0, savedY)
    }
  }, [open, lockScroll])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`modal-overlay ${className}`}
          style={OVERLAY_FIXED_STYLE}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) onBackdropClick?.()
          }}
        >
          <div className="modal-overlay__panel pointer-events-auto w-full max-w-sm px-1">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export default ModalOverlay
