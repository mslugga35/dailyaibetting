import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'DailyAI Betting - AI-Powered Sports Picks Consensus';
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
          backgroundImage: 'radial-gradient(circle at 25% 25%, #10b981 0%, transparent 50%), radial-gradient(circle at 75% 75%, #3b82f6 0%, transparent 50%)',
        }}
      >
        {/* Logo/Brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 40,
          }}
        >
          <span style={{ fontSize: 72, marginRight: 16 }}>🎯</span>
          <span
            style={{
              fontSize: 56,
              fontWeight: 800,
              background: 'linear-gradient(90deg, #10b981, #3b82f6)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            DailyAI Betting
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 36,
            color: '#e5e7eb',
            marginBottom: 40,
            textAlign: 'center',
            maxWidth: 800,
          }}
        >
          AI-Powered Sports Picks Consensus
        </div>

        {/* Features */}
        <div
          style={{
            display: 'flex',
            gap: 40,
            marginBottom: 40,
          }}
        >
          {[
            { emoji: '🔥', text: 'Fire Picks' },
            { emoji: '🤖', text: '10 Cappers' },
            { emoji: '📊', text: 'Consensus' },
          ].map((item) => (
            <div
              key={item.text}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px 24px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 12,
              }}
            >
              <span style={{ fontSize: 32, marginRight: 12 }}>{item.emoji}</span>
              <span style={{ fontSize: 24, color: '#fff', fontWeight: 600 }}>
                {item.text}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          style={{
            fontSize: 24,
            color: '#10b981',
            fontWeight: 600,
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
