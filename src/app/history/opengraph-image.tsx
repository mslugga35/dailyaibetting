import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Pick History - Browse Past Consensus Results | DailyAI Betting';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.2) 0%, transparent 60%)',
        }}
      >
        <div style={{ fontSize: 100, marginBottom: 20 }}>📅</div>
        <div style={{ fontSize: 56, fontWeight: 800, color: '#fff', marginBottom: 16 }}>
          Pick History
        </div>
        <div style={{ fontSize: 28, color: '#9ca3af', marginBottom: 40 }}>
          Browse Our Complete Results Archive
        </div>
        <div
          style={{
            display: 'flex',
            gap: 24,
          }}
        >
          {['Filter by Sport', 'Filter by Date', 'Track Performance'].map((text) => (
            <div
              key={text}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 24px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 12,
              }}
            >
              <span style={{ fontSize: 18, color: '#e5e7eb' }}>{text}</span>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: 40, fontSize: 24, color: '#6b7280' }}>
          dailyaibetting.com/history
        </div>
      </div>
    ),
    { ...size }
  );
}
