import * as vscode from "vscode";

const scanLine = (line: string, search: string, stack: number[] = []): number[] => {
  const idx = line.indexOf(search);
  if (search.length < 1 || line.length < 1 || idx < 0) {
    return stack;
  }
  const lastIdx = stack.length ? stack.slice(-1)[0] + search.length : 0;
  stack.push(lastIdx + idx);
  const rest = line.substring(idx + search.length);
  return scanLine(rest, search, stack);
};

const scanToEOF = (editor: vscode.TextEditor, base: vscode.Selection): vscode.Selection[] => {
  const sels: vscode.Selection[] = [];
  const search = editor.document.getText(base);
  for (let i = base.start.line; i < editor.document.lineCount; i++) {
    const line = editor.document.lineAt(i);
    const offsets = scanLine(line.text, search, []);
    if (offsets.length < 1) {
      continue;
    }
    offsets
      .filter((offset) => {
        if (i == base.start.line) {
          return base.start.character <= offset;
        }
        return true;
      })
      .forEach((offset) => {
        const s = new vscode.Selection(i, offset, i, offset + search.length);
        sels.push(s);
      });
  }
  return sels;
};


const sortSels = (sels: vscode.Selection[]): vscode.Selection[] => {
  return sels.sort((a, b) => {
    if (a.start < b.start) return -1;
    if (b.start < a.start) return 1;
    return 0;
  });
};

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand("select-to-eof.seed", (editor: vscode.TextEditor) => {
      if (editor.selections.length < 2) {
        editor.selections = scanToEOF(editor, editor.selection);
        return;
      }
      const sels = sortSels(editor.selections.slice());
      const base = sels.slice(-1)[0];
      if (base.isEmpty) {
        return;
      }
      editor.selections = scanToEOF(editor, base);
    })
  );
}

export function deactivate() {}
