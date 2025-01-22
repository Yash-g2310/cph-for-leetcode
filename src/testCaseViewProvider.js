const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { possibleCommands } = require("./langSwitch");

class TestCaseViewProvider {

    // globlal state maanagement done
    /**
     * @param {vscode.Uri} extensionUri
     * @param {vscode.Memento} globalState
     */
    constructor(extensionUri, globalState) {
        this._extensionUri = extensionUri;
        this._globalState = globalState;
        this._storageKey = "cph-for-leetcode.testCaseStorage.v1";
        this._testCasesStorage = this._globalState.get(this._storageKey, {});
        this._activeFile = null;

        if (vscode.window.activeTextEditor) {
            this._activeFile = vscode.window.activeTextEditor.document.fileName;
        }
    }

    // setting the active file and then updating (rerendering of the view)
    /**
     * @param {string} fileName
     */
    setActiveFile(fileName) {
        this._activeFile = fileName;
        this._updateView();
    }

    // saving the test cases globally
    saveTestCasesForFile() {
        if (this._activeFile && this._testCasesStorage[this._activeFile]) {
            this._globalState.update(this._storageKey, this._testCasesStorage);
            this._updateView();
        }
    }

    // updating the webview view (rerender it)
    _updateView() {
        if (this._webviewView && this._activeFile) {
            const testCases = this._testCasesStorage[this._activeFile] || [];
            this._webviewView.webview.postMessage({
                command: "updateTestCases",
                testCases,
            });
        }
    }

    // runs when webview is created
    /**
     * @param {vscode.WebviewView} webviewView
     */
    resolveWebviewView(webviewView) {
        this._webviewView = webviewView;

        // Set up the HTML content for the webview
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case "addTestCase":
                    if (this._activeFile) {
                        if (!this._testCasesStorage[this._activeFile]) {
                            this._testCasesStorage[this._activeFile] = [];
                        }
                        this._testCasesStorage[this._activeFile].push(message.testCase);
                        this._updateView();
                    }
                    break;
                case "saveTestCases":
                    if (this._activeFile) {
                        this._testCasesStorage[this._activeFile] = message.testCases;
                        this._globalState.update(this._storageKey, this._testCasesStorage);
                    }
                    break;
                case "runTestCases":
                    await this._runTestCases();
                    break;
                case "webviewReady":{
                    this._updateView();
                }
            }
        });

        // Initial update
        if (this._activeFile) {
            this._updateView();
        }
    }

    // for getting html of webview
    /**
     * @param {vscode.Webview} webview
     * @returns {string}
     */
    _getHtmlForWebview(webview) {
        const nonce = this._getNonce();
        const htmlPath = path.join(this._extensionUri.fsPath, "src", "webview.html");
        let html = fs.readFileSync(htmlPath, "utf8");

        // adding testcases and nonce to the html
        html = html.replace("{{nonce}}", nonce);
        return html;
    }

    // for generating nonce
    /**
     * @returns {string} A nonce string
     */
    _getNonce() {
        let text = "";
        const possible =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    // running the test cases
    async _runTestCases() {
        if (!this._activeFile) {
            vscode.window.showErrorMessage("No active file selected.");
            return;
        }

        // create the folder and files to store output
        const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const inputDir = path.join(workspaceFolder, "test_outputs");
        if (!fs.existsSync(inputDir)) {
            fs.mkdirSync(inputDir);
        }
        const fileNameWithoutExtension = path.basename(this._activeFile, path.extname(this._activeFile));

        // run each testCase -> get result -> write output to file (for all test cases)
        const testCases = this._testCasesStorage[this._activeFile] || [];
        const results = [];
        let i = 0;
        for (const testCase of testCases) {
            i++;
            const result = await this._runTestCase(testCase, i);
            results.push(result);
            const outputFilePath = path.join( inputDir, `${fileNameWithoutExtension}_output_${i}.txt`);
            fs.writeFileSync(outputFilePath, result.output);
        }

        this._webviewView.webview.postMessage({ command: "testResults", results });
    }

    // running the test case
    /**
     * @param {Object} testCase
     * @param {number} index
     * @returns {Promise<Object>}
     */
    async _runTestCase(testCase, index) {
        // create file and folder to store input.text seperately
        const fileExtension = path.extname(this._activeFile).substring(1);
        const fileNameWithoutExtension = path.basename( this._activeFile, path.extname(this._activeFile));
        const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const inputDir = path.join(workspaceFolder, "test_inputs");
        if (!fs.existsSync(inputDir)) {
            fs.mkdirSync(inputDir);
        }

        // get runcommand for the file
        const runCommand = possibleCommands(this._activeFile, fileExtension);
        if (!runCommand || runCommand === "") {
            vscode.window.showErrorMessage(
                `Unsupported file extension: ${fileExtension}`
            );
            return { input: testCase.input, output: "Unsupported file extension" };
        }

        // write input to file
        const inputFilePath = path.join( inputDir, `${fileNameWithoutExtension}_input_${index}.txt`);
        fs.writeFileSync(inputFilePath, testCase.inputFormat);

        // now combine command with input command then run with nodejs child process (exec)
        const commandWithInput = `${runCommand} < ${inputFilePath}`;

        return new Promise((resolve) => {
            const process = exec(commandWithInput, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Execution Error: ${error.message}`);
                    return resolve({
                        input: testCase.input,
                        output: `Error: ${error.message}`,
                    });
                }

                if (stderr) {
                    console.error(`Stderr: ${stderr}`);
                    return resolve({
                        input: testCase.input,
                        output: `Error: ${stderr}`,
                    });
                }

                console.log(`Stdout: ${stdout}`);
                resolve({
                    input: testCase.input,
                    output: stdout.trim(),
                });
            });

            process.on("SIGTERM", () => {
                console.log("Child process received SIGTERM. Terminating...");
                process.kill();
                vscode.window.showErrorMessage("Execution timed out");
                resolve({
                    input: testCase.input,
                    output: "SIGTERM",
                });
            });

            process.on("exit", (code) => {
                console.log(`Child process exited with code: ${code}`);
            });
        });
    }
}

module.exports = { TestCaseViewProvider };
