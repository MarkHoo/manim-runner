import * as assert from 'assert';
import { after, before } from 'mocha';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  before(() => {
    vscode.window.showInformationMessage('Start all tests.');
  });

  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('MarkHoo.manim-runner'));
  });

  test('Extension should activate', async () => {
    const extension = vscode.extensions.getExtension('MarkHoo.manim-runner');
    assert.ok(extension);
    await extension?.activate();
  });

  test('Extension should register commands', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('manim-runner.runScene'));
  });
});
