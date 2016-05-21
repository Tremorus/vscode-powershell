/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import os = require('os');
import fs = require('fs');
import cp = require('child_process');
import path = require('path');
import vscode = require('vscode');
import settingsManager = require('./settings');
import { LanguageClient, LanguageClientOptions, Executable, RequestType, NotificationType, StreamInfo } from 'vscode-languageclient';

import { registerExpandAliasCommand } from './features/ExpandAlias';
import { registerShowHelpCommand } from './features/ShowOnlineHelp';
import { registerOpenInISECommand } from './features/OpenInISE';
import { registerPowerShellFindModuleCommand } from './features/PowerShellFindModule';
import { registerConsoleCommands } from './features/Console';
import { registerExtensionCommands } from './features/ExtensionCommands';

import net = require('net');

var requiredEditorServicesVersion = "0.7.0";

var powerShellProcess: cp.ChildProcess = undefined;
var languageServerClient: LanguageClient = undefined;
var PowerShellLanguageId = 'powershell';

export function activate(context: vscode.ExtensionContext): void {

    var settings = settingsManager.load('powershell');

    vscode.languages.setLanguageConfiguration(PowerShellLanguageId,
        {
            wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\=\+\[\{\]\}\\\|\;\'\"\,\.\<\>\/\?\s]+)/g,

            indentationRules: {
                // ^(.*\*/)?\s*\}.*$
                decreaseIndentPattern: /^(.*\*\/)?\s*\}.*$/,
                // ^.*\{[^}"']*$
                increaseIndentPattern: /^.*\{[^}"']*$/
            },

            comments: {
                lineComment: '#',
                blockComment: ['<#', '#>']
            },

            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')'],
            ],

            __electricCharacterSupport: {
                docComment: { scope: 'comment.documentation', open: '/**', lineStart: ' * ', close: ' */' }
            },

            __characterPairSupport: {
                autoClosingPairs: [
                    { open: '{', close: '}' },
                    { open: '[', close: ']' },
                    { open: '(', close: ')' },
                    { open: '"', close: '"', notIn: ['string'] },
                    { open: '\'', close: '\'', notIn: ['string', 'comment'] }
                ]
            }
        });

    // The language server is only available on Windows
    if (os.platform() == "win32")
    {
        // Get the current version of this extension
        var hostVersion =
            vscode
                .extensions
                .getExtension("ms-vscode.PowerShell")
                .packageJSON
                .version;

        var startArgs =
            '-EditorServicesVersion "' + requiredEditorServicesVersion + '"' +
            '-HostName "Visual Studio Code Host" ' +
            '-HostProfileId "Microsoft.VSCode" ' +
            '-HostVersion "' + hostVersion + '" ' +
            '-BundledModulesPath "' + settings.developer.bundledModulePath + '" ';

        if (settings.developer.editorServicesWaitForDebugger) {
            startArgs += '-WaitForDebugger ';
        }
        if (settings.developer.editorServicesLogLevel) {
            startArgs += '-LogLevel "' + settings.developer.editorServicesLogLevel + '" '
        }

        // Find the path to powershell.exe
        var powerShellExePath = "powershell.exe";
        if (settings.developer.powerShellExePath) {
            powerShellExePath = settings.developer.powerShellExePath;

            // If the path does not exist, show an error
            fs.access(
                powerShellExePath, fs.X_OK,
                (err) => {
                    if (err) {
                        vscode.window.showErrorMessage(
                            "powershell.exe cannot be found or is not accessible at path " + powerShellExePath);
                    }
                    else {
                        startLanguageClient(
                            powerShellExePath,
                            startArgs);
                    }
                });
        }
        else {
            // If the setting wasn't filled in and the user desires a 32-bit host,
            // build the right powershell.exe path
            if (settings.useX86Host && process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432')) {
                powerShellExePath = process.env.windir + '\\Sysnative\\WindowsPowerShell\\v1.0\\powershell.exe';
            }

            startLanguageClient(
                powerShellExePath,
                startArgs);
        }
    }
}

function startLanguageClient(powerShellExePath: string, startArgs: string) {
    try
    {
        let pipeName = "PSES-VSCode-LanguageService-" + process.env.VSCODE_PID;
        let startScriptPath =
            path.resolve(
                __dirname,
                '../scripts/Start-EditorServices.ps1');

        startArgs += '-WaitForCompletion -LanguageServicePipeName "' + pipeName + '" ';

        let args = [
            '-NoProfile',
            '-NonInteractive',
            '-ExecutionPolicy', 'Unrestricted',
            '-Command', startScriptPath + ' ' +startArgs
        ]

        // Launch PowerShell as child process
        powerShellProcess = cp.spawn(powerShellExePath, args);
        powerShellProcess.stderr.on(
            'data',
            (data) => {
                console.log("powershell.exe - ERROR: " + data);
            });

        powerShellProcess.on(
            'close',
            (exitCode) => { console.log("powershell.exe terminated with exit code: " + exitCode); });

        console.log("powershell.exe started, pid: " + powerShellProcess.pid + ", exe: " + powerShellExePath);

        // let connectFunc = () => {
        //     return new Promise<StreamInfo>(
        //         (resolve, reject) => {
        //             var socket = net.connect("\\\\.\\pipe\\" + pipeName);
        //             socket.on(
        //                 'connect',
        //                 function() {
        //                     console.log("Pipe connected!");
        //                     resolve({writer: socket, reader: socket})
        //                 });
        //         });
        // };

        // let clientOptions: LanguageClientOptions = {
        //     documentSelector: [PowerShellLanguageId],
        //     synchronize: {
        //         configurationSection: PowerShellLanguageId,
        //         //fileEvents: vscode.workspace.createFileSystemWatcher('**/.eslintrc')
        //     }
        // }

        // languageServerClient =
        //     new LanguageClient(
        //         'PowerShell Editor Services',
        //         connectFunc,
        //         clientOptions);

        // languageServerClient.onReady().then(
        //     () => registerFeatures(),
        //     (reason) => vscode.window.showErrorMessage("Could not start language service: " + reason));

        // languageServerClient.start();
    }
    catch (e)
    {
        vscode.window.showErrorMessage(
            "The language service could not be started: " + e);
    }
}

function registerFeatures() {
    // Register other features
    registerExpandAliasCommand(languageServerClient);
    registerShowHelpCommand(languageServerClient);
    registerConsoleCommands(languageServerClient);
    registerOpenInISECommand();
    registerPowerShellFindModuleCommand(languageServerClient);
    registerExtensionCommands(languageServerClient);
}

export function deactivate(): void {
    if (languageServerClient) {
        // Close the language server client
        languageServerClient.stop();
        languageServerClient = undefined;
    }

    // Kill the child process after some time just in case
    setTimeout(() => {}, 3000);
}

function resolveLanguageServerPath(settings: settingsManager.ISettings): string {
    var editorServicesHostPath = settings.developer.editorServicesHostPath;

    if (editorServicesHostPath) {
        console.log("Found Editor Services path from config: " + editorServicesHostPath);

        // Does the path end in a .exe?  Alert the user if so.
        if (path.extname(editorServicesHostPath) != '') {
            throw "The editorServicesHostPath setting must point to a directory, not a file.";
        }

        // Make the path absolute if it's not
        editorServicesHostPath =
            path.resolve(
                __dirname,
                editorServicesHostPath,
                getHostExeName(settings.useX86Host));

        console.log("    Resolved path to: " + editorServicesHostPath);
    }
    else {
        // Use the default path in the extension's 'bin' folder
        editorServicesHostPath =
            path.join(
                __dirname,
                '..',
                'bin',
                getHostExeName(settings.useX86Host));

        console.log("Using default Editor Services path: " + editorServicesHostPath);
    }

    return editorServicesHostPath;
}

function getHostExeName(useX86Host: boolean): string {
    // The useX86Host setting is only relevant on 64-bit OS
    var is64BitOS = process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
    var archText = useX86Host && is64BitOS ? ".x86" : "";
    return "Microsoft.PowerShell.EditorServices.Host" + archText + ".exe";
}
