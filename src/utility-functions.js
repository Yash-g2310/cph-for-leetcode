const vscode = require("vscode");
const fs = require('fs');
const path = require('path');
const {getCommentTemplate} = require('./langSwitch');

// function to extract languages from code snippets
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

// function to create file if file does not exist in workspace root else open the file
/**
 * @param {string} filename - Name of the file to create.
 * @param {string} fileExtension - Content to write to the file.
 * @param {string} content - Content to write to the file.
 */
async function createOpenFile(filename, fileExtension, content) {
    
    // manage workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : null;

    let folderPath;
    let filePath;
    
    if (workspaceFolder) {
        folderPath = workspaceFolder;
    } else {
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

        // added for safety
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }
    }

    filePath = path.join(folderPath, `${filename}.${fileExtension}`);
    const fileUri = vscode.Uri.file(filePath);
    const commentTemplate = getCommentTemplate(fileExtension);

    try{
        // if file exists, open it
        await vscode.workspace.fs.stat(fileUri);
        const document = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(document);
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
        // if file does not exist, create it
        const encoder = new TextEncoder(); // Encoder to convert text to bytes
        const data = encoder.encode(commentTemplate + content);
        await vscode.workspace.fs.writeFile(fileUri, data);
        const document = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(document);
    }

    // if work space is not open, open it, with folder made above
    if (!vscode.workspace.workspaceFolders) {
        const workspaceUri = vscode.Uri.file(folderPath);
        await vscode.commands.executeCommand('vscode.openFolder', workspaceUri);
    }
    return filePath;
}

// extracting testcases
/**
 * @param {string} htmlString - Test cases to write to the file.
 * @param {string} metaData - Meta data of the problem.
 * @returns {Array} Array of test case objects.
 */
function extractTestCases(htmlString,metaData) {
    const inputRegex = /<strong>Input:<\/strong>(.*?)\n/g;
    const outputRegex = /<strong>Output:<\/strong>(.*?)\n/g;
    let match;
    const rawInputs = [];
    const rawOutputs = [];

    // get raw inputs and outputs
    while ((match = inputRegex.exec(htmlString)) !== null) {
        rawInputs.push(match[0]);
    }
    while ((match = outputRegex.exec(htmlString)) !== null) {
        rawOutputs.push(match[0]);
    }

    const FinalInputs=[];
    const FinalOutputs=[];
    const FinalInputFormat =[];
    const types = getTests(metaData);

    // final input output
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
    
    // inputFormat -> how to give input to terminal at the time of running code
    FinalInputs.forEach((input) => {
        const inputFormat = getInputformat(input,types);
        FinalInputFormat.push(inputFormat);
    })

    // return test case objects
    const testCaseObjects = [];
    FinalInputs.forEach((input, index) => {
        const output = FinalOutputs[index];
        testCaseObjects.push({
            input: input,
            output: output,
            inputFormat: FinalInputFormat[index],
            types: types
        });
    });

    return testCaseObjects;
}

// function to get the input format for the given input
/**
 * @param {*} input - input object
 * @param {Array} types - type of input
 * @returns 
 */
function getInputformat(input,types){
    let ind=0;
    let inputformat = '';

    for(const key in input){
        let i=0;
        let ipt=input[key];
        while(ipt[0]=='['){
            i++;
            ipt = ipt.substring(1,ipt.length-1);
        }
        if(i === 1){
            ipt = input[key].substring(1,input[key].length-1);
            let arr = ipt.split(',');
            inputformat+=`${arr.length}\n`;
            inputformat+=arr.join(' ')+'\n';
        }
        else if (i === 2){
            const type = types[ind];
            ipt = input[key].substring(1,input[key].length-1);
            let arr = ipt.split('],[');
            if (type.toLowerCase().includes('matrix') || type.toLowerCase().includes('board')){
                inputformat+=`${arr.length} ${arr[0].split(',').length}\n`;
            }
            else if(type.toLowerCase().includes('tree') || type.toLowerCase().includes('graph')){
                inputformat+=`${arr.length}\n`;
            }
            for(let j=0;j<arr.length;j++){
                let temp = arr[j].split(',');
                temp.forEach((ele, index) => {
                    temp[index] = ele.replace('[','').replace(']','');
                });
                inputformat+=temp.join(' ')+'\n';
            }
        }
        else{
            inputformat+=input[key] +'\n';
        }
        ind++;
    }
    return inputformat
}

// function to get the test case types -> for making sure to give arr length in input format or not
/**
 * @param {string} metaData - Meta data of the problem.
 * @returns {Array} Array of test case types.
 */
function getTests(metaData){
    const metaDataObj = JSON.parse(metaData);
    const paramTypes = metaDataObj.params.map(param => param.name);

    return paramTypes;
    
}



module.exports ={ getLanguages, createOpenFile,extractTestCases};