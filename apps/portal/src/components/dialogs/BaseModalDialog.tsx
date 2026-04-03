import { X } from "lucide-react";

interface BaseModalDialogProps {
    children: React.ReactNode;
    onClose: () => void;
    title: string;
}

export default function BaseModalDialog({ children, onClose, title }: BaseModalDialogProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700 cursor-pointer"
            >
                <X size={20} />
            </button>
            </div>
            <div className="px-6 py-6">{children}</div>
        </div>
        </div>
    );
}
