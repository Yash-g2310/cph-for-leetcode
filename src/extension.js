const vscode = require("vscode");
const { LeetCode } = require("leetcode-query"); // Use default import
const { getLanguages, createOpenFile,extractTestCases,getExtension } = require("./utility-functions");
// const { createTestCaseTab } = require("./webview");
const { TestCaseViewProvider } = require("./testCaseViewProvider");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log(
		'Congratulations, your extension "cph-for-leetcode" is now active!'
	);
	const disposable = vscode.commands.registerCommand(
		"cph-for-leetcode.helloWorld",
		function () {
			vscode.window.showInformationMessage(
				"Hello World from CPH for LeetCode!"
			);
		}
	);

	const testCaseViewProvider = new TestCaseViewProvider(context.extensionUri, context.globalState);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider("testCaseView", testCaseViewProvider)
    );

	vscode.window.onDidChangeActiveTextEditor((editor) => {
		if (editor) {
			const fileName = editor.document.fileName;
			testCaseViewProvider.setActiveFile(fileName);
		}
	});

	// Handle saving test cases before closing the editor
	vscode.workspace.onDidCloseTextDocument((document) => {
		const fileName = document.fileName;
		testCaseViewProvider.saveTestCasesForFile(fileName);
	});

	vscode.workspace.onWillSaveTextDocument((event) => {
        const fileName = event.document.fileName;
        testCaseViewProvider.saveTestCasesForFile(fileName);
    });

	vscode.workspace.onDidDeleteFiles((event) => {
		const files = event.files;
		files.forEach((file) => {
			delete testCaseViewProvider._testCasesStorage[file.fsPath];
			testCaseViewProvider.saveTestCasesForFile(file.fsPath);
		});
	})

	vscode.workspace.onDidCreateFiles((event) => {
		event.files.forEach((file) => {
			if (testCaseViewProvider._testCasesStorage[file.fsPath] === undefined) {
				testCaseViewProvider._testCasesStorage[file.fsPath] = [];
			}
			testCaseViewProvider.setActiveFile(file.fsPath);
		});
	});

	const fetchProblem = vscode.commands.registerCommand(
		"cph-for-leetcode.fetchProblem",
		async function () {
			const problemURL = await vscode.window.showInputBox({
				placeHolder:
					"Enter LeetCode problem url (e.g., https://leetcode.com/problems/two-sum/)",
			});

			if (!problemURL) {
				vscode.window.showErrorMessage("URL is required!");
				return;
			}

			const problemData = problemURL.split("/");
			const problemTitle = problemData[problemData.indexOf("problems") + 1];
			if (!problemTitle) {
				vscode.window.showErrorMessage("Not a valid LeetCode problem URL!");
				return;
			}
			// vscode.window.showInformationMessage(problemTitle);

			const lc = new LeetCode();
			const problem = await lc.problem(problemTitle);
			// task
			// 1. take languages out and ask user to select one (done)
			// 2. create a file with whole boilerplate code, combining the code you gave, (not done)
			// make the side bar with test cases (nd)
			// swich file

			const languages = getLanguages(problem["codeSnippets"]);

			const selectedItem = await vscode.window.showQuickPick(languages, {
				placeHolder: "Select the preferred language",
				canPickMany: false,
			});

			if (selectedItem) {
				vscode.window.showInformationMessage(`You selected: ${selectedItem}`);
				const codeSnippet = problem["codeSnippets"].find(
					(snippet) => snippet.lang === selectedItem
				);
				const code = codeSnippet.code;
				const fileExtension = getExtension(codeSnippet.lang);
				const filePath = await createOpenFile(
					problemTitle,
					fileExtension,
					code
				);
				let testCases = extractTestCases(problem["content"]);
				if (
					testCaseViewProvider._testCasesStorage[filePath] === undefined ||
					testCaseViewProvider._testCasesStorage[filePath].length === 0
				) {
					testCaseViewProvider._testCasesStorage[filePath] = testCases;
				}
				vscode.commands.executeCommand("testCaseView.focus").then(() => {
					testCaseViewProvider.setActiveFile(filePath);
				});
				vscode.window.showInformationMessage(testCaseViewProvider._testCasesStorage[filePath]);

			} else {
				vscode.window.showInformationMessage("No item selected");
			}
		}
	);

	context.subscriptions.push(disposable, fetchProblem);
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate,
};
