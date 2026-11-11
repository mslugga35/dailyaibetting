import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Consensus Pick Results - Graded Win-Loss Record | DailyAI Betting';
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
          backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(16, 185, 129, 0.3) 0%, transparent 50%)',
        }}
      >
        {/* Trophy Icon */}
        <div style={{ fontSize: 100, marginBottom: 20 }}>🏆</div>

        {/* Title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: '#fff',
            marginBottom: 16,
          }}
        >
          Our Graded Results
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: '#9ca3af',
            marginBottom: 40,
            textAlign: 'center',
            maxWidth: 800,
          }}
        >
          Graded win-loss results for fire pick consensus
        </div>

        {/* Stats Row */}
        <div
          style={{
            display: 'flex',
            gap: 40,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '24px 40px',
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              borderRadius: 16,
              border: '2px solid #10b981',
            }}
          >
            <span style={{ fontSize: 48, fontWeight: 800, color: '#10b981' }}>
              🔥
            </span>
            <span style={{ fontSize: 20, color: '#9ca3af', marginTop: 8 }}>
              Fire Picks
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '24px 40px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 16,
            }}
          >
            <span style={{ fontSize: 48, fontWeight: 800, color: '#fff' }}>
              3+
            </span>
            <span style={{ fontSize: 20, color: '#9ca3af', marginTop: 8 }}>
              Cappers Agree
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '24px 40px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 16,
            }}
          >
            <span style={{ fontSize: 48, fontWeight: 800, color: '#fff' }}>
              📊
            </span>
            <span style={{ fontSize: 20, color: '#9ca3af', marginTop: 8 }}>
              Graded Results
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 24,
            color: '#10b981',
          }}
        >
          dailyaibetting.com/results
        </div>
      </div>
    ),
    { ...size }
  );
}
