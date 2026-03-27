export function generateWalletSetup(target: string, framework: string): string {
  if (target === 'browser') {
    if (framework === 'nextjs') {
      return `\`\`\`typescript
'use client'
import { useState } from 'react'
import { createWallet, type BrowserWallet } from '@bsv/simple/browser'

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<BrowserWallet | null>(null)
  const [error, setError] = useState<string | null>(null)

  const connect = async () => {
    try {
      setError(null)
      const w = await createWallet()
      setWallet(w)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (!wallet) {
    return (
      <div>
        <button onClick={connect}>Connect Wallet</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    )
  }

  return (
    <div>
      <p>Connected: {wallet.getIdentityKey().substring(0, 20)}...</p>
      <p>Address: {wallet.getAddress()}</p>
      {children}
    </div>
  )
}
\`\`\``
    }

    if (framework === 'react') {
      return `\`\`\`typescript
import { useState, useEffect } from 'react'
import { createWallet, type BrowserWallet } from '@bsv/simple/browser'

export function useWallet() {
  const [wallet, setWallet] = useState<BrowserWallet | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = async () => {
    try {
      setLoading(true)
      setError(null)
      const w = await createWallet()
      setWallet(w)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return { wallet, loading, error, connect }
}
\`\`\``
    }

    return `\`\`\`typescript
import { createWallet } from '@bsv/simple/browser'

async function main() {
  const wallet = await createWallet()
  console.log('Connected:', wallet.getIdentityKey())
  console.log('Address:', wallet.getAddress())
  console.log('Status:', wallet.getStatus())

  // Check balance
  const balance = await wallet.getBalance()
  console.log('Balance:', balance.totalSatoshis, 'sats')
}

main().catch(console.error)
\`\`\``
  }

  // Server target
  if (framework === 'nextjs') {
    return `\`\`\`typescript
// app/api/server-wallet/route.ts — Simplified with handler factory
import { createServerWalletHandler } from '@bsv/simple/server'
const handler = createServerWalletHandler()
export const GET = handler.GET, POST = handler.POST
\`\`\`

Handles lazy-init singleton, key persistence, and all actions automatically.

**Key persistence order:**
1. \`process.env.SERVER_PRIVATE_KEY\` — Environment variable (production)
2. \`.server-wallet.json\` file — Persisted from previous run (development)
3. Auto-generated via \`generatePrivateKey()\` — Fresh key (first run)

**API endpoints:**
- \`GET ?action=create\` → server identity key + status
- \`GET ?action=request&satoshis=1000\` → BRC-29 payment request
- \`GET ?action=balance&basket=...\` → BalanceResult (uses \`getBalance()\` — optimized specOp when no basket)
- \`POST ?action=receive\` body: \`{ tx, senderIdentityKey, derivationPrefix, derivationSuffix, outputIndex }\`

No \`@bsv/sdk\` import needed. Add \`.server-wallet.json\` to \`.gitignore\`.`
  }

  return `\`\`\`typescript
import { ServerWallet, generatePrivateKey } from '@bsv/simple/server'

async function main() {
  const privateKey = process.env.SERVER_PRIVATE_KEY || generatePrivateKey()

  const wallet = await ServerWallet.create({
    privateKey,
    network: 'main',
    storageUrl: 'https://storage.babbage.systems'
  })

  console.log('Server wallet ready:', wallet.getIdentityKey())
  console.log('Status:', wallet.getStatus())
}

main().catch(console.error)
\`\`\``
}
