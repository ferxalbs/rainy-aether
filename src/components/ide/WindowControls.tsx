
import React, { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X, Copy, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const WindowControls: React.FC<{ className?: string }> = ({ className }) => {
    const [isMaximized, setIsMaximized] = useState(false);
    const [isMac, setIsMac] = useState(false);
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);

        const updateState = async () => {
            try {
                const win = getCurrentWindow();
                setIsMaximized(await win.isMaximized());
            } catch (e) {
                console.error(e);
            }
        };

        updateState();

        // Poll for changes (temporary solution as event listeners can be tricky to set up perfectly in React for this)
        const interval = setInterval(updateState, 1000);

        const handleResize = () => {
            updateState();
        };

        window.addEventListener('resize', handleResize);
        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const minimize = async () => {
        try { await getCurrentWindow().minimize(); } catch (e) { }
    };

    const toggleMaximize = async () => {
        try {
            const win = getCurrentWindow();
            await win.toggleMaximize();
            setIsMaximized(!isMaximized);
        } catch (e) { }
    };

    const close = async () => {
        try { await getCurrentWindow().close(); } catch (e) { }
    };

    if (isMac) {
        return (
            <div
                className={cn("flex items-center gap-[8px] px-4", className)}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                <button
                    onClick={close}
                    className="w-[13px] h-[13px] rounded-full bg-[#FF5F57] hover:bg-[#FF5F57] flex items-center justify-center border border-[#E0443E] transition-all active:opacity-80"
                    title="Close"
                >
                    <X size={8} className={cn("text-[#4c0b0b] opacity-0 transition-opacity duration-200 stroke-[3px]", isHovering && "opacity-100")} />
                </button>

                <button
                    onClick={minimize}
                    className="w-[13px] h-[13px] rounded-full bg-[#FEBC2E] hover:bg-[#FEBC2E] flex items-center justify-center border border-[#D89E24] transition-all active:opacity-80"
                    title="Minimize"
                >
                    <Minus size={8} className={cn("text-[#5c3e0e] opacity-0 transition-opacity duration-200 stroke-[3px]", isHovering && "opacity-100")} />
                </button>

                <button
                    onClick={toggleMaximize}
                    className="w-[13px] h-[13px] rounded-full bg-[#28C840] hover:bg-[#28C840] flex items-center justify-center border border-[#1AAB29] transition-all active:opacity-80"
                    title="FullScreen"
                >
                    <div className={cn("text-[#0e3f16] opacity-0 transition-opacity duration-200", isHovering && "opacity-100")}>
                        {isMaximized ? (
                            <Minimize2 size={8} className="stroke-[3px]" />
                        ) : (
                            <Maximize2 size={8} className="stroke-[3px]" />
                        )}
                    </div>
                </button>
            </div>
        );
    }

    // Windows/Linux Style
    return (
        <div className={cn("flex items-center h-full", className)}>
            <button onClick={minimize} className="h-full w-[46px] flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors text-foreground/70 hover:text-foreground">
                <Minus size={16} />
            </button>
            <button onClick={toggleMaximize} className="h-full w-[46px] flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors text-foreground/70 hover:text-foreground">
                {isMaximized ? (
                    <Copy size={14} className="rotate-180" />
                ) : (
                    <Square size={14} />
                )}
            </button>
            <button onClick={close} className="h-full w-[46px] flex items-center justify-center hover:bg-[#e81123] hover:text-white transition-colors text-foreground/70 active:bg-[#bf0f1d]">
                <X size={16} />
            </button>
        </div>
    );
};

export default WindowControls;
