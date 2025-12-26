export function WebsiteJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'DailyAI Betting',
    alternateName: 'Daily AI Betting Picks',
    url: 'https://dailyaibetting.com',
    description: 'Free daily AI-powered sports betting picks with expert consensus',
    publisher: {
      '@type': 'Organization',
      name: 'DailyAI Betting',
      url: 'https://dailyaibetting.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://dailyaibetting.com/og-image.png',
      },
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://dailyaibetting.com/picks?sport={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function SportsEventJsonLd({
  sport,
  game,
  pick,
  capperCount
}: {
  sport: string;
  game: string;
  pick: string;
  capperCount: number;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: game,
    sport: sport,
    description: `${pick} - ${capperCount} expert cappers agree on this pick`,
    organizer: {
      '@type': 'Organization',
      name: 'DailyAI Betting',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function FAQJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    name: 'DailyAI Betting FAQ',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is a consensus pick?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'A consensus pick is a bet where 2 or more expert cappers agree on the same selection. The more cappers that agree, the stronger the consensus signal.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is a fire pick?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'A fire pick (marked with a flame emoji) is a consensus pick where 3 or more expert cappers agree. These are considered high-confidence plays.',
        },
      },
      {
        '@type': 'Question',
        name: 'How often are picks updated?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Picks are updated every 5 minutes from multiple expert sources including BetFirm, Dimers, Covers, and SportsLine.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are these picks free?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, all consensus picks and daily best bets are completely free. We aggregate picks from top expert cappers and display them for free.',
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
