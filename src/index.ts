#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

// Resources
import {
  walletApiReference,
  tokensApiReference,
  inscriptionsApiReference,
  messageboxApiReference,
  certificationApiReference,
  didApiReference,
  credentialsApiReference,
  overlayApiReference
} from './resources/api-reference'
import { nextjsIntegrationGuide } from './resources/integration'
import { gotchasReference } from './resources/gotchas'
import { codePatterns } from './resources/patterns'

// Tools
import { scaffoldNextjsConfig } from './tools/scaffold'
import { generateWalletSetup } from './tools/wallet'
import { generatePaymentHandler } from './tools/payment'
import { generateTokenHandler } from './tools/token'
import { generateInscriptionHandler } from './tools/inscription'
import { generateMessageBoxSetup } from './tools/messagebox'
import { generateServerRoute } from './tools/server-route'
import { generateCredentialIssuer } from './tools/credential'
import { generateDIDIntegration } from './tools/did'

// Prompts
import { integratePrompt } from './prompts/integrate'
import { addFeaturePrompt } from './prompts/add-feature'
import { debugPrompt } from './prompts/debug'

// ============================================================================
// Create MCP Server
// ============================================================================

const server = new McpServer({
  name: 'simple-mcp',
  version: '1.0.0'
})

// ============================================================================
// Resources
// ============================================================================

server.resource('wallet-api', 'simple://api/wallet', async () => ({
  contents: [{ uri: 'simple://api/wallet', mimeType: 'text/markdown', text: walletApiReference }]
}))

server.resource('tokens-api', 'simple://api/tokens', async () => ({
  contents: [{ uri: 'simple://api/tokens', mimeType: 'text/markdown', text: tokensApiReference }]
}))

server.resource('inscriptions-api', 'simple://api/inscriptions', async () => ({
  contents: [{ uri: 'simple://api/inscriptions', mimeType: 'text/markdown', text: inscriptionsApiReference }]
}))

server.resource('messagebox-api', 'simple://api/messagebox', async () => ({
  contents: [{ uri: 'simple://api/messagebox', mimeType: 'text/markdown', text: messageboxApiReference }]
}))

server.resource('certification-api', 'simple://api/certification', async () => ({
  contents: [{ uri: 'simple://api/certification', mimeType: 'text/markdown', text: certificationApiReference }]
}))

server.resource('did-api', 'simple://api/did', async () => ({
  contents: [{ uri: 'simple://api/did', mimeType: 'text/markdown', text: didApiReference }]
}))

server.resource('credentials-api', 'simple://api/credentials', async () => ({
  contents: [{ uri: 'simple://api/credentials', mimeType: 'text/markdown', text: credentialsApiReference }]
}))

server.resource('overlay-api', 'simple://api/overlay', async () => ({
  contents: [{ uri: 'simple://api/overlay', mimeType: 'text/markdown', text: overlayApiReference }]
}))

server.resource('nextjs-guide', 'simple://guide/nextjs', async () => ({
  contents: [{ uri: 'simple://guide/nextjs', mimeType: 'text/markdown', text: nextjsIntegrationGuide }]
}))

server.resource('gotchas', 'simple://guide/gotchas', async () => ({
  contents: [{ uri: 'simple://guide/gotchas', mimeType: 'text/markdown', text: gotchasReference }]
}))

server.resource('patterns', 'simple://guide/patterns', async () => ({
  contents: [{ uri: 'simple://guide/patterns', mimeType: 'text/markdown', text: codePatterns }]
}))

// ============================================================================
// Tools
// ============================================================================

server.tool(
  'scaffold_nextjs_config',
  'Generate next.config.ts, package.json additions, and .gitignore for a BSV app',
  { features: z.array(z.string()).describe('Features to enable: payments, tokens, inscriptions, messagebox, certification, did, credentials, overlay, server-wallet') },
  async ({ features }) => ({
    content: [{ type: 'text', text: scaffoldNextjsConfig(features) }]
  })
)

server.tool(
  'generate_wallet_setup',
  'Generate wallet initialization code for browser or server',
  {
    target: z.enum(['browser', 'server']).describe('Target environment'),
    framework: z.enum(['nextjs', 'react', 'vanilla']).describe('Target framework')
  },
  async ({ target, framework }) => ({
    content: [{ type: 'text', text: generateWalletSetup(target, framework) }]
  })
)

server.tool(
  'generate_payment_handler',
  'Generate payment handler function',
  {
    type: z.enum(['simple', 'multi-output', 'server-funding', 'direct-payment', 'receive-payment']).describe('Payment type: simple (P2P via MessageBox), multi-output, server-funding (legacy), direct-payment (BRC-29 send), receive-payment (BRC-29 internalize)'),
    basket: z.string().optional().describe('Basket name for tracking payments')
  },
  async ({ type, basket }) => ({
    content: [{ type: 'text', text: generatePaymentHandler(type, basket) }]
  })
)

server.tool(
  'generate_token_handler',
  'Generate token handler functions',
  {
    operations: z.array(z.enum(['create', 'list', 'send', 'redeem', 'messagebox'])).describe('Token operations to generate')
  },
  async ({ operations }) => ({
    content: [{ type: 'text', text: generateTokenHandler(operations) }]
  })
)

server.tool(
  'generate_inscription_handler',
  'Generate inscription handler functions',
  {
    types: z.array(z.enum(['text', 'json', 'file-hash', 'image-hash'])).describe('Inscription types to generate')
  },
  async ({ types }) => ({
    content: [{ type: 'text', text: generateInscriptionHandler(types) }]
  })
)

server.tool(
  'generate_messagebox_setup',
  'Generate MessageBox integration code',
  {
    features: z.array(z.enum(['certify', 'send', 'receive', 'search'])).describe('MessageBox features to generate'),
    registryUrl: z.string().optional().describe('Identity registry URL (default: /api/identity-registry)')
  },
  async ({ features, registryUrl }) => ({
    content: [{ type: 'text', text: generateMessageBoxSetup(features, registryUrl) }]
  })
)

server.tool(
  'generate_server_route',
  'Generate Next.js API route using handler factories (identity-registry, did-resolver, server-wallet, credential-issuer, or all)',
  {
    routeType: z.enum(['identity-registry', 'did-resolver', 'server-wallet', 'credential-issuer', 'all']).describe('Which server route to generate')
  },
  async ({ routeType }) => ({
    content: [{ type: 'text', text: generateServerRoute(routeType) }]
  })
)

server.tool(
  'generate_credential_issuer',
  'Generate CredentialIssuer setup with schema',
  {
    schemaFields: z.array(z.object({
      key: z.string(),
      label: z.string(),
      type: z.string(),
      required: z.boolean().optional()
    })).describe('Schema field definitions'),
    revocation: z.boolean().describe('Enable revocation support')
  },
  async ({ schemaFields, revocation }) => ({
    content: [{ type: 'text', text: generateCredentialIssuer(schemaFields, revocation) }]
  })
)

server.tool(
  'generate_did_integration',
  'Generate DID integration code (V2 UTXO chain-linked or legacy)',
  {
    features: z.array(z.enum(['create', 'resolve', 'update', 'deactivate', 'list', 'get', 'register'])).describe('DID features: create (new V2 DID), resolve (cross-wallet with proxy), update, deactivate, list, get (legacy), register (legacy)')
  },
  async ({ features }) => ({
    content: [{ type: 'text', text: generateDIDIntegration(features) }]
  })
)

// ============================================================================
// Prompts
// ============================================================================

server.prompt(
  integratePrompt.name,
  integratePrompt.description,
  {
    framework: z.string().optional().describe('Target framework: nextjs, react, or vanilla'),
    features: z.string().optional().describe('Comma-separated features: payments, tokens, inscriptions, messagebox, certification, did, credentials, overlay, server-wallet')
  },
  ({ framework, features }) => ({
    messages: integratePrompt.getMessages({ framework: framework || 'nextjs', features: features || 'payments' })
  })
)

server.prompt(
  addFeaturePrompt.name,
  addFeaturePrompt.description,
  {
    feature: z.string().describe('Feature to add: payments, tokens, inscriptions, messagebox, certification, did, credentials, overlay, server-wallet'),
    framework: z.string().optional().describe('Target framework: nextjs, react, or vanilla')
  },
  ({ feature, framework }) => ({
    messages: addFeaturePrompt.getMessages({ feature, framework: framework || 'nextjs' })
  })
)

server.prompt(
  debugPrompt.name,
  debugPrompt.description,
  {
    error: z.string().describe('Error message or problem description'),
    feature: z.string().optional().describe('Feature area: wallet, payments, tokens, inscriptions, messagebox, certification, did, credentials, overlay, server-wallet')
  },
  ({ error, feature }) => ({
    messages: debugPrompt.getMessages({ error, feature: feature || 'general' })
  })
)

// ============================================================================
// Start Server
// ============================================================================

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(console.error)
