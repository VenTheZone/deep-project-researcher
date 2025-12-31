import { describe, it, expect, vi } from 'bun:test';
import { findReferencesTool, analyzeCodeTool } from '../../lib/tools.js';

describe('Tools', () => {
  describe('findReferencesTool', () => {
    it('should be a function that accepts context', () => {
      const mockCtx = { directory: '/tmp/test' };
      expect(typeof findReferencesTool).toBe('function');
      // Should not throw when called with context
      expect(() => findReferencesTool(mockCtx)).not.toThrow();
    });

    it('should return a tool definition when called', () => {
      const mockCtx = { directory: '/tmp/test' };
      const tool = findReferencesTool(mockCtx);
      expect(tool).toBeDefined();
      expect(typeof tool).toBe('object');
    });
  });

  describe('analyzeCodeTool', () => {
    it('should be a function that accepts context', () => {
      const mockCtx = { directory: '/tmp/test' };
      expect(typeof analyzeCodeTool).toBe('function');
      // Should not throw when called with context
      expect(() => analyzeCodeTool(mockCtx)).not.toThrow();
    });

    it('should return a tool definition when called', () => {
      const mockCtx = { directory: '/tmp/test' };
      const tool = analyzeCodeTool(mockCtx);
      expect(tool).toBeDefined();
      expect(typeof tool).toBe('object');
    });
  });
});