const vscode = require("vscode");
const { LeetCode } = require("leetcode-query");
const { getLanguages, createOpenFile, extractTestCases } = require("./utility-functions");
const { getExtension } = require("./langSwitch");
const { TestCaseViewProvider } = require("./testCaseViewProvider");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log(
		'Congratulations, your extension "cph-for-leetcode" is now active!'
	);

	const testCaseViewProvider = new TestCaseViewProvider(context.extensionUri, context.globalState);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("testCaseView", testCaseViewProvider)
	);

	// when editor changes, save test cases for the previous file
	vscode.window.onDidChangeActiveTextEditor((editor) => {
		if (editor) {
			const fileName = editor.document.fileName;
			testCaseViewProvider.setActiveFile(fileName);
			testCaseViewProvider.saveTestCasesForFile();
		}
	});


	// when a document is closed, save test cases for that file
	vscode.workspace.onDidCloseTextDocument(() => {
		testCaseViewProvider.saveTestCasesForFile();
	});

	// when a document will be saved, save test cases for that file
	vscode.workspace.onWillSaveTextDocument(() => {
		testCaseViewProvider.saveTestCasesForFile();
	});

	// when a document is deleted, delete test cases for that file
	vscode.workspace.onDidDeleteFiles((event) => {
		const files = event.files;
		files.forEach((file) => {
			delete testCaseViewProvider._testCasesStorage[file.fsPath];
			testCaseViewProvider.saveTestCasesForFile();
		});
	})

	// when a document is created, save test cases for that file
	vscode.workspace.onDidCreateFiles((event) => {
		event.files.forEach((file) => {
			if (testCaseViewProvider._testCasesStorage[file.fsPath] === undefined) {
				testCaseViewProvider._testCasesStorage[file.fsPath] = [];
			}
			testCaseViewProvider.setActiveFile(file.fsPath);
			testCaseViewProvider.saveTestCasesForFile();
		});
	});

	// CPH: Fetch Problem
	const fetchProblem = vscode.commands.registerCommand(
		"cph-for-leetcode.fetchProblem",
		async function () {

			// take the URL from the user
			const problemURL = await vscode.window.showInputBox({
				placeHolder:
					"Enter LeetCode problem url (e.g., https://leetcode.com/problems/two-sum/)",
			});

			if (!problemURL) {
				vscode.window.showErrorMessage("URL is required!");
				return;
			}

			// get problem title from the URL
			const problemData = problemURL.split("/");
			const problemTitle = problemData[problemData.indexOf("problems") + 1];
			if (!problemTitle) {
				vscode.window.showErrorMessage("Not a valid LeetCode problem URL!");
				return;
			}

			// fetch problem from LeetCode
			const lc = new LeetCode();
			const problem = await lc.problem(problemTitle);

			// get possible languages
			const languages = getLanguages(problem["codeSnippets"]);

			// show quick pick to select the language
			const selectedItem = await vscode.window.showQuickPick(languages, {
				placeHolder: "Select the preferred language",
				canPickMany: false,
			});

			if (selectedItem) {
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

				// extract test cases from the problem content
				let testCases = extractTestCases(problem["content"],problem['metaData']);

				// save test cases for the file
				testCaseViewProvider._testCasesStorage[filePath] = testCases;
				testCaseViewProvider.saveTestCasesForFile();

				// open webview with the test cases for the file
				vscode.commands.executeCommand("testCaseView.focus").then(() => {
					testCaseViewProvider.setActiveFile(filePath);
					testCaseViewProvider.saveTestCasesForFile();
				});

			} else {
				vscode.window.showInformationMessage("No item selected");
			}
		}
	);

	// CPH: Run Test Cases
	const runTestCases = vscode.commands.registerCommand(
		"cph-for-leetcode.runTestCases",
		async function () {
			vscode.commands.executeCommand("testCaseView.focus").then(async () => {
				await testCaseViewProvider._runTestCases();
			})
		}
	);

	context.subscriptions.push(fetchProblem, runTestCases);
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate,
};
