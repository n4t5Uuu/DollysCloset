import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@dollys-closet/ui";

export interface ImageAlertConfig {
  isOpen: boolean;
  title: string;
  description: string;
}

export function ImageAlertDialog({
  config,
  onOpenChange,
}: {
  config: ImageAlertConfig;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AlertDialog open={config.isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gray-900">{config.title}</AlertDialogTitle>
          <AlertDialogDescription>{config.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction className="bg-[#E7A3B0] hover:bg-[#ca8c98] text-white cursor-pointer">
            Understood
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
