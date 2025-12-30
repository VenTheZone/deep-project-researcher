# DeepProjectResearcher - Agent Guidelines

This file contains guidelines for agentic coding agents working on the DeepProjectResearcher OpenCode plugin.

## Project Overview

DeepProjectResearcher is an OpenCode plugin that automatically discovers similar open-source projects, saves them as references, and helps analyze/adapt code from those projects during development.

**Architecture**: TypeScript plugin using `@opencode-ai/plugin` SDK
**Storage**: Project-specific JSON files in `.opencode/` directory
**Integration**: Hooks into OpenCode lifecycle events and exposes custom tools

---

## Development Commands

### Package Management
```bash
# Install dependencies
bun install

# Add new dependency
bun add <package-name>
bun add -D <dev-package-name>

# Update dependencies
bun update
```

### Build & Development
```bash
# Build the plugin
bun run build

# Development mode (watch for changes)
bun run dev

# Type checking
bun run type-check

# Linting
bun run lint
bun run lint:fix

# Testing
bun run test              # Run all tests
bun run test:unit        # Run unit tests only
bun run test:integration # Run integration tests only
bun run test:single <test-file>  # Run single test file
bun run test:watch       # Watch mode for tests
```

### Code Quality
```bash
# Format code
bun run format

# Check formatting
bun run format:check

# Run all quality checks
bun run check
```

---

## Code Style Guidelines

### TypeScript Configuration
- Use strict TypeScript settings
- Enable `noImplicitAny`, `strictNullChecks`, `noImplicitReturns`
- Use `@ts-expect-error` for intentional type violations (never `@ts-ignore`)
- Prefer explicit return types for public functions

### Import Organization
```typescript
// 1. Node.js built-ins
import { promises as fs } from "fs";
import path from "path";

// 2. External dependencies
import { z } from "zod";
import { tool } from "@opencode-ai/plugin";

// 3. Internal modules (relative imports)
import { ProjectAnalyzer } from "./lib/project-analyzer.js";
import { type Reference } from "./lib/types.js";
```

**Rules**:
- Use `.js` extensions for internal imports (ESM compatibility)
- Group imports by category with blank lines between
- Use `import type` for type-only imports
- Avoid default exports except for main entry points

### Naming Conventions
```typescript
// Classes: PascalCase
class ProjectAnalyzer {}
class ReferenceManager {}

// Functions/Variables: camelCase
const analyzeProject = async () => {};
const currentReferences = [];

// Constants: UPPER_SNAKE_CASE
const MAX_REFERENCES = 10;
const DEFAULT_CONFIG_PATH = ".opencode/references.json";

// Interfaces/Types: PascalCase with descriptive names
interface ProjectMetadata {}
type SearchResult = {
  url: string;
  relevance: number;
};

// Files: kebab-case
// project-analyzer.ts, reference-manager.ts, types.ts
```

### Error Handling
```typescript
// Use Result pattern for operations that can fail
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Prefer specific error types
class ProjectAnalysisError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "ProjectAnalysisError";
  }
}

// Always handle async errors
const analyzeProject = async (): Promise<Result<ProjectMetadata>> => {
  try {
    const metadata = await performAnalysis();
    return { success: true, data: metadata };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};
```

### Function Design
```typescript
// Use descriptive function names
const extractTechStackFromPackageJson = (packageJson: any): string[] => {
  // Implementation
};

// Prefer pure functions when possible
const calculateRelevanceScore = (
  projectTechStack: string[],
  referenceTechStack: string[]
): number => {
  // Pure calculation, no side effects
};

// Use options pattern for complex functions
interface ResearchOptions {
  maxResults?: number;
  platforms?: string[];
  minStars?: number;
}

const researchProjects = async (
  query: string,
  options: ResearchOptions = {}
): Promise<Reference[]> => {
  // Implementation with defaults
};
```

### Plugin Architecture Patterns
```typescript
// Plugin entry point - export default
export default createDeepProjectResearcherPlugin;

// Tool definitions - use tool() helper
const researchProjectsTool = (ctx: PluginInput) => tool({
  description: "Research similar open-source projects",
  args: {
    query: tool.schema.string().describe("Search query"),
    maxResults: tool.schema.number().optional().default(10),
  },
  async execute(args, context) {
    // Implementation
  },
});

// Event handlers - filter by event type
export const DeepProjectResearcherPlugin: Plugin = async (ctx) => ({
  event: async ({ event }) => {
    if (event.type === "session.created") {
      await handleSessionCreated(ctx, event);
    }
  },
});
```

### File Structure & Organization
```
deep-project-researcher/
├── index.ts                 # Plugin entry point (default export)
├── lib/
│   ├── types.ts            # All type definitions
│   ├── project-analyzer.ts # Single responsibility per file
│   ├── research-engine.ts
│   ├── reference-manager.ts
│   ├── code-analyzer.ts
│   └── utils.ts            # Shared utilities
├── schemas/
│   └── reference-schema.json # JSON schemas for validation
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
└── README.md
```

### Testing Guidelines
```typescript
// Unit tests - focus on single function behavior
describe("ProjectAnalyzer", () => {
  it("should extract tech stack from package.json", () => {
    const packageJson = { dependencies: { react: "^18.0.0" } };
    const result = extractTechStack(packageJson);
    expect(result).toContain("react");
  });
});

// Integration tests - test component interactions
describe("Research Engine Integration", () => {
  it("should research and save references", async () => {
    const ctx = createMockPluginContext();
    await researchProjects(ctx, "react dashboard");
    
    const saved = await loadReferences(ctx.directory);
    expect(saved.references).toHaveLength(5);
  });
});

// Use test fixtures for complex data
const mockPackageJson = {
  name: "test-app",
  dependencies: { react: "^18.0.0", typescript: "^5.0.0" },
};
```

### Configuration Management
```typescript
// Use JSONC for configuration files
// .opencode/dpr.jsonc
{
  // Enable or disable the plugin
  "enabled": true,
  
  // Research settings
  "researchDepth": "light", // "light", "medium", "heavy"
  "maxReferences": 10,
  
  // Platform preferences
  "platforms": ["github", "gitlab", "codeberg"],
  "minStars": 10,
  
  // Feature flags
  "contextAwareSuggestions": true,
  "codeAnalysis": {
    "enabled": true,
    "cacheSize": 20
  }
}
```

### Performance Guidelines
- Use Bun's native `fetch` for HTTP requests
- Implement caching for expensive operations (web search, code analysis)
- Use streaming for large file operations
- Limit concurrent requests to external APIs
- Prefer async/await over Promise chains for readability

### Security Considerations
- Validate all external inputs with Zod schemas
- Sanitize file paths to prevent directory traversal
- Use HTTPS for all external requests
- Don't expose sensitive data in error messages
- Implement rate limiting for external API calls

---

## OpenCode Plugin Specifics

### Plugin Registration
- Add to `~/.config/opencode/opencode.json` plugin array
- Use semantic versioning for releases
- Test with different OpenCode versions

### Tool Exposure
- Tools automatically appear to AI when registered
- Use descriptive tool descriptions and argument docs
- Provide helpful error messages for invalid inputs

### Event Handling
- `session.created`: Best for initialization and auto-research
- `tool.execute.before`: Can intercept and modify tool calls
- Use `client.tui.showToast` for user notifications
- Use `client.session.prompt` for context suggestions

### File System Access
- Use `ctx.directory` for project root path
- Use `ctx.$` (Bun Shell) for shell operations
- Store project data in `.opencode/` subdirectory
- Handle file permissions gracefully

---

## Common Pitfalls to Avoid

1. **Don't use `@ts-ignore`** - Use `@ts-expect-error` with comments
2. **Don't swallow errors** - Always handle or re-throw with context
3. **Don't use default exports** except for main entry points
4. **Don't mix async/sync patterns** - Be consistent with async/await
5. **Don't hardcode paths** - Use `path.join()` and `ctx.directory`
6. **Don't forget error boundaries** - Wrap risky operations in try/catch
7. **Don't ignore TypeScript strict mode** - Fix all type errors
8. **Don't use `any`** - Use proper types or `unknown` with type guards

---

## Development Workflow

1. **Before coding**: Read existing code, understand patterns
2. **During coding**: Run `bun run lint:fix` frequently
3. **After changes**: Run `bun run type-check` and `bun run test`
4. **Before commit**: Run `bun run check` (all quality checks)
5. **Testing**: Write tests for new features, ensure coverage
6. **Documentation**: Update README.md and inline comments

Remember: This plugin will be used by developers to improve their workflow. Prioritize reliability, performance, and clear error messages.