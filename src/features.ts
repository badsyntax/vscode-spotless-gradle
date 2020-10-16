import * as vscode from 'vscode';

const ignoredLanguages = ['log'];

export async function hasSpotlessTaskForLanguage(
  language: string
): Promise<boolean> {
  if (ignoredLanguages.includes(language.toLocaleLowerCase())) {
    return false;
  }
  const spotlessTaskName = `spotless${
    language[0].toUpperCase() + language.slice(1)
  }`;
  return !!(
    await vscode.tasks.fetchTasks({
      type: 'gradle',
    })
  ).find((task) => task.name === spotlessTaskName);
}
