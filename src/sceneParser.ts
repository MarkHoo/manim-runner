import * as fs from 'fs';
import * as path from 'path';

export interface ManimScene {
  name: string;
  className: string;
  line: number;
}

export class ManimSceneParser {
  /**
   * Parse a Python file to find Manim Scene classes
   */
  parseScenes(filePath: string): ManimScene[] {
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const scenes: ManimScene[] = [];

    // Pattern to match class definitions that inherit from Scene or Mobject
    const classPattern = /^class\s+(\w+)\s*\((.*)\)/;
    const scenePatterns = ['Scene', 'MovingCameraScene', 'ZoomedScene', 'ThreeDScene'];

    lines.forEach((line, index) => {
      const match = line.match(classPattern);
      if (match) {
        const className = match[1];
        const inheritances = match[2];

        // Check if the class inherits from any Manim scene type
        const inheritsFromScene = scenePatterns.some(pattern => {
          return inheritances.includes(pattern);
        });

        if (inheritsFromScene) {
          scenes.push({
            name: className,
            className: className,
            line: index + 1
          });
        }
      }
    });

    return scenes;
  }

  /**
   * Check if a file contains Manim scenes
   */
  hasManimScenes(filePath: string): boolean {
    return this.parseScenes(filePath).length > 0;
  }
}
