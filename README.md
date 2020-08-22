# Block Jumper (Mario)

Tired of using your mouse like an amateur? Add this extension to your arsenal.

This extension works like W,A,S,D based on the blocks (indented or seperated by whitespace) of your code.
Ever use Inspect Element on your browser, and navigate the elements using your arrow keys? This behaves similarly but for all code.

## Features

* `mario.moveUp`: W: Move up a space block
* `mario.moveToOuter`: A:  Move left
* `mario.moveDown`: S: Move down a space block
* `mario.moveDownToInner`: D: Move right (down)
* `mario.moveUpToInner`: E: Move right (up)

## Keybindings Example

```json
    {
        "key": "alt+shift+w",
        "command": "mario.moveUp",
        "when": "editorTextFocus"
    },
    {
        "key": "alt+shift+a",
        "command": "mario.moveToOuter",
        "when": "editorTextFocus"
    },
    {
        "key": "alt+shift+s",
        "command": "mario.moveDown",
        "when": "editorTextFocus"
    },
    {
        "key": "alt+shift+d",
        "command": "mario.moveDownToInner",
        "when": "editorTextFocus"
    },
    {
        "key": "alt+shift+e",
        "command": "mario.moveUpToInner",
        "when": "editorTextFocus"
    },
```

