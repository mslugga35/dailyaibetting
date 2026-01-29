import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Free Sports Picks Today - Expert Consensus | DailyAI Betting';
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
          backgroundImage: 'linear-gradient(135deg, #1a1a2e 0%, #0a0a0a 50%, #1a2e1a 100%)',
        }}
      >
        {/* Sport Icons */}
        <div style={{ fontSize: 80, marginBottom: 20, display: 'flex', gap: 20 }}>
          <span>🏈</span>
          <span>🏀</span>
          <span>⚾</span>
          <span>🏒</span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: '#fff',
            marginBottom: 16,
          }}
        >
          Free Sports Picks
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 32,
            color: '#9ca3af',
            marginBottom: 40,
          }}
        >
          Expert Consensus Across All Sports
        </div>

        {/* Fire Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px 32px',
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            borderRadius: 16,
            border: '2px solid #10b981',
          }}
        >
          <span style={{ fontSize: 32, marginRight: 12 }}>🔥</span>
          <span style={{ fontSize: 28, color: '#10b981', fontWeight: 700 }}>
            Fire Picks: 3+ Cappers Agree
          </span>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 24,
            color: '#6b7280',
          }}
        >
          dailyaibetting.com
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
