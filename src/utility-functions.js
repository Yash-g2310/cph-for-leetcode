const vscode = require("vscode");
const fs = require('fs');
const path = require('path');

/**
 * @param {Array} codeSnippets - Array of code snippets.
 */
const getLanguages = async (codeSnippets) => {
    const languages = [];
    codeSnippets.forEach((snippet) => {
        languages.push(snippet.lang);
    });
    return languages;
};

/**
 * @param {string} filename - Name of the file to create.
 * @param {string} fileExtension - Content to write to the file.
 * @param {string} content - Content to write to the file.
 */

async function createOpenFile(filename, fileExtension, content) {
    // Check if there is a workspace folder open
    const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : null;

    let folderPath;
    let filePath;
    
    if (workspaceFolder) {
        // If workspace is open, create the file inside the workspace
        folderPath = workspaceFolder;
    } else {
        // If no workspace, prompt user to select or create a folder
        const folderUri = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            openLabel: 'Select a folder for your workspace',
        });

        if (!folderUri) {
            vscode.window.showInformationMessage("Folder creation canceled.");
            return;
        }

        folderPath = folderUri[0].fsPath;

        // Optional: If folder doesn't exist, you can create it
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }
    }

    // Create a new file in the selected folder
    filePath = path.join(folderPath, `${filename}.${fileExtension}`);
    const fileUri = vscode.Uri.file(filePath);
    try{
        await vscode.workspace.fs.stat(fileUri);
        const document = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(document);
        vscode.window.showInformationMessage("File opened successfully!");
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
        const encoder = new TextEncoder(); // Encoder to convert text to bytes
        const data = encoder.encode(content);
        await vscode.workspace.fs.writeFile(fileUri, data);
        const document = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(document);
        vscode.window.showInformationMessage("File created successfully!");
    }
    // Path for the new file
    vscode.window.showInformationMessage(filename);
                vscode.window.showInformationMessage(fileExtension);
                vscode.window.showInformationMessage(content);

    if (!vscode.workspace.workspaceFolders) {
        const workspaceUri = vscode.Uri.file(folderPath);
        await vscode.commands.executeCommand('vscode.openFolder', workspaceUri);
    }
    return filePath;
}

/**
 * @param {string} htmlString - Test cases to write to the file.
 * @returns {Array} Array of test case objects.
 */
function extractTestCases(htmlString) {
    const inputRegex = /<strong>Input:<\/strong>(.*?)\n/g;
    const outputRegex = /<strong>Output:<\/strong>(.*?)\n/g;
    let match;
    const rawInputs = [];
    const rawOutputs = [];

    while ((match = inputRegex.exec(htmlString)) !== null) {
        rawInputs.push(match[0]);
    }
    while ((match = outputRegex.exec(htmlString)) !== null) {
        rawOutputs.push(match[0]);
    }

    const FinalInputs=[];
    const FinalOutputs=[];
    rawInputs.forEach((input) => {
        const inputPairs = input.substring(24,input.length-1).split(', ').map(pair => pair.trim());
        const inputObj = {};
        inputPairs.forEach(pair => {
            const [key, value] = pair.split(' = ').map(str => str.trim());
                inputObj[key] = value;
        });
        FinalInputs.push(inputObj);
    });
    rawOutputs.forEach((output) => {
        const out = output.substring(25,output.length-1);
        FinalOutputs.push(out);
    });
    const testCaseObjects = [];
    FinalInputs.forEach((input, index) => {
        const output = FinalOutputs[index];
        testCaseObjects.push({
            input: input,
            output: output
        });
    });
    return testCaseObjects;
}

/**
 * @param {string} language - Language of the code snippet.
 * @returns {string} File extension for the given language
 */
function getExtension(language){
    switch (language) {
        case 'C++':
            return 'cpp';
        case 'Java':
            return 'java';
        case 'Python':
        case 'Python3':
            return 'py';
        case 'C':
            return 'c';
        case 'C#':
            return 'cs';
        case 'JavaScript':
        case 'Node.js':
            return 'js';
        case 'TypeScript':
            return 'ts';
        case 'PHP':
            return 'php';
        case 'Swift':
            return 'swift';
        case 'Kotlin':
            return 'kt';
        case 'Dart':
            return 'dart';
        case 'Go':
            return 'go';
        case 'Ruby':
            return 'rb';
        case 'Scala':
            return 'scala';
        case 'Rust':
            return 'rs';
        case 'Racket':
            return 'rkt';
        case 'Erlang':
            return 'erl';
        case 'Elixir':
            return 'ex';
        default:
            return 'txt';
    }
}




module.exports ={ getLanguages, createOpenFile,extractTestCases,getExtension};