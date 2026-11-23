// DAI-18 support mailbox test. Uses a MailSlurp inbox (independent external mailbox, ETETEST key) — never Gmail as sender.
//   node qa/launch-verify/support-mail-test.mjs send          → creates a MailSlurp inbox, sends a test to support@dailyaibetting.com,
//                                                               prints the inbox id + a unique token to search for in Gmail
//   node qa/launch-verify/support-mail-test.mjs wait <inboxId> → waits up to 5 min for the reply that arrives at that inbox and
//                                                               prints its From / Reply-To (shows whether the Gmail address is exposed)
//   MAILSLURP_ENV  env file with MAILSLURP_API_KEY (default: ~/ETETEST/.env)
process.loadEnvFile(process.env.MAILSLURP_ENV || 'C:/Users/mpmmo/ETETEST/.env');
const KEY = process.env.MAILSLURP_API_KEY;
if (!KEY) throw new Error('MAILSLURP_API_KEY missing');
const api = async (method, path, body) => {
  const r = await fetch('https://api.mailslurp.com' + path, { method, headers: { 'x-api-key': KEY, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
};
const [mode, arg] = process.argv.slice(2);
if (mode === 'send') {
  const inbox = await api('POST', '/inboxes?name=dai-support-test&expiresIn=86400000');
  const token = 'DAI18-' + Math.random().toString(36).slice(2, 10).toUpperCase();
  await api('POST', `/inboxes/${inbox.id}`, {
    to: ['support@dailyaibetting.com'],
    subject: `Support test ${token}`,
    body: `Inbound test for support@dailyaibetting.com (DAI-18), token ${token}. Please reply to this message to test replies.`,
  });
  console.log(`SENT from ${inbox.emailAddress} (MailSlurp) to support@dailyaibetting.com at ${new Date().toISOString()}`);
  console.log(`TOKEN ${token}   (search Gmail: "${token}")`);
  console.log(`INBOX ${inbox.id}  (run: node qa/launch-verify/support-mail-test.mjs wait ${inbox.id})`);
} else if (mode === 'wait' && arg) {
  const e = await api('GET', `/waitForLatestEmail?inboxId=${encodeURIComponent(arg)}&timeout=300000&unreadOnly=true`);
  const h = e.headers || {};
  console.log(`REPLY received ${e.createdAt}`);
  console.log(`From: ${e.from}`);
  console.log(`Reply-To: ${e.replyTo || h['Reply-To'] || '(none)'}`);
  console.log(`Subject: ${e.subject}`);
  console.log(/@gmail\.com/i.test(`${e.from} ${e.replyTo || ''}`) ? 'EXPOSED: the reply reveals the Gmail address' : 'OK: the reply does not reveal the Gmail address');
} else {
  console.error('usage: send | wait <inboxId>'); process.exit(2);
}
