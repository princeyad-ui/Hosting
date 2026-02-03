const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * Build Manager - Automatically builds React/Node projects
 * Detects package.json and builds projects with npm/yarn
 */

class BuildManager {
  /**
   * Find package.json in a deployment
   * Searches: root, client/, Quiz app/, etc.
   * Prioritizes actual source directories over copied dist/
   */
  static findPackageJson(deploymentPath) {
    // Priority order: actual source folders first, then generic search
    const searchPaths = [
      path.join(deploymentPath, "package.json"), // Root
      path.join(deploymentPath, "client", "package.json"), // Monorepo client
      path.join(deploymentPath, "Quiz app", "package.json"), // Named folder
      path.join(deploymentPath, "Food Website", "package.json"), // Other named folder
      path.join(deploymentPath, "amazon", "package.json"), // Other named folder
    ];

    // Also check subdirectories dynamically
    if (fs.existsSync(deploymentPath)) {
      const entries = fs.readdirSync(deploymentPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
          searchPaths.push(
            path.join(deploymentPath, entry.name, "package.json")
          );
        }
      }
    }

    for (const pkgPath of searchPaths) {
      if (fs.existsSync(pkgPath)) {
        return pkgPath;
      }
    }
    return null;
  }

  /**
   * Check if a package.json is a React project
   */
  static isReactProject(packageJsonPath) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      return (
        pkg.dependencies?.react ||
        pkg.devDependencies?.react ||
        pkg.dependencies?.["@vitejs/plugin-react"]
      );
    } catch {
      return false;
    }
  }

  /**
   * Check if a deployment has already been built
   */
  static isBuilt(deploymentPath) {
    // A project is only "built" if it has dist/assets (actual compiled files)
    const builtIndicators = [
      path.join(deploymentPath, "dist", "assets"), // Vite/CRA
      path.join(deploymentPath, "build"), // CRA alternate
    ];

    // If it has dist/ but no assets/, it's source code, not a build
    const hasDistWithSource = fs.existsSync(path.join(deploymentPath, "dist", "src"));
    if (hasDistWithSource) {
      return false; // This is source code copied to dist/, not a real build
    }

    for (const indicator of builtIndicators) {
      if (fs.existsSync(indicator)) {
        // Double-check it's not just a source folder
        const files = fs.readdirSync(indicator);
        if (files.length > 0 && !files.includes("src")) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Build a React project
   */
  static buildProject(deploymentId, deploymentPath) {
    console.log(`\n📦 Building deployment: ${deploymentId}`);

    const packageJsonPath = this.findPackageJson(deploymentPath);

    if (!packageJsonPath) {
      console.log(`❌ No package.json found in ${deploymentId}`);
      return false;
    }

    if (!this.isReactProject(packageJsonPath)) {
      console.log(`❌ Not a React project: ${deploymentId}`);
      return false;
    }

    const projectDir = path.dirname(packageJsonPath);
    console.log(`📂 Project directory: ${projectDir}`);

    try {
      // Check if node_modules exists
      if (!fs.existsSync(path.join(projectDir, "node_modules"))) {
        console.log(`📥 Installing dependencies...`);
        execSync("npm install --legacy-peer-deps", {
          cwd: projectDir,
          stdio: "inherit",
          timeout: 120000, // 2 minutes timeout
        });
      }

      // Run build
      console.log(`🔨 Running build...`);
      execSync("npm run build", {
        cwd: projectDir,
        stdio: "inherit",
        timeout: 120000, // 2 minutes timeout
      });

      console.log(`✅ Build successful for ${deploymentId}`);
      return true;
    } catch (error) {
      console.error(`❌ Build failed for ${deploymentId}:`, error.message);
      return false;
    }
  }

  /**
   * Find all unbuilt deployments and build them
   */
  static buildAllUnbuilt(deploymentsDir) {
    console.log(`\n🔍 Scanning for unbuilt deployments...`);

    try {
      const dirs = fs.readdirSync(deploymentsDir, { withFileTypes: true });
      let builtCount = 0;

      for (const entry of dirs) {
        if (!entry.isDirectory()) continue;

        const deploymentPath = path.join(deploymentsDir, entry.name);

        // Skip if already built
        if (this.isBuilt(deploymentPath)) {
          console.log(`✅ Already built: ${entry.name}`);
          continue;
        }

        // Build if it's a React project
        if (this.findPackageJson(deploymentPath)) {
          const success = this.buildProject(entry.name, deploymentPath);
          if (success) builtCount++;
        }
      }

      console.log(`\n📊 Build summary: ${builtCount} project(s) built`);
      return builtCount;
    } catch (error) {
      console.error("Error scanning deployments:", error);
      return 0;
    }
  }
}

module.exports = BuildManager;
