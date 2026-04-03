#!/usr/bin/env node
// Creates the DailyAI Welcome Email workflow in n8n via REST API
// Usage: node create-welcome-email-workflow.mjs

const N8N_HOST = 'https://mslugga35.app.n8n.cloud';
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!N8N_API_KEY) {
  console.error('N8N_API_KEY not set');
  process.exit(1);
}

const workflow = {
  name: 'DailyAI Welcome Email',
  nodes: [
    {
      parameters: {
        httpMethod: 'POST',
        path: 'dailyai-welcome-email',
        options: {},
      },
      id: 'webhook-1',
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [250, 300],
    },
    {
      parameters: {
        sendTo: '={{ $json.body.email }}',
        subject: 'Welcome to DailyAI Betting!',
        emailType: 'html',
        message: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #0a0f0d; color: #e5e7eb;"><h1 style="color: #10b981; font-size: 24px; margin-bottom: 16px;">Welcome to DailyAI Betting</h1><p style="line-height: 1.6; margin-bottom: 16px;">You're now subscribed! We'll keep you updated with the latest picks and consensus plays.</p><p style="line-height: 1.6; margin-bottom: 24px;">Every day, we analyze picks from top expert cappers and highlight where they agree — giving you the strongest consensus plays.</p><a href="https://dailyaibetting.com/consensus" style="display: inline-block; background: #10b981; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Today's Consensus</a><p style="margin-top: 32px; font-size: 13px; color: #6b7280;">For entertainment purposes only. Please gamble responsibly.</p></div>`,
        options: {},
      },
      id: 'gmail-1',
      name: 'Send Welcome Email',
      type: 'n8n-nodes-base.gmail',
      typeVersion: 2.1,
      position: [500, 300],
      credentials: {
        gmailOAuth2: {
          id: '1',
          name: 'Gmail account',
        },
      },
    },
  ],
  connections: {
    Webhook: {
      main: [
        [
          {
            node: 'Send Welcome Email',
            type: 'main',
            index: 0,
          },
        ],
      ],
    },
  },
  settings: {
    executionOrder: 'v1',
  },
};

async function main() {
  // Create workflow
  console.log('Creating workflow...');
  const createRes = await fetch(`${N8N_HOST}/api/v1/workflows`, {
    method: 'POST',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(workflow),
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    console.error('Create failed:', createRes.status, text);
    process.exit(1);
  }

  const created = await createRes.json();
  console.log('Created workflow:', created.id, created.name);

  // Activate it
  console.log('Activating...');
  const activateRes = await fetch(`${N8N_HOST}/api/v1/workflows/${created.id}`, {
    method: 'PATCH',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ active: true }),
  });

  if (!activateRes.ok) {
    const text = await activateRes.text();
    console.error('Activate failed:', activateRes.status, text);
    process.exit(1);
  }

  const activated = await activateRes.json();
  console.log('Active:', activated.active);

  // Get webhook URL
  const webhookPath = 'dailyai-welcome-email';
  const webhookUrl = `${N8N_HOST}/webhook/${webhookPath}`;
  console.log('\nWebhook URL:', webhookUrl);
  console.log('\nAdd to .env.local:');
  console.log(`N8N_WELCOME_EMAIL_WEBHOOK=${webhookUrl}`);
}

main().catch(console.error);
