import { promises as fs } from "fs";
import path from "path";
import { type Reference, type ReferencesData, type Result } from "./types.js";

export { ReferenceManagerError };

const DEFAULT_REFERENCES_PATH = ".opencode/references.json";

/**
 * Load references from project-specific storage
 */
export const loadReferences = async (
  projectPath: string,
  referencesPath = DEFAULT_REFERENCES_PATH
): Promise<Result<ReferencesData>> => {
  try {
    const fullPath = path.join(projectPath, referencesPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    try {
      const data = await fs.readFile(fullPath, "utf-8");
      const references: ReferencesData = JSON.parse(data);
      return { success: true, data: references };
    } catch (error) {
      // File doesn't exist or is invalid
      const emptyData: ReferencesData = {
        projectPath,
        currentTechStack: [],
        references: [],
        lastResearchDate: new Date().toISOString(),
      };
      
      // Save empty structure
      await fs.writeFile(fullPath, JSON.stringify(emptyData, null, 2));
      return { success: true, data: emptyData };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new ReferenceManagerError(String(error)),
    };
  }
};

/**
 * Save references to project-specific storage
 */
export const saveReferences = async (
  projectPath: string,
  referencesData: ReferencesData,
  referencesPath = DEFAULT_REFERENCES_PATH
): Promise<Result<void>> => {
  try {
    const fullPath = path.join(projectPath, referencesPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    const updatedData = {
      ...referencesData,
      lastResearchDate: new Date().toISOString(),
    };
    
    await fs.writeFile(fullPath, JSON.stringify(updatedData, null, 2));
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new ReferenceManagerError(String(error)),
    };
  }
};

/**
 * Add new references to existing data
 */
export const addReferences = async (
  projectPath: string,
  newReferences: Reference[],
  referencesPath = DEFAULT_REFERENCES_PATH
): Promise<Result<ReferencesData>> => {
  try {
    const currentResult = await loadReferences(projectPath, referencesPath);
    
    if (!currentResult.success) {
      return currentResult;
    }
    
    const currentData = currentResult.data;
    
    // Merge with existing references, avoiding duplicates by URL
    const existingUrls = new Set(currentData.references.map(ref => ref.url));
    const uniqueNewReferences = newReferences.filter(ref => !existingUrls.has(ref.url));
    
    const updatedData: ReferencesData = {
      ...currentData,
      references: [...currentData.references, ...uniqueNewReferences],
    };
    
    const saveResult = await saveReferences(projectPath, updatedData, referencesPath);
    
    if (!saveResult.success) {
      return saveResult;
    }
    
    return { success: true, data: updatedData };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new ReferenceManagerError(String(error)),
    };
  }
};

/**
 * Search references by various criteria
 */
export const searchReferences = async (
  projectPath: string,
  criteria: {
    query?: string;
    techStack?: string[];
    features?: string[];
    domain?: string;
    minRelevanceScore?: number;
  },
  referencesPath = DEFAULT_REFERENCES_PATH
): Promise<Result<Reference[]>> => {
  try {
    const loadResult = await loadReferences(projectPath, referencesPath);
    
    if (!loadResult.success) {
      return loadResult;
    }
    
    const { references } = loadResult.data;
    
    let filteredReferences = references;
    
    // Filter by text query
    if (criteria.query) {
      const queryLower = criteria.query.toLowerCase();
      filteredReferences = filteredReferences.filter(ref =>
        ref.name.toLowerCase().includes(queryLower) ||
        ref.description.toLowerCase().includes(queryLower) ||
        ref.techStack.some(tech => tech.toLowerCase().includes(queryLower)) ||
        ref.features.some(feature => feature.toLowerCase().includes(queryLower)) ||
        ref.domain.toLowerCase().includes(queryLower)
      );
    }
    
    // Filter by tech stack
    if (criteria.techStack && criteria.techStack.length > 0) {
      filteredReferences = filteredReferences.filter(ref =>
        criteria.techStack!.some(targetTech =>
          ref.techStack.some(refTech =>
            refTech.toLowerCase().includes(targetTech.toLowerCase())
          )
        )
      );
    }
    
    // Filter by features
    if (criteria.features && criteria.features.length > 0) {
      filteredReferences = filteredReferences.filter(ref =>
        criteria.features!.some(targetFeature =>
          ref.features.some(refFeature =>
            refFeature.toLowerCase().includes(targetFeature.toLowerCase())
          )
        )
      );
    }
    
    // Filter by domain
    if (criteria.domain) {
      const domainLower = criteria.domain.toLowerCase();
      filteredReferences = filteredReferences.filter(ref =>
        ref.domain.toLowerCase().includes(domainLower)
      );
    }
    
    // Filter by minimum relevance score
    if (criteria.minRelevanceScore !== undefined) {
      filteredReferences = filteredReferences.filter(ref =>
        ref.relevanceScore >= criteria.minRelevanceScore!
      );
    }
    
    // Sort by relevance score (highest first)
    const sortedReferences = filteredReferences.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return { success: true, data: sortedReferences };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new ReferenceManagerError(String(error)),
    };
  }
};

/**
 * Update project's current tech stack
 */
export const updateTechStack = async (
  projectPath: string,
  techStack: string[],
  referencesPath = DEFAULT_REFERENCES_PATH
): Promise<Result<void>> => {
  try {
    const loadResult = await loadReferences(projectPath, referencesPath);
    
    if (!loadResult.success) {
      return loadResult;
    }
    
    const updatedData: ReferencesData = {
      ...loadResult.data,
      currentTechStack: techStack,
    };
    
    return await saveReferences(projectPath, updatedData, referencesPath);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new ReferenceManagerError(String(error)),
    };
  }
};

/**
 * Remove outdated references
 */
export const cleanupReferences = async (
  projectPath: string,
  maxAge: number = 90, // days
  referencesPath = DEFAULT_REFERENCES_PATH
): Promise<Result<void>> => {
  try {
    const loadResult = await loadReferences(projectPath, referencesPath);
    
    if (!loadResult.success) {
      return loadResult;
    }
    
    const { references } = loadResult.data;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);
    
    const activeReferences = references.filter(ref => {
      try {
        return new Date(ref.lastUpdated) >= cutoffDate;
      } catch {
        return true; // Keep if date is invalid
      }
    });
    
    const updatedData: ReferencesData = {
      ...loadResult.data,
      references: activeReferences,
    };
    
    return await saveReferences(projectPath, updatedData, referencesPath);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new ReferenceManagerError(String(error)),
    };
  }
};