/**
 * WebMCP integration for dailyaibetting.com
 * ---------------------------------------------------------------------------
 * Exposes the daily consensus to an AI agent running in the visitor's browser,
 * via the W3C WebMCP draft (document.modelContext).
 *
 * CONTRACT (developer.chrome.com/docs/ai/webmcp/imperative-api):
 *   document.modelContext.registerTool({ name, description, inputSchema, execute })
 *   execute(args, { signal }) MUST resolve to a STRING - not an MCP
 *   {content:[{type:'text'}]} envelope, which is the server-side MCP shape.
 *
 * DESIGN RULE - read before adding a tool:
 * /api/consensus tiers its own output on isPremium(user.id). Calling it from
 * the page with the visitor's own session means a free visitor's agent sees the
 * free slice and a subscriber's agent sees the full one - the paywall is
 * enforced server-side exactly as it is for the UI. Never reach past that
 * endpoint to a data source directly; that would turn an agent into a paywall
 * bypass. There is deliberately no tool for the internal cron path, which takes
 * Bearer CRON_SECRET and returns the full unsliced consensus.
 *
 * NOTE: /api/cappers currently 500s ("column cappers.total_picks does not
 * exist"), so no capper-leaderboard tool is registered. Add one once that
 * endpoint is fixed rather than working around it here.
 */
(function () {
  'use strict';

  // --- origin trial ----------------------------------------------------------
  // The registered token is THIRD-PARTY (isThirdParty:true). Chrome requires
  // third-party tokens to be delivered from an external JavaScript file via a
  // <script> element - "Third-party tokens don't work in a meta tag, inline
  // script or HTTP header" - so injecting it here is the only valid path.
  // https://developer.chrome.com/docs/web-platform/third-party-origin-trials
  //
  // Injected BEFORE the API is probed: the feature only appears once a valid
  // token is registered, so probing first would always miss.
  // Expires 2026-11-17 (trial runs Chrome 149-156).
  var OT_TOKEN = 'AyUolMxSeDZytHS9Je56ac/KyoVF3FbIK6G/OQAb2k7JLDU/i3006Ae3NPG3qYfeBe3jksdL2eWLXSVMgK77QAMAAAB5eyJvcmlnaW4iOiJodHRwczovL2RhaWx5YWliZXR0aW5nLmNvbTo0NDMiLCJmZWF0dXJlIjoiV2ViTUNQIiwiZXhwaXJ5IjoxNzk0ODczNjAwLCJpc1N1YmRvbWFpbiI6dHJ1ZSwiaXNUaGlyZFBhcnR5Ijp0cnVlfQ==';

  try {
    var otMeta = document.createElement('meta');
    otMeta.httpEquiv = 'origin-trial';
    otMeta.content = OT_TOKEN;
    (document.head || document.documentElement).appendChild(otMeta);
  } catch (e) {
    console.warn('[webmcp] origin-trial token injection failed:', e);
  }

  var mc = (typeof document !== 'undefined' && document.modelContext) ||
           (typeof navigator !== 'undefined' && navigator.modelContext) ||
           null;

  var hasApi = !!(mc && typeof mc.registerTool === 'function');

  var MAX_RESULTS = 15;
  var SPORTS = ['ALL', 'MLB', 'NFL', 'NBA', 'NHL', 'NCAAF', 'NCAAB', 'WNBA', 'MLS', 'TENNIS', 'UFC', 'SOCCER'];

  function clampLimit(n) {
    var v = parseInt(n, 10);
    if (isNaN(v) || v < 1) return 10;
    return Math.min(v, MAX_RESULTS);
  }

  function slim(c) {
    return {
      bet: c.bet,
      sport: c.sport,
      bet_type: c.betType,
      matchup: c.matchup,
      cappers_agreeing: c.capperCount,
      cappers: Array.isArray(c.cappers) ? c.cappers.slice(0, 8) : undefined,
      high_consensus: !!c.isFire
    };
  }

  async function getConsensus(params) {
    var qs = new URLSearchParams();
    Object.keys(params).forEach(function (k) {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') qs.set(k, params[k]);
    });
    var url = '/api/consensus' + (qs.toString() ? '?' + qs.toString() : '');
    var res = await fetch(url);
    if (!res.ok) {
      var err = null;
      try { err = (await res.json()).error; } catch (e) { /* non-JSON */ }
      throw new Error(err || ('Consensus lookup failed (HTTP ' + res.status + ')'));
    }
    return res.json();
  }

  // --- tools -----------------------------------------------------------------

  async function todaysConsensus(args) {
    args = args || {};
    var sport = args.sport ? String(args.sport).trim().toUpperCase() : '';
    if (sport && SPORTS.indexOf(sport) === -1) {
      return 'Unknown sport "' + args.sport + '". Known values: ' + SPORTS.join(', ') + '.';
    }
    var minCappers = parseInt(args.min_cappers, 10);
    if (isNaN(minCappers) || minCappers < 1) minCappers = 2;
    minCappers = Math.min(minCappers, 100);

    var limit = clampLimit(args.limit);

    var data;
    try {
      data = await getConsensus({
        sport: sport && sport !== 'ALL' ? sport : undefined,
        minCappers: minCappers,
        date: args.yesterday ? 'yesterday' : undefined
      });
    } catch (e) { return 'Consensus lookup failed: ' + e.message; }

    var rows = data.consensus || [];
    if (!rows.length) {
      return 'No consensus plays on dailyaibetting.com' + (sport && sport !== 'ALL' ? ' for ' + sport : '') +
             ' with at least ' + minCappers + ' cappers agreeing. Try a lower min_cappers or a different sport.';
    }

    return JSON.stringify({
      date: data.date,
      sport: sport || 'ALL',
      min_cappers: minCappers,
      total_cappers_tracked: data.capperCount,
      total_picks_analyzed: data.totalPicks,
      returned: Math.min(rows.length, limit),
      capped_at: MAX_RESULTS,
      note: 'Free visitors see a limited slice; the full consensus requires a ' +
            'dailyaibetting.com subscription. This is informational, not betting advice.',
      consensus: rows.slice(0, limit).map(slim)
    }, null, 2);
  }

  var PUBLIC_TOOLS = [
    {
      name: 'get_consensus_picks',
      description:
        'Get the current expert-consensus plays from dailyaibetting.com - bets where multiple ' +
        'tracked handicappers agree. Returns the bet, sport, matchup, how many cappers agree, ' +
        'and who. Informational only, not betting advice. Free visitors receive a limited slice; ' +
        'the full list requires a subscription, enforced server-side.',
      inputSchema: {
        type: 'object',
        properties: {
          sport: { type: 'string', description: 'Filter by league, e.g. "MLB" or "NFL". Use "ALL" or omit for every sport.' },
          min_cappers: { type: 'number', description: 'Minimum cappers agreeing, 1-100. Default 2.' },
          limit: { type: 'number', description: 'Max plays, 1-' + MAX_RESULTS + '. Default 10.' },
          yesterday: { type: 'boolean', description: 'Return yesterday\'s consensus with graded results instead of today\'s.' }
        }
      },
      execute: todaysConsensus
    }
  ];

  var registered = [];

  async function register(tool) {
    try {
      await mc.registerTool(tool);
      registered.push(tool.name);
    } catch (e) {
      console.warn('[webmcp] failed to register ' + tool.name + ':', e);
    }
  }

  /**
   * Always exposed so "is the trial live?" is answerable from the console.
   * call() returns exactly what execute() returns - no unwrapping, or this
   * harness would diverge from what the browser actually receives.
   */
  window.__webmcp = {
    apiAvailable: hasApi,
    apiSurface: hasApi ? (document.modelContext ? 'document.modelContext' : 'navigator.modelContext') : null,
    registered: registered,
    tools: PUBLIC_TOOLS.map(function (t) { return t.name; }),
    call: async function (name, args) {
      var tool = PUBLIC_TOOLS.filter(function (t) { return t.name === name; })[0];
      if (!tool) throw new Error('No such tool: ' + name);
      return tool.execute(args || {});
    }
  };

  (async function boot() {
    if (!hasApi) {
      console.info('[webmcp] document.modelContext unavailable - site works normally. ' +
                   'Tools still callable for tests via window.__webmcp.call().');
      return;
    }
    for (var i = 0; i < PUBLIC_TOOLS.length; i++) await register(PUBLIC_TOOLS[i]);
    console.info('[webmcp] registered ' + registered.length + ' tools: ' + registered.join(', '));
  })();
})();
