// /* eslint-disable @typescript-eslint/no-unused-vars */
// import {
//   Difference,
//   generateDifferences,
//   // showInvisibles,
// } from 'prettier-linter-helpers';
// // import { diff } from 'semver';
// // import { diff } from 'semver';
// import * as vscode from 'vscode';
// import { logger } from './logger';
// import { Spotless } from './Spotless';

// const { INSERT, DELETE, REPLACE } = generateDifferences;

// const noChanges: vscode.CodeAction[] = [];

// function reportInsert(
//   context: vscode.CodeActionContext,
//   offset: number,
//   text: string
// ): void {
//   // const pos = context.getSourceCode().getLocFromIndex(offset);
//   // const range = [offset, offset];
//   // context.report({
//   //   message: 'Insert `{{ code }}`',
//   //   data: { code: showInvisibles(text) },
//   //   loc: { start: pos, end: pos },
//   //   fix(fixer) {
//   //     return fixer.insertTextAfterRange(range, text);
//   //   },
//   // });
// }

// function reportDelete(
//   context: vscode.CodeActionContext,
//   offset: number,
//   text: string
// ): void {
//   // const start = context.getSourceCode().getLocFromIndex(offset);
//   // const end = context.getSourceCode().getLocFromIndex(offset + text.length);
//   // const range = [offset, offset + text.length];
//   // context.report({
//   //   message: 'Delete `{{ code }}`',
//   //   data: { code: showInvisibles(text) },
//   //   loc: { start, end },
//   //   fix(fixer) {
//   //     return fixer.removeRange(range);
//   //   },
//   // });
// }

// function reportReplace(
//   context: vscode.CodeActionContext,
//   offset: number,
//   deleteText: string,
//   insertText: string
// ): void {
//   // const start = context.getSourceCode().getLocFromIndex(offset);
//   // const end = context
//   //   .getSourceCode()
//   //   .getLocFromIndex(offset + deleteText.length);
//   // const range = [offset, offset + deleteText.length];
//   // context.report({
//   //   message: 'Replace `{{ deleteCode }}` with `{{ insertCode }}`',
//   //   data: {
//   //     deleteCode: showInvisibles(deleteText),
//   //     insertCode: showInvisibles(insertText),
//   //   },
//   //   loc: { start, end },
//   //   fix(fixer) {
//   //     return fixer.replaceTextRange(range, insertText);
//   //   },
//   // });
// }

// function reportDifferences(
//   context: vscode.CodeActionContext,
//   differences: Difference[]
// ): void {
//   differences.forEach((difference) => {
//     switch (difference.operation) {
//       case INSERT:
//         reportInsert(context, difference.offset, difference.insertText!);
//         break;
//       case DELETE:
//         reportDelete(context, difference.offset, difference.deleteText!);
//         break;
//       case REPLACE:
//         reportReplace(
//           context,
//           difference.offset,
//           difference.deleteText!,
//           difference.insertText!
//         );
//         break;
//     }
//   });
// }

// export class FixAllCodeActionProvider implements vscode.CodeActionProvider {
//   public static readonly fixAllCodeActionKind = vscode.CodeActionKind.SourceFixAll.append(
//     'spotlessGradle'
//   );

//   public static metadata: vscode.CodeActionProviderMetadata = {
//     providedCodeActionKinds: [FixAllCodeActionProvider.fixAllCodeActionKind],
//   };

//   constructor(private readonly spotless: Spotless) {}

//   public async provideCodeActions(
//     document: vscode.TextDocument,
//     _range: vscode.Range | vscode.Selection,
//     context: vscode.CodeActionContext,
//     cancellationToken: vscode.CancellationToken
//   ): Promise<vscode.CodeAction[]> {
//     if (!context.only) {
//       return noChanges;
//     }

//     if (
//       !context.only.contains(FixAllCodeActionProvider.fixAllCodeActionKind) &&
//       !FixAllCodeActionProvider.fixAllCodeActionKind.contains(context.only)
//     ) {
//       return noChanges;
//     }

//     try {
//       const {
//         source,
//         formattedSource,
//         differences,
//       } = await this.spotless.getDiff(document, cancellationToken);
//       console.log(source, formattedSource, differences);
//       if (differences.length) {
//         reportDifferences(context, differences);
//       }

//       const newText = await this.spotless.apply(document, cancellationToken);
//       if (!newText) {
//         return noChanges;
//       }
//       const range = new vscode.Range(
//         document.positionAt(0),
//         document.positionAt(document.getText().length)
//       );
//       const title = 'Format code using Spotless';
//       const action = new vscode.CodeAction(
//         title,
//         FixAllCodeActionProvider.fixAllCodeActionKind
//       );
//       action.edit = new vscode.WorkspaceEdit();
//       action.edit.replace(document.uri, range, newText);
//       action.isPreferred = true;

//       return [action];
//     } catch (e) {
//       logger.error(`Unable to apply code action: ${e.message}`);
//       return noChanges;
//     }
//   }
// }
