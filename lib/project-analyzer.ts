import { promises as fs } from "fs";
import path from "path";
import { type TechStackAnalysis, type ProjectMetadata, type Result } from "./types.js";

export class ProjectAnalysisError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "ProjectAnalysisError";
  }
}

/**
 * Detect programming language from project files
 */
export const detectLanguage = async (projectPath: string): Promise<string> => {
  const commonFiles = [
    { file: "package.json", language: "JavaScript/TypeScript" },
    { file: "requirements.txt", language: "Python" },
    { file: "pyproject.toml", language: "Python" },
    { file: "go.mod", language: "Go" },
    { file: "Cargo.toml", language: "Rust" },
    { file: "pom.xml", language: "Java" },
    { file: "build.gradle", language: "Java" },
    { file: "Gemfile", language: "Ruby" },
    { file: "composer.json", language: "PHP" },
    { file: "Cargo.lock", language: "Rust" },
    { file: "go.sum", language: "Go" },
  ];

  for (const { file, language } of commonFiles) {
    try {
      await fs.access(path.join(projectPath, file));
      return language;
    } catch {
      // File doesn't exist, continue checking
    }
  }

  return "Unknown";
};

/**
 * Parse package.json for Node.js/TypeScript dependencies
 */
export const parsePackageJson = async (projectPath: string): Promise<TechStackAnalysis> => {
  try {
    const packageJsonPath = path.join(projectPath, "package.json");
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));

    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies,
    };

    const deps = Object.keys(dependencies ?? {});

    const frameworks = deps.filter(dep => 
      ["react", "vue", "angular", "svelte", "next", "express", "koa", "hapi"].some(fw => dep.includes(fw))
    );

    const libraries = deps.filter(dep => 
      !frameworks.includes(dep) && 
      !dep.startsWith("@types/")
    );

    return {
      language: "JavaScript/TypeScript",
      dependencies: deps,
      frameworks,
      libraries,
    };
  } catch (error) {
    throw new ProjectAnalysisError(`Failed to parse package.json: ${error}`);
  }
};

/**
 * Parse requirements.txt for Python dependencies
 */
export const parseRequirementsTxt = async (projectPath: string): Promise<TechStackAnalysis> => {
  try {
    const requirementsPath = path.join(projectPath, "requirements.txt");
    const requirements = await fs.readFile(requirementsPath, "utf-8");
    
    const dependencies = requirements
      .split("\n")
      .map(line => line.trim())
      .filter(line => line && !line.startsWith("#"))
      .map(line => line.split(/[=<>]/)[0]?.trim() ?? line.trim());

    const frameworks = dependencies.filter(dep =>
      ["django", "flask", "fastapi", "pytest"].some(fw => dep.includes(fw))
    );

    const libraries = dependencies.filter(dep => !frameworks.includes(dep));

    return {
      language: "Python",
      dependencies,
      frameworks,
      libraries,
    };
  } catch (error) {
    throw new ProjectAnalysisError(`Failed to parse requirements.txt: ${error}`);
  }
};

/**
 * Parse go.mod for Go dependencies
 */
export const parseGoMod = async (projectPath: string): Promise<TechStackAnalysis> => {
  try {
    const goModPath = path.join(projectPath, "go.mod");
    const goMod = await fs.readFile(goModPath, "utf-8");
    
    const dependencies: string[] = [];
    const lines = goMod.split("\n");
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("require ") && !trimmed.startsWith("require (")) {
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2 && parts[1]) {
          dependencies.push(parts[1]);
        }
      }
    }

    return {
      language: "Go",
      dependencies,
      frameworks: [], // Go doesn't have traditional frameworks
      libraries: dependencies,
    };
  } catch (error) {
    throw new ProjectAnalysisError(`Failed to parse go.mod: ${error}`);
  }
};

/**
 * Parse Cargo.toml for Rust dependencies
 */
export const parseCargoToml = async (projectPath: string): Promise<TechStackAnalysis> => {
  try {
    // Simple TOML parsing (basic approach)
    const cargoPath = path.join(projectPath, "Cargo.toml");
    const cargo = await fs.readFile(cargoPath, "utf-8");
    
    const dependencies: string[] = [];
    const lines = cargo.split("\n");
    let inDeps = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("[dependencies]")) {
        inDeps = true;
        continue;
      }
      if (trimmed.startsWith("[") && !trimmed.startsWith("[dependencies]")) {
        inDeps = false;
        continue;
      }
      if (inDeps && trimmed && !trimmed.startsWith("#")) {
        const depMatch = trimmed.match(/^(\w+)\s*=/);
        if (depMatch && depMatch[1]) {
          dependencies.push(depMatch[1]);
        }
      }
    }

    return {
      language: "Rust",
      dependencies,
      frameworks: [],
      libraries: dependencies,
    };
  } catch (error) {
    throw new ProjectAnalysisError(`Failed to parse Cargo.toml: ${error}`);
  }
};

/**
 * Get tech stack analysis based on detected language
 */
export const getTechStackAnalysis = async (projectPath: string): Promise<TechStackAnalysis> => {
  const language = await detectLanguage(projectPath);

  switch (language) {
    case "JavaScript/TypeScript":
      return await parsePackageJson(projectPath);
    case "Python":
      return await parseRequirementsTxt(projectPath);
    case "Go":
      return await parseGoMod(projectPath);
    case "Rust":
      return await parseCargoToml(projectPath);
    default:
      return {
        language,
        dependencies: [],
        frameworks: [],
        libraries: [],
      };
  }
};

/**
 * Analyze project structure to detect features
 */
export const analyzeFeatures = async (projectPath: string): Promise<string[]> => {
  try {
    const features: string[] = [];
    const structure = await fs.readdir(projectPath, { withFileTypes: true });

    // Check for common feature directories
    const featureMap = {
      "auth": "authentication",
      "src/auth": "authentication", 
      "api": "api",
      "src/api": "api",
      "routes": "routing",
      "src/routes": "routing",
      "components": "component-based",
      "src/components": "component-based",
      "pages": "pages/routing",
      "src/pages": "pages/routing",
      "tests": "testing",
      "test": "testing",
      "src/test": "testing",
      "__tests__": "testing",
      "public": "static-assets",
      "assets": "static-assets",
      "src/assets": "static-assets",
      "docs": "documentation",
      "README.md": "documentation",
      "Dockerfile": "dockerization",
      "docker-compose.yml": "dockerization",
      "docker-compose.yaml": "dockerization",
      ".github/workflows": "ci-cd",
      "scripts": "build-tools",
      "config": "configuration",
      "src/config": "configuration",
    };

    for (const [featurePath, feature] of Object.entries(featureMap)) {
      try {
        await fs.access(path.join(projectPath, featurePath));
        if (!features.includes(feature)) {
          features.push(feature);
        }
      } catch {
        // Path doesn't exist
      }
    }

    return features;
  } catch (error) {
    throw new ProjectAnalysisError(`Failed to analyze features: ${error}`);
  }
};

/**
 * Extract domain from project metadata
 */
export const extractDomain = async (projectPath: string, features: string[]): Promise<string> => {
  try {
    // Try to extract from project name
    const projectName = path.basename(projectPath).toLowerCase();
    
    const domainMap = {
      "shop": "e-commerce",
      "store": "e-commerce", 
      "cart": "e-commerce",
      "payment": "fintech",
      "bank": "fintech",
      "wallet": "fintech",
      "blog": "content-management",
      "cms": "content-management",
      "admin": "admin-dashboard",
      "dashboard": "admin-dashboard",
      "social": "social-media",
      "chat": "messaging",
      "video": "media",
      "music": "media",
      "game": "gaming",
      "api": "backend-api",
      "micro": "microservices",
      "server": "backend-api",
      "cli": "command-line",
      "tool": "command-line",
      "library": "package-library",
    };

    for (const [keyword, domain] of Object.entries(domainMap)) {
      if (projectName.includes(keyword)) {
        return domain;
      }
    }

    // Check features for domain clues
    const featureDomainMap = {
      "e-commerce": ["cart", "checkout", "payment"],
      "admin-dashboard": ["admin", "dashboard"],
      "social-media": ["social", "profile", "feed"],
      "messaging": ["chat", "message"],
      "content-management": ["blog", "cms", "content"],
      "backend-api": ["api", "server"],
    };

    for (const [domain, keywords] of Object.entries(featureDomainMap)) {
      if (keywords.some(keyword => features.includes(keyword))) {
        return domain;
      }
    }

    // Try to read README for domain clues
    try {
      const readmePath = path.join(projectPath, "README.md");
      const readme = await fs.readFile(readmePath, "utf-8");
      const readmeLower = readme.toLowerCase();
      
      for (const [keyword, domain] of Object.entries(domainMap)) {
        if (readmeLower.includes(keyword)) {
          return domain;
        }
      }
    } catch {
      // README doesn't exist
    }

    return "general";
  } catch (error) {
    throw new ProjectAnalysisError(`Failed to extract domain: ${error}`);
  }
};

/**
 * Complete project analysis
 */
export const analyzeProject = async (projectPath: string): Promise<Result<ProjectMetadata>> => {
  try {
    const projectName = path.basename(projectPath);
    const techStackAnalysis = await getTechStackAnalysis(projectPath);
    const features = await analyzeFeatures(projectPath);
    const domain = await extractDomain(projectPath, features);

    const metadata: ProjectMetadata = {
      name: projectName,
      techStack: [...techStackAnalysis.dependencies, ...techStackAnalysis.frameworks],
      features,
      domain,
      language: techStackAnalysis.language,
    };

    return { success: true, data: metadata };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new ProjectAnalysisError(String(error)),
    };
  }
};