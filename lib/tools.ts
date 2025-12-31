import { tool } from "@opencode-ai/plugin";
import { z } from "zod";
import { analyzeProject } from "./project-analyzer.js";
import { searchSimilarProjects } from "./research-engine.js";
import { addReferences, loadReferences, searchReferences } from "./reference-manager.js";
import { type PluginInput } from "./types.js";

const researchProjectsTool: (ctx: PluginInput) => any = (ctx: PluginInput) => tool({
  description: "Research and find similar open-source projects",
  args: {
    techStack: tool.schema.array(tool.schema.string()).optional().describe("Technologies to search for"),
    features: tool.schema.array(tool.schema.string()).optional().describe("Features to search for"),
    domain: tool.schema.string().optional().describe("Project domain to search for"),
    maxResults: tool.schema.number().optional().default(10).describe("Maximum number of results"),
    minStars: tool.schema.number().optional().default(10).describe("Minimum stars for projects"),
    forceRefresh: tool.schema.boolean().optional().default(false).describe("Force fresh research"),
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
        (args.techStack as string[]) || projectAnalysis.data.techStack,
        (args.features as string[]) || projectAnalysis.data.features,
        (args.domain as string) || projectAnalysis.data.domain,
        {
          maxResults: args.maxResults as number,
          minStars: args.minStars as number,
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

      return `Found ${searchResult.data.length} similar projects:\n\n${searchResult.data
        .map((p) => `• ${p.name} (${p.stars}⭐)\n  ${p.url}\n  Tech: ${p.techStack.join(", ")}`)
        .join("\n\n")}`;
    } catch (error) {
      await ctx.client.tui.showToast({
        body: {
          title: "Research Failed",
          message: error instanceof Error ? error.message : String(error),
          variant: "error"
        }
      });

      return `Research failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

const findReferencesTool: (ctx: PluginInput) => any = (ctx: PluginInput) => tool({
  description: "Search saved project references by tech stack, features, or keywords",
  args: {
    query: tool.schema.string().describe("Search query"),
    techStack: tool.schema.array(tool.schema.string()).optional().describe("Filter by tech stack"),
    features: tool.schema.array(tool.schema.string()).optional().describe("Filter by features"),
    domain: tool.schema.string().optional().describe("Filter by domain"),
    minRelevanceScore: tool.schema.number().optional().describe("Minimum relevance score"),
  },
  async execute(args, context) {
    try {
      const searchResult = await searchReferences(ctx.directory, {
        query: args.query as string,
        techStack: args.techStack as string[],
        features: args.features as string[],
        domain: args.domain as string,
        minRelevanceScore: args.minRelevanceScore as number,
      });

      if (!searchResult.success) {
        throw searchResult.error;
      }

      if (searchResult.data.length === 0) {
        return "No references found matching your search criteria.";
      }

      return `Found ${searchResult.data.length} references:\n\n${searchResult.data
        .map((r) => `• ${r.name} (${r.relevanceScore.toFixed(2)} relevance)\n  ${r.url}\n  Tech: ${r.techStack.join(", ")}`)
        .join("\n\n")}`;
    } catch (error) {
      return `Search failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

const analyzeCodeTool: (ctx: PluginInput) => any = (ctx: PluginInput) => tool({
  description: "Fetch and analyze code from a reference project",
  args: {
    referenceUrl: tool.schema.string().describe("URL of the reference project"),
    filePath: tool.schema.string().optional().describe("Specific file path to analyze"),
    analyzeWithCurrentProject: tool.schema.boolean().optional().default(true).describe("Compare with current project"),
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
        const githubRawUrl = (referenceUrl as string).replace(
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

      const suggestions = generateCodeAdaptationSuggestions(codeContent, filePath);

      let result = `Code Analysis Result\n`;
      result += `==================\n\n`;
      result += `Source: ${analysisUrl}\n\n`;
      result += `Code Length: ${codeContent.length} characters\n\n`;

      if (comparativeAnalysis) {
        result += `${comparativeAnalysis}\n`;
      }

      if (suggestions.length > 0) {
        result += `Adaptation Suggestions:\n`;
        suggestions.forEach((s, i) => {
          result += `${i + 1}. ${s}\n`;
        });
      } else {
        result += `No specific adaptation suggestions for this code.\n`;
      }

      return result;
    } catch (error) {
      await ctx.client.tui.showToast({
        body: {
          title: "Analysis Failed",
          message: error instanceof Error ? error.message : String(error),
          variant: "error"
        }
      });

      return `Analysis failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

const generateCodeAdaptationSuggestions = (codeContent: string, filePath?: string): string[] => {
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