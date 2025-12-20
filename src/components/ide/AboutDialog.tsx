import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Copy, Check } from "lucide-react";

interface AboutDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface AppInfo {
    version: string;
    tauriVersion: string;
    webviewVersion: string;
    rustVersion: string;
    os: string;
    arch: string;
    commitHash?: string;
    buildDate?: string;
}

const AboutDialog: React.FC<AboutDialogProps> = ({ open, onOpenChange }) => {
    const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (open) {
            loadAppInfo();
        }
    }, [open]);

    const loadAppInfo = async () => {
        try {
            // Get basic info from environment and Tauri
            const info: AppInfo = {
                version: "0.1.0", // From tauri.conf.json
                tauriVersion: "2.0.0",
                webviewVersion: await getWebviewVersion(),
                rustVersion: "1.75.0",
                os: getOSName(),
                arch: getArch(),
                commitHash: undefined, // Can be set during build
                buildDate: new Date().toISOString().split("T")[0],
            };

            // Try to get more info from Tauri
            try {
                const { getVersion } = await import("@tauri-apps/api/app");
                info.version = await getVersion();
            } catch {
                // Use default
            }

            try {
                const { getTauriVersion } = await import("@tauri-apps/api/app");
                info.tauriVersion = await getTauriVersion();
            } catch {
                // Use default
            }

            setAppInfo(info);
        } catch (error) {
            console.error("Failed to load app info:", error);
            setAppInfo({
                version: "0.1.0",
                tauriVersion: "2.0.0",
                webviewVersion: "Unknown",
                rustVersion: "Unknown",
                os: getOSName(),
                arch: getArch(),
            });
        }
    };

    const getWebviewVersion = async (): Promise<string> => {
        // Extract from user agent
        const ua = navigator.userAgent;
        const webkitMatch = ua.match(/AppleWebKit\/(\d+(?:\.\d+)*)/);
        const chromeMatch = ua.match(/Chrome\/(\d+(?:\.\d+)*)/);
        const safariMatch = ua.match(/Safari\/(\d+(?:\.\d+)*)/);

        if (chromeMatch) return `Chrome/${chromeMatch[1]}`;
        if (webkitMatch) return `WebKit/${webkitMatch[1]}`;
        if (safariMatch) return `Safari/${safariMatch[1]}`;
        return "Unknown";
    };

    const getOSName = (): string => {
        const platform = navigator.platform.toLowerCase();
        const ua = navigator.userAgent;

        if (platform.includes("mac") || ua.includes("Mac OS X")) {
            const match = ua.match(/Mac OS X (\d+[._]\d+(?:[._]\d+)?)/);
            if (match) {
                const version = match[1].replace(/_/g, ".");
                return `macOS ${version}`;
            }
            return "macOS";
        }
        if (platform.includes("win")) {
            if (ua.includes("Windows NT 10.0")) return "Windows 10/11";
            if (ua.includes("Windows NT 6.3")) return "Windows 8.1";
            if (ua.includes("Windows NT 6.2")) return "Windows 8";
            return "Windows";
        }
        if (platform.includes("linux")) return "Linux";
        return platform;
    };

    const getArch = (): string => {
        const ua = navigator.userAgent;
        if (ua.includes("arm64") || ua.includes("aarch64")) return "arm64";
        if (ua.includes("x64") || ua.includes("x86_64") || ua.includes("Win64")) return "x64";
        if (ua.includes("x86") || ua.includes("i686")) return "x86";

        // For macOS, check if it's likely Apple Silicon
        if (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 0) {
            return "arm64";
        }

        return "x64"; // Default assumption
    };

    const formatInfoForCopy = (): string => {
        if (!appInfo) return "";

        const lines = [
            `Version: ${appInfo.version}`,
            appInfo.commitHash ? `Commit: ${appInfo.commitHash}` : null,
            appInfo.buildDate ? `Date: ${appInfo.buildDate}` : null,
            `Tauri: ${appInfo.tauriVersion}`,
            `Webview: ${appInfo.webviewVersion}`,
            `OS: ${appInfo.os}`,
            `Arch: ${appInfo.arch}`,
        ].filter(Boolean);

        return lines.join("\n");
    };

    const handleCopy = async () => {
        const text = formatInfoForCopy();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy:", error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        {/* Logo placeholder - you can replace with actual logo */}
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white text-xl font-bold">RA</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold">Rainy Aether</h2>
                            <p className="text-sm text-muted-foreground font-normal">
                                A Modern Code Editor
                            </p>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-4 space-y-3">
                    {appInfo ? (
                        <div className="font-mono text-sm space-y-1 bg-muted/50 rounded-lg p-4">
                            <InfoRow label="Version" value={appInfo.version} />
                            {appInfo.commitHash && (
                                <InfoRow label="Commit" value={appInfo.commitHash} />
                            )}
                            {appInfo.buildDate && (
                                <InfoRow label="Date" value={appInfo.buildDate} />
                            )}
                            <InfoRow label="Tauri" value={appInfo.tauriVersion} />
                            <InfoRow label="Webview" value={appInfo.webviewVersion} />
                            <InfoRow label="OS" value={appInfo.os} />
                            <InfoRow label="Arch" value={appInfo.arch} />
                        </div>
                    ) : (
                        <div className="h-32 flex items-center justify-center">
                            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-2">
                        <p className="text-xs text-muted-foreground">
                            © 2024 Enosis Labs. All rights reserved.
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopy}
                            disabled={!appInfo}
                            className="gap-2"
                        >
                            {copied ? (
                                <>
                                    <Check className="h-4 w-4" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4" />
                                    Copy
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

interface InfoRowProps {
    label: string;
    value: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
    <div className="flex justify-between">
        <span className="text-muted-foreground">{label}:</span>
        <span className="text-foreground">{value}</span>
    </div>
);

export default AboutDialog;
