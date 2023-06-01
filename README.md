# Block Jumper (Mario)

This extension gives you WASD control over blocks of code (code that's indented or seperated by whitespace).
Ever use Inspect Element on your browser, and navigate the elements using your arrow keys? This behaves similarly but for all code.

![block jumper](https://user-images.githubusercontent.com/17692058/108124841-449fc680-706d-11eb-9507-c9bc9bb4b211.gif)


## How Do I Use It?
1. Install the extension on VS Code
2. Learn the keyboard shortcuts!

### Here's the default shortcuts

(You can use shift with any of the jumps as well)

#### Block Jump:
- (you'll probably end up only using one of these)
- `alt+WASD` (Mac/Linux/Windows)
- `ctrl+WASD` (Mac)
- `ctrl+ArrowKeys` (Mac)
- `alt+ctrl+ArrowKeys` (Linux/Windows)

#### Quote Jump:
- `alt+SingleQuote` go to the right -> (until a quote is hit)
- `alt+Semicolon` go to the left <- (until a quote is hit)

#### Comma Jump:
- `alt+Comma` go to the left <- (until a comma is hit)
- `alt+Period` go to the right -> (until a comma is hit)

#### Whitespace Jump:
- `alt+Comma` go to the left <- (until a comma is hit)
- `alt+Period` go to the right -> (until a comma is hit)

#### Undo/Redo Jump:
- `alt+z` undo
- `alt+shift+z` redo

#### Here's the json for the keybindings

These keybindings are enabled BY DEFAULT.<br>
Here's some code for mass-DISABLING keybindings that you don't want.<br>
You can paste chunks of the code below in your `keybindings.json`.

```jsonc
    // 
    // undo / redo jump
    // (built-in commands, but these shortcuts play nice with other shortcuts)
    // 
    { "key": "alt+z",       "command": "-workbench.action.navigateBack"    },
    { "key": "alt+shift+z", "command": "-workbench.action.navigateForward" },
    
    //
    // alt+WASD (any os)
    //
    { "key": "alt+w",        "command": "-mario.moveUp",            "when": "editorTextFocus" },
    { "key": "alt+shift+w",  "command": "-mario.selectUp",          "when": "editorTextFocus" },
    { "key": "alt+s",        "command": "-mario.moveDown",          "when": "editorTextFocus" },
    { "key": "alt+shift+s",  "command": "-mario.selectDown",        "when": "editorTextFocus" },
    { "key": "alt+a",        "command": "-mario.moveToOuter",       "when": "editorTextFocus" },
    { "key": "alt+shift+a",  "command": "-mario.selectToOuter",     "when": "editorTextFocus" },
    { "key": "alt+d",        "command": "-mario.moveDownToInner",   "when": "editorTextFocus" },
    { "key": "alt+shift+d",  "command": "-mario.selectDownToInner", "when": "editorTextFocus" },
    { "key": "alt+e",        "command": "-mario.moveUpToInner",     "when": "editorTextFocus" },
    { "key": "alt+shift+e",  "command": "-mario.selectUpToInner",   "when": "editorTextFocus" },
    
    //
    // ctrl+WASD (MacOS)
    //
    { "key": "ctrl+w",        "command": "-mario.moveUp",            "when": "editorTextFocus && isMac" },
    { "key": "ctrl+shift+w",  "command": "-mario.selectUp",          "when": "editorTextFocus && isMac" },
    { "key": "ctrl+s",        "command": "-mario.moveDown",          "when": "editorTextFocus && isMac" },
    { "key": "ctrl+shift+s",  "command": "-mario.selectDown",        "when": "editorTextFocus && isMac" },
    { "key": "ctrl+a",        "command": "-mario.moveToOuter",       "when": "editorTextFocus && isMac" },
    { "key": "ctrl+shift+a",  "command": "-mario.selectToOuter",     "when": "editorTextFocus && isMac" },
    { "key": "ctrl+d",        "command": "-mario.moveDownToInner",   "when": "editorTextFocus && isMac" },
    { "key": "ctrl+shift+d",  "command": "-mario.selectDownToInner", "when": "editorTextFocus && isMac" },
    { "key": "ctrl+e",        "command": "-mario.moveUpToInner",     "when": "editorTextFocus && isMac" },
    { "key": "ctrl+shift+e",  "command": "-mario.selectUpToInner",   "when": "editorTextFocus && isMac" },
    
    //
    // ctrl+arrows (MacOS)
    //
    { "key": "ctrl+up",         "command": "-mario.moveUp",            "when": "editorTextFocus && isMac" },
    { "key": "ctrl+shift+up",   "command": "-mario.selectUp",          "when": "editorTextFocus && isMac" },
    { "key": "ctrl+down",       "command": "-mario.moveDown",          "when": "editorTextFocus && isMac" },
    { "key": "ctrl+shift+down", "command": "-mario.selectDown",        "when": "editorTextFocus && isMac" },
    { "key": "ctrl+left",       "command": "-mario.moveToOuter",       "when": "editorTextFocus && isMac" },
    { "key": "ctrl+shift+left", "command": "-mario.selectToOuter",     "when": "editorTextFocus && isMac" },
    { "key": "ctrl+right",      "command": "-mario.moveDownToInner",   "when": "editorTextFocus && isMac" },
    { "key": "ctrl+shift+right","command": "-mario.selectDownToInner", "when": "editorTextFocus && isMac" },
    
    //
    // alt+ctrl+arrows (Linux/Windows)
    //
    { "key": "alt+ctrl+up",          "command": "-mario.moveUp",            "when": "editorTextFocus && !isMac" },
    { "key": "alt+ctrl+shift+up",    "command": "-mario.selectUp",          "when": "editorTextFocus && !isMac" },
    { "key": "alt+ctrl+down",        "command": "-mario.moveDown",          "when": "editorTextFocus && !isMac" },
    { "key": "alt+ctrl+shift+down",  "command": "-mario.selectDown",        "when": "editorTextFocus && !isMac" },
    { "key": "alt+ctrl+left",        "command": "-mario.moveToOuter",       "when": "editorTextFocus && !isMac" },
    { "key": "alt+ctrl+shift+left",  "command": "-mario.selectToOuter",     "when": "editorTextFocus && !isMac" },
    { "key": "alt+ctrl+right",       "command": "-mario.moveDownToInner",   "when": "editorTextFocus && !isMac" },
    { "key": "alt+ctrl+shift+right", "command": "-mario.selectDownToInner", "when": "editorTextFocus && !isMac" },
    
    //
    // Commas
    //
    { "key": "alt+.",       "command": "-mario.nextComma",           "when": "editorTextFocus" },
    { "key": "alt+shift+.", "command": "-mario.selectNextComma",     "when": "editorTextFocus" },
    { "key": "alt+,",       "command": "-mario.previousComma",       "when": "editorTextFocus" },
    { "key": "alt+shift+,", "command": "-mario.selectPreviousComma", "when": "editorTextFocus" },
    
    //
    // Quotes
    //
    { "key": "alt+'",       "command": "-mario.nextQuote",           "when": "editorTextFocus" },
    { "key": "alt+shift+'", "command": "-mario.selectNextQuote",     "when": "editorTextFocus" },
    { "key": "alt+;",       "command": "-mario.previousQuote",       "when": "editorTextFocus" },
    { "key": "alt+shift+;", "command": "-mario.selectPreviousQuote", "when": "editorTextFocus" }
    
    //
    // Whitespace
    //
    { "key": "ctrl+]",       "command": "-mario.nextSpace",           "when": "editorTextFocus" },
    { "key": "ctrl+shift+]", "command": "-mario.selectNextSpace",     "when": "editorTextFocus" },
    { "key": "ctrl+[",       "command": "-mario.previousSpace",       "when": "editorTextFocus" },
    { "key": "ctrl+shift+[", "command": "-mario.selectPreviousSpace", "when": "editorTextFocus" }
```

## ToDo / Bugs

- Fix/improve the built-in jump-to-bracket and select-to-bracket
