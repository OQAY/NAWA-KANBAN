Set WshShell = CreateObject("WScript.Shell")
sDir = Replace(WScript.ScriptFullName, "launch-silent.vbs", "")
WshShell.CurrentDirectory = sDir
WshShell.Run "python """ & sDir & "monitor.py""", 1, False
