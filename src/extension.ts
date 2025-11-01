import * as vscode from "vscode";

interface InfillResponse {
  content: string;
}
export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "rama-llama-95.helloWorld",
    () => {
      vscode.window.showInformationMessage("Hello from Rama Llama 95!");
    }
  );
  context.subscriptions.push(disposable);

  const providerDisposable =
    vscode.languages.registerInlineCompletionItemProvider(
      { pattern: "**" },
      {
        async provideInlineCompletionItems(document, position, context, token) {
          const prefixRange = new vscode.Range(
            new vscode.Position(0, 0),
            position
          );
          const inputPrefix = document.getText(prefixRange);

          const suffixRange = new vscode.Range(
            position,
            new vscode.Position(
              document.lineCount - 1,
              document.lineAt(document.lineCount - 1).text.length
            )
          );
          const inputSuffix = document.getText(suffixRange);

          const editor = vscode.window.activeTextEditor;
          if (!editor) {
            vscode.window.showInformationMessage("No active editor");
            return;
          }

          const filePath = editor.document.uri.fsPath;
          const fileName = editor.document.uri.path.split("/").pop();

          const workspaceFolder = vscode.workspace.getWorkspaceFolder(
            editor.document.uri
          );
          const projectName = workspaceFolder?.name ?? "untitled";

          const controller = new AbortController();
          const signal = controller.signal;
          token.onCancellationRequested(() => {
            controller.abort();
          });

          // const prompt = `<|repo_name|>${projectName}\n<|file_sep|>${fileName}\n<|fim_prefix|>${inputPrefix}<|fim_suffix|>${inputSuffix}<|fim_middle|>`;

          const body = {
            input_prefix: inputPrefix,
            input_suffix: inputSuffix,
            // prompt,
          };
          const config = vscode.workspace.getConfiguration("rama-llama-95");
          const url = config.get<string>("url");
          if (!url) {
            const message = "No server URL configured";
            vscode.window.showErrorMessage(message);
            throw new Error(message);
          }

          const response = await fetch(`${url}/infill`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            signal,
          });

          if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
          }

          const data = (await response.json()) as InfillResponse;

          const completion = new vscode.InlineCompletionItem(data.content);

          return [completion];
        },
      }
    );

  context.subscriptions.push(providerDisposable);
}

export function deactivate() {}
