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

function cursorRightUp({direction, startingLineIndex, upperBound, getCharacterIndexOfIndentFor, document, currentPosition, lineIndexToJumpTo, currentIndentLevel, indentLevelOfNewLine, hitAtLeastOneLineWithDifferentIndent, line, skippedBlankLines, indentLevelChanged}) {
    // if cursor isn't after the indent, move it there
    if (currentPosition.character < getCharacterIndexOfIndentFor(lineIndexToJumpTo)) {
        return lineIndexToJumpTo
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
            return lineIndexToJumpTo
        // if its actually going back up, then stop and just go up one
        } else if (newLineIndex < currentIndentLevel) {
            lineIndexToJumpTo = currentPosition.line-1
            return lineIndexToJumpTo
        }
    }
    return lineIndexToJumpTo
}

function cursorRightDown({direction, startingLineIndex, upperBound, getCharacterIndexOfIndentFor, document, currentPosition, lineIndexToJumpTo, currentIndentLevel, indentLevelOfNewLine, hitAtLeastOneLineWithDifferentIndent, line, skippedBlankLines, indentLevelChanged}) {
    // if cursor isn't after the indent, move it there
    if (currentPosition.character < getCharacterIndexOfIndentFor(lineIndexToJumpTo)) {
        return lineIndexToJumpTo
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
            return lineIndexToJumpTo
        // if its actually going back up, then stop and just go down one
        } else if (newLineIndex < currentIndentLevel) {
            lineIndexToJumpTo = currentPosition.line+1
            return lineIndexToJumpTo
        }
    }
    return lineIndexToJumpTo
}

function cursorLeft({direction, startingLineIndex, getCharacterIndexOfIndentFor, document, currentPosition, lineIndexToJumpTo, currentIndentLevel, indentLevelOfNewLine, hitAtLeastOneLineWithDifferentIndent, line, skippedBlankLines, indentLevelChanged}) {
    if (startingLineIndex == 0) {
        return startingLineIndex
    }
    while (lineIndexToJumpTo > 0) {
        --lineIndexToJumpTo
        let newLineIndex = getApproxIndentLevel(lineIndexToJumpTo)
        if (newLineIndex < currentIndentLevel) {
            return lineIndexToJumpTo
        }
        // break condition
        if (!(lineIndexToJumpTo > 0)) {
            // go up 1 on failure
            if (currentFile.indexIsInBounds(startingLineIndex-1)) {
                return cursorUpOrDown({direction:"up", lineIndexToJumpTo: startingLineIndex, startingLineIndex, getCharacterIndexOfIndentFor, document, currentPosition, currentIndentLevel, indentLevelOfNewLine, hitAtLeastOneLineWithDifferentIndent, line, skippedBlankLines, indentLevelChanged})
            }
            return startingLineIndex
        }
    }
}

function cursorUpOrDown({direction, startingLineIndex, upperBound, lowerBound, getCharacterIndexOfIndentFor, document, currentPosition, lineIndexToJumpTo, currentIndentLevel, indentLevelOfNewLine, hitAtLeastOneLineWithDifferentIndent, line}) {
    const baselineLevel = getIndentAmount(line.text.slice(0, currentFile.editor.selection.start.character))
    const goingUp = direction == "up"
    const incrementor = goingUp ? -1 : 1
    let iterNumber = 0
    let stayWithinBlock = false
    let failureValue = startingLineIndex
    while (true) {
        iterNumber++
        // if failed, then just go up or down 1
        if (!currentFile.indexIsInBounds(lineIndexToJumpTo+incrementor)) {
            return failureValue
        }
        // go up or down the line index
        lineIndexToJumpTo += incrementor
        indentLevelOfNewLine = getApproxIndentLevel(lineIndexToJumpTo)
        // info
        let indentLevelChanged = indentLevelOfNewLine != baselineLevel
        let blankLine = document.lineAt(lineIndexToJumpTo).isEmptyOrWhitespace
        
        // not going past the edge (and not starting in blank space)
        if (iterNumber == 1 && !(blankLine || indentLevelChanged)) {
            stayWithinBlock = true
        }
        
        // not on the edge and not starting in blank space
        if (stayWithinBlock) {
            if (indentLevelChanged || blankLine) {
                return lineIndexToJumpTo-incrementor
            }
        } else {
            // we found a block, now stay in it
            if (indentLevelOfNewLine == baselineLevel && !blankLine) {
                stayWithinBlock = true
                failureValue = lineIndexToJumpTo
            }
        }
    }
}

function moveCursor({anchor, direction}) {
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
    const startingLineIndex = currentPosition.line
    let lineIndexToJumpTo = startingLineIndex
    var currentIndentLevel = getApproxIndentLevel(currentPosition.line)
    let indentLevelOfNewLine = currentIndentLevel
    let hitAtLeastOneLineWithDifferentIndent = false
    let line = document.lineAt(currentPosition.line)
    var skippedBlankLines = false
    var indentLevelChanged = false
    switch (direction) {
        // next line (up) with the same or smaller indent    
        case "up":
        // next line (down) with the same or smaller indent
        case "down":
            lineIndexToJumpTo = cursorUpOrDown({direction, startingLineIndex, upperBound, lowerBound, getCharacterIndexOfIndentFor, document, currentPosition, lineIndexToJumpTo, currentIndentLevel, indentLevelOfNewLine, hitAtLeastOneLineWithDifferentIndent, line, skippedBlankLines, indentLevelChanged})
            break

        // next line (up) with a smaller indent
        case "left":
            lineIndexToJumpTo = cursorLeft({direction, startingLineIndex, upperBound, lowerBound, getCharacterIndexOfIndentFor, document, currentPosition, lineIndexToJumpTo, currentIndentLevel, indentLevelOfNewLine, hitAtLeastOneLineWithDifferentIndent, line, skippedBlankLines, indentLevelChanged})
            break

        // next line (down) with a larger indent
        case "rightDown":
            lineIndexToJumpTo = cursorRightDown({direction, startingLineIndex, upperBound, getCharacterIndexOfIndentFor, document, currentPosition, lineIndexToJumpTo, currentIndentLevel, indentLevelOfNewLine, hitAtLeastOneLineWithDifferentIndent, line, skippedBlankLines, indentLevelChanged})
            break

        // next line (up) with a larger indent
        case "rightUp":
            lineIndexToJumpTo = cursorRightUp({direction, startingLineIndex, upperBound, getCharacterIndexOfIndentFor, document, currentPosition, lineIndexToJumpTo, currentIndentLevel, indentLevelOfNewLine, hitAtLeastOneLineWithDifferentIndent, line, skippedBlankLines, indentLevelChanged})
            break
    }

    const characterIndex = getCharacterIndexOfIndentFor(lineIndexToJumpTo)
    const active = currentFile.editor.selection.active.with(lineIndexToJumpTo, characterIndex)
    currentFile.editor.selection = new vscode.Selection(anchor || active, active)
    currentFile.editor.revealRange(new vscode.Range(anchor || active, active))
}

function jumpTo({lineIndex, characterIndex, anchor}) {
    const editor = vscode.window.activeTextEditor
    const active = editor.selection.active.with(lineIndex, characterIndex)
    editor.selection = new vscode.Selection(anchor || active, active)
    editor.revealRange(new vscode.Range(anchor || active, active))
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

module.exports = {
    activate(context) {
        context.subscriptions.push(
            vscode.commands.registerCommand("mario.moveUp", () => {
                moveCursor({ direction: "up" })
            })
        )

        context.subscriptions.push(
            vscode.commands.registerCommand("mario.moveDown", () => {
                moveCursor({ direction: "down" })
            })
        )
        
        context.subscriptions.push(
            vscode.commands.registerCommand("mario.moveToOuter", () => {
                moveCursor({ direction: "left" })
            })
        )
        
        context.subscriptions.push(
            vscode.commands.registerCommand("mario.selectToOuter", () => {
                moveCursor({
                    direction: "left",
                    anchor: anchorPosition(vscode.window.activeTextEditor.selection),
                })
            })
        )

        context.subscriptions.push(
            vscode.commands.registerCommand("mario.moveDownToInner", () => {
                moveCursor({ direction: "rightDown" })
            })
        )

        context.subscriptions.push(
            vscode.commands.registerCommand("mario.moveUpToInner", () => {
                moveCursor({ direction: "rightUp" })
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

        function nextFinder(name, pattern) {
            context.subscriptions.push(
                vscode.commands.registerCommand(`mario.next${name}`, () => {
                    let [lineIndex, characterIndex] = findNext({pattern: pattern, })
                    jumpTo({ lineIndex, characterIndex, })
                })
            )

            context.subscriptions.push(
                vscode.commands.registerCommand(`mario.previous${name}`, () => {
                    let [lineIndex, characterIndex] = findNext({pattern: pattern, goBackwards: true})
                    jumpTo({ lineIndex, characterIndex, })
                })
            )
            
            context.subscriptions.push(
                vscode.commands.registerCommand(`mario.selectNext${name}`, () => {
                    let [lineIndex, characterIndex] = findNext({pattern: pattern, })
                    jumpTo({
                        lineIndex,
                        characterIndex, 
                        anchor: anchorPosition(vscode.window.activeTextEditor.selection),
                    })
                })
            )

            context.subscriptions.push(
                vscode.commands.registerCommand(`mario.selectPrevious${name}`, () => {
                    let [lineIndex, characterIndex] = findNext({pattern: pattern, goBackwards: true})
                    jumpTo({
                        lineIndex,
                        characterIndex, 
                        anchor: anchorPosition(vscode.window.activeTextEditor.selection),
                    })
                })
            )
        }

        nextFinder("Quote", /"|'|`/)
        nextFinder("Comma", /,/)
    },

    deactivate() {

    }
}

