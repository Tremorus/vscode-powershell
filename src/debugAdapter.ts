import {DebugSession, InitializedEvent, TerminatedEvent, StoppedEvent, OutputEvent, Thread, StackFrame, Scope, Source, Handles} from 'vscode-debugadapter';
import {DebugProtocol} from 'vscode-debugprotocol';
import fs = require('fs');

class PowerShellDebugSession extends DebugSession {
    public constructor(debuggerLinesAndColumnsStartAt1?: boolean, isServer?: boolean) {
		super();

        let pipeName = "\\\\.\\pipe\\PSES-VSCode-Debug-" + process.env.VSCODE_PID;

        var pid = process.env.VSCODE_PID;
        fs.writeFile("c:\\Users\\daviwil\\Desktop\\DEBUG_PID.txt", "VSCODE_PID: " + pid, function(err) {
            if(err) {
                return console.log(err);
            }

            console.log("The file was saved!");
        });
    }
}

// Run the debug session
DebugSession.run(PowerShellDebugSession);