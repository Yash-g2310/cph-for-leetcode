const vscode = require("vscode");
const fs = require('fs');
const path = require('path');
const {getCommentTemplate} = require('./langSwitch');

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
    const commentTemplate = getCommentTemplate(fileExtension);

    try{
        await vscode.workspace.fs.stat(fileUri);
        const document = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(document);
        vscode.window.showInformationMessage("File opened successfully!");
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
        const encoder = new TextEncoder(); // Encoder to convert text to bytes
        const data = encoder.encode(commentTemplate + content);
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
 * @param {string} metaData - Meta data of the problem.
 * @returns {Array} Array of test case objects.
 */
function extractTestCases(htmlString,metaData) {
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
    const FinalInputFormat =[];
    const types = getTests(metaData);

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
    
    FinalInputs.forEach((input) => {
        const inputFormat = getInputformat(input,types);
        FinalInputFormat.push(inputFormat);

    })

    const testCaseObjects = [];
    FinalInputs.forEach((input, index) => {
        const output = FinalOutputs[index];
        testCaseObjects.push({
            input: input,
            output: output,
            inputFormat: FinalInputFormat[index],
        });
    });

    console.log("+++++++++++++++++++++++++++++++++++++Test case objects: ");
    console.log(testCaseObjects);
    return testCaseObjects;
}

/**
 * 
 * @param {*} input - input object
 * @param {Array} types - type of input
 * @returns 
 */
function getInputformat(input,types){
    console.log("in getinputformat");
    console.log(types);
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
            console.log("type: ",type,typeof(type));
            console.log("lowercase: ",type.toLowerCase());
            ipt = input[key].substring(1,input[key].length-1);
            let arr = ipt.split('],[');
            if (type.toLowerCase().includes('matrix') || type.toLowerCase().includes('board')){
                console.log("--------------a");
                inputformat+=`${arr.length} ${arr[0].split(',').length}\n`;
            }
            else if(type.toLowerCase().includes('tree') || type.toLowerCase().includes('graph')){
                console.log("--------------b");
                inputformat+=`${arr.length}\n`;
            }
            for(let j=0;j<arr.length;j++){
                console.log("--------------c");
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

/**
 * @param {string} metaData - Meta data of the problem.
 * @returns {Array} Array of test case types.
 */
function getTests(metaData){
    // Parse JSON string to object
    const metaDataObj = JSON.parse(metaData);
    console.log(metaDataObj);

    // Extract parameter types
    const paramTypes = metaDataObj.params.map(param => param.name);
    console.log("-paramtypes>> ",paramTypes);

    return paramTypes;
    
}



module.exports ={ getLanguages, createOpenFile,extractTestCases};