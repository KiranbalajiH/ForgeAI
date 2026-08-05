import { ProjectContext } from "../project-context-builder.service";

export function buildRepositoryPrompt(
  context: ProjectContext
): string {
  return `
# Repository Information

Repository:
${context.repository}

Language:
${context.project.language}

Framework:
${context.project.framework}

Package Manager:
${context.project.packageManager}

Project Name:
${context.package?.name ?? "Unknown"}

Project Version:
${context.package?.version ?? "Unknown"}

Detected Package Manager:
${context.package?.packageManager ?? "Unknown"}

Entry Point:
${
  context.entryPoint.exists
    ? context.entryPoint.path
    : "Not Detected"
}
`;
}