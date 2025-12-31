import { describe, it, expect, vi } from 'bun:test';
import { analyzeProject } from '../../lib/project-analyzer.js';
import { type ProjectMetadata } from '../../lib/types.js';

describe('ProjectAnalyzer', () => {
  describe('analyzeProject', () => {
    it('should analyze a basic package.json', async () => {
      // Create a temporary directory with package.json for testing
      const testProjectPath = '/tmp/test-project';
      await fs.mkdir(testProjectPath, { recursive: true });

      const packageJson = {
        name: 'test-app',
        dependencies: {
          react: '^18.0.0',
          typescript: '^5.0.0'
        }
      };

      await fs.writeFile(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson));

      const result = await analyzeProject(testProjectPath);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.techStack).toContain('react');
      expect(result.data!.techStack).toContain('typescript');

      // Cleanup
      await fs.rm(testProjectPath, { recursive: true, force: true });
    });

    it('should extract tech stack correctly', async () => {
      const testProjectPath = '/tmp/test-project-vue';
      await fs.mkdir(testProjectPath, { recursive: true });

      const packageJson = {
        name: 'test-app',
        dependencies: {
          'vue': '^3.0.0',
          'nuxt': '^3.0.0',
          'pinia': '^2.0.0'
        }
      };

      await fs.writeFile(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson));

      const result = await analyzeProject(testProjectPath);

      expect(result.success).toBe(true);
      expect(result.data!.techStack).toEqual(['vue', 'nuxt', 'pinia']);

      // Cleanup
      await fs.rm(testProjectPath, { recursive: true, force: true });
    });
  });
});

    it('should handle missing package.json', async () => {
      const mockCtx = {
        $: vi.fn().mockReturnValue({
          exitCode: 1,
          stderr: 'package.json not found'
        })
      };

      const result = await analyzeProject(mockCtx as any);

      expect(result.success).toBe(false);
    });

    it('should extract tech stack correctly', async () => {
      const mockPackageJson = {
        dependencies: {
          'react': '^18.0.0',
          'next': '^13.0.0',
          'typescript': '^5.0.0',
          'node-fetch': '^3.0.0'
        },
        devDependencies: {
          'jest': '^29.0.0',
          'eslint': '^8.0.0'
        }
      };

      const mockCtx = {
        $: vi.fn().mockReturnValue({
          exitCode: 0,
          stdout: JSON.stringify(mockPackageJson)
        })
      };

      const result = await analyzeProject(mockCtx as any);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.techStack).toEqual(
          expect.arrayContaining(['react', 'next', 'typescript', 'node-fetch', 'jest', 'eslint'])
        );
      }
    });