import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface PreviewOptions {
  videoPath: string;
  codePath: string;
  sceneName: string;
  quality: string;
}

export class PreviewPanel {
  private static currentPanel: PreviewPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  private currentVideoPath: string = '';
  private currentCodePath: string = '';
  private currentSceneName: string = '';
  private currentQuality: string = 'l';
  private messageHandler: ((message: any) => void) | undefined;

  private constructor(panel: vscode.WebviewPanel) {
    this.panel = panel;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    
    // Register message handler once in constructor
    this.panel.webview.onDidReceiveMessage(
      (message) => {
        if (this.messageHandler) {
          this.messageHandler(message);
        }
      },
      null,
      this.disposables
    );
  }

  public static show(options: PreviewOptions, messageHandler?: (message: any) => void): PreviewPanel | undefined {
    const column = vscode.ViewColumn.Two;

    // If we already have a panel, reveal it
    if (PreviewPanel.currentPanel) {
      PreviewPanel.currentPanel.panel.reveal(column);
      PreviewPanel.currentPanel.update(options);
      if (messageHandler) {
        PreviewPanel.currentPanel.messageHandler = messageHandler;
      }
      return PreviewPanel.currentPanel;
    }

    // Otherwise, create a new panel
    // Use workspace root or video parent directory for localResourceRoots to support all quality levels
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
    const videoDir = vscode.Uri.file(path.dirname(options.videoPath));
    const localRoots = workspaceRoot ? [workspaceRoot, videoDir] : [videoDir];
    
    const panel = vscode.window.createWebviewPanel(
      'manimPreview',
      'Manim Preview',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: localRoots
      }
    );

    PreviewPanel.currentPanel = new PreviewPanel(panel);
    PreviewPanel.currentPanel.messageHandler = messageHandler;
    PreviewPanel.currentPanel.update(options);
    return PreviewPanel.currentPanel;
  }

  private update(options: PreviewOptions): void {
    this.currentVideoPath = options.videoPath;
    this.currentCodePath = options.codePath;
    this.currentSceneName = options.sceneName;
    this.currentQuality = options.quality || 'l';

    const videoName = path.basename(options.videoPath);
    const fileUri = vscode.Uri.file(options.videoPath);
    // Add timestamp to force video refresh
    const fileUrl = this.panel.webview.asWebviewUri(fileUri).toString() + '?t=' + Date.now();

    const html = this.getWebviewContent(fileUrl, videoName, options.videoPath, options.codePath, this.currentQuality);
    this.panel.webview.html = html;
  }

  private getWebviewContent(fileUrl: string, videoName: string, videoPath: string, codePath: string, quality: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Manim Preview</title>
  <style>
    * {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
    }
    body {
      padding: 15px;
      background-color: var(--vscode-editor-background, #1e1e1e);
      color: var(--vscode-editor-foreground, #cccccc);
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .container {
      width: 100%;
      max-width: 100%;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }
    .video-wrapper {
      width: 100%;
      aspect-ratio: 16 / 9;
      background-color: #000;
      border-radius: 4px;
      overflow: hidden;
      position: relative;
      flex-shrink: 0;
    }
    .video-container {
      width: 100%;
      height: 100%;
      position: relative;
    }
    video {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: contain;
      background-color: #000;
    }
    .title {
      margin-top: 12px;
      font-size: 14px;
      font-weight: 500;
      color: var(--vscode-editor-foreground, #cccccc);
    }
    .controls-row {
      margin-top: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .quality-select {
      padding: 4px 8px;
      background-color: var(--vscode-dropdown-background, #3c3c3c);
      color: var(--vscode-dropdown-foreground, #cccccc);
      border: 1px solid var(--vscode-dropdown-border, #555);
      border-radius: 2px;
      font-size: 12px;
      cursor: pointer;
    }
    .rerender-btn {
      padding: 4px 12px;
      background-color: #28a745;
      color: #ffffff;
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
      transition: background-color 0.2s;
    }
    .rerender-btn:hover {
      background-color: #218838;
    }
    .path-info {
      margin-top: 8px;
      padding: 10px;
      background-color: var(--vscode-textBlockQuote-background, #2d2d2d);
      border-left: 3px solid var(--vscode-textLink-foreground, #3794ff);
      border-radius: 2px;
      font-size: 11px;
      flex-shrink: 0;
    }
    .path-info .path-row {
      margin: 4px 0;
      color: var(--vscode-descriptionForeground, #999999);
      word-break: break-all;
    }
    .path-info .path-label {
      font-weight: 500;
      color: var(--vscode-editor-foreground, #cccccc);
    }
    .error-message {
      display: none;
      color: #ff6b6b;
      padding: 20px;
      text-align: center;
      background-color: rgba(255, 107, 107, 0.1);
      border-radius: 4px;
    }
    .error-message.show {
      display: block;
    }
    .loading-indicator {
      display: none;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #666;
      font-size: 14px;
    }
    .loading-indicator.show {
      display: block;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="video-wrapper">
      <div class="video-container">
        <video id="video" controls autoplay loop muted playsinline preload="auto">
          <source src="${fileUrl}" type="video/mp4">
        </video>
        <div id="loading" class="loading-indicator">Loading video...</div>
      </div>
    </div>

    <div class="title">${this.currentSceneName}</div>

    <div class="controls-row">
      <select class="quality-select" id="qualitySelect">
        <option value="l" ${quality === 'l' ? 'selected' : ''}>480P (854x480 15FPS)</option>
        <option value="m" ${quality === 'm' ? 'selected' : ''}>720P (1280x720 30FPS)</option>
        <option value="h" ${quality === 'h' ? 'selected' : ''}>1080P (1920x1080 60FPS)</option>
        <option value="p" ${quality === 'p' ? 'selected' : ''}>2K (2560x1440 60FPS)</option>
        <option value="k" ${quality === 'k' ? 'selected' : ''}>4K (3840x2160 60FPS)</option>
      </select>
      <button class="rerender-btn" onclick="onRerender()">Rerender</button>
    </div>

    <div class="path-info">
      <div class="path-row">
        <span class="path-label">Code:</span> ${codePath}
      </div>
      <div class="path-row">
        <span class="path-label">Video:</span> ${videoPath}
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const video = document.getElementById('video');
    const qualitySelect = document.getElementById('qualitySelect');
    const loading = document.getElementById('loading');

    // Show loading indicator initially
    loading.classList.add('show');

    // Auto-play video when loaded
    function attemptPlay() {
      if (video.readyState >= 2) {
        loading.classList.remove('show');
        video.play().then(() => {
          console.log('Video playing successfully');
        }).catch(e => {
          console.log('Auto-play prevented:', e);
          loading.classList.remove('show');
        });
      }
    }

    // Try to play on multiple events for better compatibility
    video.addEventListener('loadedmetadata', attemptPlay);
    video.addEventListener('canplay', attemptPlay);
    video.addEventListener('loadeddata', attemptPlay);

    // Hide loading when video is ready to play
    video.addEventListener('canplaythrough', () => {
      loading.classList.remove('show');
    });

    // Also try to play when the page loads
    window.addEventListener('load', () => {
      setTimeout(attemptPlay, 100);
    });

    // Ensure video loops
    video.addEventListener('ended', () => {
      video.currentTime = 0;
      video.play().catch(e => console.log('Loop play failed:', e));
    });

    video.addEventListener('error', function(e) {
      console.error('Video loading error:', e);
      loading.classList.remove('show');
      console.error('Video source:', '${fileUrl}');
    });

    function onRerender() {
      const quality = qualitySelect.value;
      vscode.postMessage({
        command: 'rerender',
        quality: quality
      });
    }
  </script>
</body>
</html>
    `;
  }

  public setMessageHandler(handler: (message: any) => void): void {
    this.messageHandler = handler;
  }

  public dispose(): void {
    PreviewPanel.currentPanel = undefined;
    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
