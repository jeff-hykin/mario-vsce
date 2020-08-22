let readline = require("readline")
let vscode = require("vscode")

// global var that is updated when called on a new active document
let currentFile = {
    editor: null,
    tabSize: null,
    lineIndentCache: {},
    indexIsInBounds: ()=>0,
}

function anchorPosition(selection) {
    return selection.active.line === selection.end.line ? selection.start : selection.end
}

let getApproxIndentLevel = (lineIndex) => {
    if (currentFile.lineIndentCache[lineIndex] != null) {
        return currentFile.lineIndentCache[lineIndex]
    }
    
    if (!currentFile.indexIsInBounds(lineIndex)) {
        console.error(`called getApproxIndentLevel() with an out-of-bounds index: ${lineIndex}`)
        return null
    }
    
    // 
    // all-whitespace lines:
    // 
    // if its an all-whitespace line there's a small problem
    // this is because of code like
    // def:
    //     im indented      // <- indent = 4
    //                      // <- indent = 0 (an all whitespace line)
    //     im indented      // <- indent = 4
    // instead of using the real indent, then indent is estimated 
    // using the indent level of next/previous line, whichever is larger
    const line = currentFile.editor.document.lineAt(lineIndex)
    if (line.isEmptyOrWhitespace) {
        let results = []
        // iterate up the lines (-1), then down the lines (1)
        for (let each of [-1, 1]) {
            index = lineIndex
            let incrementor = each
            // iterate over line indices
            while (1) {
                index = index + incrementor
                if (currentFile.lineIndentCache[index] != null) {
                    results.push(currentFile.lineIndentCache[index])
                    break
                }
                if (!currentFile.indexIsInBounds(index)) {
                    results.push(0)
                    break
                }
                if (!currentFile.editor.document.lineAt(index).isEmptyOrWhitespace) {
                    // get the indent (recursion, but will only ever be 1-deep recursion)
                    results.push(getApproxIndentLevel(index))
                    break
                }
            }
        }
        // cache & return the result
        return currentFile.lineIndentCache[lineIndex] = Math.max(...results)
    }

    // 
    // if its a normal uncached line:
    // 
    let string = line.text

    let output = 0
    // get all leading whitespace
    let indentMatch = string.match(/^[ \t]+/)
    if (!indentMatch) {
        return output
    }
    let indent = indentMatch[0]
    
    // count & remove tabs
    let tabsMatch = indent.match(/\t/g)
    if (tabsMatch) {
        output += tabsMatch.length
        // remove the tabs
        indent = indent.replace(/\t/g,"")
    }
    
    // count spaces
    let spacesMatch = indent.match(/ /g)
    if (spacesMatch) {
        output += Math.floor( spacesMatch.length / currentFile.tabSize)
    }
    
    // cache the result
    currentFile.lineIndentCache[lineIndex] = output
    return output
}

function moveCursor({anchor, goUp, direction}) {
    // update the editor
    currentFile.editor = vscode.window.activeTextEditor
    currentFile.tabSize = currentFile.editor.options.tabSize
    currentFile.lineIndentCache = {}
    // NOTE: bit of a misnomer cause the upperBound is the BOTTOM of the file (but its a larger line number)
    const upperBound = currentFile.editor.document.lineCount - 1
    const lowerBound = 0
    currentFile.indexIsInBounds = (index) => index <= upperBound && index >= lowerBound
    let getCharacterIndexOfIndentFor = (lineIndex) => (document.lineAt(lineIndex).text.match(/^[\t ]*/)[0].length)
    
    let document = currentFile.editor.document
    let currentPosition = currentFile.editor.selection.active
    let lineIndexToJumpTo = currentPosition.line
    console.debug(`about to get currentIndentLevel`)
    let currentIndentLevel = getApproxIndentLevel(currentPosition.line)
    let indentLevelOfNewLine = currentIndentLevel
    let hitAtLeastOneLineWithDifferentIndent = false
    let line = document.lineAt(currentPosition.line)
    let startedOnBlankLine = line.isEmptyOrWhitespace
    var skippedBlankLines = false
    var indentLevelChanged = false
    console.debug(`startingIndex is:`,lineIndexToJumpTo)
    console.debug(`direction is:`,direction)
    switch (direction) {
                    
        // next line (up) with the same or smaller indent    
        case "up":
        // next line (down) with the same or smaller indent
        case "down":
            // 
            // this loop is a little complicated because of this case:
            // 1. blah blah blah
            // 2.     blah blah
            // 3.        blah blah
            // 4.        blah blah
            // 5.        blah blah   
            // 6.        blah blah   <- cursor starts here
            // 7.        blah blah
            // 8.  blah
            // 
            // *moveUp*
            // 
            // 1. blah blah blah
            // 2.     blah blah
            // 3.        blah blah   <- cursor should end up here 
            // 4.        blah blah
            // 5.        blah blah   
            // 6.        blah blah   
            // 7.        blah blah
            // 8.  blah
            let incrementor = direction == "up" ? -1 : 1
            while (currentFile.indexIsInBounds(lineIndexToJumpTo+incrementor)) {
                // go up or down the line index
                lineIndexToJumpTo += incrementor

                indentLevelOfNewLine = getApproxIndentLevel(lineIndexToJumpTo)
                
                // stop if the next line is un-indented
                if (indentLevelOfNewLine < currentIndentLevel) {
                    break
                }
                
                // skip blank lines
                if (document.lineAt(lineIndexToJumpTo).isEmptyOrWhitespace) {
                    console.debug(`Skipping blank line`)
                    skippedBlankLines = true
                    continue
                }
                // stop after skipping blank lines
                if (skippedBlankLines && indentLevelOfNewLine <= currentIndentLevel) {
                    console.debug(`indentLevelOfNewLine <= currentIndentLevel is:`,indentLevelOfNewLine <= currentIndentLevel)
                    break
                }
                
                // if the indent level (at some point) aka; went right-> (aka more indented)
                indentLevelChanged = indentLevelChanged || (indentLevelOfNewLine != currentIndentLevel)
                if (indentLevelChanged) {
                    // and now its back to being the same
                    if (indentLevelOfNewLine == currentIndentLevel) {
                        break
                    }
                // if indent level never changed (were still inside the same block)
                } else {
                    // look ahead for a signal that the block just ended
                    let nextIndex = lineIndexToJumpTo+incrementor
                    if (currentFile.indexIsInBounds(nextIndex)) {
                        let blockStoppedByParent = getApproxIndentLevel(nextIndex) < indentLevelOfNewLine
                        console.debug(`blockStoppedByParent? is:`,blockStoppedByParent)
                        if (blockStoppedByParent) {
                            break
                        }
                        let blockStoppedByBlankLines = document.lineAt(nextIndex).isEmptyOrWhitespace
                        console.debug(`blockStoppedByBlankLines? is:`,blockStoppedByBlankLines)
                        if (blockStoppedByBlankLines) {
                            break
                        }
                    }
                }
            }
            break

        // next line (up) with a smaller indent
        case "left":
            // if cursor isn't at the front of the line, move it there
            if (currentPosition.character > getCharacterIndexOfIndentFor(lineIndexToJumpTo)) {
                break
            }
            while (lineIndexToJumpTo > 0) {
                --lineIndexToJumpTo
                let newLineIndex = getApproxIndentLevel(lineIndexToJumpTo)
                if (newLineIndex < currentIndentLevel) {
                    break
                }
            }
            break

        // next line (down) with a larger indent
        case "rightDown":
            console.debug(`currentPosition.character < getCharacterIndexOfIndentFor(lineIndexToJumpTo) is:`,currentPosition.character < getCharacterIndexOfIndentFor(lineIndexToJumpTo))
            // if cursor isn't after the indent, move it there
            if (currentPosition.character < getCharacterIndexOfIndentFor(lineIndexToJumpTo)) {
                break
            }
            while (lineIndexToJumpTo < upperBound) {
                ++lineIndexToJumpTo
                let newLineIndex = getApproxIndentLevel(lineIndexToJumpTo)
                // skip blank lines
                if (document.lineAt(lineIndexToJumpTo).isEmptyOrWhitespace) {
                    skippedBlankLines = true
                    continue
                }

                if (newLineIndex > currentIndentLevel) {
                    break
                // if its actually going back up, then stop and just go down one
                } else if (newLineIndex < currentIndentLevel) {
                    lineIndexToJumpTo = currentPosition.line+1
                    break
                }
            }
            break

        // next line (up) with a larger indent
        case "rightUp":
            console.debug(`currentPosition.character < getCharacterIndexOfIndentFor(lineIndexToJumpTo) is:`,currentPosition.character < getCharacterIndexOfIndentFor(lineIndexToJumpTo))
            // if cursor isn't after the indent, move it there
            if (currentPosition.character < getCharacterIndexOfIndentFor(lineIndexToJumpTo)) {
                break
            }
            while (lineIndexToJumpTo > 0) {
                --lineIndexToJumpTo
                let newLineIndex = getApproxIndentLevel(lineIndexToJumpTo)

                // skip blank lines
                if (document.lineAt(lineIndexToJumpTo).isEmptyOrWhitespace) {
                    skippedBlankLines = true
                    continue
                }

                if (newLineIndex > currentIndentLevel) {
                    break
                // if its actually going back up, then stop and just go up one
                } else if (newLineIndex < currentIndentLevel) {
                    lineIndexToJumpTo = currentPosition.line-1
                    break
                }
            }
            break
    }


    console.debug(`lineIndexToJumpTo is:`,lineIndexToJumpTo)
    const characterIndex = getCharacterIndexOfIndentFor(lineIndexToJumpTo)
    const active = currentFile.editor.selection.active.with(lineIndexToJumpTo, characterIndex)
    currentFile.editor.selection = new vscode.Selection(anchor || active, active)
    currentFile.editor.revealRange(new vscode.Range(active, active))
}

module.exports = {
    activate(context) {
        context.subscriptions.push(
            vscode.commands.registerCommand("mario.moveUp", () => {
                try {
                    moveCursor({ direction: "up"})
                } catch (error) {
                    console.debug(`error is:`,error)
                }
            })
        )

        context.subscriptions.push(
            vscode.commands.registerCommand("mario.moveDown", () => {
                moveCursor({ direction: "down"})
            })
        )
        
        context.subscriptions.push(
            vscode.commands.registerCommand("mario.moveToOuter", () => {
                moveCursor({ direction: "left"})
            })
        )

        context.subscriptions.push(
            vscode.commands.registerCommand("mario.moveDownToInner", () => {
                moveCursor({ direction: "rightDown"})
            })
        )

        context.subscriptions.push(
            vscode.commands.registerCommand("mario.moveUpToInner", () => {
                moveCursor({ direction: "rightUp"})
            })
        )
        
        // TODO: remove 
        context.subscriptions.push(
            vscode.commands.registerCommand("mario.selectUp", () => {
                moveCursor({
                    anchor: anchorPosition(editor.selection)
                })
            })
        )

        // TODO: remove 
        context.subscriptions.push(
            vscode.commands.registerCommand("mario.selectDown", () => {
                moveCursor({
                    
                    anchor: anchorPosition(editor.selection)
                })
            })
        )
    },

    deactivate() {

    }
}

