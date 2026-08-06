import { ArchitectureAnalysis } from "./architecture-analyzer.service";
import { ApiRoute } from "./api-route-analyzer.service";
import { FileSymbols } from "./symbol-analyzer.service";

export interface KnowledgeNode {
  id: string;
  label: string;
  type:
    | "controller"
    | "service"
    | "route"
    | "symbol"
    | "database"
    | "file";
}

export interface KnowledgeEdge {
  source: string;
  target: string;
  relation:
    | "imports"
    | "defines"
    | "uses"
    | "belongs_to";
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

export class KnowledgeGraphService {
  build(
    architecture: ArchitectureAnalysis,
    apiRoutes: ApiRoute[],
    symbols: FileSymbols[]
  ): KnowledgeGraph {
    const nodes: KnowledgeNode[] = [];
    const edges: KnowledgeEdge[] = [];

    // Controllers
    for (const controller of architecture.controllers) {
      nodes.push({
        id: controller,
        label: controller.split(/[\\/]/).pop() ?? controller,
        type: "controller",
      });
    }

    // Services
    for (const service of architecture.services) {
      nodes.push({
        id: service,
        label: service.split(/[\\/]/).pop() ?? service,
        type: "service",
      });
    }

    // API Routes
    for (const route of apiRoutes) {
      nodes.push({
        id: `${route.method} ${route.path}`,
        label: `${route.method} ${route.path}`,
        type: "route",
      });
    }

    // Symbols
    for (const file of symbols) {
      for (const symbol of file.symbols) {
        nodes.push({
          id: `${file.file}:${symbol.name}`,
          label: symbol.name,
          type: "symbol",
        });

        edges.push({
          source: file.file,
          target: `${file.file}:${symbol.name}`,
          relation: "defines",
        });
      }
    }

    return {
      nodes,
      edges,
    };
  }
}