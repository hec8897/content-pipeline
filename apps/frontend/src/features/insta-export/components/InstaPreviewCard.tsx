import type { CardNewsCard } from '@/types';

// 1080×1080 캡처 전용 카드. CardNewsView 와 동일한 트리이되 root 사이즈/폰트를
// 1080 기준으로 고정. 화면엔 보이지 않고 cardsToZip 이 캡처 직전 off-screen
// 컨테이너에 마운트 후 html-to-image 로 toPng 추출.
const SIZE = 1080;

export function InstaPreviewCard({ card }: { card: CardNewsCard }) {
  const hasImage = !!card.bg_image;
  const rootStyle: React.CSSProperties = {
    width: SIZE,
    height: SIZE,
    padding: 80,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
    boxSizing: 'border-box',
    ...(hasImage
      ? {
          backgroundColor: card.bg,
          backgroundImage: `url(${card.bg_image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: 'white',
        }
      : { background: card.bg, color: card.fg }),
  };

  const centered = card.type === 'cover' || card.type === 'outro';

  return (
    <div style={rootStyle}>
      {hasImage && (
        <div
          aria-hidden
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }}
        />
      )}
      {/* meta 영역 — cover 의 tag 만 표시. body/outro 는 빈 자리(space-between 유지). */}
      {card.type === 'cover' && card.tag ? (
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            fontSize: 32,
            opacity: 0.7,
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          }}
        >
          <span>{card.tag}</span>
        </div>
      ) : (
        <div style={{ position: 'relative', zIndex: 1 }} />
      )}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          textAlign: centered ? 'center' : 'left',
        }}
      >
        <h4
          style={{
            fontSize: 88,
            fontWeight: 700,
            lineHeight: 1.2,
            whiteSpace: 'pre-line',
            margin: 0,
          }}
        >
          {card.title}
        </h4>
        {card.subtitle && (
          <p style={{ fontSize: 44, opacity: 0.8, whiteSpace: 'pre-line', margin: 0 }}>
            {card.subtitle}
          </p>
        )}
        {card.body && (
          <p
            style={{
              fontSize: 40,
              opacity: 0.78,
              whiteSpace: 'pre-line',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {card.body}
          </p>
        )}
        {card.cta && (
          <p
            style={{
              fontSize: 36,
              opacity: 0.75,
              marginTop: 12,
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              margin: 0,
            }}
          >
            {card.cta}
          </p>
        )}
      </div>
    </div>
  );
}
