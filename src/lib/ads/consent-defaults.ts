/**
 * Google consent defaults, inlined at the top of <head> so they run before gtag.js and adsbygoogle.js.
 * - Everywhere: non-personalized ads only (ad_personalization / ad_user_data denied, and AdSense's
 *   requestNonPersonalizedAds flag), so no ad targeting from browsing data.
 * - EEA, UK and Switzerland: ad and analytics storage also denied (no Google cookies without consent;
 *   the site has no consent banner, so consent is never granted there).
 */
export const CONSENT_REGIONS_STRICT = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU',
  'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH',
];

export const CONSENT_DEFAULTS_SCRIPT = [
  'window.dataLayer=window.dataLayer||[];',
  'function gtag(){dataLayer.push(arguments);}',
  `gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',region:${JSON.stringify(CONSENT_REGIONS_STRICT)}});`,
  "gtag('consent','default',{ad_user_data:'denied',ad_personalization:'denied'});",
  "gtag('set','ads_data_redaction',true);",
  '(window.adsbygoogle=window.adsbygoogle||[]).requestNonPersonalizedAds=1;',
].join('');
