import * as vscode from 'vscode';
import * as path from 'path';
import { ManimSceneParser } from './sceneParser';
import { ManimRunner } from './runner';
import { PreviewPanel, PreviewOptions } from './previewPanel';

let currentRunConfig: {
  filePath: string;
  sceneName: string;
  quality: string;
} | null = null;

let currentPanel: PreviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('Manim Runner is now active!');

  const runner = new ManimRunner();
  const parser = new ManimSceneParser();

  // Handle rerender command (used by the preview panel's rerender button)
  const rerenderCommand = vscode.commands.registerCommand('manim-runner.rerenderScene', async (quality: string) => {
    const config = currentRunConfig;
    if (!config) {
      vscode.window.showErrorMessage('No scene has been run yet. Please run a Manim scene first.');
      return;
    }

    // Parse file to find Manim Scene classes
    const scenes = parser.parseScenes(config.filePath);
    if (scenes.length === 0 || !scenes.some((s) => s.name === config.sceneName)) {
      vscode.window.showErrorMessage(`Scene "${config.sceneName}" not found in file.`);
      return;
    }

    // Update quality and run
    config.quality = quality;

    // Run scene
    const outputChannel = vscode.window.createOutputChannel('Manim Runner');
    outputChannel.show(true);
    outputChannel.appendLine(`Rerendering Manim scene: ${config.sceneName}`);
    outputChannel.appendLine(`Quality: ${quality}`);
    outputChannel.appendLine(`File: ${config.filePath}`);

    try {
      // Rerender always disables cache
      const videoPath = await runner.runScene(config.filePath, config.sceneName, quality, outputChannel, true);

      if (videoPath) {
        outputChannel.appendLine(`Video rendered successfully: ${videoPath}`);

        // Show preview
        const previewOptions: PreviewOptions = {
          videoPath: videoPath,
          codePath: config.filePath,
          sceneName: config.sceneName,
          quality: quality
        };

        // Update preview panel with message handler
        const handleMessage = async (message: any) => {
          if (message.command === 'rerender') {
            vscode.commands.executeCommand('manim-runner.rerenderScene', message.quality);
          }
        };
        currentPanel = PreviewPanel.show(previewOptions, handleMessage);
      } else {
        outputChannel.appendLine('Failed to render video. Check the output for details.');
      }
    } catch (error) {
      outputChannel.appendLine(`Error: ${error}`);
      vscode.window.showErrorMessage(`Failed to run Manim scene: ${error}`);
    }
  });

  // Register run scene command
  const runCommand = vscode.commands.registerCommand('manim-runner.runScene', async (quality?: string) => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      vscode.window.showErrorMessage('No active editor found. Please open a Python file.');
      return;
    }

    if (editor.document.languageId !== 'python') {
      vscode.window.showErrorMessage('Please select a Python file containing Manim scenes.');
      return;
    }

    const filePath = editor.document.uri.fsPath;
    const fileName = path.basename(filePath, '.py');

    // Parse file to find Manim Scene classes
    const scenes = parser.parseScenes(filePath);

    if (scenes.length === 0) {
      vscode.window.showInformationMessage('No Manim Scene classes found in file.');
      return;
    }

    // Show quick pick to select a scene if not already selected
    let selectedSceneName: string;

    if (currentRunConfig && currentRunConfig.filePath === filePath && scenes.some((s) => s.name === currentRunConfig!.sceneName)) {
      selectedSceneName = currentRunConfig.sceneName;
    } else {
      const selectedScene = await vscode.window.showQuickPick(
        scenes.map(scene => ({
          label: scene.name,
          description: scene.className,
          scene: scene
        })),
        {
          placeHolder: 'Select a Manim scene to render'
        }
      );

      if (!selectedScene) {
        return;
      }
      selectedSceneName = selectedScene.scene.name;
    }

    // Get the quality to use
    const defaultQuality = vscode.workspace.getConfiguration('manim-runner').get<string>('defaultQuality', 'l');
    const renderQuality = quality || defaultQuality;

    // Store current run configuration
    currentRunConfig = {
      filePath: filePath,
      sceneName: selectedSceneName,
      quality: renderQuality
    };

    // Run scene
    const outputChannel = vscode.window.createOutputChannel('Manim Runner');
    outputChannel.show(true);
    outputChannel.appendLine(`Running Manim scene: ${selectedSceneName}`);
    outputChannel.appendLine(`Quality: ${renderQuality}`);

    try {
      // Always disable cache for fresh render
      const videoPath = await runner.runScene(filePath, selectedSceneName, renderQuality, outputChannel, true);

      if (videoPath) {
        outputChannel.appendLine(`Video rendered successfully: ${videoPath}`);

        // Show preview
        const previewOptions: PreviewOptions = {
          videoPath: videoPath,
          codePath: filePath,
          sceneName: selectedSceneName,
          quality: renderQuality
        };

        // Create or update preview panel with message handler
        const handleMessage = async (message: any) => {
          if (message.command === 'rerender') {
            // Rerender with selected quality
            vscode.commands.executeCommand('manim-runner.rerenderScene', message.quality);
          }
        };
        currentPanel = PreviewPanel.show(previewOptions, handleMessage);
      } else {
        outputChannel.appendLine('Failed to render video. Check the output for details.');
      }
    } catch (error) {
      outputChannel.appendLine(`Error: ${error}`);
      vscode.window.showErrorMessage(`Failed to run Manim scene: ${error}`);
    }
  });

  context.subscriptions.push(runCommand);
  context.subscriptions.push(rerenderCommand);
}

export function deactivate() {
  if (currentPanel) {
    currentPanel.dispose();
  }
}
