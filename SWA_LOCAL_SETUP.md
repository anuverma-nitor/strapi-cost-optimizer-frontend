# Azure Static Web Apps - Local Development Setup

## Problem
SWA CLI needs `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET` environment variables to test Easy Auth locally.

## Solution: Set Environment Variables

### Option 1: Set Environment Variables in PowerShell (Current Session)

**PowerShell:**
```powershell
$env:AZURE_CLIENT_ID="your-client-id-here"
$env:AZURE_CLIENT_SECRET="your-client-secret-here"
swa start http://localhost:3000
```

**Command Prompt (CMD):**
```cmd
set AZURE_CLIENT_ID=your-client-id-here
set AZURE_CLIENT_SECRET=your-client-secret-here
swa start http://localhost:3000
```

### Option 2: Create .env.local file (Recommended)

1. Create a `.env.local` file in the project root:
```env
AZURE_CLIENT_ID=your-client-id-here
AZURE_CLIENT_SECRET=your-client-secret-here
NEXT_PUBLIC_API_URL=http://localhost:3001
```

2. Use the npm script (see package.json):
```bash
npm run swa:start
```

### Option 3: Use SWA CLI Config File

Create `swa-cli.config.json`:
```json
{
  "appLocation": ".",
  "outputLocation": ".next",
  "appDevserverUrl": "http://localhost:3000",
  "env": {
    "AZURE_CLIENT_ID": "your-client-id-here",
    "AZURE_CLIENT_SECRET": "your-client-secret-here"
  }
}
```

Then run: `swa start`

## Where to Get Your Credentials

1. **AZURE_CLIENT_ID**: 
   - Azure Portal → Microsoft Entra ID → App registrations
   - Select your app → Overview → Application (client) ID

2. **AZURE_CLIENT_SECRET**:
   - Azure Portal → Microsoft Entra ID → App registrations
   - Select your app → Certificates & secrets
   - Create new client secret → Copy the **Value** (only shown once!)

## Quick Start

1. Get your credentials from Azure Portal
2. Set environment variables (Option 1 or 2)
3. Run: `swa start http://localhost:3000`
4. Navigate to: `http://localhost:4280/login`

## Important Notes

- **Never commit `.env.local`** to git (it should be in `.gitignore`)
- The client secret value is only shown once when created
- For production, set these in Azure Portal → Static Web App → Configuration → Application Settings

