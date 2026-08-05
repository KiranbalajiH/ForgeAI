import { ProjectContext } from "./project-context-builder.service";

import { buildSystemPrompt } from "./prompts/system.prompt";
import { buildRepositoryPrompt } from "./prompts/repository.prompt";
import { buildArchitecturePrompt } from "./prompts/architecture.prompt";
import { buildDependencyPrompt } from "./prompts/dependency.prompt";
import { buildFilesPrompt } from "./prompts/files.prompt";
import { buildAnalysisPrompt } from "./prompts/analysis.prompt";

export class PromptBuilderService {
  buildRepositoryAnalysisPrompt(
    context: ProjectContext
  ): string {
    return [
      buildSystemPrompt(),
      buildRepositoryPrompt(context),
      buildArchitecturePrompt(context),
      buildDependencyPrompt(context),
      buildFilesPrompt(context),
      buildAnalysisPrompt(),
    ].join("\n\n");
  }
}