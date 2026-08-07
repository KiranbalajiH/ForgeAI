import {
  RepositoryKnowledgeService,
  RepositoryKnowledgeResult,
  KnowledgeRetrievalOptions,
  KnowledgeRetrievalStats,
} from "./repository-knowledge.service";
import { LLMService } from "./llm.service";
import { SourceReference, ContextDomain } from "./chat-context.service";
import { executeWithTelemetry } from "./ai-service.wrapper";
import { AIServiceBase } from "./ai-service.base";
import { AIConfigService } from "./ai-config.service";


export type DocumentationType =
  | "README"
  | "Architecture Overview"
  | "API Documentation"
  | "Module Summary"
  | string;

export interface DocumentationResult {
  /** Generated documentation formatted in markdown */
  documentation: string;
  /** Citable source references */
  sources: SourceReference[];
  /** Generation metadata */
  metadata: {
    repository: string;
    documentationType: string;
    intent: string;
    contextDomainsUsed: ContextDomain[];
    strategy: string;
  };
  /** Retrieval and generation statistics */
  stats: KnowledgeRetrievalStats;
}

interface DocTypeConfig {
  /** Target retrieval query used to fetch focused context via RepositoryKnowledgeService */
  retrievalQuery: string;
  /** Custom prompt template builder */
  buildPrompt: (knowledgePrompt: string, repository: string) => string;
}

/**
 * Extensible Documentation Prompt Configuration Map
 *
 * To add a new documentation type in the future:
 *  1. Add a new key (e.g., "SECURITY_AUDIT" or "DATABASE_SCHEMA")
 *  2. Specify a targeted retrieval query for RepositoryKnowledgeService
 *  3. Define a buildPrompt formatting function
 */
const DOC_PROMPT_CONFIGS: Record<string, DocTypeConfig> = {
  README: {
    retrievalQuery: "repository overview project setup features dependencies entry point readme summary",
    buildPrompt: (knowledgePrompt, repo) => `
You are an expert technical writer and open-source maintainer.
Your task is to generate a comprehensive, professional, and well-structured README.md for the "${repo}" repository.

Structure the README with the following sections:
- # Project Title & Description
- ## Tech Stack & Frameworks
- ## Architecture & Key Components
- ## API & Entry Points
- ## Getting Started & Setup
- ## Project Structure Overview

Base your documentation strictly on the repository context below. Do not make up non-existent features.

---

${knowledgePrompt}
`,
  },

  "Architecture Overview": {
    retrievalQuery: "architecture controllers services middleware models system design relationships module flow",
    buildPrompt: (knowledgePrompt, repo) => `
You are a Principal Software Architect.
Your task is to write a detailed Architecture Overview document for the "${repo}" repository.

Structure the document with the following sections:
- # System Architecture Overview
- ## Architectural Pattern & Layer Separation (Controllers, Services, Models, Middleware)
- ## Key Components & Responsibilities
- ## Data Flow & Component Interactions
- ## Technology Stack & Database Schema
- ## Architectural Tradeoffs & Design Decisions

Base your document strictly on the provided repository context.

---

${knowledgePrompt}
`,
  },

  "API Documentation": {
    retrievalQuery: "api endpoints routes HTTP methods request handlers controllers parameters database models",
    buildPrompt: (knowledgePrompt, repo) => `
You are a Lead API Engineer and Technical Writer.
Your task is to generate clean, comprehensive API Reference Documentation for the "${repo}" repository.

Structure the document with:
- # API Reference Guide
- ## Overview & Authentication
- ## Endpoints Summary Table (Method, Path, Handler)
- ## Detailed Endpoint Specifications
  - Request format, path parameters, query parameters
  - Expected response schemas & error handling
- ## Data Models & Schemas

Base your documentation strictly on the API endpoints, handlers, and models found in the context below.

---

${knowledgePrompt}
`,
  },

  "Module Summary": {
    retrievalQuery: "major modules exported symbols packages services directory structure modules relationships",
    buildPrompt: (knowledgePrompt, repo) => `
You are a Senior Software Engineer.
Your task is to write a comprehensive Module Summary document analyzing the key code modules in the "${repo}" repository.

Structure the document with:
- # Codebase Module Summary
- ## Major Modules & Subsystems
- ## Exported Symbols, Interfaces & Classes
- ## Core Utility & Helper Libraries
- ## Dependencies & Internal Import Graph

Base your summary strictly on the modules, symbols, and relationships present in the context below.

---

${knowledgePrompt}
`,
  },
};

/**
 * Normalizes input string to match canonical DocType keys.
 */
function normalizeDocType(docType: string): string {
  if (!docType) return "README";
  const norm = docType.trim().toLowerCase().replace(/[-_]/g, " ");

  if (norm.includes("readme")) return "README";
  if (norm.includes("architecture")) return "Architecture Overview";
  if (norm.includes("api")) return "API Documentation";
  if (norm.includes("module")) return "Module Summary";

  return docType.trim();
}

/**
 * DocumentationGenerationService
 *
 * Responsibility:
 *  1. Accept repository and documentationType ("README", "Architecture Overview", "API Documentation", "Module Summary").
 *  2. Map documentationType to a targeted retrieval query for RepositoryKnowledgeService.
 *  3. Build a type-specific documentation prompt.
 *  4. Invoke LLMService to generate structured markdown documentation.
 *  5. Return a complete DocumentationResult model.
 */
export class DocumentationGenerationService extends AIServiceBase {
  private knowledgeService: RepositoryKnowledgeService;
  private llmService: LLMService;

  constructor(
    knowledgeService?: RepositoryKnowledgeService,
    llmService?: LLMService,
    configService?: AIConfigService
  ) {
    super("DocumentationGenerationService", configService);
    this.knowledgeService = knowledgeService ?? new RepositoryKnowledgeService(undefined, undefined, undefined, undefined, configService);
    this.llmService = llmService ?? new LLMService(undefined, configService);
  }

  /**
   * Generates documentation for a given repository and documentation type.
   *
   * @param repository        - Repository name / slug
   * @param documentationType - Type of documentation ("README", "Architecture Overview", "API Documentation", "Module Summary")
   * @param options           - Optional retrieval tuning parameters
   */
  async generate(
    repository: string,
    documentationType: DocumentationType,
    options?: KnowledgeRetrievalOptions
  ): Promise<DocumentationResult> {
    return this.execute(repository, async (context) => {
        const canonicalType = normalizeDocType(documentationType);
    const config = DOC_PROMPT_CONFIGS[canonicalType] || {
      retrievalQuery: `${documentationType} repository documentation overview structure`,
      buildPrompt: (knowledgePrompt: string, repo: string) => `
You are an expert software documentation author.
Generate detailed technical documentation for the "${repo}" repository regarding "${documentationType}".

---

${knowledgePrompt}
`,
    };

    // 1. Retrieve targeted repository knowledge via RepositoryKnowledgeService
    const knowledgeResult: RepositoryKnowledgeResult = this.knowledgeService.retrieve(
      repository,
      config.retrievalQuery,
      options
    );

    // 2. Build documentation-specific prompt
    const docPrompt = config.buildPrompt(knowledgeResult.prompt, repository);

    // 3. Call LLMService
    const documentation = await this.trackLLM(context, docPrompt, () =>
      this.llmService.chat(docPrompt)
    );

    return {
      documentation,
      sources: knowledgeResult.sources,
      metadata: this.buildMetadata(repository, knowledgeResult, { documentationType: canonicalType }) as any,
      stats: knowledgeResult.stats,
    };
    }, {
      category: "AIResponses",
      payload: { documentationType, options },
    });
  }
}
