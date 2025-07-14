/**
 * Generic Frida Script for Bypassing App Integrity Checks
 * Usage: frida -U -f <APP_PACKAGE_NAME> -l generic_integrity_bypass.js --no-pause
 * Dynamically hooks common integrity-related methods across any app without hardcoded class names.
 */

console.log("[+] Starting Generic Integrity Bypass Script");

Java.perform(function() {
    // Utility: Hook all overloads of a given method on a class
    function hookAll(cls, methodName, callback) {
        try {
            var target = Java.use(cls);
            target[methodName].overloads.forEach(function(overload) {
                overload.implementation = callback(overload);
            });
            console.log("[+] Hooked " + cls + "." + methodName);
        } catch (e) {
            // Method or class not found
        }
    }

    // 1. Dynamically enumerate and bypass suspicious methods
    Java.enumerateLoadedClasses({
        onMatch: function(aClassName) {
            if (/license|validator|integrity|signature|check|auth|attest|verify/i.test(aClassName)) {
                try {
                    var hookCls = Java.use(aClassName);
                    hookCls.class.getDeclaredMethods().forEach(function(m) {
                        var mName = m.getName();
                        if (/check|verify|validate|auth|attest|isDebuggable|honorsDebugCertificates/i.test(mName)) {
                            hookCls[mName].overloads.forEach(function(overload) {
                                overload.implementation = function() {
                                    console.log("[+] Bypassed " + aClassName + "." + mName);
                                    var retType = overload.returnType.className;
                                    if (retType === 'boolean') return true;
                                    if (retType.match(/int|long|short|byte/)) return 0;
                                    if (retType === 'void') return;
                                    if (retType === 'java.lang.String') return "";
                                    return null;
                                };
                            });
                            console.log("[+] Installed generic bypass for " + aClassName + "." + mName);
                        }
                    });
                } catch (e) {}
            }
        },
        onComplete: function() {
            console.log("[+] Dynamic hook enumeration complete");
        }
    });

    // 2. Hook Java Signature.verify to always succeed
    hookAll('java.security.Signature', 'verify', function(overload) {
        return function() {
            console.log('[+] java.security.Signature.verify bypassed');
            return true;
        };
    });

    // 3. Bypass PackageManager signature checks
    hookAll('android.content.pm.PackageManager', 'checkSignatures', function() {
        return function(pkg1, pkg2) {
            console.log('[+] PackageManager.checkSignatures bypassed');
            return 0; // PackageManager.SIGNATURE_MATCH
        };
    });

    hookAll('android.content.pm.PackageManager', 'getPackageInfo', function(overload) {
        return function(pkgName, flags) {
            console.log('[+] PackageManager.getPackageInfo bypassed');
            var info = this.getPackageInfo.call(this, pkgName, flags);
            if (flags & 0x40) { // GET_SIGNATURES flag
                var Sig = Java.use('android.content.pm.Signature');
                info.signatures = [Sig.$new('FAKE_SIG')];
            }
            return info;
        };
    });

    // 4. SAFETYNET / PLAY PROTECT BYPASS
    try {
        var SNR    = Java.use('com.google.android.gms.safetynet.SafetyNetApi$SafetyNetResponse');
        var Status = Java.use('com.google.android.gms.common.api.Status');
        SNR.isCtsProfileMatched.implementation     = function() { return true; };
        SNR.isBasicIntegrityMatched.implementation = function() { return true; };
        SNR.getJwsResult.implementation            = function() { return 'eyJhbGciOiJI…fakesignature'; };
        Status.isSuccess.implementation             = function() { return true; };
        console.log('[+] SafetyNet/Play Protect bypass applied');
    } catch (e) {
        console.log('[!] SafetyNet bypass failed: ' + e);
    }

    // 5. SUPPRESS Play-Protect “not certified” dialog
    try {
        var ADB        = Java.use('android.app.AlertDialog$Builder');
        var JavaString = Java.use('java.lang.String');
        var pattern    = new RegExp(
            "your device doesn(?:'|\\u2019)t meet Google Play requirements",
            "i"
        );
        ADB.setMessage.overload('java.lang.CharSequence')
           .implementation = function(msg) {
            var s = msg.toString();
            var newMsg = msg;
            if (pattern.test(s)) {
                newMsg = JavaString.$new("Device certified for Play Protect.");
            }
            return this.setMessage.overload('java.lang.CharSequence').call(this, newMsg);
        };
        ADB.setMessage.overload('int')
           .implementation = function(resId) {
            var newMsg = JavaString.$new("Device certified for Play Protect.");
            return this.setMessage.overload('java.lang.CharSequence').call(this, newMsg);
        };
        ADB.show.implementation = function() {
            console.log('[+] suppressed uncertified-device dialog');
            return this.create();
        };
        console.log('[+] Play Protect dialog suppression applied');
    } catch (e) {
        console.log('[!] Dialog suppression failed: ' + e);
    }

    // 6. NO-OP finish()/exit so app can’t close itself
    try {
        var Activity    = Java.use('android.app.Activity');
        Activity.finish.implementation = function() {
            console.log('[+] suppressed finish() call');
        };
    } catch (e) {}
    try {
        var SystemClass = Java.use('java.lang.System');
        SystemClass.exit.overload('int').implementation = function(code) {
            console.log('[+] suppressed System.exit(' + code + ')');
        };
    } catch (e) {}
    try {
        var Proc = Java.use('android.os.Process');
        Proc.killProcess.overload('int').implementation = function(pid) {
            console.log('[+] suppressed killProcess(' + pid + ')');
        };
    } catch (e) {}

    console.log('[full_bypass] All hooks applied—including Play Protect bypass, dialog suppression, and exit no-ops.');
});
