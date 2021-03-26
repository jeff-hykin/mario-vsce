let readline = require("readline")
let vscode = require("vscode")

// a global-for-this-file var that is updated when called on a new active document
const activeFile = {
    tabSize: null,
    lineIndentCache: {},
    indexIsInBounds: ()=>0,
    
    get editor() {
        return vscode.window.activeTextEditor
    },
    get selection() {
        return vscode.window.activeTextEditor.selection
    },
    get selections() {
        return vscode.window.activeTextEditor.selections
    },
    get document() {
        return vscode.window.activeTextEditor.selections
    },
    get lineCount() {
        return vscode.window.activeTextEditor.document.lineCount
    },
    get cursorPosition() {
        return vscode.window.activeTextEditor.selection.active
    },
    
    lineAt(...args) {
        return vscode.window.activeTextEditor.document.lineAt(...args)
    },
}

const getIndentAmount = (string) => {
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
        output += Math.floor( spacesMatch.length / activeFile.tabSize)
    }
    return output
}

const getApproxIndentLevel = (lineIndex) => {
    if (activeFile.lineIndentCache[lineIndex] != null) {
        return activeFile.lineIndentCache[lineIndex]
    }
    
    if (!activeFile.indexIsInBounds(lineIndex)) {
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
    const line = activeFile.lineAt(lineIndex)
    if (line.isEmptyOrWhitespace) {
        let results = []
        // iterate up the lines (-1), then down the lines (1)
        for (let each of [-1, 1]) {
            index = lineIndex
            let incrementor = each
            // iterate over line indices
            while (1) {
                index = index + incrementor
                if (activeFile.lineIndentCache[index] != null) {
                    results.push(activeFile.lineIndentCache[index])
                    break
                }
                if (!activeFile.indexIsInBounds(index)) {
                    results.push(0)
                    break
                }
                if (!activeFile.lineAt(index).isEmptyOrWhitespace) {
                    // get the indent (recursion, but will only ever be 1-deep recursion)
                    results.push(getApproxIndentLevel(index))
                    break
                }
            }
        }
        // cache & return the result
        return activeFile.lineIndentCache[lineIndex] = Math.max(...results)
    }

    // if its a normal uncached line:
    // cache the result
    return activeFile.lineIndentCache[lineIndex] = getIndentAmount(line.text)
}

function cursorRightUpBlock({direction, startingLineIndex, upperBound, getCharacterIndexOfIndentFor, document, currentPosition, lineIndexToJumpTo, currentIndentLevel, indentLevelOfNewLine, hitAtLeastOneLineWithDifferentIndent, line, skippedBlankLines, indentLevelChanged}) {
    // if cursor isn't after the indent, move it there
    if (currentPosition.character < getCharacterIndexOfIndentFor(lineIndexToJumpTo)) {
        return lineIndexToJumpTo
    }
    while (lineIndexToJumpTo > 0) {
        --lineIndexToJumpTo
        let newLineIndex = getApproxIndentLevel(lineIndexToJumpTo)

        // skip blank lines
        if (activeFile.lineAt(lineIndexToJumpTo).isEmptyOrWhitespace) {
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

function cursorRightDownBlock({direction, startingLineIndex, upperBound, getCharacterIndexOfIndentFor, document, currentPosition, lineIndexToJumpTo, currentIndentLevel, indentLevelOfNewLine, hitAtLeastOneLineWithDifferentIndent, line, skippedBlankLines, indentLevelChanged}) {
    // if cursor isn't after the indent, move it there
    if (currentPosition.character < getCharacterIndexOfIndentFor(lineIndexToJumpTo)) {
        return lineIndexToJumpTo
    }
    while (lineIndexToJumpTo < upperBound) {
        ++lineIndexToJumpTo
        let newLineIndex = getApproxIndentLevel(lineIndexToJumpTo)
        // skip blank lines
        if (activeFile.lineAt(lineIndexToJumpTo).isEmptyOrWhitespace) {
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

function cursorLeftBlock({direction, startingLineIndex, upperBound, lowerBound, getCharacterIndexOfIndentFor, document, currentPosition, lineIndexToJumpTo, currentIndentLevel, indentLevelOfNewLine, hitAtLeastOneLineWithDifferentIndent, line, skippedBlankLines, indentLevelChanged}) {
    // if already top level
    if (currentIndentLevel == 0) {
        return cursorUpOrDownBlock({direction: "up", startingLineIndex, upperBound, lowerBound, getCharacterIndexOfIndentFor, document, currentPosition, lineIndexToJumpTo, currentIndentLevel, indentLevelOfNewLine, hitAtLeastOneLineWithDifferentIndent, line, skippedBlankLines, indentLevelChanged})
    }
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
            if (activeFile.indexIsInBounds(startingLineIndex-1)) {
                return cursorUpOrDownBlock({direction:"up", lineIndexToJumpTo: startingLineIndex, startingLineIndex, getCharacterIndexOfIndentFor, document, currentPosition, currentIndentLevel, indentLevelOfNewLine, hitAtLeastOneLineWithDifferentIndent, line, skippedBlankLines, indentLevelChanged})
            }
            return startingLineIndex
        }
    }
}

function cursorUpOrDownBlock({direction, startingLineIndex, upperBound, lowerBound, getCharacterIndexOfIndentFor, document, currentPosition, lineIndexToJumpTo, currentIndentLevel, indentLevelOfNewLine, hitAtLeastOneLineWithDifferentIndent, line}) {
    const baselineLevel = getIndentAmount(line.text.slice(0, activeFile.editor.selection.start.character))
    const goingUp = direction == "up"
    const incrementor = goingUp ? -1 : 1
    let iterNumber = 0
    let stayWithinBlock = false
    let failureValue = startingLineIndex
    while (true) {
        iterNumber++
        // if failed, then just go up or down 1
        if (!activeFile.indexIsInBounds(lineIndexToJumpTo+incrementor)) {
            if (goingUp) {
                return lowerBound
            } else {
                return upperBound
            }
        }
        // go up or down the line index
        lineIndexToJumpTo += incrementor
        indentLevelOfNewLine = getApproxIndentLevel(lineIndexToJumpTo)
        // info
        let indentLevelChanged = indentLevelOfNewLine != baselineLevel
        let blankLine = activeFile.lineAt(lineIndexToJumpTo).isEmptyOrWhitespace
        
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

function cursorJumpBlock({direction, shouldSelectRange, }) {
    try {
        // update the editor
        activeFile.tabSize = activeFile.editor.options.tabSize
        activeFile.lineIndentCache = {}
        // NOTE: bit of a misnomer cause the upperBound is the BOTTOM of the file (but its a larger line number)
        const upperBound = activeFile.lineCount - 1
        const lowerBound = 0
        activeFile.indexIsInBounds = (index) => index <= upperBound && index >= lowerBound
        let getCharacterIndexOfIndentFor = (lineIndex) => (activeFile.lineAt(lineIndex).text.match(/^[\t ]*/)[0].length)
        
        const document = activeFile.document
        const currentPosition = activeFile.cursorPosition
        const startingLineIndex = currentPosition.line
        const startingIndentLevel = getApproxIndentLevel(currentPosition.line)
        let lineIndexToJumpTo = startingLineIndex
        // TODO: args and the cursorUpOrDownBlock(args), cursorLeftBlock(args), etc need to be refactored/cleaned up
        const args = {
            direction,
            startingLineIndex,
            upperBound,
            lowerBound,
            getCharacterIndexOfIndentFor,
            document,
            currentPosition,
            lineIndexToJumpTo,
            currentIndentLevel: startingIndentLevel,
            indentLevelOfNewLine: startingIndentLevel,
            hitAtLeastOneLineWithDifferentIndent: false,
            line: activeFile.lineAt(currentPosition.line),
            skippedBlankLines: false,
            indentLevelChanged: false,
        }
        switch (direction) {
            // next line (up) with the same or smaller indent    
            // or next line (down) with the same or smaller indent
            case "up":
            case "down":      lineIndexToJumpTo = cursorUpOrDownBlock(args)  ; break
            // next line (up) with a smaller indent
            case "left":      lineIndexToJumpTo = cursorLeftBlock(args)      ; break
            // next line (down) with a larger indent
            case "rightDown": lineIndexToJumpTo = cursorRightDownBlock(args) ; break
            // next line (up) with a larger indent
            case "rightUp":   lineIndexToJumpTo = cursorRightUpBlock(args)   ; break
        }

        // 
        // get characterIndex
        // 
        let characterIndex = getCharacterIndexOfIndentFor(lineIndexToJumpTo)
        if (direction == "up" || direction == "down") {
            const startingCharIndex = startingIndentLevel * activeFile.tabSize
            characterIndex = startingCharIndex < characterIndex ? startingCharIndex : characterIndex
        }
        
        // 
        // set the cursor position
        // 
        changeCursorSelections({
            newCursorRanges: [ { lineIndex: lineIndexToJumpTo, characterIndex } ],
            shouldSelectRange,
        })
    } catch (error) {
        console.debug(`mario cursorJumpBlock() error is:`,error)
    }
}

/**
 * Function that does something
 *
 * @param {[{lineIndex, characterIndex,}]} args.newCursorRanges - what should be selected
 * @param {Boolean} [args.shouldSelectRange=true] - if ranges are desired
 *
 * @example
 *    changeCursorSelections({newCursorRanges:[{lineIndex: 5, characterIndex: 0, }]})
 */
function changeCursorSelections({ newCursorRanges, shouldSelectRange=false }) {
    const editor = vscode.window.activeTextEditor
    
    let createNewSelection = ({selection, newCursorRange, shouldRevealRange=false}) => {
        var { characterIndex, lineIndex, trailingCharacterIndex, trailingLineIndex, } = newCursorRange
        // provide default values
        if (trailingCharacterIndex == null && trailingLineIndex == null) {
            if (shouldSelectRange) {
                const activeCursorIsAtEnd = selection.active.line === selection.end.line
                // begining of the selection is the opposite side of the active cursor
                if (activeCursorIsAtEnd) {
                    trailingCharacterIndex = selection.start.character
                    trailingLineIndex = selection.start.line
                } else {
                    trailingCharacterIndex = selection.end.character
                    trailingLineIndex = selection.end.line
                }
            } else {
                trailingCharacterIndex = characterIndex
                trailingLineIndex = lineIndex
            }
        }
        const activeCursor = editor.selection.active.with(lineIndex, characterIndex)
        const selectionTail = editor.selection.active.with(trailingLineIndex, trailingCharacterIndex)
        shouldRevealRange && editor.revealRange(new vscode.Range(activeCursor, activeCursor))
        return new vscode.Selection( selectionTail, activeCursor )
    }

    if (newCursorRanges.length == 1) {
        editor.selection = createNewSelection({
            selection: editor.selection,
            newCursorRange: newCursorRanges[0],
            shouldRevealRange: true,
        })
    } else if (newCursorRanges.length > 0) {
        let isFirstSelection = true
        newCursorRanges = [...newCursorRanges] // copy to prevent mutation
        const selectionObjects = []
        for (const eachSelection of editor.selections) {
            const nextCursorRange = newCursorRanges.shift()
            if (nextCursorRange === undefined) {
                break
            }
            selectionObjects.push(
                createNewSelection({
                    selection: eachSelection,
                    newCursorRange: nextCursorRange,
                    // TODO: find a similar command to the one commented out below, but limit it to horizontal movement only
                    // otherwise it will have annoying behavior like snapping to the first/last selection when viewing the middle of multple selections
                    // editor.revealRange(new vscode.Range(newCursorLocation, newCursorLocation))
                    shouldRevealRange: isFirstSelection,
                })
            )
            isFirstSelection = false
        }
        // change all the cursors at one time
        editor.selections = selectionObjects
    }
}

function regexFindAll(regexPattern, sourceString) {
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

function findNext({pattern, goBackwards=false, startingCharacterIndex=null, startingLineIndex=null, selection=null}) {
    // process args
    if (selection == null) { selection = vscode.window.activeTextEditor.selection }
    const searchStartCharacterIndex = startingCharacterIndex == null ? selection.active.character : startingCharacterIndex
    const searchStartLineIndex      = startingLineIndex      == null ? selection.active.line      : startingLineIndex
    
    // setup
    const editor = vscode.window.activeTextEditor
    let characterIndex = searchStartCharacterIndex
    let lineIndex      = searchStartLineIndex
    const directionNumber = goBackwards ? -1 : 1
    
    // now try to find the next lineIndex and characterIndex
    lineIndex -= directionNumber // offset the begining becase the ++ is done at the top of the loop
    mainLoop: while (true) {
        try {
            lineIndex += directionNumber
            var lineContent = activeFile.lineAt(lineIndex).text
        } catch (error) {
            lineIndex = searchStartLineIndex
            characterIndex = searchStartCharacterIndex
            break mainLoop
        }
        let matches = regexFindAll(pattern, lineContent)
        if (matches.length > 0) {
            if (!goBackwards) {
                for (let eachMatch of matches) {
                    if (lineIndex == searchStartLineIndex) {
                        // must be after starting position
                        if (eachMatch.index > searchStartCharacterIndex) {
                            characterIndex = eachMatch.index
                            break mainLoop
                        }
                    } else {
                        characterIndex = eachMatch.index
                        break mainLoop
                    }
                }
            } else {
                for (let eachMatch of matches.reverse()) {
                    if (lineIndex == searchStartLineIndex) {
                        // must be before starting position
                        if (eachMatch.index < searchStartCharacterIndex-1) {
                            characterIndex = eachMatch.index+1
                            break mainLoop
                        }
                    } else {
                        characterIndex = eachMatch.index+1
                        break mainLoop
                    }
                }
            }
        }
    }
    
    return {characterIndex, lineIndex}
}

module.exports = {
    activate(context) {
        const newCommand = ({name, command}) => {
            console.debug(`creating command: ${name}`)
            context.subscriptions.push(vscode.commands.registerCommand("mario."+name, command))
        }
        
        newCommand({       name:"moveUp"           , command: ()=>cursorJumpBlock({ direction: "up",                                })       })
        newCommand({       name:"selectUp"         , command: ()=>cursorJumpBlock({ direction: "up",        shouldSelectRange:true, })       })
        newCommand({       name:"moveDown"         , command: ()=>cursorJumpBlock({ direction: "down",                              })       })
        newCommand({       name:"selectDown"       , command: ()=>cursorJumpBlock({ direction: "down",      shouldSelectRange:true, })       })
        newCommand({       name:"moveToOuter"      , command: ()=>cursorJumpBlock({ direction: "left",                              })       })
        newCommand({       name:"selectToOuter"    , command: ()=>cursorJumpBlock({ direction: "left",      shouldSelectRange:true, })       })
        newCommand({       name:"moveUpToInner"    , command: ()=>cursorJumpBlock({ direction: "rightUp",                           })       })
        newCommand({       name:"selectUpToInner"  , command: ()=>cursorJumpBlock({ direction: "rightUp",   shouldSelectRange:true, })       })
        newCommand({       name:"moveDownToInner"  , command: ()=>cursorJumpBlock({ direction: "rightDown",                         })       })
        newCommand({       name:"selectDownToInner", command: ()=>cursorJumpBlock({ direction: "rightDown", shouldSelectRange:true, })       })
        
        function nextFinder(name, pattern) {
            const genericFindNextFunction = ({ goBackwards, shouldSelectRange }) => {
                try {
                    const editor = vscode.window.activeTextEditor
                    let newCursorRanges = editor.selections.map(eachSelection => findNext({pattern: pattern, selection: eachSelection, goBackwards,}))
                    changeCursorSelections({ newCursorRanges, shouldSelectRange })
                } catch (error) {
                    console.debug(`mario.${name} error is:`,error)
                }
            }
            newCommand({ name: `next${name}`           , command: ()=>genericFindNextFunction({ goBackwards: false, shouldSelectRange: false, }) })
            newCommand({ name: `previous${name}`       , command: ()=>genericFindNextFunction({ goBackwards: true , shouldSelectRange: false, }) })
            newCommand({ name: `selectNext${name}`     , command: ()=>genericFindNextFunction({ goBackwards: false, shouldSelectRange: true , }) })
            newCommand({ name: `selectPrevious${name}` , command: ()=>genericFindNextFunction({ goBackwards: true , shouldSelectRange: true , }) })
        }

        nextFinder("Quote", /"|'|`/) // TODO: make quote know which quote it is matching (when finding more quotes in a selection)
        nextFinder("Comma", /,/)
    },

    deactivate() {

    }
}

