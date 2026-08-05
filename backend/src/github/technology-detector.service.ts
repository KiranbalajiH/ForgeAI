import { PackageAnalysis } from "./package-analyzer.service";

export interface TechnologyStack {
  language?: string;
  frontend?: string;
  backend?: string;
  database?: string;
  orm?: string;
  authentication?: string;
  packageManager?: string;
}

export class TechnologyDetectorService {
  detect(packageInfo: PackageAnalysis | null): TechnologyStack {
    if (!packageInfo) {
      return {};
    }

    const stack: TechnologyStack = {};

    const backendDependencies = {
      ...(packageInfo.backend?.dependencies || {}),
      ...(packageInfo.backend?.devDependencies || {}),
    };

    const frontendDependencies = {
      ...(packageInfo.frontend?.dependencies || {}),
      ...(packageInfo.frontend?.devDependencies || {}),
    };

    const dependencies = {
      ...backendDependencies,
      ...frontendDependencies,
    };

    // Language
    if (dependencies.typescript) {
      stack.language = "TypeScript";
    } else if (dependencies.python) {
      stack.language = "Python";
    }

    // Frontend Framework
    if (frontendDependencies.next) {
      stack.frontend = "Next.js";
    } else if (frontendDependencies.react) {
      stack.frontend = "React";
    } else if (frontendDependencies.vue) {
      stack.frontend = "Vue";
    } else if (frontendDependencies.svelte) {
      stack.frontend = "Svelte";
    }

    // Backend Framework
    if (backendDependencies.express) {
      stack.backend = "Express";
    } else if (backendDependencies["@nestjs/core"]) {
      stack.backend = "NestJS";
    } else if (backendDependencies.fastify) {
      stack.backend = "Fastify";
    } else if (backendDependencies.koa) {
      stack.backend = "Koa";
    }

    // ORM
    if (
      backendDependencies.prisma ||
      backendDependencies["@prisma/client"]
    ) {
      stack.orm = "Prisma";
    } else if (backendDependencies.typeorm) {
      stack.orm = "TypeORM";
    } else if (backendDependencies.sequelize) {
      stack.orm = "Sequelize";
    }

    // Database
    if (
      backendDependencies.mongodb ||
      backendDependencies.mongoose
    ) {
      stack.database = "MongoDB";
    } else if (backendDependencies.pg) {
      stack.database = "PostgreSQL";
    } else if (backendDependencies.mysql2) {
      stack.database = "MySQL";
    } else if (backendDependencies.sqlite3) {
      stack.database = "SQLite";
    }

    // Authentication
    if (
      backendDependencies.jsonwebtoken ||
      backendDependencies.passport
    ) {
      stack.authentication = "JWT";
    }

    // Package Manager
    if (packageInfo.backend) {
      stack.packageManager = "npm";
    }

    return stack;
  }
}