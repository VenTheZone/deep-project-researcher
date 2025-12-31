import { type PluginInput } from "@opencode-ai/plugin";
import { z } from "zod";

// Re-export PluginInput for internal use
export type { PluginInput };

// Project metadata types
export interface ProjectMetadata {
  name: string;
  techStack: string[];
  features: string[];
  domain: string;
  language: string;
}

// Reference project types
export interface Reference {
  url: string;
  platform: string;
  name: string;
  description: string;
  techStack: string[];
  features: string[];
  domain: string;
  relevanceScore: number;
  stars?: number;
  lastUpdated: string;
  notes?: string;
  tags?: string[];
}

// Storage data structure
export interface ReferencesData {
  projectPath: string;
  currentTechStack: string[];
  references: Reference[];
  lastResearchDate: string;
}

// Research options
export interface ResearchOptions {
  maxResults?: number;
  platforms?: string[];
  minStars?: number;
  techStack?: string[];
  features?: string[];
  domain?: string;
}

// Analysis result types
export interface TechStackAnalysis {
  language: string;
  dependencies: string[];
  frameworks: string[];
  libraries: string[];
}

export interface FeatureAnalysis {
  directoryStructure: string[];
  keywords: string[];
  detectedFeatures: string[];
}

// Result type for operations that can fail
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Custom error types
export class ProjectAnalysisError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "ProjectAnalysisError";
  }
}

export class ResearchError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "ResearchError";
  }
}

export class ReferenceManagerError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "ReferenceManagerError";
  }
}