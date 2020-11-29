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

let getIndentAmount = (string) => {
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
    return output
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

    // if its a normal uncached line:
    // cache the result
    return currentFile.lineIndentCache[lineIndex] = getIndentAmount(line.text)
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
    var currentIndentLevel = getApproxIndentLevel(currentPosition.line)
    let indentLevelOfNewLine = currentIndentLevel
    let hitAtLeastOneLineWithDifferentIndent = false
    let line = document.lineAt(currentPosition.line)
    let startedOnBlankLine = line.isEmptyOrWhitespace
    var skippedBlankLines = false
    var indentLevelChanged = false
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
            let baselineLevel = getIndentAmount(line.text.slice(0, currentFile.editor.selection.start.character))
            while (currentFile.indexIsInBounds(lineIndexToJumpTo+incrementor)) {
                // go up or down the line index
                lineIndexToJumpTo += incrementor

                indentLevelOfNewLine = getApproxIndentLevel(lineIndexToJumpTo)
                
                // stop if the next line is un-indented
                if (indentLevelOfNewLine < baselineLevel) {
                    break
                }
                
                // skip blank lines
                if (document.lineAt(lineIndexToJumpTo).isEmptyOrWhitespace) {
                    skippedBlankLines = true
                    continue
                }
                // stop after skipping blank lines
                if (skippedBlankLines && indentLevelOfNewLine <= baselineLevel) {
                    break
                }
                
                // if the indent level (at some point) aka; went right-> (aka more indented)
                indentLevelChanged = indentLevelChanged || (indentLevelOfNewLine != baselineLevel)
                if (indentLevelChanged) {
                    // and now its back to being the same
                    if (indentLevelOfNewLine == baselineLevel) {
                        break
                    }
                // if indent level never changed (were still inside the same block)
                } else {
                    // look ahead for a signal that the block just ended
                    let nextIndex = lineIndexToJumpTo+incrementor
                    if (currentFile.indexIsInBounds(nextIndex)) {
                        let blockStoppedByParentOrChild = getApproxIndentLevel(nextIndex) != indentLevelOfNewLine
                        if (blockStoppedByParentOrChild) {
                            break
                        }
                        let blockStoppedByBlankLines = document.lineAt(nextIndex).isEmptyOrWhitespace
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

    const characterIndex = getCharacterIndexOfIndentFor(lineIndexToJumpTo)
    const active = currentFile.editor.selection.active.with(lineIndexToJumpTo, characterIndex)
    currentFile.editor.selection = new vscode.Selection(anchor || active, active)
    currentFile.editor.revealRange(new vscode.Range(anchor || active, active))
}

function jumpTo(lineIndex, characterIndex) {
    const editor = vscode.window.activeTextEditor
    const active = editor.selection.active.with(lineIndex, characterIndex)
    editor.selection = new vscode.Selection(active, active)
    editor.revealRange(new vscode.Range(active, active))
}

function findAll(regexPattern, sourceString) {
    let output = []
    let match
    // make sure the pattern has the global flag
    let regexPatternWithGlobal = RegExp(regexPattern,'g'+regexPattern.flags)
    while (match = regexPatternWithGlobal.exec(sourceString)) {
        // get rid of the string copy
        delete match.input
        // store the match data
        output.push(match)
    } 
    return output
}

const findNext = ({pattern, goBackwards=false, characterIndex=null, lineNumber=null}) => {
    // process args
    const editor = vscode.window.activeTextEditor
    if (characterIndex==null) { characterIndex = editor.selection.start.character }
    if (lineNumber==null    ) { lineNumber = editor.selection.start.line }
    
    // find the lineNumber and characterIndex
    const directionNumber = goBackwards ? -1 : 1
    const startingLine = lineNumber
    const startingCharIndex = characterIndex
    let startingPostion = [ startingLine, startingCharIndex ]
    lineNumber -= directionNumber // offset for first iter of loop
    while (true) {
        try {
            lineNumber += directionNumber
            var lineContent = editor.document.lineAt(lineNumber).text
        } catch (error) {
            break
        }
        let matches = findAll(pattern, lineContent)
        if (matches.length > 0) {
            if (!goBackwards) {
                for (let eachMatch of matches) {
                    if (lineNumber == startingLine) {
                        // must be after starting position
                        if (eachMatch.index > startingCharIndex) {
                            return [lineNumber, eachMatch.index]
                        }
                    } else {
                        return [lineNumber, eachMatch.index]
                    }
                }
            } else {
                for (let eachMatch of matches.reverse()) {
                    console.debug(`eachMatch is:`,eachMatch)
                    if (lineNumber == startingLine) {
                        // must be before starting position
                        if (eachMatch.index < startingCharIndex) {
                            return [lineNumber, eachMatch.index]
                        }
                    } else {
                        return [lineNumber, eachMatch.index]
                    }
                }
            }
        }
    }
    return startingPostion
}

const defaultQuotes = /"|'|`/

module.exports = {
    activate(context) {
        context.subscriptions.push(
            vscode.commands.registerCommand("mario.moveUp", () => {
                moveCursor({ direction: "up"})
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

        context.subscriptions.push(
            vscode.commands.registerCommand("mario.nextQuote", () => {
                jumpTo(...findNext({pattern: defaultQuotes, }))
            })
        )

        context.subscriptions.push(
            vscode.commands.registerCommand("mario.previousQuote", () => {
                jumpTo(...findNext({pattern: defaultQuotes, goBackwards: true}))
            })
        )
        
        context.subscriptions.push(
            vscode.commands.registerCommand("mario.selectUp", () => {
                moveCursor({
                    anchor: anchorPosition(vscode.window.activeTextEditor.selection),
                    direction: "up",
                })
            })
        )

        context.subscriptions.push(
            vscode.commands.registerCommand("mario.selectDown", () => {
                moveCursor({
                    anchor: anchorPosition(vscode.window.activeTextEditor.selection),
                    direction: "down",
                })
            })
        )
    },

    deactivate() {

    }
}

