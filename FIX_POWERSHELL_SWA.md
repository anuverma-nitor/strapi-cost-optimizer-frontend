# Fix PowerShell Execution Policy for SWA CLI

## Problem
PowerShell is blocking the `swa` command because script execution is disabled.

## Solutions

### Option 1: Change Execution Policy (Recommended for Development)

Run PowerShell as Administrator and execute:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

This allows local scripts to run and only requires signing for remote scripts.

**To verify it worked:**
```powershell
Get-ExecutionPolicy -List
```

### Option 2: Bypass for Current Session Only

Run this in your current PowerShell session:

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

Then try `swa start http://localhost:3000` again.

### Option 3: Use npx Instead (No Policy Change Needed)

Instead of using the globally installed `swa`, use `npx`:

```powershell
npx @azure/static-web-apps-cli start http://localhost:3000
```

### Option 4: Use Command Prompt (CMD) Instead

Open Command Prompt (cmd.exe) instead of PowerShell:

```cmd
swa start http://localhost:3000
```

### Option 5: Run Specific Command with Bypass

Run the command with execution policy bypass:

```powershell
powershell -ExecutionPolicy Bypass -Command "swa start http://localhost:3000"
```

## Recommended Approach

For development, I recommend **Option 1** (RemoteSigned) as it's secure and allows npm scripts to work properly.

After fixing, you can test with:
```powershell
swa start http://localhost:3000
```

## Alternative: Use npm script

You can also add this to your `package.json`:

```json
{
  "scripts": {
    "swa:start": "swa start http://localhost:3000"
  }
}
```

Then run: `npm run swa:start`

