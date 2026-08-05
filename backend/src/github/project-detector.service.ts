import fs from "fs";
import path from "path";

export class ProjectDetectorService {
  detect(repoName: string) {
    const repoPath = path.join(process.cwd(), "temp", repoName);

    const packageJsonPath = path.join(repoPath, "package.json");

    if (!fs.existsSync(packageJsonPath)) {
      return {
        language: "Unknown",
        framework: "Unknown",
        packageManager: "Unknown",
      };
    }

    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, "utf8")
    );

    const dependencies = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
    };

    let framework = "Node.js";

    if (dependencies.next) {
      framework = "Next.js";
    } else if (dependencies.react && dependencies["react-dom"]) {
      framework = "React";
    } else if (dependencies.express) {
      framework = "Express";
    } else if (dependencies["@nestjs/core"]) {
      framework = "NestJS";
    } else if (dependencies.vue) {
      framework = "Vue";
    } else if (dependencies.nuxt) {
      framework = "Nuxt";
    } else if (dependencies["@angular/core"]) {
      framework = "Angular";
    } else if (dependencies.vite) {
      framework = "Vite";
    } else if (dependencies.fastify) {
      framework = "Fastify";
    } else if (dependencies.koa) {
      framework = "Koa";
    } else if (dependencies.hono) {
      framework = "Hono";
    } else if (dependencies.svelte) {
      framework = "Svelte";
    } else if (dependencies.electron) {
      framework = "Electron";
    } else if (dependencies["react-native"]) {
      framework = "React Native";
    }

    let language = "JavaScript";

    if (
      dependencies.typescript ||
      fs.existsSync(path.join(repoPath, "tsconfig.json"))
    ) {
      language = "TypeScript";
    }

    let packageManager = "npm";

    if (fs.existsSync(path.join(repoPath, "yarn.lock"))) {
      packageManager = "yarn";
    } else if (fs.existsSync(path.join(repoPath, "pnpm-lock.yaml"))) {
      packageManager = "pnpm";
    } else if (fs.existsSync(path.join(repoPath, "bun.lockb"))) {
      packageManager = "bun";
    }

    return {
      language,
      framework,
      packageManager,
    };
  }
}