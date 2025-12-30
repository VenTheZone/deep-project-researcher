import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { type PluginInput, type Result } from "./lib/types.js";
import { searchReferences } from "./lib/reference-manager.js";

const DEFAULT_CONFIG_PATH = ".opencode/dpr.jsonc";
const DEFAULT_CONFIG = {
  enabled: true,
  autoResearch: true,
  researchDepth: "light" as const,
  maxReferences: 10,
  platforms: ["github", "gitlab", "codeberg", "any"] as const,
  minStars: 10,
  searchEngines: ["web"] as const,
  contextAwareSuggestions: true,
  codeAnalysis: {
    enabled: true,
    cacheSize: 20,
  },
};

export type Config = typeof DEFAULT_CONFIG;

export const loadConfig = async (
  projectPath: string,
  configPath = DEFAULT_CONFIG_PATH
): Promise<Result<Config>> => {
  try {
    const fullPath = path.join(projectPath, configPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    try {
      const data = await fs.readFile(fullPath, "utf-8");
      const config = JSON.parse(data);
      return { success: true, data: { ...DEFAULT_CONFIG, ...config } };
    } catch {
      // File doesn't exist or is invalid
      const emptyConfig = { ...DEFAULT_CONFIG };
      
      await fs.writeFile(fullPath, JSON.stringify(emptyConfig, null, 2));
      return { success: true, data: emptyConfig };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

export const saveConfig = async (
  projectPath: string,
  config: Config,
  configPath = DEFAULT_CONFIG_PATH
): Promise<Result<void>> => {
  try {
    const fullPath = path.join(projectPath, configPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    await fs.writeFile(fullPath, JSON.stringify(config, null, 2));
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

const analyzeConversationForRelevance = (
  message: string
): { techStack: string[]; features: string[]; domain: string } => {
  const techKeywords = [
    "react", "vue", "angular", "svelte", "next", "remix", "express", "koa", "hapi",
    "python", "django", "flask", "fastapi", "pytest", "numpy", "pandas",
    "typescript", "javascript", "node", "npm", "webpack", "vite", "babel",
    "go", "rust", "cargo", "java", "maven", "gradle", "spring",
    "docker", "kubernetes", "aws", "azure", "gcp", "firebase", "supabase",
    "mongodb", "postgresql", "mysql", "redis", "graphql", "rest", "api",
    "tailwind", "bootstrap", "css", "html", "scss", "sass",
  ];

  const featureKeywords = [
    "auth", "authentication", "login", "register", "user", "profile",
    "routing", "router", "pages", "navigation", "menu", "sidebar",
    "api", "backend", "server", "endpoint", "rest", "graphql",
    "component", "ui", "frontend", "client", "interface", "design",
    "test", "testing", "unit", "integration", "e2e", "cypress",
    "database", "db", "sql", "nosql", "migration", "seed",
    "deployment", "deploy", "cicd", "github", "actions", "pipeline",
    "admin", "dashboard", "management", "cms", "blog", "content",
  ];

  const domainKeywords = {
    "e-commerce": ["shop", "store", "cart", "checkout", "payment", "product"],
    "fintech": ["bank", "payment", "wallet", "transfer", "finance"],
    "admin-dashboard": ["admin", "dashboard", "management", "panel"],
    "social-media": ["social", "profile", "feed", "post", "message"],
    "messaging": ["chat", "message", "notification", "real-time"],
    "content-management": ["blog", "cms", "content", "article", "post"],
    "backend-api": ["api", "server", "backend", "endpoint", "service"],
    "mobile": ["mobile", "app", "ios", "android", "react-native"],
  };

  const messageLower = message.toLowerCase();
  const detectedTech = techKeywords.filter(tech => 
    messageLower.includes(tech.toLowerCase())
  );

  const detectedFeatures = featureKeywords.filter(feature => 
    messageLower.includes(feature.toLowerCase())
  );

  let detectedDomain = "general";
  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    if (keywords.some(keyword => messageLower.includes(keyword))) {
      detectedDomain = domain;
      break;
    }
  }

  return {
    techStack: [...new Set(detectedTech)],
    features: [...new Set(detectedFeatures)],
    domain: detectedDomain,
  };
};

export const shouldSuggestReferences = (ctx: PluginInput): boolean => {
  const configResult = loadConfig(ctx.directory);
  if (!configResult.success) {
    return false;
  }
  
  return configResult.data.contextAwareSuggestions && configResult.data.enabled;
};

export const generateContextualSuggestion = async (
  ctx: PluginInput,
  message: string
): Promise<string | null> => {
  if (!await shouldSuggestReferences(ctx)) {
    return null;
  }

  const relevance = analyzeConversationForRelevance(message);
  const hasRelevantKeywords = 
    relevance.techStack.length > 0 || 
    relevance.features.length > 0 || 
    relevance.domain !== "general";

  if (!hasRelevantKeywords) {
    return null;
  }

  try {
    const searchResult = await searchReferences(ctx.directory, {
      techStack: relevance.techStack,
      features: relevance.features,
      domain: relevance.domain,
      minRelevanceScore: 60,
    });

    if (!searchResult.success || searchResult.data.length === 0) {
      return null;
    }

    const topReferences = searchResult.data.slice(0, 3);
    const referenceList = topReferences.map(ref => 
      `- [${ref.name}](${ref.url}) - ${ref.description || ref.domain} project`
    ).join("\n");

    return `[REFERENCE] Found similar projects for your "${relevance.domain}" work with ${relevance.techStack.join(", ")}:\n${referenceList}`;
  } catch (error) {
    return null;
  }
};