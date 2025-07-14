# Frida Android SafetyNet/Play Protect Bypass

A Frida script for bypassing Android's SafetyNet and Play Protect checks. It fakes integrity results, suppresses uncertified device dialogs, and prevents apps from self-closing. Intended for security research and testing purposes only.

## Requirements
- Frida installed on your system and device.
- Rooted Android device or emulator with Frida server running.
- Target app using SafetyNet/Play Protect APIs.

## Features
- **Integrity Bypass**: Hooks SafetyNet API to return true for CTS and basic integrity checks; fakes JWS result.
- **Dialog Suppression**: Intercepts and modifies AlertDialog to hide/replace "not certified" messages; prevents dialog from showing.
- **Prevent Self-Closure**: No-ops `Activity.finish()`, `System.exit()`, and `Process.killProcess()` to stop app termination.

## How It Works
The script uses Frida's JavaScript API to hook into Android classes:
- Overrides SafetyNet response methods.
- Modifies dialog builder to alter messages.
- Suppresses exit calls with console logs.

## Disclaimer
This is for educational and research use only. Do not use for malicious purposes or in production. Misuse may violate terms of service or laws. Use ethically and at your own risk.
