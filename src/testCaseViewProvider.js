const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { exec } = require('child_process');
class TestCaseViewProvider {
    /**
     * @param {vscode.Uri} extensionUri
     * @param {vscode.Memento} globalState
     */
    constructor(extensionUri, globalState) {
        vscode.window.showInformationMessage("Creating test case view provider...");
        this._extensionUri = extensionUri;
        this._globalState = globalState;

        this._storageKey = 'cph-for-leetcode.testCaseStorage.v1';
        this._testCasesStorage = this._globalState.get(this._storageKey, {});
        this._activeFile = null;

        if (vscode.window.activeTextEditor) {
            this._activeFile = vscode.window.activeTextEditor.document.fileName;
        }
    }

    /**
     * Set the currently active file.
     * @param {string} fileName
     */
    setActiveFile(fileName) {
        console.log(`Setting active file to ${fileName}`);
        this._activeFile = fileName;
        this._updateView();
    }

    /**
     * Save test cases for the currently active file.
     * @param {string} fileName
     */
    saveTestCasesForFile(fileName) {
        console.log(`Saving test cases for ${fileName}`);
        if (this._activeFile && this._testCasesStorage[this._activeFile]) {
            this._globalState.update(this._storageKey, this._testCasesStorage);
            console.log(`Test cases saved for ${this._activeFile}`);  
            console.log(`Test cases  ${this._testCasesStorage[this._activeFile]}`);          
        }
    }

    /**
     * Update the webview view with the test cases for the active file.
     */
    _updateView() {
        console.log(`Updating test cases for ${this._activeFile} before ${this._webviewView}, ${this._activeFile}`);
        if (this._webviewView && this._activeFile) {
            const testCases = this._testCasesStorage[this._activeFile] || [];
            console.log(`>>>>>>>>>>> ${testCases}`);
            this._webviewView.webview.postMessage({ command: "updateTestCases", testCases });
            console.log(`Updating test cases for ${this._activeFile} after ${this._webviewView}, ${this._activeFile}`);
        }
    }

    /**
     * Handle resolving the webview view.
     * @param {vscode.WebviewView} webviewView
     */
    resolveWebviewView(webviewView) {
        console.log(`Resolving webview view`);
        this._webviewView = webviewView;

        // Set up the HTML content for the webview
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        console.log(`html content for webview ${webviewView.webview.html}`);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async(message) => {
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
            }
        });

        // Initial update
        if (this._activeFile) {
            this._updateView();
        }
    }
    

    /**
     * Generate HTML content for the webview.
     * @param {vscode.Webview} webview
     * @returns {string}
     */
        _getHtmlForWebview(webview) {
            const nonce = this._getNonce();
            const testCases = JSON.stringify(this._testCasesStorage[this._activeFile] || []);
            console.log(`inside getHtmlForWebview and sending the test cases ${testCases}`);
            const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'webview.html');
            let html = fs.readFileSync(htmlPath, 'utf8');
            html = html.replace('{{nonce}}', nonce);
            html = html.replace('{{testCases}}', testCases);
            return html;
    }

    /**
     * Generate a nonce for security
     * @returns {string} A nonce string
     */
    _getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    async _runTestCases() {
        if (!this._activeFile) {
            vscode.window.showErrorMessage("No active file selected.");
            return;
        }
        
        const testCases = this._testCasesStorage[this._activeFile] || [];
        const results = [];
        let i=0;
        for (const testCase of testCases) {
            i++;
            console.log(`Running test case ${i}`);
            console.log(`inside runtestcases and runing the test cases`);
            const result = await this._runTestCase(testCase);
            results.push(result);
        }
        console.log(`inside runtestcases and sending the test results`);
        console.log(`Sending test results to webview: ${results} ${results.length} ${results[0]}`);
        console.log(`Sending test results to webview: ${typeof(results)} ${typeof(results[0])}`);
        console.log(`Sending test results to webview: ${this._webviewView}`);
        console.log("Is webview visible:", this._webviewView?.visible);
        console.log("Test results to send:", JSON.stringify(results, null, 2));
        this._webviewView.webview.postMessage({ command: "testResults", results });
        console.log("Webview script loaded");
    }

    /**
     * Run a single test case.
     * @param {Object} testCase
     * @returns {Promise<Object>}
     */
    async _runTestCase(testCase) {
        const fileExtension = path.extname(this._activeFile).substring(1);
        console.log(`Running test case for ${fileExtension}`);
        console.log(`input: ${testCase.input}`);
        console.log(`output: ${testCase.output}`);
    
        // Mapping file extensions to run commands
        const commands = {
            js: `node ${this._activeFile}`,
            py: `python ${this._activeFile}`,
            cpp: `g++ "${this._activeFile}" -o "${this._activeFile}.exe" && "${this._activeFile}.exe"`,
            c: `gcc "${this._activeFile}" -o "${this._activeFile}.exe" && "${this._activeFile}.exe"`,
            java: `javac "${this._activeFile}" && java -cp "${path.dirname(this._activeFile)}" "${path.basename(this._activeFile, '.java')}"`,
            cs: `csc "${this._activeFile}" && "${path.basename(this._activeFile, '.cs')}.exe"`,
            ts: `tsc "${this._activeFile}" && node "${this._activeFile.replace('.ts', '.js')}"`,
            php: `php "${this._activeFile}"`,
            swift: `swift "${this._activeFile}"`,
            kt: `kotlinc "${this._activeFile}" -include-runtime -d "${this._activeFile}.jar" && java -jar "${this._activeFile}.jar"`,
            dart: `dart "${this._activeFile}"`,
            go: `go run "${this._activeFile}"`,
            rb: `ruby "${this._activeFile}"`,
            scala: `scala "${this._activeFile}"`,
            rs: `rustc "${this._activeFile}" -o "${this._activeFile}.exe" && "${this._activeFile}.exe"`,
            rkt: `racket "${this._activeFile}"`,
            erl: `erl -noshell -s "${path.basename(this._activeFile, '.erl')}" main -s init stop`,
            ex: `elixir "${this._activeFile}"`
        };
    
        if (!commands[fileExtension]) {
            vscode.window.showErrorMessage(`Unsupported file extension: ${fileExtension}`);
            return { input: testCase.input, output: "Unsupported file extension" };
        }
    
        const runCommand = commands[fileExtension];
        console.log(`Running command: ${runCommand}`);
    
        return new Promise((resolve) => {
            console.log(`inside promise`);
            const process = exec(runCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Execution Error: ${error.message}`);
                    return resolve({ 
                        input: testCase.input, 
                        output: `Error: ${error.message}` 
                    });
                }
    
                if (stderr) {
                    console.error(`Stderr: ${stderr}`);
                    return resolve({ 
                        input: testCase.input, 
                        output: `Error: ${stderr}` 
                    });
                }

                console.log(`Stdout: ${stdout}`);
                resolve({ 
                    input: testCase.input, 
                    output: stdout.trim() 
                });
            });
    
            process.on('SIGTERM', () => {
                console.log('Child process received SIGTERM. Terminating...');
                process.kill();
                vscode.window.showErrorMessage('Execution timed out');
                resolve({ 
                    input: testCase.input, 
                    output: 'SIGTERM' 
                });
            });
    
            process.on('exit', (code) => {
                console.log(`Child process exited with code: ${code}`);
            });
        });
    }
}

module.exports = { TestCaseViewProvider };
