import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Best Parlay Picks Today - High Confidence Legs | DailyAI Betting';
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
          backgroundImage: 'linear-gradient(135deg, #2e1a2e 0%, #0a0a0a 50%, #1a2e2e 100%)',
        }}
      >
        {/* Parlay Icon */}
        <div style={{ fontSize: 100, marginBottom: 20 }}>🎯</div>

        {/* Title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: '#fff',
            marginBottom: 16,
          }}
        >
          Parlay Picks Today
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 32,
            color: '#9ca3af',
            marginBottom: 40,
          }}
        >
          High-Confidence Legs for Bigger Payouts
        </div>

        {/* Fire Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px 32px',
            backgroundColor: 'rgba(168, 85, 247, 0.2)',
            borderRadius: 16,
            border: '2px solid #a855f7',
          }}
        >
          <span style={{ fontSize: 32, marginRight: 12 }}>🔥</span>
          <span style={{ fontSize: 28, color: '#a855f7', fontWeight: 700 }}>
            Each Leg: 3+ Cappers Agree
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
