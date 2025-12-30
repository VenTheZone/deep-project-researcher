import { tool } from "@opencode-ai/plugin";
import { z } from "zod";
import { analyzeProject } from "./lib/project-analyzer.js";
import { searchSimilarProjects } from "./lib/research-engine.js";
import { addReferences, loadReferences, searchReferences } from "./lib/reference-manager.js";
import { type PluginInput, type Result } from "./lib/types.js";

const researchProjectsTool = (ctx: PluginInput) => tool({
  description: "Research and find similar open-source projects",
  args: {
    techStack: z.array(z.string()).optional().describe("Technologies to search for"),
    features: z.array(z.string()).optional().describe("Features to search for"),
    domain: z.string().optional().describe("Project domain to search for"),
    maxResults: z.number().optional().default(10).describe("Maximum number of results"),
    minStars: z.number().optional().default(10).describe("Minimum stars for projects"),
    forceRefresh: z.boolean().optional().default(false).describe("Force fresh research"),
  },
  async execute(args, context) {
    const { sessionID } = context;
    
    try {
      await ctx.client.tui.showToast({
        body: { 
          title: "Research Started", 
          message: "Searching for similar projects...",
          variant: "info" 
        }
      });

      const projectAnalysis = await analyzeProject(ctx.directory);
      
      if (!projectAnalysis.success) {
        throw projectAnalysis.error;
      }

      const searchResult = await searchSimilarProjects(
        args.techStack || projectAnalysis.data.techStack,
        args.features || projectAnalysis.data.features,
        args.domain || projectAnalysis.data.domain,
        {
          maxResults: args.maxResults,
          minStars: args.minStars,
        }
      );

      if (!searchResult.success) {
        throw searchResult.error;
      }

      const addResult = await addReferences(ctx.directory, searchResult.data);
      
      if (!addResult.success) {
        throw addResult.error;
      }

      await ctx.client.tui.showToast({
        body: { 
          title: "Research Complete", 
          message: `Found ${searchResult.data.length} similar projects`,
          variant: "success" 
        }
      });

      return {
        success: true,
        projects: searchResult.data,
        projectAnalysis: projectAnalysis.data,
      };
    } catch (error) {
      await ctx.client.tui.showToast({
        body: { 
          title: "Research Failed", 
          message: error instanceof Error ? error.message : String(error),
          variant: "error" 
        }
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

const findReferencesTool = (ctx: PluginInput) => tool({
  description: "Search saved project references by tech stack, features, or keywords",
  args: {
    query: z.string().describe("Search query"),
    techStack: z.array(z.string()).optional().describe("Filter by tech stack"),
    features: z.array(z.string()).optional().describe("Filter by features"),
    domain: z.string().optional().describe("Filter by domain"),
    minRelevanceScore: z.number().optional().describe("Minimum relevance score"),
  },
  async execute(args, context) {
    try {
      const searchResult = await searchReferences(ctx.directory, {
        query: args.query,
        techStack: args.techStack,
        features: args.features,
        domain: args.domain,
        minRelevanceScore: args.minRelevanceScore,
      });

      if (!searchResult.success) {
        throw searchResult.error;
      }

      return {
        success: true,
        references: searchResult.data,
        count: searchResult.data.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

const analyzeCodeTool = (ctx: PluginInput) => tool({
  description: "Fetch and analyze code from a reference project",
  args: {
    referenceUrl: z.string().describe("URL of the reference project"),
    filePath: z.string().optional().describe("Specific file path to analyze"),
    analyzeWithCurrentProject: z.boolean().optional().default(true).describe("Compare with current project"),
  },
  async execute(args, context) {
    try {
      const { referenceUrl, filePath } = args;
      
      if (!referenceUrl) {
        throw new Error("Reference URL is required");
      }

      await ctx.client.tui.showToast({
        body: { 
          title: "Analysis Started", 
          message: `Analyzing code from ${referenceUrl}`,
          variant: "info" 
        }
      });

      let analysisUrl = referenceUrl;
      if (filePath) {
        const githubRawUrl = referenceUrl.replace(
          "https://github.com/",
          "https://raw.githubusercontent.com/"
        ).replace(/\/$/, "/main/");
        analysisUrl = `${githubRawUrl}${filePath}`;
      }

      const response = await fetch(analysisUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch code: ${response.statusText}`);
      }

      const codeContent = await response.text();
      
      let comparativeAnalysis = "";
      if (args.analyzeWithCurrentProject) {
        const projectAnalysis = await analyzeProject(ctx.directory);
        
        if (projectAnalysis.success) {
          comparativeAnalysis = `
Current Project Tech Stack: ${projectAnalysis.data.techStack.join(", ")}
Current Project Features: ${projectAnalysis.data.features.join(", ")}

Comparison:
- Reference project uses ${filePath ? filePath : 'main structure'}
- Current project structure: ${projectAnalysis.data.features.join(", ")}
- Consider adapting patterns for your ${projectAnalysis.data.language} stack
          `;
        }
      }

      return {
        success: true,
        code: codeContent,
        referenceUrl: analysisUrl,
        comparativeAnalysis,
        suggestions: generateCodeAdaptationSuggestions(codeContent, filePath),
      };
    } catch (error) {
      await ctx.client.tui.showToast({
        body: { 
          title: "Analysis Failed", 
          message: error instanceof Error ? error.message : String(error),
          variant: "error" 
        }
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

const generateCodeAdaptationSuggestions = (codeContent: string, filePath: string): string[] => {
  const suggestions: string[] = [];
  
  if (codeContent.includes("import React")) {
    suggestions.push("Consider using React hooks pattern if adapting to modern React");
  }
  
  if (codeContent.includes("componentDidMount")) {
    suggestions.push("This uses class components - consider converting to functional components with useEffect");
  }
  
  if (codeContent.includes("useState") && !codeContent.includes("useEffect")) {
    suggestions.push("Add useEffect for side effects in functional components");
  }
  
  if (filePath?.includes("router") || codeContent.includes("BrowserRouter")) {
    suggestions.push("Check your current project's routing setup - may need to adapt routing configuration");
  }
  
  if (codeContent.includes("axios") || codeContent.includes("fetch")) {
    suggestions.push("Ensure your API client matches your project's HTTP library preferences");
  }
  
  return suggestions;
};

export {
  researchProjectsTool,
  findReferencesTool,
  analyzeCodeTool,
};