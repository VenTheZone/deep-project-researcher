# DeepProjectResearcher

An OpenCode plugin that automatically discovers similar open-source projects, saves them as references, and helps you analyze and adapt code from those projects during development.

## Features

### 🚀 Automatic Project Analysis
- **Tech Stack Detection**: Supports Node.js/TypeScript, Python, Go, Rust, Java, and more
- **Feature Extraction**: Analyzes project structure to identify key features
- **Domain Identification**: Determines project domain (e-commerce, admin dashboard, etc.)

### 🔍 Smart Research Engine
- **Multi-Platform Search**: GitHub, GitLab, Codeberg, and any open-source repositories
- **Intelligent Queries**: Combines tech stack, features, and domain for relevant results
- **Quality Filtering**: Configurable minimum stars and activity requirements
- **Relevance Scoring**: Ranks projects by technology overlap, feature similarity, and recency

### 📚 Project-Specific Reference Storage
- **Local Storage**: Saves to `.opencode/references.json` (project-specific)
- **Rich Metadata**: Stores URLs, tech stacks, features, domains, and relevance scores
- **Duplicate Prevention**: Avoids saving duplicate references

### 🤖 Context-Aware Suggestions
- **Conversation Monitoring**: Analyzes ongoing discussions for relevant topics
- **Automatic Suggestions**: Suggests similar projects based on current context
- **Non-Intrusive**: Provides helpful references without disrupting workflow

### 🛠️ Code Analysis Tools
- **Code Fetching**: Retrieves specific files from reference projects
- **Pattern Comparison**: Compares implementations between projects
- **Adaptation Guidance**: Suggests how to adapt code for your tech stack

## Installation

1. **Install Plugin**:
```bash
bun install deep-project-researcher
```

2. **Add to OpenCode Config**:
```jsonc
{
  "plugin": [
    "deep-project-researcher",
    // ... other plugins
  ]
}
```

3. **Restart OpenCode**: Plugin will automatically initialize and be ready to use.

## Configuration

Create `.opencode/dpr.jsonc` in your project for project-specific settings:

```jsonc
{
  "enabled": true,
  "autoResearch": true,
  "researchDepth": "light", // "light", "medium", "heavy"
  "maxReferences": 10,
  "platforms": ["github", "gitlab", "codeberg", "any"],
  "minStars": 10,
  "contextAwareSuggestions": true,
  "codeAnalysis": {
    "enabled": true,
    "cacheSize": 20
  }
}
```

## Usage

### Automatic Research
When you open a project, the plugin automatically:
1. Analyzes your current project structure
2. Searches for similar open-source projects
3. Saves references to `.opencode/references.json`
4. Shows notification with results count

### Manual Tools

#### `research-projects`
Research similar projects manually:
```
research-projects with:
  techStack: ["react", "typescript"]
  features: ["authentication", "api"]
  domain: "e-commerce"
  maxResults: 15
  minStars: 50
```

#### `find-references`
Search your saved project references:
```
find-references:
  query: "authentication"
  techStack: ["react"]
  minRelevanceScore: 70
```

#### `analyze-code`
Analyze code from a reference project:
```
analyze-code:
  referenceUrl: "https://github.com/vercel/next.js"
  filePath: "pages/api/auth.js"
  analyzeWithCurrentProject: true
```

### Context-Aware Suggestions

The plugin monitors your conversations and automatically suggests relevant reference projects when you're working on related topics:

**Example:**
```
User: How do I handle routing in React?

Plugin Suggestion: [REFERENCE] Found similar projects for your "framework" work with react:
- vercel/next.js (file-based routing)
- remix-run/remix (nested routing)
Check their router/ directories for patterns
```

## Development

### Build and Test
```bash
bun run build          # Build plugin
bun run dev             # Development mode (watch)
bun run type-check      # Type checking
bun run lint           # Lint code
bun run lint:fix       # Fix linting issues
bun run test           # Run all tests
bun run test:unit     # Run unit tests
bun run test:single <file>  # Run single test
bun run check          # Run all quality checks
```

### Project Structure
```
deep-project-researcher/
├── index.ts                 # Plugin entry point
├── lib/
│   ├── types.ts           # TypeScript interfaces
│   ├── project-analyzer.ts # Project analysis logic
│   ├── research-engine.ts  # Search and relevance scoring
│   ├── reference-manager.ts # Reference storage and retrieval
│   ├── tools.ts          # Custom tool definitions
│   ├── config.ts         # Configuration management
│   └── utils.ts          # Helper functions
├── schemas/
│   └── reference-schema.json # JSON schema for validation
├── tests/
│   ├── unit/            # Unit tests
│   ├── integration/       # Integration tests
│   └── fixtures/         # Test data
├── package.json
├── tsconfig.json
├── .eslintrc.js
├── .prettierrc
└── README.md
```

## Architecture

The plugin is built with TypeScript using the `@opencode-ai/plugin` SDK and follows OpenCode best practices:

- **Event-Driven**: Hooks into `session.created` for automatic research
- **Tool-Based**: Exposes custom tools that AI can call
- **Configurable**: Project-specific settings via JSONC files
- **Type-Safe**: Full TypeScript with strict mode enabled
- **Error-Handled**: Comprehensive Result pattern for error handling
- **Self-Documenting**: Clear function and variable names, minimal comments

## License

MIT

---

**Start discovering better code patterns today!** 🚀