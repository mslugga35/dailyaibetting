import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Expert Sports Picks Today - Pro Handicapper Consensus | DailyAI Betting';
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
          backgroundImage: 'linear-gradient(135deg, #1a2e1a 0%, #0a0a0a 50%, #2e2e1a 100%)',
        }}
      >
        {/* Expert Icon */}
        <div style={{ fontSize: 100, marginBottom: 20 }}>🏆</div>

        {/* Title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: '#fff',
            marginBottom: 16,
          }}
        >
          Expert Picks Today
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 32,
            color: '#9ca3af',
            marginBottom: 40,
          }}
        >
          Professional Handicapper Consensus
        </div>

        {/* Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px 32px',
            backgroundColor: 'rgba(234, 179, 8, 0.2)',
            borderRadius: 16,
            border: '2px solid #eab308',
          }}
        >
          <span style={{ fontSize: 32, marginRight: 12 }}>⭐</span>
          <span style={{ fontSize: 28, color: '#eab308', fontWeight: 700 }}>
            Premium: 4+ Experts Agree
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
