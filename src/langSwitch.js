const vscode = require("vscode");
const path = require('path');

/**
 * @param {string} activeFile - Name of the active file.
 * @param {string} lang - Language of the active file.
 * 
 */
const possibleCommands = (activeFile, lang)=> {
    switch (lang) {
        case 'js':
            return `node ${activeFile}`;
        case 'py':
            return `python ${activeFile}`;
        case 'cpp':
            return `g++ "${activeFile}" -o "${activeFile}.exe" && "${activeFile}.exe"`;
        case 'c':
            return `gcc "${activeFile}" -o "${activeFile}.exe" && "${activeFile}.exe"`;
        case 'java':
            return `javac "${activeFile}" && java -cp "${path.dirname(activeFile)}" "${path.basename(activeFile, '.java')}"`;
        case 'cs':
            return `csc "${activeFile}" && "${path.basename(activeFile, '.cs')}.exe"`;
        case 'ts':
            return `tsc "${activeFile}" && node "${activeFile.replace('.ts', '.js')}"`;
        case 'php':
            return `php "${activeFile}"`;
        case 'swift':
            return `swift "${activeFile}"`;
        case 'kt':
            return `kotlinc "${activeFile}" -include-runtime -d "${activeFile}.jar" && java -jar "${activeFile}.jar"`;
        case 'dart':
            return `dart "${activeFile}"`;
        case 'go':
            return `go run "${activeFile}"`;
        case 'rb':
            return `ruby "${activeFile}"`;
        case 'scala':
            return `scala "${activeFile}"`;
        case 'rs':
            return `rustc "${activeFile}" -o "${activeFile}.exe" && "${activeFile}.exe"`;
        case 'rkt':
            return `racket "${activeFile}"`;
        case 'erl':
            return `erl -noshell -s "${path.basename(activeFile, '.erl')}" main -s init stop`;
        case 'ex':
            return `elixir "${activeFile}"`;
        default:
            return '';
    }
};

/**
 * 
 * @param {string} lang - Language of the code snippet.
 * @returns {string} Comment template for the given language.
 */

const comment = "You need to add input and output yourself in your preferred language. You can click on the input format to see in what format the input will be provided to you. The button is located at the bottom of each test case.\n"

const getCommentTemplate = (lang) => {
    const commentTemplates = {
        js: `// ${comment}`,
        py: `# ${comment}`,
        cpp: `// ${comment}`,
        c: `// ${comment}`,
        java: `// ${comment}`,
        cs: `// ${comment}`,
        ts: `// ${comment}`,
        php: `// ${comment}`,
        swift: `// ${comment}`,
        kt: `// ${comment}`,
        dart: `// ${comment}`,
        go: `// ${comment}`,
        rb: `// ${comment}`,
        scala: `// ${comment}`,
        rs: `// ${comment}`,
        rkt: `; ${comment}`,
        erl: `% ${comment}`,
        ex: `# ${comment}`,
    };
    return commentTemplates[lang] || `// ${comment}`;
};

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

module.exports = {possibleCommands, getCommentTemplate, getExtension};