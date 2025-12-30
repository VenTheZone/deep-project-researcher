import { type Plugin, type PluginInput } from "@opencode-ai/plugin";
import { analyzeProject } from "./lib/project-analyzer.js";
import { searchSimilarProjects } from "./lib/research-engine.js";
import { addReferences } from "./lib/reference-manager.js";
import { researchProjectsTool, findReferencesTool, analyzeCodeTool } from "./lib/tools.js";

const handleSessionCreated = async (ctx: PluginInput) => {
  try {
    const projectAnalysis = await analyzeProject(ctx.directory);
    
    if (!projectAnalysis.success) {
      await ctx.client.tui.showToast({
        body: { 
          title: "Analysis Failed", 
          message: "Could not analyze project structure",
          variant: "error" 
        }
      });
      return;
    }

    await ctx.client.tui.showToast({
      body: { 
        title: "Auto-Research Started", 
        message: `Analyzing ${projectAnalysis.data.name} for similar projects...`,
        variant: "info" 
      }
    });

    const searchResult = await searchSimilarProjects(
      projectAnalysis.data.techStack,
      projectAnalysis.data.features,
      projectAnalysis.data.domain,
      {
        maxResults: 10, // Light research as requested
        minStars: 10,
      }
    );

    if (!searchResult.success) {
      await ctx.client.tui.showToast({
        body: { 
          title: "Research Failed", 
          message: searchResult.error.message,
          variant: "error" 
        }
      });
      return;
    }

    const addResult = await addReferences(ctx.directory, searchResult.data);
    
    if (!addResult.success) {
      await ctx.client.tui.showToast({
        body: { 
          title: "Storage Failed", 
          message: "Could not save references",
          variant: "error" 
        }
      });
      return;
    }

    await ctx.client.tui.showToast({
      body: { 
        title: "Auto-Research Complete", 
        message: `Found ${searchResult.data.length} similar projects for reference`,
        variant: "success" 
      }
    });

    await ctx.client.session.prompt({
      path: { id: ctx.sessionID },
      body: { 
        parts: [{ 
          type: "text", 
          text: `[AUTO-RESEARCH] Analyzed ${projectAnalysis.data.name} (${projectAnalysis.data.language}) and found ${searchResult.data.length} reference projects. Use "find-references" tool to search them or "analyze-code" to examine specific implementations.` 
        }] 
      }
    });
  } catch (error) {
    await ctx.client.tui.showToast({
      body: { 
        title: "Auto-Research Error", 
        message: error instanceof Error ? error.message : String(error),
        variant: "error" 
      }
    });
  }
};

const createDeepProjectResearcherPlugin: Plugin = async (ctx) => {
  return {
    event: async ({ event }) => {
      if (event.type === "session.created") {
        await handleSessionCreated(ctx);
      }
    },
    
    tool: {
      "research-projects": researchProjectsTool(ctx),
      "find-references": findReferencesTool(ctx),
      "analyze-code": analyzeCodeTool(ctx),
    },
  };
};

export default createDeepProjectResearcherPlugin;