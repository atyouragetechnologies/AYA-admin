

interface MascotLoaderProps {
    fullscreen?: boolean;
    message?: string;
    subMessage?: string;
    transparentBg?: boolean;
    speed?: number;
}

export function MascotLoader({
    fullscreen = true,
    message = 'Loading...',
    subMessage,
    transparentBg = false,
}: MascotLoaderProps) {
    const content = (
        <div className="relative flex flex-col items-center justify-center select-none max-w-xs w-full px-6 py-8 text-center animate-fade-in">
            {/* Simple Elegant Minimal Ring Spinner */}
            <div className="relative w-12 h-12 flex items-center justify-center mb-4">
                {/* Subtle background track */}
                <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                {/* Rotating accent ring */}
                <div 
                    className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-400 border-r-amber-400/50 animate-spin" 
                    style={{ animationDuration: '0.85s' }} 
                />
                {/* Soft center pulse dot */}
                <div className="w-2 h-2 rounded-full bg-amber-400/90 animate-pulse" />
            </div>

            {/* Simple Loading Message */}
            {message && (
                <p className="text-sm font-semibold text-slate-200 tracking-wide">
                    {message}
                </p>
            )}

            {/* Optional Submessage */}
            {subMessage && (
                <p className="mt-1 text-xs text-slate-400 font-normal">
                    {subMessage}
                </p>
            )}
        </div>
    );

    if (!fullscreen) {
        return content;
    }

    return (
        <div
            className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center p-4 ${
                transparentBg
                    ? 'bg-black/60 backdrop-blur-sm'
                    : 'bg-[#09090f]/95 backdrop-blur-md'
            }`}
        >
            {content}
        </div>
    );
}

export const SimpleLoader = MascotLoader;
export default MascotLoader;
