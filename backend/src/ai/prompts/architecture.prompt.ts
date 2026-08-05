import { ProjectContext } from "../project-context-builder.service";

export function buildArchitecturePrompt(
  context: ProjectContext
): string {
  const architecture = context.architecture;

  return `
# Architecture

## Controllers
${
  architecture.controllers.length
    ? architecture.controllers.map(file => `- ${file}`).join("\n")
    : "None Detected"
}

## Services
${
  architecture.services.length
    ? architecture.services.map(file => `- ${file}`).join("\n")
    : "None Detected"
}

## Routes
${
  architecture.routes.length
    ? architecture.routes.map(file => `- ${file}`).join("\n")
    : "None Detected"
}

## Middleware
${
  architecture.middleware.length
    ? architecture.middleware.map(file => `- ${file}`).join("\n")
    : "None Detected"
}

## Models
${
  architecture.models.length
    ? architecture.models.map(file => `- ${file}`).join("\n")
    : "None Detected"
}

## Configuration Files
${
  architecture.configs.length
    ? architecture.configs.map(file => `- ${file}`).join("\n")
    : "None Detected"
}
`;
}