# @bsv/simple MCP Server

An MCP (Model Context Protocol) server that provides AI agents with knowledge and code generation tools for building BSV blockchain applications using `@bsv/simple`.

## Quick Start

### Claude Code (recommended)
```bash
claude mcp add simple-mcp -- npx -y @bsv/simple-mcp
```

That's it — Claude will automatically download and run the MCP server via npx.

### Docker (alternative)
```bash
docker build -t simple-mcp .
```

Add to `~/.claude/settings.json`:
```json
{
  "mcpServers": {
    "simple": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "simple-mcp"]
    }
  }
}
```

## Resources

| URI | Description |
|-----|-------------|
| `simple://api/wallet` | WalletCore + BrowserWallet + ServerWallet methods |
| `simple://api/tokens` | Token create/list/send/redeem/messagebox |
| `simple://api/inscriptions` | Text/JSON/hash inscriptions |
| `simple://api/messagebox` | Certification, payments, identity registry |
| `simple://api/certification` | Certifier, certificates, revocation |
| `simple://api/did` | DID class, wallet DID methods |
| `simple://api/credentials` | Schema, Issuer, VC/VP, revocation stores |
| `simple://api/overlay` | Overlay, SHIP/SLAP, broadcasting |
| `simple://guide/nextjs` | Complete Next.js integration guide |

## Tools

| Tool | Description |
|------|-------------|
| `scaffold_nextjs_config` | Generate next.config.ts + package.json for BSV apps |
| `generate_wallet_setup` | Wallet initialization code (browser or server) |
| `generate_payment_handler` | Payment handler functions |
| `generate_token_handler` | Token CRUD operations |
| `generate_inscription_handler` | OP_RETURN inscription handlers |
| `generate_messagebox_setup` | MessageBox P2P integration |
| `generate_server_route` | Next.js API route for server wallet |
| `generate_credential_issuer` | CredentialIssuer setup with schema |
| `generate_did_integration` | DID integration code |

## Prompts

| Prompt | Description |
|--------|-------------|
| `integrate_simple` | Full integration walkthrough |
| `add_bsv_feature` | Feature-specific code generation |
| `debug_simple` | Debugging help for common issues |
