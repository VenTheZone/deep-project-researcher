import { z } from "zod";
import { type Reference, type ResearchOptions, type Result } from "./types.js";
import { ResearchError } from "./types.js";

/**
 * Construct intelligent search query based on project characteristics
 */
const constructSearchQuery = (
  techStack: string[],
  features: string[],
  domain: string
): string => {
  const queryParts = [];
  
  // Add main domain/technology
  if (domain && domain !== "general") {
    queryParts.push(domain);
  }
  
  // Add key technologies
  const keyTech = techStack.slice(0, 3); // Limit to top 3
  if (keyTech.length > 0) {
    queryParts.push(keyTech.join(" "));
  }
  
  // Add key features
  const keyFeatures = features.slice(0, 2); // Limit to top 2
  if (keyFeatures.length > 0) {
    queryParts.push(keyFeatures.join(" "));
  }
  
  // Add platform specifier
  queryParts.push("github");
  
  return queryParts.join(" ");
};

/**
 * Parse search results from web search
 */
const parseSearchResults = (searchResults: string): Reference[] => {
  const references: Reference[] = [];
  
  // This is a simplified parser - in production would use more sophisticated parsing
  const lines = searchResults.split("\n");
  
  for (const line of lines) {
    // Look for GitHub URLs
    const githubMatch = line.match(/https:\/\/github\.com\/([^\/\s]+)/);
    if (githubMatch) {
      const url = githubMatch[0] ?? "";
      const repoPath = githubMatch[1] ?? "";
      const name = repoPath.split("/").pop() ?? repoPath;
      
      references.push({
        url,
        platform: "github",
        name,
        description: "", // Would be extracted from actual search results
        techStack: [], // Would be populated by enhanced analysis
        features: [], // Would be populated by enhanced analysis
        domain: "", // Would be populated by enhanced analysis
        relevanceScore: 50, // Default score
        lastUpdated: new Date().toISOString(),
      });
    }
  }
  
  return references;
};

/**
 * Calculate relevance score based on project characteristics
 */
const calculateRelevanceScore = (
  reference: Reference,
  targetTechStack: string[],
  targetFeatures: string[],
  targetDomain: string
): number => {
  let score = 0;
  
  // Tech stack overlap (40 points max)
  const techOverlap = reference.techStack.filter(tech => 
    targetTechStack.some(target => target.toLowerCase().includes(tech.toLowerCase()))
  ).length;
  score += Math.min(techOverlap * 10, 40);
  
  // Feature overlap (30 points max)
  const featureOverlap = reference.features.filter(feature => 
    targetFeatures.some(target => target.toLowerCase().includes(feature.toLowerCase()))
  ).length;
  score += Math.min(featureOverlap * 10, 30);
  
  // Domain match (20 points max)
  if (reference.domain && targetDomain && reference.domain === targetDomain) {
    score += 20;
  }
  
  // Recency bonus (10 points max)
  try {
    const lastUpdated = new Date(reference.lastUpdated);
    const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) {
      score += 10;
    } else if (daysSinceUpdate < 90) {
      score += 5;
    }
  } catch {
    // If date parsing fails, no bonus
  }
  
  return Math.min(score, 100);
};

/**
 * Search for similar projects using web search
 */
export const searchSimilarProjects = async (
  techStack: string[],
  features: string[],
  domain: string,
  options: ResearchOptions = {}
): Promise<Result<Reference[]>> => {
  try {
    const maxResults = options.maxResults || 10;
    const minStars = options.minStars || 10;
    
    const query = constructSearchQuery(techStack, features, domain);
    
    // In a real implementation, this would use OpenCode's websearch tool
    // For now, we'll simulate the search
    const mockResults = generateMockSearchResults(query, techStack, features, domain);
    
    // Filter by minimum stars (if available in results)
    const filteredResults = mockResults.filter(ref => 
      !ref.stars || ref.stars >= minStars
    );
    
    // Sort by relevance
    const sortedResults = filteredResults
      .map(ref => ({
        ...ref,
        relevanceScore: calculateRelevanceScore(ref, techStack, features, domain),
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);
    
    return { success: true, data: sortedResults };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new ResearchError(String(error)),
    };
  }
};

/**
 * Generate mock search results for development/testing
 */
const generateMockSearchResults = (
  query: string,
  techStack: string[],
  features: string[],
  domain: string
): Reference[] => {
  const mockProjects: Reference[] = [
    {
      url: "https://github.com/vercel/next.js",
      platform: "github",
      name: "next.js",
      description: "React framework with file-based routing",
      techStack: ["react", "typescript", "tailwind"],
      features: ["routing", "api", "ssr"],
      domain: "framework",
      relevanceScore: 0,
      stars: 115000,
      lastUpdated: "2024-12-15T00:00:00Z",
    },
    {
      url: "https://github.com/remix-run/remix",
      platform: "github", 
      name: "remix",
      description: "React framework with nested routing",
      techStack: ["react", "typescript"],
      features: ["routing", "api", "ssr"],
      domain: "framework",
      relevanceScore: 0,
      stars: 28000,
      lastUpdated: "2024-12-10T00:00:00Z",
    },
    {
      url: "https://github.com/facebook/create-react-app",
      platform: "github",
      name: "create-react-app",
      description: "React project bootstrapper",
      techStack: ["react", "webpack", "babel"],
      features: ["component-based"],
      domain: "tool",
      relevanceScore: 0,
      stars: 99000,
      lastUpdated: "2024-11-20T00:00:00Z",
    },
    {
      url: "https://github.com/expo/expo",
      platform: "github",
      name: "expo",
      description: "React Native development platform",
      techStack: ["react-native", "typescript"],
      features: ["mobile", "components"],
      domain: "mobile",
      relevanceScore: 0,
      stars: 23000,
      lastUpdated: "2024-12-08T00:00:00Z",
    },
    {
      url: "https://github.com/storybookjs/storybook",
      platform: "github",
      name: "storybook",
      description: "Component development environment",
      techStack: ["react", "vue", "angular", "svelte"],
      features: ["component-based", "documentation"],
      domain: "tool",
      relevanceScore: 0,
      stars: 81000,
      lastUpdated: "2024-12-12T00:00:00Z",
    },
  ];

  // Filter based on query relevance
  const queryLower = query.toLowerCase();
  return mockProjects.filter(project => {
    const nameMatch = queryLower.includes(project.name.toLowerCase());
    const techMatch = techStack.some(tech => 
      project.techStack.some(ptech => ptech.toLowerCase().includes(tech.toLowerCase()))
    );
    const featureMatch = features.some(feature => 
      project.features.some(pfeature => pfeature.toLowerCase().includes(feature.toLowerCase()))
    );
    const domainMatch = domain !== "general" && project.domain.includes(domain);
    
    return nameMatch || techMatch || featureMatch || domainMatch;
  });
};