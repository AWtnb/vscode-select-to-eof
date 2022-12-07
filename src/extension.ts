import * as vscode from "vscode";

const scanLine = (line: string, search: string, stack: number[] = []): number[] => {
  if (search.length < 1 || line.length < 1 || line.indexOf(search) < 0) {
    return stack;
  }
  const lastIdx = stack.length ? stack.slice(-1)[0] + search.length : 0;
  stack.push(lastIdx + line.indexOf(search));
  const rest = line.substring(line.indexOf(search) + search.length);
  return scanLine(rest, search, stack);
};

const scanToEOF = (editor: vscode.TextEditor, current: vscode.Selection): vscode.Selection[] => {
  const sels: vscode.Selection[] = [];
  const search = editor.document.getText(current);
  for (let i = current.start.line; i < editor.document.lineCount; i++) {
    const line = editor.document.lineAt(i);
    const rangeStartIndices = scanLine(line.text, search, []);
    if (rangeStartIndices.length) {
      rangeStartIndices
        .filter((startIdx) => {
          if (i == current.start.line) return current.start.character <= startIdx;
          return true;
        })
        .forEach((startIdx) => {
          const startPos = new vscode.Position(i, startIdx);
          const endPos = new vscode.Position(i, startIdx + search.length);
          sels.push(new vscode.Selection(startPos, endPos));
        });
    }
  }
  return sels;
};

const scrollToNextSelection = (editor: vscode.TextEditor) => {
  if (editor.selections.length < 2) {
    return;
  }
  const visible = editor.visibleRanges[0];
  const unseenSelections = editor.selections.filter((sel) => {
    return visible.end.line < sel.start.line;
  });
  const targetLine = unseenSelections.length < 1 ? editor.selections[0].start.line : unseenSelections[0].start.line;
  vscode.commands.executeCommand("revealLine", {
    lineNumber: targetLine,
    at: "center",
  });
};

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand("select-to-eof.seed", (editor: vscode.TextEditor) => {
      const current = editor.selection;
      if (current.isEmpty) {
        return;
      }
      editor.selections = scanToEOF(editor, current);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand("select-to-eof.scroll", (editor: vscode.TextEditor) => {
      scrollToNextSelection(editor);
    })
  );
}

export function deactivate() {}
