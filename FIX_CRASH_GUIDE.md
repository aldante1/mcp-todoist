# 🔧 Fix Crash Guide - FastMCP File API Issue

## 🐛 Problem
Server crashes with error:
```
ReferenceError: File is not defined
at /app/node_modules/undici/lib/web/webidl/index.js:531
```

## ✅ Solution Applied

### 1. **Upgraded Node.js Version**
- Changed from `node:18-alpine` to `node:20-alpine`
- Updated `package.json` engines to `>=20.0.0`
- Node.js 20+ has better Web API compatibility

### 2. **Added Polyfills**
Created `src/polyfills.ts` with:
- ✅ `File` global polyfill
- ✅ `Blob` global polyfill  
- ✅ `FormData` global polyfill
- ✅ `Headers` global polyfill
- ✅ `Request` global polyfill
- ✅ `Response` global polyfill
- ✅ `fetch` fallback

### 3. **Import Strategy**
- Polyfills imported first in both servers
- Ensures globals available before FastMCP loads

## 🚀 Deployment Instructions

### Option A: Fresh Deploy
1. Push changes to GitHub
2. Railway will auto-redeploy with Node.js 20
3. All polyfills included automatically

### Option B: Manual Redeploy
```bash
# Force Railway to rebuild
railway up --force
```

### Option C: Update Existing Railway Service
1. Go to Railway dashboard
2. Settings → Variables
3. Add `NODE_OPTIONS=--enable-source-maps`
4. Redeploy service

## 🔍 Verification

After deployment, test:

```bash
# Health check
curl https://your-app.railway.app/health

# Expected response:
{
  "status": "healthy",
  "service": "todoist-mcp-server-poke",
  "version": "1.0.0",
  "transport": "httpStream",
  "endpoint": "/mcp",
  "authentication": "enabled",
  "tools": 28,
  "timestamp": "2025-10-29T...",
  "environment": {
    "todoist_api_configured": true,
    "mcp_auth_configured": true
  }
}
```

## 🛠️ Technical Details

### Root Cause
FastMCP uses `undici` which expects Web APIs like `File`, `Blob`, etc.
Node.js 18+ doesn't provide these globals by default in all contexts.

### Polyfill Implementation
```typescript
// Before FastMCP import
import "./polyfills.js";

// Ensures globals exist
if (typeof global.File === 'undefined') {
  global.File = class File { ... };
}
```

### Node.js Version Benefits
- **Node.js 20**: Better Web API support
- **V8 engine**: Improved performance
- **ESM stability**: Better module handling

## 📊 Files Modified

1. **`Dockerfile`** - Node.js 20 Alpine
2. **`package.json`** - Updated engines
3. **`src/polyfills.ts`** - New polyfills file
4. **`src/poke-server.ts`** - Polyfills import
5. **`src/poke-express-server.ts`** - Polyfills import
6. **`railway.json`** - NODE_OPTIONS config

## 🎯 Expected Results

- ✅ **No more File undefined crashes**
- ✅ **Stable FastMCP server startup**
- ✅ **All 28 tools available**
- ✅ **Health checks passing**
- ✅ **Poke integration working**

## 🔮 Future Prevention

- Always use Node.js 20+ with FastMCP
- Include polyfills for Web APIs
- Test in Railway environment before production
- Monitor logs for missing globals

---

**🎉 Your Todoist MCP Server should now run without crashes!**
