export function generatePaymentHandler(type: string, basket?: string): string {
  const effectiveBasket = basket || 'payments'

  if (type === 'simple') {
    return `\`\`\`typescript
async function sendPayment(
  wallet: BrowserWallet,
  recipientKey: string,
  satoshis: number
) {
  const result = await wallet.pay({
    to: recipientKey,
    satoshis
  })

  console.log('TXID:', result.txid)

  return result
}
\`\`\``
  }

  if (type === 'multi-output') {
    return `\`\`\`typescript
async function sendMultiOutput(
  wallet: BrowserWallet,
  outputs: Array<{
    to?: string
    satoshis?: number
    data?: (string | object | number[])[]
    basket?: string
  }>
) {
  const result = await wallet.send({
    outputs: outputs.map(o => ({
      to: o.to,
      satoshis: o.satoshis,
      data: o.data,
      basket: o.basket || '${effectiveBasket}'
    })),
    description: 'Multi-output transaction'
  })

  console.log('TXID:', result.txid)
  console.log('Outputs:', result.outputDetails.map(d => \`#\${d.index}: \${d.type} (\${d.satoshis} sats)\`))

  return result
}

// Usage:
// await sendMultiOutput(wallet, [
//   { to: recipientKey, satoshis: 1000 },                    // P2PKH
//   { data: ['Hello!'] },                                     // OP_RETURN
//   { to: wallet.getIdentityKey(), data: [{ v: 1 }], satoshis: 1 }  // PushDrop
// ])
\`\`\``
  }

  if (type === 'server-funding') {
    return `\`\`\`typescript
async function fundServer(wallet: BrowserWallet, serverApiUrl: string) {
  // 1. Get payment request from server
  const res = await fetch(\`\${serverApiUrl}?action=request\`)
  const { paymentRequest } = await res.json()

  // 2. Fund server wallet via BRC-29 derivation
  const result = await wallet.fundServerWallet(
    paymentRequest,
    '${effectiveBasket}'
  )

  if (!result.tx) {
    throw new Error('No transaction bytes returned')
  }

  // 3. Send tx to server for internalization
  const receiveRes = await fetch(\`\${serverApiUrl}?action=receive\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tx: Array.from(result.tx),
      senderIdentityKey: wallet.getIdentityKey(),
      derivationPrefix: paymentRequest.derivationPrefix,
      derivationSuffix: paymentRequest.derivationSuffix,
      outputIndex: 0
    })
  })

  const receiveData = await receiveRes.json()
  if (!receiveData.success) {
    throw new Error(receiveData.error || 'Server receive failed')
  }

  console.log('Server funded:', result.txid)
  return result
}
\`\`\``
  }

  if (type === 'direct-payment') {
    return `\`\`\`typescript
// Direct Payment: Send sats to any wallet using BRC-29 derivation.
// The recipient internalizes via 'wallet payment' protocol (NOT into a basket).

import type { PaymentRequest } from '@bsv/simple'

async function sendDirectPayment(
  wallet: BrowserWallet,
  request: PaymentRequest
) {
  // Create BRC-29 derived P2PKH transaction
  const result = await wallet.sendDirectPayment(request)

  console.log('TXID:', result.txid)
  console.log('Sender:', result.senderIdentityKey)
  console.log('Output index:', result.outputIndex)

  // Send remittance data to recipient (via API, MessageBox, etc.)
  // The recipient needs: tx, senderIdentityKey, derivationPrefix,
  // derivationSuffix, outputIndex to call receiveDirectPayment()
  return result
}

// Usage — fund a server wallet:
// 1. Get payment request from server
// const res = await fetch('/api/payment-request?satoshis=2000')
// const paymentRequest = await res.json()
//
// 2. Create + send payment
// const payment = await sendDirectPayment(wallet, paymentRequest)
//
// 3. Send remittance to server for internalization
// await fetch('/api/receive-payment', {
//   method: 'POST',
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify({
//     tx: Array.from(payment.tx),
//     senderIdentityKey: payment.senderIdentityKey,
//     derivationPrefix: payment.derivationPrefix,
//     derivationSuffix: payment.derivationSuffix,
//     outputIndex: payment.outputIndex
//   })
// })
\`\`\``
  }

  if (type === 'receive-payment') {
    return `\`\`\`typescript
// Receive Direct Payment: Internalize a BRC-29 payment directly into the
// wallet's spendable balance using 'wallet payment' protocol.
// This does NOT put the output into a basket — it becomes a regular UTXO.

import type { PaymentRequest, IncomingPayment } from '@bsv/simple'

// Step 1: Generate a payment request (share with the sender)
function createPaymentRequest(wallet: BrowserWallet, satoshis: number) {
  const request = wallet.createPaymentRequest({ satoshis, memo: 'Payment' })
  // Returns: { serverIdentityKey, derivationPrefix, derivationSuffix, satoshis, memo }
  return request
}

// Step 2: After sender creates the tx, internalize it
async function receiveDirectPayment(
  wallet: BrowserWallet,
  paymentData: {
    tx: number[]
    senderIdentityKey: string
    derivationPrefix: string
    derivationSuffix: string
    outputIndex: number
  }
) {
  await wallet.receiveDirectPayment({
    tx: paymentData.tx,
    senderIdentityKey: paymentData.senderIdentityKey,
    derivationPrefix: paymentData.derivationPrefix,
    derivationSuffix: paymentData.derivationSuffix,
    outputIndex: paymentData.outputIndex,
    description: 'Incoming direct payment'
  })

  console.log('Payment internalized into wallet balance')
}

// Usage — receive from a server:
// 1. Create payment request
// const request = createPaymentRequest(wallet, 100)
//
// 2. Send to server, get back the tx data
// const res = await fetch('/api/send-to-browser', {
//   method: 'POST',
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify(request)
// })
// const paymentData = await res.json()
//
// 3. Internalize into wallet
// await receiveDirectPayment(wallet, paymentData)
\`\`\``
  }

  return `Unknown payment type: ${type}. Use 'simple', 'multi-output', 'server-funding', 'direct-payment', or 'receive-payment'.`
}
