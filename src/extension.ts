
import * as vscode from "vscode";
import FormatProvider from './formatterProvider'

function findDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.Range | vscode.Range[] {
  let range = document.getWordRangeAtPosition(position);
  if (!range.isEmpty) {
    const selected = document.getText(range);
    const functionMatcher = new RegExp("^\\s*function\\s+(" + selected + ")")
    const localMatcher = new RegExp("^\\s*local\\s+([a-zA-Z][0-9a-zA-Z]+\\s+)+(" + selected + ")")
    let lineIndex = 0;
    let found = false;
    while (lineIndex <= position.line) {
      const line = document.lineAt(lineIndex).text;
      if (line.search(functionMatcher) >= 0) {
        range = new vscode.Range(new vscode.Position(lineIndex, line.search(selected)), new vscode.Position(lineIndex, line.search(selected) + selected.length));
        found = true;
        break;
      }
      if (line.search(localMatcher) >= 0) {
        range = new vscode.Range(new vscode.Position(lineIndex, line.search(selected)), new vscode.Position(lineIndex, line.search(selected) + selected.length));
        found = true;
      }
      lineIndex++;
    }
    if (range.start.line == position.line) {
      if (found) {
        let refs: vscode.Range[] = [];
        const refMatcher = new RegExp("\\b" + selected + "\\b")
        while (lineIndex < document.lineCount) {
          const line = document.lineAt(lineIndex).text;
          if (line.search(refMatcher) >= 0) {
            range = new vscode.Range(new vscode.Position(lineIndex, line.search(refMatcher)), new vscode.Position(lineIndex, line.search(refMatcher) + selected.length));
            refs.push(range);
          }
          lineIndex++;
        }
        return refs;
      } else {
        lineIndex = 0;
        while (lineIndex < position.line) {
          const line = document.lineAt(lineIndex).text;
          if (line.search(selected) >= 0) {
            range = new vscode.Range(new vscode.Position(lineIndex, line.search(selected)), new vscode.Position(lineIndex, line.search(selected) + selected.length));
          }
          lineIndex++;
        }
      }
    }
  }
  return range;
}

export async function activate(context: vscode.ExtensionContext) {
  const documentSelector: vscode.DocumentSelector = {
    language: 'jass',
  };
  context.subscriptions.push(vscode.languages.registerDocumentRangeFormattingEditProvider(documentSelector,
    new FormatProvider()
  ));
  context.subscriptions.push(vscode.languages.registerOnTypeFormattingEditProvider(documentSelector,
    new FormatProvider(),
    '\n'));
  context.subscriptions.push(vscode.languages.registerDefinitionProvider('jass', {
    provideDefinition(document, position, token) {
      let range = findDefinition(document, position);
      if (range instanceof vscode.Range) {
        return {
          uri: document.uri,
          range: range
        };
      } else {
        let locs: vscode.Location[] = [];
        range.forEach(r => locs.push({ uri: document.uri, range: r }));
        return locs;
      }
    }
  }));
  context.subscriptions.push(vscode.languages.registerHoverProvider('jass', {
    provideHover(document, position, token) {
      let range = findDefinition(document, position);
      if (range instanceof vscode.Range && range.start.line < position.line) {
        return {
          contents: [document.lineAt(range.start.line).text]
        };
      }
    }
  }));
}
export async function deactivate() {
}