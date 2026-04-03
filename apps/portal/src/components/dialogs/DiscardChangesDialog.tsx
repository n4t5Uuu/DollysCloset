import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DiscardChangesDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onDiscard: () => void;
}

export default function DiscardChangesDialog({ isOpen, onOpenChange, onDiscard }: DiscardChangesDialogProps) {
    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent className="bg-white">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-gray-900">Discard changes?</AlertDialogTitle>
                    <AlertDialogDescription>
                        You have unsaved changes. Are you sure you want to discard them?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => onOpenChange(false)} className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900">Keep editing</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { onOpenChange(false); onDiscard(); }} className="bg-red-500 hover:bg-red-600 text-white cursor-pointer">Discard</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
