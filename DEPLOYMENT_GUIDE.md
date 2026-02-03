# 🚀 Deployment Guide - React Project Deployment System

## Overview
This hosting system automatically builds and serves any React project. Simply upload your project and it will be built and deployed automatically!

## How It Works

### ✅ Supported Project Types
- **Vite + React** (recommended)
- **Create React App (CRA)**
- **Next.js**
- **Any project with `package.json` and React dependencies**

### 📋 Requirements
- Project must have a valid `package.json`
- Must have `react` as a dependency
- Must have a build script (`npm run build`)
- Output must create a `dist/` folder

## Deployment Process

### Step 1: Prepare Your React Project
```bash
# Install dependencies
npm install

# Test build locally
npm run build

# Check that dist/ folder was created with assets/
ls dist/
```

### Step 2: Upload to Server

The system expects this structure:
```
deployments/[SITE_ID]/
├── package.json
├── package-lock.json
├── src/
├── public/
├── vite.config.js (or equivalent)
└── ... (other source files)
```

### Step 3: Automatic Build

When you upload a new deployment:

1. **Option A: Auto-build on server startup**
   - Upload your project
   - Restart the server with `node index.js`
   - Server automatically detects and builds all unbuilt projects

2. **Option B: Manual build via API**
   ```bash
   # Build a specific deployment
   curl -X POST http://localhost:5000/api/build/YOUR_SITE_ID
   
   # Build all unbuilt deployments
   curl -X POST http://localhost:5000/api/build-all
   ```

3. **Option C: Check build status**
   ```bash
   curl http://localhost:5000/api/build-status/YOUR_SITE_ID
   
   # Response:
   # {
   #   "siteId": "YOUR_SITE_ID",
   #   "hasPackageJson": true,
   #   "isReactProject": true,
   #   "isBuilt": true,
   #   "status": "ready"
   # }
   ```

## Accessing Your Deployment

### After successful build:

**Root deployment (latest built app):**
```
http://localhost:5000
```

**Specific deployment by ID:**
```
http://localhost:5000/sites/YOUR_SITE_ID
```

## Example: Deploy a Vite Project

```bash
# 1. Create a new Vite project
npm create vite@latest my-app -- --template react
cd my-app

# 2. Build it
npm install
npm run build

# 3. Upload the entire project folder (not just dist/)
# to: server/deployments/[new-unique-id]/

# 4. Restart server or trigger build API
curl -X POST http://localhost:5000/api/build-all

# 5. Access at:
# http://localhost:5000/sites/[new-unique-id]/
```

## Example: Deploy a Create React App (CRA) Project

```bash
# 1. Create a CRA project
npx create-react-app my-app
cd my-app

# 2. Build it
npm run build

# 3. Upload the entire project folder to:
# server/deployments/[new-unique-id]/

# 4. Trigger build (auto-build will handle it)
curl -X POST http://localhost:5000/api/build-all

# 5. Access at:
# http://localhost:5000/sites/[new-unique-id]/
```

## Troubleshooting

### ❌ "Deployment not found or not built"
**Solution:** 
- Check if `package.json` exists in the project
- Verify it's a React project (`react` in dependencies)
- Trigger manual build: `curl -X POST http://localhost:5000/api/build/YOUR_SITE_ID`
- Check server logs for build errors

### ❌ Build fails with "npm not found"
**Solution:**
- Ensure Node.js and npm are installed on the server
- Check that `node` and `npm` are in system PATH
- Check server logs for detailed error messages

### ❌ Build times out
**Solution:**
- Large projects may take longer to build
- Build timeout is set to 2 minutes
- If project has many dependencies, increase timeout in buildManager.js

### ❌ Assets not loading (404 errors)
**Solution:**
- Verify `npm run build` creates a `dist/` folder
- Check that `dist/assets/` contains built JS/CSS files
- Verify correct vite.config.js with `base: "/"`
- Clear browser cache and hard refresh (Ctrl+Shift+R)

## API Endpoints

### Build a specific deployment
```
POST /api/build/:siteId
```

### Build all unbuilt deployments
```
POST /api/build-all
```

### Check build status
```
GET /api/build-status/:siteId
```

Response:
```json
{
  "siteId": "YOUR_SITE_ID",
  "hasPackageJson": true,
  "isReactProject": true,
  "isBuilt": true,
  "status": "ready"
}
```

## Server Configuration Files

- **`utils/buildManager.js`** - Handles project detection and building
- **`server/index.js`** - Main server file with deployment routing
- **`server/deployments/`** - Directory where projects are stored

## Notes

- ✅ Projects are built on-demand (first access may be slow)
- ✅ Multiple projects can be deployed simultaneously
- ✅ Each project is isolated in its own directory
- ✅ Latest built project is served at root `/`
- ✅ Specific projects accessible at `/sites/:siteId/`

## Environment Variables

Check `.env` file for:
- `NODE_ENV` - Development/Production mode
- Other service configurations (payment, auth, etc.)

---

**Happy Deploying! 🎉**
