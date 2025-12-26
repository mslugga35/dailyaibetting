import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Best Sports Betting Apps & Bonuses 2025 | DailyAI Betting';
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
          backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)',
        }}
      >
        {/* Money Icon */}
        <div style={{ fontSize: 100, marginBottom: 20 }}>💰</div>

        {/* Title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: '#fff',
            marginBottom: 16,
          }}
        >
          Best Sportsbook Bonuses
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: '#9ca3af',
            marginBottom: 40,
          }}
        >
          Up to $1,500 in Signup Bonuses - December 2025
        </div>

        {/* Sportsbook Icons */}
        <div
          style={{
            display: 'flex',
            gap: 24,
            marginBottom: 40,
          }}
        >
          {['🏈 DraftKings', '🏀 FanDuel', '🎰 BetMGM', '👑 Caesars'].map((book) => (
            <div
              key={book}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px 24px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 12,
              }}
            >
              <span style={{ fontSize: 20, color: '#fff', fontWeight: 600 }}>
                {book}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px 40px',
            backgroundColor: '#10b981',
            borderRadius: 12,
          }}
        >
          <span style={{ fontSize: 24, color: '#fff', fontWeight: 700 }}>
            Compare & Claim Bonuses
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
          dailyaibetting.com/sportsbooks
        </div>
      </div>
    ),
    { ...size }
  );
}
