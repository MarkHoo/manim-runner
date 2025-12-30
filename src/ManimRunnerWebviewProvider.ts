import * as vscode from 'vscode';
import * as path from 'path';

export class ManimRunnerWebviewProvider {
  private static readonly viewType = 'manimRunner.preview';

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this._updateWebview();
      }
    });
  }

  public updateVideo(videoPath: string) {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview(this._view.webview, videoPath);
    }
  }

  private _updateWebview() {
    // Update webview content if needed
  }

  private _getHtmlForWebview(webview: vscode.Webview, videoPath?: string): string {
    const fileUrl = videoPath ? vscode.Uri.file(videoPath).toString() : '';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Manim Runner</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background-color: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-font-family);
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      margin-bottom: 20px;
    }

    .header h2 {
      margin: 0;
      color: var(--vscode-textLink-foreground);
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--vscode-descriptionForeground);
    }

    .empty-state p {
      margin: 10px 0;
    }

    .video-container {
      width: 100%;
      background-color: #000;
      border-radius: 4px;
      overflow: hidden;
      display: ${videoPath ? 'block' : 'none'};
    }

    video {
      width: 100%;
      height: auto;
      display: block;
    }

    .controls {
      margin-top: 15px;
      display: ${videoPath ? 'flex' : 'none'};
      gap: 10px;
      justify-content: center;
    }

    button {
      padding: 8px 16px;
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 13px;
    }

    button:hover {
      background-color: var(--vscode-button-hoverBackground);
    }

    .info {
      margin-top: 20px;
      padding: 15px;
      background-color: var(--vscode-textBlockQuote-background);
      border-left: 3px solid var(--vscode-textLink-foreground);
      border-radius: 2px;
    }

    .info h3 {
      margin-top: 0;
      margin-bottom: 10px;
      font-size: 14px;
    }

    .info ul {
      margin: 0;
      padding-left: 20px;
      font-size: 13px;
    }

    .info li {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Manim Runner</h2>
    </div>

    <div class="video-container">
      <video id="video" controls autoplay loop>
        <source src="${fileUrl}" type="video/mp4">
      </video>
    </div>

    <div class="controls">
      <button onclick="document.getElementById('video').play()">Play</button>
      <button onclick="document.getElementById('video').pause()">Pause</button>
      <button onclick="document.getElementById('video').currentTime = 0">Restart</button>
    </div>

    <div class="empty-state" style="display: ${videoPath ? 'none' : 'block'}">
      <p>No video loaded</p>
      <p>Run a Manim scene to preview it here</p>
    </div>

    <div class="info">
      <h3>Quick Start</h3>
      <ul>
        <li>Open a Python file with Manim scenes</li>
        <li>Run "Manim Runner: Run Manim Scene" from the command palette</li>
        <li>Select a scene to render</li>
        <li>Preview the rendered video</li>
      </ul>
    </div>
  </div>
</body>
</html>
    `;
  }
}
