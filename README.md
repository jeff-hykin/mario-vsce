# Block Jumper (Mario)

This extension gives you WASD control over blocks of code (code that's indented or seperated by whitespace).
Ever use Inspect Element on your browser, and navigate the elements using your arrow keys? This behaves similarly but for all code.

![block jumper](https://user-images.githubusercontent.com/17692058/108124841-449fc680-706d-11eb-9507-c9bc9bb4b211.gif)


## How Do I Use It?
1. Install the extension on VS Code
2. Add Keyboard shortcuts (copy and paste below, or make your own)

To use the following shortcuts, do (cmd/ctrl)+P then type "Preferences: Open Keyboard Shortcuts (JSON)" then pick and choose what kind of keybindings you want below.
```jsonc
    // 
    // undo / redo jump
    // (built-in commands, but these shortcuts play nice with other shortcuts)
    // 
    { "key": "alt+z",       "command": "workbench.action.navigateBack"    },
    { "key": "alt+shift+z", "command": "workbench.action.navigateForward" },
    
    // 
    // alt + WASD (technically WASDE)
    // 
    { "key": "alt+w",        "command": "mario.moveUp",          "when": "editorTextFocus" },
    { "key": "alt+a",        "command": "mario.moveToOuter",     "when": "editorTextFocus" },
    { "key": "alt+s",        "command": "mario.moveDown",        "when": "editorTextFocus" },
    { "key": "alt+d",        "command": "mario.moveDownToInner", "when": "editorTextFocus" },
    { "key": "alt+e",        "command": "mario.moveUpToInner",   "when": "editorTextFocus" },
    { "key": "alt+shift+w",  "command": "mario.selectUp",        "when": "editorTextFocus" },
    { "key": "alt+shift+s",  "command": "mario.selectDown",      "when": "editorTextFocus" },
    
    // 
    // (additional option for Mac)
    // MacOS: ctrl + WASD
    // 
    { "key": "ctrl+w",        "command": "mario.moveUp",          "when": "editorTextFocus && isMac" },
    { "key": "ctrl+a",        "command": "mario.moveToOuter",     "when": "editorTextFocus && isMac" },
    { "key": "ctrl+s",        "command": "mario.moveDown",        "when": "editorTextFocus && isMac" },
    { "key": "ctrl+d",        "command": "mario.moveDownToInner", "when": "editorTextFocus && isMac" },
    { "key": "ctrl+e",        "command": "mario.moveUpToInner",   "when": "editorTextFocus && isMac" },
    { "key": "ctrl+shift+w",  "command": "mario.selectUp",        "when": "editorTextFocus && isMac" },
    { "key": "ctrl+shift+s",  "command": "mario.selectDown",      "when": "editorTextFocus && isMac" },
    
    // 
    // (arrow keys option)
    // Linux/Windows: alt  + arrow keys
    // MacOS:         ctrl + arrow keys
    // 
    { "key": "ctrl+up",         "command": "mario.moveUp",          "when": "editorTextFocus && isMac" },
    { "key": "ctrl+left",       "command": "mario.moveToOuter",     "when": "editorTextFocus && isMac" },
    { "key": "ctrl+down",       "command": "mario.moveDown",        "when": "editorTextFocus && isMac" },
    { "key": "ctrl+right",      "command": "mario.moveDownToInner", "when": "editorTextFocus && isMac" },
    { "key": "ctrl+shift+up",   "command": "mario.selectUp",        "when": "editorTextFocus && isMac" },
    { "key": "ctrl+shift+down", "command": "mario.selectDown",      "when": "editorTextFocus && isMac" },
    { "key": "alt+up",          "command": "mario.moveUp",          "when": "editorTextFocus && !isMac" },
    { "key": "alt+left",        "command": "mario.moveToOuter",     "when": "editorTextFocus && !isMac" },
    { "key": "alt+down",        "command": "mario.moveDown",        "when": "editorTextFocus && !isMac" },
    { "key": "alt+right",       "command": "mario.moveDownToInner", "when": "editorTextFocus && !isMac" },
    { "key": "alt+shift+up",    "command": "mario.selectUp",        "when": "editorTextFocus && !isMac" },
    { "key": "alt+shift+down",  "command": "mario.selectDown",      "when": "editorTextFocus && !isMac" },
    
    // 
    // jump/select to comma
    // 
    { "key": "alt+.",       "command": "mario.nextComma",           "when": "editorTextFocus" },
    { "key": "alt+,",       "command": "mario.previousComma",       "when": "editorTextFocus" },
    { "key": "alt+shift+.", "command": "mario.selectNextComma",     "when": "editorTextFocus" },
    { "key": "alt+shift+,", "command": "mario.selectPreviousComma", "when": "editorTextFocus" },
    
    // 
    // jump/select to quote
    // 
    { "key": "alt+'",       "command": "mario.nextQuote",           "when": "editorTextFocus" },
    { "key": "alt+;",       "command": "mario.previousQuote",       "when": "editorTextFocus" },
    { "key": "alt+shift+.", "command": "mario.selectNextQuote",     "when": "editorTextFocus" },
    { "key": "alt+shift+,", "command": "mario.selectPreviousQuote", "when": "editorTextFocus" },
    
    // 
    // jump/select to bracket
    // (built-in commands, but these shortcuts play nice with other shortcuts)
    // 
    { "key": "alt+]",       "command": "mario.nextBracket",           "when": "editorTextFocus" },
    { "key": "alt+[",       "command": "mario.previousBracket",       "when": "editorTextFocus" },
    { "key": "alt+shift+]", "command": "mario.selectNextBracket",     "when": "editorTextFocus" },
    { "key": "alt+shift+[", "command": "mario.selectPreviousBracket", "when": "editorTextFocus" },
```

## ToDo / Bugs

- Select-out and select-in haven't been implemented yet
- Fix/improve the built-in jump-to-bracket and select-to-bracket
