# Manim Runner

A Visual Studio Code extension for running and previewing Manim animations directly in the editor.

## Features

- Run Manim scenes from Python files with a single click
- Preview rendered animations in a built-in panel
- Support for multiple quality levels (480p to 4K)
- Automatic scene detection from Python files
- Quick rerender with different quality settings

## Requirements

- Visual Studio Code 1.92.0 or higher
- Manim Community Edition installed and accessible from command line
- Python 3.7+

## Installation

1. Install Manim Community Edition: https://docs.manim.community/en/stable/installation.html
2. Install this extension from VS Code Marketplace or from VSIX file

## Usage

1. Open a Python file containing Manim Scene classes
2. Click the play button in the editor title bar, or run the command "Run Manim Scene"
3. Select the scene you want to render
4. The animation will be rendered and displayed in a preview panel

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `manim-runner.defaultQuality` | Default rendering quality | `l` (Low) |

### Quality Options

| Value | Resolution | FPS |
|-------|------------|-----|
| `l` | 854x480 | 15 |
| `m` | 1280x720 | 30 |
| `h` | 1920x1080 | 60 |
| `p` | 2560x1440 | 60 |
| `k` | 3840x2160 | 60 |

## Commands

| Command | Description |
|---------|-------------|
| `manim-runner.runScene` | Run the selected Manim scene |

## Example

Create a Python file with a Manim scene:

```python
from manim import *

class SquareToCircle(Scene):
    def construct(self):
        circle = Circle()
        square = Square()
        square.flip(RIGHT)
        square.rotate(-3 * TAU / 8)
        circle.set_fill(PINK, opacity=0.5)

        self.play(Create(square))
        self.play(Transform(square, circle))
        self.play(FadeOut(square))
```

Then click the play button or run "Run Manim Scene" command.

## Development

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Watch mode
npm run watch

# Run linter
npm run lint

# Run tests
npm test
```

## License

MIT License - see LICENSE file for details.

## Repository

https://github.com/MarkHoo/manim-runner
