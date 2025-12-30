import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

export class ManimRunner {
  /**
   * Run a Manim scene and return the path to the rendered video
   */
  async runScene(
    filePath: string,
    className: string,
    quality: string,
    outputChannel: vscode.OutputChannel,
    disableCache: boolean = false
  ): Promise<string | null> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      outputChannel.appendLine('Error: No workspace folder found.');
      return null;
    }

    // Determine the output directory (usually 'media' in the project root)
    const outputDir = path.join(workspaceFolder.uri.fsPath, 'media');

    // Build the manim command
    const args = [
      filePath,
      className
    ];

    // Add quality flag based on selection
    // l=480p, m=720p, h=1080p, p=2K, k=4K
    switch (quality) {
      case 'l':
        args.push('-ql');
        break;
      case 'm':
        args.push('-qm');
        break;
      case 'h':
        args.push('-qh');
        break;
      case 'p':
        args.push('-qp');
        break;
      case 'k':
        args.push('-qk');
        break;
      default:
        args.push('-ql');
    }

    // Disable caching for rerender
    if (disableCache) {
      args.push('--disable_caching');
    }

    outputChannel.appendLine(`Running: manim ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
      const manim = spawn('manim', args, {
        cwd: workspaceFolder.uri.fsPath
      });

      let stdout = '';
      let stderr = '';

      manim.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        outputChannel.append(text);
      });

      manim.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        outputChannel.append(text);
      });

      manim.on('close', (code) => {
        if (code === 0) {
          // Try to find the rendered video file
          const videoPath = this.findRenderedVideo(outputDir, className, quality);
          if (videoPath) {
            resolve(videoPath);
          } else {
            // Fallback: try to parse the output for the video path
            const videoPathFromOutput = this.parseVideoPathFromOutput(stdout);
            resolve(videoPathFromOutput);
          }
        } else {
          reject(`Manim exited with code ${code}`);
        }
      });

      manim.on('error', (error) => {
        outputChannel.appendLine(`Error spawning manim: ${error.message}`);
        outputChannel.appendLine('Please make sure manim is installed and accessible.');
        reject(error);
      });
    });
  }

  /**
   * Get the quality directory name based on quality flag
   */
  private getQualityDir(quality: string): string {
    switch (quality) {
      case 'l': return '480p15';
      case 'm': return '720p30';
      case 'h': return '1080p60';
      case 'p': return '1440p60';
      case 'k': return '2160p60';
      default: return '480p15';
    }
  }

  /**
   * Find the rendered video file in the output directory
   */
  private findRenderedVideo(outputDir: string, className: string, quality: string): string | null {
    if (!fs.existsSync(outputDir)) {
      return null;
    }

    // Try to find the video in videos subdirectory
    const videosDir = path.join(outputDir, 'videos');
    if (!fs.existsSync(videosDir)) {
      return null;
    }

    const qualityDir = this.getQualityDir(quality);

    // Search for the video file in the correct quality directory
    const searchVideo = (dir: string): string | null => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // Prioritize the correct quality directory
          if (file === qualityDir) {
            const videoPath = path.join(fullPath, `${className}.mp4`);
            if (fs.existsSync(videoPath)) {
              return videoPath;
            }
          }
          const result = searchVideo(fullPath);
          if (result && result.includes(qualityDir)) {
            return result;
          }
        } else if (file === `${className}.mp4` && dir.includes(qualityDir)) {
          return fullPath;
        }
      }
      return null;
    };

    return searchVideo(videosDir);
  }

  /**
   * Parse the video path from manim output
   */
  private parseVideoPathFromOutput(output: string): string | null {
    // Manim typically outputs something like: "File ready at /path/to/video.mp4"
    const match = output.match(/File ready at (.+\.mp4)/);
    if (match && match[1]) {
      if (fs.existsSync(match[1])) {
        return match[1];
      }
    }

    // Alternative pattern: look for absolute paths ending in .mp4
    const pathMatch = output.match(/([\/\w\-~\.]+\/[\w\-]+\.mp4)/);
    if (pathMatch && pathMatch[1] && fs.existsSync(pathMatch[1])) {
      return pathMatch[1];
    }

    return null;
  }
}
