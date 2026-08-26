export function LogoMark({ size = 30, color = '#2563eb' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="288 298 448 434" aria-hidden="true">
      <g fill="none" stroke={color} strokeWidth={64} strokeLinecap="round" strokeLinejoin="round">
        <path d="M320 700 V500 L512 330 L704 500 V700" />
        <path d="M420 585 L487 652 L600 530" />
      </g>
    </svg>
  )
}
