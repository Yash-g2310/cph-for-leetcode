const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
class TestCaseViewProvider {
    /**
     * @param {vscode.Uri} extensionUri
     * @param {vscode.Memento} globalState
     */
    constructor(extensionUri, globalState) {
        vscode.window.showInformationMessage("Creating test case view provider...");
        this._extensionUri = extensionUri;
        this._globalState = globalState;
        this._testCasesStorage = this._globalState.get('testCaseStorage',{});
        this._activeFile = null;
    }

    /**
     * Set the currently active file.
     * @param {string} fileName
     */
    setActiveFile(fileName) {
        vscode.window.showInformationMessage(`Setting active file to ${fileName}`);
        this._activeFile = fileName;
        this._updateView();
    }

    /**
     * Save test cases for the currently active file.
     * @param {string} fileName
     */
    saveTestCasesForFile(fileName) {
        if (this._activeFile && this._testCasesStorage[this._activeFile]) {
            vscode.window.showInformationMessage(`Test cases saved for ${fileName}`);
            this._globalState.update('testCaseStorage', this._testCasesStorage);
        }
    }

    /**
     * Update the webview view with the test cases for the active file.
     */
    _updateView() {
        vscode.window.showInformationMessage(`Updating test cases for ${this._activeFile} before ${this._webviewView}, ${this._activeFile}`);
        if (this._webviewView && this._activeFile) {
            const testCases = this._testCasesStorage[this._activeFile] || [];
            vscode.window.showInformationMessage(`Updating test cases for ${testCases}`);
            this._webviewView.webview.postMessage({ command: "updateTestCases", testCases });
        }
    }

    /**
     * Handle resolving the webview view.
     * @param {vscode.WebviewView} webviewView
     */
    resolveWebviewView(webviewView) {
        vscode.window.showInformationMessage("Resolving webview view...");
        this._webviewView = webviewView;

        // Set up the HTML content for the webview
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage((message) => {
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
            }
        });

        // Initial update
        this._updateView();
    }
    

    /**
     * Generate HTML content for the webview.
     * @param {vscode.Webview} webview
     * @returns {string}
     */
        _getHtmlForWebview(webview) {
            const nonce = this._getNonce();
            const htmlPath = path.join(this._extensionUri.fsPath, 'src','webview.html');
            let html = fs.readFileSync(htmlPath, 'utf8');
            html = html.replace('{{nonce}}', nonce);
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

        for (const testCase of testCases) {
            const result = await this._runTestCase(testCase);
            results.push(result);
        }

        this._webviewView.webview.postMessage({ command: "testResults", results });
    }

    /**
     * Run a single test case.
     * @param {Object} testCase
     * @returns {Promise<Object>}
     */
    async _runTestCase(testCase) {
        const terminal = vscode.window.createTerminal(`Test Case Runner`);
        const fileExtension = path.extname(this._activeFile).substring(1);

        let runCommand;
        switch (fileExtension) {
            case 'js':
                runCommand = `node ${this._activeFile}`;
                break;
            case 'py':
                runCommand = `python ${this._activeFile}`;
                break;
            case 'cpp':
                runCommand = `g++ ${this._activeFile} -o ${this._activeFile}.out && ${this._activeFile}.out`;
                break;
            case 'java':
                runCommand = `javac ${this._activeFile} && java ${path.basename(this._activeFile, '.java')}`;
                break;
            // Add more cases for other languages as needed
            default:
                vscode.window.showErrorMessage(`Unsupported file extension: ${fileExtension}`);
                return { input: testCase.input, output: "Unsupported file extension" };
        }

        terminal.sendText(runCommand);
        terminal.show();

        return new Promise((resolve) => {
            const disposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
                if (closedTerminal === terminal) {
                    resolve({ input: testCase.input, output: "Test case output" });
                    disposable.dispose();
                }
            });
        });
    }
}

module.exports = { TestCaseViewProvider };
