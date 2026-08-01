import { ProjectContext } from "./project-context-builder.service";

export class PromptBuilderService {
  buildRepositoryAnalysisPrompt(context: ProjectContext): string {
    const fileList = context.files
      .map((file) => `- ${file.path}`)
      .join("\n");

    return `
You are an expert software architect.

Analyze the following repository.

Repository:
${context.repository}

Project Information:
${JSON.stringify(context.project, null, 2)}

Files:
${fileList}

Tasks:
1. Identify the purpose of the project.
2. Explain the architecture.
3. Identify important modules.
4. Mention possible improvements.
5. Highlight any missing best practices.

Respond using Markdown.
`;
  }
}