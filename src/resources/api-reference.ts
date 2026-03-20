// API Reference resources for @bsv/simple

export const walletApiReference = `# @bsv/simple — Wallet API Reference

## Initialization

### Browser
\`\`\`typescript
import { createWallet } from '@bsv/simple/browser'
const wallet = await createWallet()
// Optional defaults:
const wallet = await createWallet({ network: 'main' })
\`\`\`

### Server (Node.js)
\`\`\`typescript
const { ServerWallet } = await import('@bsv/simple/server')
const wallet = await ServerWallet.create({
  privateKey: 'hex_private_key',
  network: 'main',
  storageUrl: 'https://storage.babbage.systems'
})
\`\`\`

## WalletCore Methods (shared by Browser + Server)

### Wallet Info
- \`getIdentityKey(): string\` — Compressed public key hex (66 chars)
- \`getAddress(): string\` — P2PKH address from identity key
- \`getStatus(): WalletStatus\` — { isConnected, identityKey, network }
- \`getWalletInfo(): WalletInfo\` — { identityKey, address, network, isConnected }
- \`getClient(): WalletInterface\` — Underlying SDK wallet client

### Key Derivation
- \`derivePublicKey(protocolID: [SecurityLevel, string], keyID: string, counterparty?: string, forSelf?: boolean): Promise<string>\` — Derive public key for any protocol
- \`derivePaymentKey(counterparty: string, invoiceNumber?: string): Promise<string>\` — Derive BRC-29 payment key (protocol [2, '3241645161d8'])

### Payments
- \`pay(options: PaymentOptions): Promise<TransactionResult>\` — Payment via MessageBox P2P (PeerPayClient)
- \`send(options: SendOptions): Promise<SendResult>\` — Multi-output: combine P2PKH + OP_RETURN + PushDrop in one tx
- \`fundServerWallet(request: PaymentRequest, basket?: string): Promise<TransactionResult>\` — Fund a ServerWallet using BRC-29 derivation (legacy — prefer sendDirectPayment)

### Direct Payments (BRC-29 wallet payment internalization)
- \`createPaymentRequest(options: { satoshis: number, memo?: string }): PaymentRequest\` — Generate BRC-29 derivation data. Share with the sender so they can pay you.
- \`sendDirectPayment(request: PaymentRequest): Promise<DirectPaymentResult>\` — Create a BRC-29 derived P2PKH transaction. Returns tx + remittance data for the recipient.
- \`receiveDirectPayment(payment: IncomingPayment): Promise<void>\` — Internalize a payment directly into wallet balance using \`wallet payment\` protocol (NOT into a basket).

\`\`\`typescript
// DirectPaymentResult — returned by sendDirectPayment
interface DirectPaymentResult extends TransactionResult {
  senderIdentityKey: string
  derivationPrefix: string
  derivationSuffix: string
  outputIndex: number
}
\`\`\`

**Flow: Wallet A pays Wallet B directly**
\`\`\`typescript
// 1. Wallet B creates payment request
const request = walletB.createPaymentRequest({ satoshis: 2000 })

// 2. Wallet A creates the transaction
const payment = await walletA.sendDirectPayment(request)

// 3. Wallet B internalizes (funds go into spendable balance, not a basket)
await walletB.receiveDirectPayment({
  tx: payment.tx,
  senderIdentityKey: payment.senderIdentityKey,
  derivationPrefix: payment.derivationPrefix,
  derivationSuffix: payment.derivationSuffix,
  outputIndex: payment.outputIndex
})
\`\`\`

### PaymentOptions
\`\`\`typescript
interface PaymentOptions {
  to: string              // recipient identity key
  satoshis: number        // amount
  memo?: string           // optional memo
  description?: string    // tx description
}
\`\`\`

### SendOptions (multi-output)
\`\`\`typescript
interface SendOptions {
  outputs: SendOutputSpec[]
  description?: string
}

interface SendOutputSpec {
  to?: string                              // recipient key
  satoshis?: number                        // amount
  data?: Array<string | object | number[]> // data fields
  description?: string
  basket?: string
  protocolID?: [number, string]            // for PushDrop
  keyID?: string                           // for PushDrop
}
// Rules: to only → P2PKH | data only → OP_RETURN | to + data → PushDrop
\`\`\`

## ServerWallet-specific Methods
- \`receivePayment(payment: IncomingPayment): Promise<void>\` — **Deprecated.** Use \`receiveDirectPayment()\` instead. Kept for backward compat with \`server_funding\` label.

**Note:** \`createPaymentRequest()\` and \`receiveDirectPayment()\` are now on WalletCore (both browser + server). ServerWallet inherits them.

## Result Types
\`\`\`typescript
interface TransactionResult { txid: string; tx: any; outputs?: OutputInfo[] }
interface SendResult extends TransactionResult { outputDetails: SendOutputDetail[] }
interface SendOutputDetail { index: number; type: 'p2pkh' | 'op_return' | 'pushdrop'; satoshis: number; description: string }
\`\`\`
`

export const tokensApiReference = `# @bsv/simple — Tokens API Reference

## Methods (mixed into wallet via createTokenMethods)

### createToken(options: TokenOptions): Promise<TokenResult>
Create an encrypted PushDrop token.
\`\`\`typescript
interface TokenOptions {
  to?: string                     // recipient key (default: self)
  data: any                       // JSON-serializable data (encrypted)
  basket?: string                 // default: 'tokens'
  protocolID?: [number, string]   // default: [0, 'token']
  keyID?: string                  // default: '1'
  satoshis?: number               // default: 1
}
interface TokenResult extends TransactionResult {
  basket: string
  encrypted: boolean
}
\`\`\`
Example:
\`\`\`typescript
const result = await wallet.createToken({
  data: { type: 'loyalty', points: 100 },
  basket: 'my-tokens'
})
\`\`\`

### listTokenDetails(basket?: string): Promise<TokenDetail[]>
List and decrypt all tokens in a basket.
\`\`\`typescript
interface TokenDetail {
  outpoint: string     // txid.vout
  satoshis: number
  data: any            // decrypted payload
  protocolID: any
  keyID: string
  counterparty: string
}
\`\`\`

### sendToken(options: SendTokenOptions): Promise<TransactionResult>
Transfer a token to another key (on-chain, two-step sign flow).
\`\`\`typescript
interface SendTokenOptions { basket: string; outpoint: string; to: string }
\`\`\`

### redeemToken(options: RedeemTokenOptions): Promise<TransactionResult>
Spend/destroy a token (reclaims satoshis).
\`\`\`typescript
interface RedeemTokenOptions { basket: string; outpoint: string }
\`\`\`

### sendTokenViaMessageBox(options: SendTokenOptions): Promise<TransactionResult>
Transfer a token via MessageBox P2P messaging (off-chain delivery).

### listIncomingTokens(): Promise<any[]>
List tokens waiting in the \`simple_token_inbox\` MessageBox.

### acceptIncomingToken(token: any, basket?: string): Promise<any>
Accept incoming token into a basket via \`basket insertion\` protocol.
`

export const inscriptionsApiReference = `# @bsv/simple — Inscriptions API Reference

All inscriptions create OP_RETURN outputs (0 satoshis).

## Methods

### inscribeText(text: string, opts?): Promise<InscriptionResult>
Create an OP_RETURN text inscription.
- Default basket: \`'text'\`

### inscribeJSON(data: object, opts?): Promise<InscriptionResult>
Create an OP_RETURN JSON inscription.
- Default basket: \`'json'\`

### inscribeFileHash(hash: string, opts?): Promise<InscriptionResult>
Create an OP_RETURN SHA-256 file hash inscription.
- Default basket: \`'hash-document'\`
- Validates: must be 64-char hex string

### inscribeImageHash(hash: string, opts?): Promise<InscriptionResult>
Create an OP_RETURN SHA-256 image hash inscription.
- Default basket: \`'hash-image'\`
- Validates: must be 64-char hex string

## Shared Options
\`\`\`typescript
opts?: { basket?: string; description?: string }
\`\`\`

## Result Type
\`\`\`typescript
interface InscriptionResult extends TransactionResult {
  type: 'text' | 'json' | 'file-hash' | 'image-hash'
  dataSize: number
  basket: string
}
\`\`\`

## Example
\`\`\`typescript
const text = await wallet.inscribeText('Hello blockchain!')
const json = await wallet.inscribeJSON({ title: 'Doc', created: Date.now() })
const hash = await wallet.inscribeFileHash('a'.repeat(64))
\`\`\`
`

export const messageboxApiReference = `# @bsv/simple — MessageBox API Reference

## Identity & Certification

### certifyForMessageBox(handle: string, registryUrl?: string, host?: string): Promise<{ txid, handle }>
Register a handle on the identity registry and anoint the MessageBox host.

### getMessageBoxHandle(registryUrl?: string): Promise<string | null>
Check if wallet has a registered handle. Returns null if none found.

### revokeMessageBoxCertification(registryUrl?: string): Promise<void>
Remove all registered handles for this identity key.

## Payments

### sendMessageBoxPayment(to: string, satoshis: number): Promise<any>
Send payment via MessageBox using \`createPaymentToken()\` + \`sendMessage()\`.
Returns: \`{ txid, amount, recipient }\`

### listIncomingPayments(): Promise<any[]>
List payments in the \`payment_inbox\` MessageBox.

### acceptIncomingPayment(payment: any, basket?: string): Promise<any>
Accept a payment.
- **With basket:** Uses \`basket insertion\` protocol — output goes into named basket.
- **Without basket:** Uses \`wallet payment\` protocol — output goes directly into wallet's spendable balance (internalized like a direct payment).

## Identity Registry

### registerIdentityTag(tag: string, registryUrl?: string): Promise<{ tag }>
Register a tag in the identity registry.

### lookupIdentityByTag(query: string, registryUrl?: string): Promise<{ tag, identityKey }[]>
Search the identity registry by tag.

### listMyTags(registryUrl?: string): Promise<{ tag, createdAt }[]>
List all tags registered to this identity key.

### revokeIdentityTag(tag: string, registryUrl?: string): Promise<void>
Remove a registered tag.

## Registry API Format
The identity registry expects these API endpoints:
- \`GET ?action=lookup&query=...\` → \`{ success, results: [{ tag, identityKey }] }\`
- \`GET ?action=list&identityKey=...\` → \`{ success, tags: [{ tag, createdAt }] }\`
- \`POST ?action=register\` body: \`{ tag, identityKey }\` → \`{ success }\`
- \`POST ?action=revoke\` body: \`{ tag, identityKey }\` → \`{ success }\`

## Server-side Setup (3 lines)
\`\`\`typescript
// app/api/identity-registry/route.ts
import { createIdentityRegistryHandler } from '@bsv/simple/server'
const handler = createIdentityRegistryHandler()
export const GET = handler.GET, POST = handler.POST
\`\`\`
`

export const certificationApiReference = `# @bsv/simple — Certification API Reference

## Certifier Class (standalone)

### Certifier.create(config?): Promise<Certifier>
\`\`\`typescript
const certifier = await Certifier.create()  // random key
const certifier = await Certifier.create({
  privateKey: 'hex',
  certificateType: 'base64type',
  defaultFields: { role: 'admin' },
  includeTimestamp: true  // default: true
})
\`\`\`

### certifier.getInfo(): { publicKey, certificateType }

### certifier.certify(wallet: WalletCore, additionalFields?): Promise<CertificateData>
Issues a certificate AND acquires it into the wallet in one call.

## Wallet Methods

### acquireCertificateFrom(config): Promise<CertificateData>
\`\`\`typescript
await wallet.acquireCertificateFrom({
  serverUrl: 'https://certifier.example.com',
  replaceExisting: true  // revoke old certs first (default: true)
})
\`\`\`
Server must expose: \`GET ?action=info\` → \`{ certifierPublicKey, certificateType }\`, \`POST ?action=certify\` → CertificateData. Use \`createCredentialIssuerHandler()\` from \`@bsv/simple/server\` to set this up automatically.

### listCertificatesFrom(config): Promise<{ totalCertificates, certificates }>
\`\`\`typescript
const result = await wallet.listCertificatesFrom({
  certifiers: [certifierPubKey],
  types: [certificateType],
  limit: 100
})
\`\`\`

### relinquishCert(args): Promise<void>
\`\`\`typescript
await wallet.relinquishCert({ type, serialNumber, certifier })
\`\`\`

## CertificateData Type
\`\`\`typescript
interface CertificateData {
  type: string; serialNumber: string; subject: string; certifier: string
  revocationOutpoint: string; fields: Record<string, string>
  signature: string; keyringForSubject: Record<string, string>
}
\`\`\`
`

export const didApiReference = `# @bsv/simple — DID API Reference

## Overview

\`did:bsv:\` DIDs use UTXO chain-linking on the BSV blockchain. The DID identifier
is the txid of the issuance transaction. The chain of output-0 spends carries
the DID Document and its updates.

## DID Class (standalone, no wallet needed)

### DID.buildDocument(txid, subjectPubKeyHex, controllerDID?, services?): DIDDocumentV2
Build a W3C DID Document with JsonWebKey2020 verification method.

### DID.fromTxid(txid: string): string
Create a DID string from a transaction ID: \`did:bsv:<txid>\`

### DID.parse(didString: string): DIDParseResult
Parse \`did:bsv:<txid>\` → \`{ method: 'bsv', identifier: '<txid>' }\`
Also accepts legacy 66-char pubkey identifiers.

### DID.isValid(didString: string): boolean
Check if a DID string is valid \`did:bsv:\` format (64-char txid or 66-char pubkey).

### DID.fromIdentityKey(identityKey: string): DIDDocument
**Deprecated.** Generate a legacy DID Document from a compressed public key.

### DID.getCertificateType(): string
Returns the base64 certificate type for DID persistence.

## Wallet Methods (V2 — UTXO Chain-Linked)

### createDID(options?: DIDCreateOptions): Promise<DIDCreateResult>
Create a new on-chain DID with UTXO chain linking.
- TX0: Issuance (chain UTXO + OP_RETURN marker)
- TX1: Document (spends TX0, new chain UTXO + OP_RETURN with DID Document)
\`\`\`typescript
interface DIDCreateOptions {
  basket?: string           // default: 'did_v2'
  identityCode?: string     // auto-generated if omitted
  services?: DIDService[]   // optional services in document
}
interface DIDCreateResult {
  did: string               // 'did:bsv:<txid>'
  txid: string              // issuance txid
  identityCode: string
  document: DIDDocumentV2
}
\`\`\`

### resolveDID(didString: string): Promise<DIDResolutionResult>
Resolve any \`did:bsv:\` DID to its Document.

**Resolution order:**
1. Local basket (own DIDs — fastest)
2. Server-side proxy (\`didProxyUrl\` — handles nChain + WoC fallback)
3. Direct resolvers (server-side only — no proxy needed)

**Important:** In browsers, set \`didProxyUrl\` for cross-wallet resolution:
\`\`\`typescript
const wallet = await createWallet({ didProxyUrl: '/api/resolve-did' })
\`\`\`
\`\`\`typescript
interface DIDResolutionResult {
  didDocument: DIDDocumentV2 | null
  didDocumentMetadata: { created?: string; updated?: string; deactivated?: boolean; versionId?: string }
  didResolutionMetadata: { contentType?: string; error?: string; message?: string }
}
\`\`\`

### updateDID(options: DIDUpdateOptions): Promise<DIDCreateResult>
Update a DID document by spending the current chain UTXO.
\`\`\`typescript
interface DIDUpdateOptions {
  did: string                       // DID to update
  services?: DIDService[]           // new services
  additionalKeys?: string[]         // extra verification keys (compressed pubkey hex)
}
\`\`\`

### deactivateDID(didString: string): Promise<{ txid: string }>
Revoke a DID. Spends the chain UTXO with payload \`"3"\` (revocation marker).
Chain terminates — resolvers will return \`deactivated: true\`.

### listDIDs(): Promise<DIDChainState[]>
List all DIDs owned by this wallet.
\`\`\`typescript
interface DIDChainState {
  did: string; identityCode: string; issuanceTxid: string
  currentOutpoint: string; status: 'active' | 'deactivated'
  created: string; updated: string
}
\`\`\`

## Legacy Wallet Methods (deprecated)

### getDID(): DIDDocument
Get legacy identity-key-based DID Document (synchronous).

### registerDID(options?: { persist?: boolean }): Promise<DIDDocument>
Persist legacy DID as a BSV certificate.

## DID Document Structure (V2)
\`\`\`typescript
interface DIDDocumentV2 {
  '@context': string                    // 'https://www.w3.org/ns/did/v1'
  id: string                            // 'did:bsv:<txid>'
  controller?: string
  verificationMethod: DIDVerificationMethodV2[]
  authentication: string[]
  service?: DIDService[]
}
interface DIDVerificationMethodV2 {
  id: string                            // 'did:bsv:<txid>#subject-key'
  type: 'JsonWebKey2020'
  controller: string
  publicKeyJwk: { kty: 'EC'; crv: 'secp256k1'; x: string; y: string }
}
interface DIDService {
  id: string; type: string; serviceEndpoint: string
}
\`\`\`

## Cross-Wallet Resolution (Proxy Setup)

Browser-side resolution of other wallets' DIDs requires a server-side proxy
because:
- nChain Universal Resolver is unreliable (returns HTTP 500)
- WhatsOnChain API calls from browsers are blocked by CORS and rate-limited

The proxy (\`/api/resolve-did\`) makes all external calls server-side:
1. Try nChain resolver (10s timeout)
2. On failure → WoC chain-following: fetch TX → parse OP_RETURN → follow output 0 spend → return last document

See the DID guide (\`docs/guides/did.md\`) for the complete proxy implementation.

## Example
\`\`\`typescript
import { createWallet, DID } from '@bsv/simple/browser'

const wallet = await createWallet({ didProxyUrl: '/api/resolve-did' })

// Create
const { did, document } = await wallet.createDID()
console.log(did)  // 'did:bsv:d803b04a...'

// Resolve (cross-wallet, goes through proxy)
const result = await wallet.resolveDID('did:bsv:<other-txid>')
console.log(result.didDocument)

// Update
await wallet.updateDID({ did, services: [{ id: did + '#api', type: 'API', serviceEndpoint: 'https://...' }] })

// List
const dids = await wallet.listDIDs()

// Deactivate
await wallet.deactivateDID(did)

// Static utilities
DID.isValid('did:bsv:d803b04a...')  // true
DID.parse('did:bsv:d803b04a...')    // { method: 'bsv', identifier: 'd803b04a...' }
\`\`\`
`

export const credentialsApiReference = `# @bsv/simple — Credentials API Reference

## CredentialSchema

### Constructor
\`\`\`typescript
const schema = new CredentialSchema({
  id: 'my-schema',
  name: 'My Credential',
  description: 'Optional',
  fields: [
    { key: 'name', label: 'Full Name', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'role', label: 'Role', type: 'select', options: [{ value: 'admin', label: 'Admin' }] }
  ],
  validate: (values) => values.name.length < 2 ? 'Name too short' : null,
  computedFields: (values) => ({ verified: 'true', timestamp: Date.now().toString() })
})
\`\`\`

### Methods
- \`validate(values: Record<string, string>): string | null\`
- \`computeFields(values: Record<string, string>): Record<string, string>\`
- \`getInfo(): { id, name, description?, certificateTypeBase64, fieldCount }\`
- \`getConfig(): CredentialSchemaConfig\`

## CredentialIssuer

### CredentialIssuer.create(config): Promise<CredentialIssuer>
\`\`\`typescript
const issuer = await CredentialIssuer.create({
  privateKey: 'hex_key',
  schemas: [schemaConfig],
  revocation: {
    enabled: true,
    wallet: walletInstance,                // for creating revocation UTXOs
    store: new MemoryRevocationStore()     // or FileRevocationStore
  }
})
\`\`\`

### Methods
- \`issue(subjectIdentityKey, schemaId, fields): Promise<VerifiableCredential>\`
- \`verify(vc: VerifiableCredential): Promise<VerificationResult>\`
- \`revoke(serialNumber: string): Promise<{ txid }>\`
- \`isRevoked(serialNumber: string): Promise<boolean>\`
- \`getInfo(): { publicKey, did, schemas: [{ id, name }] }\`

## Revocation Stores

### MemoryRevocationStore (browser/tests)
\`\`\`typescript
import { MemoryRevocationStore } from '@bsv/simple/browser'
const store = new MemoryRevocationStore()
\`\`\`

### FileRevocationStore (server only)
\`\`\`typescript
import { FileRevocationStore } from '@bsv/simple/server'
const store = new FileRevocationStore()           // default: .revocation-secrets.json
const store = new FileRevocationStore('/custom/path.json')
\`\`\`

### RevocationStore Interface
\`\`\`typescript
interface RevocationStore {
  save(serialNumber: string, record: RevocationRecord): Promise<void>
  load(serialNumber: string): Promise<RevocationRecord | undefined>
  delete(serialNumber: string): Promise<void>
  has(serialNumber: string): Promise<boolean>
  findByOutpoint(outpoint: string): Promise<boolean>
}
\`\`\`

## W3C VC/VP Utilities
\`\`\`typescript
import { toVerifiableCredential, toVerifiablePresentation } from '@bsv/simple/browser'

const vc = toVerifiableCredential(certData, issuerPublicKey, { credentialType: 'MyType' })
const vp = toVerifiablePresentation([vc1, vc2], holderKey)
\`\`\`

## Wallet Methods
- \`acquireCredential(config): Promise<VerifiableCredential>\` — Acquire VC from remote issuer (uses \`?action=info\` and \`?action=certify\` query params)
- \`listCredentials(config): Promise<VerifiableCredential[]>\` — List certs as W3C VCs
- \`createPresentation(credentials): VerifiablePresentation\` — Wrap VCs into a VP

## Server-Side Handler

\`\`\`typescript
// app/api/credential-issuer/route.ts  (no [[...path]] catch-all needed!)
import { createCredentialIssuerHandler } from '@bsv/simple/server'
const handler = createCredentialIssuerHandler({
  schemas: [{ id: 'my-cred', name: 'MyCred', fields: [{ key: 'name', label: 'Name', type: 'text', required: true }] }]
})
export const GET = handler.GET, POST = handler.POST
\`\`\`
`

export const overlayApiReference = `# @bsv/simple — Overlay API Reference

## Overlay Class (standalone)

### Overlay.create(config): Promise<Overlay>
\`\`\`typescript
const overlay = await Overlay.create({
  topics: ['tm_my_topic'],              // MUST start with 'tm_'
  network: 'mainnet',                   // 'mainnet' | 'testnet' | 'local'
  slapTrackers: ['https://...'],        // optional
  hostOverrides: { tm_topic: ['url'] }, // optional
  additionalHosts: { tm_topic: ['url'] } // optional
})
\`\`\`

### Instance Methods
- \`getInfo(): OverlayInfo\` — { topics, network }
- \`addTopic(topic: string): void\` — Add topic (must start with 'tm_')
- \`removeTopic(topic: string): void\` — Remove topic
- \`broadcast(tx: Transaction, topics?: string[]): Promise<OverlayBroadcastResult>\`
- \`query(service: string, query: unknown, timeout?: number): Promise<LookupAnswer>\`
- \`lookupOutputs(service: string, query: unknown): Promise<OverlayOutput[]>\`
- \`getBroadcaster(): TopicBroadcaster\` — Raw SDK broadcaster
- \`getResolver(): LookupResolver\` — Raw SDK resolver

## Wallet Methods (overlay module)

### advertiseSHIP(domain, topic, basket?): Promise<TransactionResult>
Create a SHIP advertisement token. Topic must start with 'tm_'.

### advertiseSLAP(domain, service, basket?): Promise<TransactionResult>
Create a SLAP advertisement token. Service must start with 'ls_'.

### broadcastAction(overlay, actionOptions, topics?): Promise<{ txid, broadcast }>
Create an action and broadcast to overlay in one step.

### withRetry<T>(operation, overlay, maxRetries?): Promise<T>
Double-spend retry wrapper using \`withDoubleSpendRetry\`.

## Types
\`\`\`typescript
interface OverlayConfig {
  topics: string[]
  network?: 'mainnet' | 'testnet' | 'local'
  slapTrackers?: string[]
  hostOverrides?: Record<string, string[]>
  additionalHosts?: Record<string, string[]>
}
interface OverlayBroadcastResult { success: boolean; txid?: string; code?: string; description?: string }
interface OverlayOutput { beef: number[]; outputIndex: number; context?: number[] }
\`\`\`
`
