// Critical pitfalls and gotchas

export const gotchasReference = `# @bsv/simple — Critical Gotchas

## 1. basket insertion vs wallet payment are MUTUALLY EXCLUSIVE

In \`internalizeAction\`, each output can use EITHER \`basket insertion\` OR \`wallet payment\`, never both.

- **wallet payment** — provides derivation info for spending. Output is NOT in any app basket.
- **basket insertion** — puts output in a named basket (visible via \`listOutputs\`). Derivation info must go in \`customInstructions\`.

\`\`\`typescript
// CORRECT: basket insertion
await client.internalizeAction({
  tx: txBytes,
  outputs: [{
    outputIndex: 0,
    protocol: 'basket insertion',
    insertionRemittance: {
      basket: 'my-basket',
      customInstructions: JSON.stringify({ derivationPrefix, derivationSuffix }),
      tags: ['payment']
    }
  }]
})

// CORRECT: wallet payment
await client.internalizeAction({
  tx: txBytes,
  outputs: [{
    outputIndex: 0,
    protocol: 'wallet payment',
    paymentRemittance: {
      senderIdentityKey,
      derivationPrefix,
      derivationSuffix
    }
  }]
})

// WRONG: both on same output — will fail
\`\`\`

## 1b. acceptIncomingPayment() now uses wallet payment when no basket

When calling \`wallet.acceptIncomingPayment(payment)\` without a basket argument, the library now uses \`wallet payment\` internalization (funds go directly into wallet balance) instead of the old PeerPayClient fallback. With a basket, it still uses \`basket insertion\`.

\`\`\`typescript
// Into basket (basket insertion):
await wallet.acceptIncomingPayment(payment, 'my-basket')

// Into wallet balance (wallet payment):
await wallet.acceptIncomingPayment(payment)
\`\`\`

## 1c. createPaymentRequest() and receiveDirectPayment() are on WalletCore

Both browser and server wallets can now generate payment requests and internalize payments directly:

\`\`\`typescript
// Browser wallet can now receive direct payments:
const request = wallet.createPaymentRequest({ satoshis: 1000 })
// ... share request, get back tx data ...
await wallet.receiveDirectPayment(paymentData)
\`\`\`

## 2. PeerPayClient.acceptPayment() swallows errors

Returns the string \`'Unable to receive payment!'\` instead of throwing an error.

\`\`\`typescript
// WRONG: silently fails
await peerPay.acceptPayment(payment)

// CORRECT: always check
const result = await peerPay.acceptPayment(payment)
if (typeof result === 'string') throw new Error(result)
\`\`\`

The simple library handles this internally, but be aware when using \`@bsv/message-box-client\` directly.

## 3. result.tx from createAction may be undefined

Always check before using:
\`\`\`typescript
const result = await client.createAction({ ... })
if (!result.tx) {
  console.warn('No tx bytes available')
  return
}
// Now safe to use result.tx
\`\`\`

## 4. BRC-29 Payment Derivation Protocol ID

Always use: \`[2, '3241645161d8']\`
\`\`\`typescript
const protocolID: [SecurityLevel, string] = [2, '3241645161d8']
\`\`\`

## 5. FileRevocationStore is server-only

It uses Node.js \`fs\` module and will crash in the browser. It's isolated in \`file-revocation-store.ts\` to prevent Turbopack from bundling it.

\`\`\`typescript
// Browser: use MemoryRevocationStore
import { MemoryRevocationStore } from '@bsv/simple/browser'

// Server: use FileRevocationStore
const { FileRevocationStore } = await import('@bsv/simple/server')
\`\`\`

## 6. Overlay topics must start with tm_, services with ls_

The Overlay class enforces these prefixes and throws if violated:
\`\`\`typescript
// CORRECT
await Overlay.create({ topics: ['tm_payments'] })
await wallet.advertiseSLAP('domain.com', 'ls_payments')

// WRONG — throws Error
await Overlay.create({ topics: ['payments'] })
await wallet.advertiseSLAP('domain.com', 'payments')
\`\`\`

## 7. Token send/redeem uses two-step signing

Token transfers require: \`createAction\` → get \`signableTransaction\` → sign with PushDrop unlock → \`signAction\`. Don't try to do it in a single step.

## 8. pay() uses PeerPayClient.sendPayment()

Payments via \`wallet.pay()\` are routed through MessageBox P2P using PeerPayClient, not direct on-chain P2PKH. For direct on-chain payments, use \`wallet.send()\` with a P2PKH output:

\`\`\`typescript
// MessageBox P2P payment (via pay):
await wallet.pay({ to: recipientKey, satoshis: 1000 })

// Direct on-chain P2PKH (via send):
await wallet.send({
  outputs: [{ to: recipientKey, satoshis: 1000 }],
  description: 'Direct payment'
})
\`\`\`

## 9. Server exports not available from @bsv/simple

Server-only utilities (ServerWallet, handler factories, FileRevocationStore, generatePrivateKey) must be imported from \`@bsv/simple/server\`, not from the main \`@bsv/simple\` entry point.

\`\`\`typescript
// WRONG
import { ServerWallet } from '@bsv/simple'

// CORRECT
import { ServerWallet } from '@bsv/simple/server'
\`\`\`

## 10. Dynamic imports for server code in Next.js

Always use \`await import()\` for server-only code in API routes:
\`\`\`typescript
// WRONG: static import at top of API route
import { ServerWallet } from '@bsv/simple/server'

// CORRECT: dynamic import inside handler
const { ServerWallet } = await import('@bsv/simple/server')
\`\`\`

## 11. next.config.ts serverExternalPackages is required (updated for v2)

Without this, Turbopack bundles \`@bsv/wallet-toolbox\`, \`knex\`, and database drivers for the browser:
\`\`\`typescript
const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@bsv/wallet-toolbox", "knex", "better-sqlite3", "tedious",
    "mysql", "mysql2", "pg", "pg-query-stream", "oracledb", "dotenv"
  ]
}
\`\`\`

## 12. Server wallet initialization — use handler factories

The \`createServerWalletHandler()\` factory handles lazy-init singleton + key persistence automatically. No manual caching needed:
\`\`\`typescript
// OLD (manual caching pattern — no longer needed):
// let serverWallet: any = null
// let initPromise: Promise<any> | null = null
// async function getServerWallet() { /* ... 50 lines of boilerplate ... */ }

// NEW (3 lines):
import { createServerWalletHandler } from '@bsv/simple/server'
const handler = createServerWalletHandler()
export const GET = handler.GET, POST = handler.POST
\`\`\`

Similarly, use \`createIdentityRegistryHandler()\`, \`createDIDResolverHandler()\`, and \`createCredentialIssuerHandler()\` — all handle lazy init and file persistence internally.

## 13. No need to import @bsv/sdk

Never import \`@bsv/sdk\` in consumer code. Use \`generatePrivateKey()\` from \`@bsv/simple/server\`:
\`\`\`typescript
// WRONG
// import { PrivateKey } from '@bsv/sdk'
// const key = PrivateKey.fromRandom().toHex()

// CORRECT
import { generatePrivateKey } from '@bsv/simple/server'
const key = generatePrivateKey()
\`\`\`
`
