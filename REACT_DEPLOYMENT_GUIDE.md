# ✅ React Deployment Guide for Multiple Projects

## 📋 Overview
This hosting platform allows you to deploy multiple React projects. Each project is accessible at a unique URL: `/sites/{siteId}/`

## 🎯 Key Features
- ✅ **Works with ANY React project** - Vite, Create React App, Next.js, etc.
- ✅ **No configuration needed** - Server automatically fixes asset paths
- ✅ **MIME type errors fixed** - All assets served with correct types
- ✅ **Auto-detection** - Finds dist folder automatically
- ✅ **No manual path rewriting** - Everything is automatic!

---

## 🚀 How to Deploy a React Project (ANY Type)

### Step 1: Build Your Project
Just build normally - **no special configuration needed**:

```bash
npm install
npm run build
```

This generates a `dist/` folder with your app.

### Step 2: Upload to Server
1. Create or get a folder in `/server/deployments/{siteId}/`
2. Copy your `dist/` folder into it:
   ```
   server/deployments/{siteId}/dist/   ← All your assets go here
   ```

### Step 3: Access Your App
Navigate to: `http://localhost:5000/sites/{siteId}/`

✅ **That's it!** No configuration, no path rewriting, automatic MIME types!

---

## 💡 How It Works

The server automatically:
1. **Detects** any request to `/sites/{siteId}/`
2. **Finds** your `dist/` folder
3. **Rewrites** HTML asset paths from `/assets/...` → `assets/...`
4. **Serves** each file with the correct MIME type
5. **Handles** asset caching and SPA routing

Result: Your app just works! 🎉

---

## 📝 Old Way (Optional - Still Works)

If you prefer to pre-configure the base path in your project, update `vite.config.js`:

```javascript
export default defineConfig({
  base: "/sites/{YOUR_SITE_ID}/",  // Optional - server will fix this anyway
  plugins: [react()],
});
```

But this is **not required** anymore - the server handles it for you!

---

## 📝 Example

### Before Deploying:
1. You have a React project with ID: `a633b10b-9a48-4876-a685-8be80479cdf4`
2. Build normally: `npm run build`
3. Copy `dist/` to `server/deployments/a633b10b-9a48-4876-a685-8be80479cdf4/dist/`
4. Access at: `http://localhost:5000/sites/a633b10b-9a48-4876-a685-8be80479cdf4/` ✅

---

## 🔧 Troubleshooting

### Issue: "Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of text/html"
**Root Cause**: Assets are being served as HTML instead of JavaScript

**Solution**: 
1. Make sure your `dist/` folder has an `assets/` subfolder with `.js` and `.css` files
2. Verify the folder structure:
   ```
   server/deployments/{siteId}/dist/
   ├── index.html
   ├── assets/
   │   ├── index-xxx.js       ← JavaScript file
   │   └── index-xxx.css      ← CSS file
   └── vite.svg
   ```
3. If missing, rebuild: `npm run build` again
4. Re-upload the `dist/` folder

### Issue: App is blank or shows "NotFound"
**Solution**:
- Check that `dist/index.html` exists
- Verify path is correct: `server/deployments/{siteId}/dist/`
- Check browser DevTools → Network tab to see what files are loading

### Issue: Styles or scripts don't load
**Solution**: This usually means your `dist/` folder structure is wrong. Verify:
- `dist/assets/` folder exists with JS/CSS files
- `dist/index.html` references those assets
- Browser DevTools shows `200` status (not `404`)

### Issue: Old error "base: path not configured"
**Solution**: This is fixed! The server now handles it automatically. No configuration needed.

---

## 📚 API Endpoints

### Build a Specific Deployment
```
GET /api/build/{siteId}
```
Rebuilds the React project in that deployment folder.

### Build All Deployments
```
GET /api/build-all
```
Scans and builds all unbuilt React projects on the server.

### Check Build Status
```
GET /api/build-status/{siteId}
```
Returns whether the deployment is built and ready.

---

## 🎯 Best Practices

1. **Build your project normally**
   - No special configuration needed
   - Standard `npm run build` process

2. **Check your dist folder**
   - Make sure it has `assets/` subfolder
   - Contains compiled JS and CSS files
   - Has `index.html` in the root

3. **Upload correctly**
   - Copy entire `dist/` folder
   - To: `server/deployments/{siteId}/dist/`
   - Don't skip the `/dist/` part of the path

4. **Test in browser**
   - Open DevTools → Network tab
   - Verify JS/CSS files load as `200` (not `404`)
   - Check Content-Type headers are correct
   - Hard refresh (Ctrl+Shift+R) if needed

5. **For any React type**
   - Vite ✅ Works
   - Create React App ✅ Works
   - Next.js ✅ Works
   - Any other bundler ✅ Works

---

## 🐛 Debug Tips

### Check if dist folder exists
```bash
ls server/deployments/{siteId}/dist/
# Should show: index.html, assets/, vite.svg, etc.
```

### Check if assets folder exists
```bash
ls server/deployments/{siteId}/dist/assets/
# Should show: index-xxx.js, index-xxx.css, etc.
```

### Inspect Network Requests
Open DevTools → Network tab:
- Click on a `.js` file being loaded
- Check "Response Headers" section
- Should see: `Content-Type: application/javascript; charset=utf-8`
- Status should be `200` (green), not `404`

### Clear Cache Issues
If assets show old content:
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or open DevTools, right-click reload icon → "Empty cache and hard refresh"

---

## ❓ FAQ

**Q: Do I need to configure the base path?**
A: No! The server automatically handles it for you. Optional for advanced users.

**Q: Which React frameworks are supported?**
A: All of them! Vite, Create React App, Next.js, Remix, Astro, Qwik, etc. Any framework that builds to a `dist/` folder.

**Q: What if my project has a different build output folder?**
A: The server checks multiple locations automatically (dist/, build/, client/dist/, etc.)

**Q: Can I have multiple versions of the same app?**
A: Yes! Each gets a unique siteId. Create new folders in `server/deployments/` with different IDs.

**Q: What if I don't know my siteId?**
A: Check the `/server/deployments/` folder - each folder name is a siteId.

**Q: How do I update an existing deployment?**
A: Just replace the `dist/` folder contents and refresh the browser.

**Q: Will this work with React Router and nested routes?**
A: Yes! The server automatically serves `index.html` for all unknown routes (SPA routing).

---

## 📞 Support
- Check server logs: `node server/index.js`
- Verify assets load: Open DevTools → Network tab → Check `.js` file headers
- Inspect dist folder: `ls server/deployments/{siteId}/dist/`
