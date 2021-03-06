import * as vscode from 'vscode';
import { ALPanel } from "../ALPanel";
import { ALCommandBase } from "./Base/ALCommandBase";
import { ALSettings } from '../ALSettings';

export class BrowserPreviewCommand extends ALCommandBase {

    public constructor(lObjectDesigner: ALPanel, lExtensionPath: string) {
        super(lObjectDesigner, lExtensionPath);
    }

    async execute(message: any) {
        let checkExt = vscode.extensions.getExtension('auchenberg.vscode-browser-preview');
        if (!checkExt) {
            await vscode.window.showErrorMessage(`Browser Preview extension is not installed or disabled.`);
        }

        if (['Table','Page','PageExtension','TableExtension','Report', 'Query'].indexOf(message.Type) == -1) {
            await vscode.window.showErrorMessage(`${message.Type} objects cannot be run in Modern Client.`)
            return;
        }

        let type = (message.Type as string).replace('Extension', '');
        let objectId = message.Id;
        switch(message.Type) {
            case 'TableExtension':
            case 'PageExtension':
                let sourceObject = ALPanel.objectList!.find((f: any) => f.Name == message.TargetObject && f.Type == type);
                if (sourceObject) {
                    objectId = sourceObject.Id;
                }
                break;
        }

        let mainUri = (vscode.workspace as any).workspaceFolders[0].uri;
        let settings = new ALSettings(mainUri);
        let launchUrl = settings.getUrl(type, objectId);
        vscode.commands.executeCommand('browser-preview.openPreview', launchUrl);
    }
}