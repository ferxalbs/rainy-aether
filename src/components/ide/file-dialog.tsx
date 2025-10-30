import { useCallback, useEffect, useId, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";

interface FileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  initialName: string;
  onConfirm: (name: string) => void;
  confirmLabel: string;
  isDirectory?: boolean;
}

const splitNameAndExtension = (initial: string) => {
  if (!initial) return { baseName: "", extension: "" };
  const lastDot = initial.lastIndexOf(".");

  if (lastDot > 0) {
    return {
      baseName: initial.slice(0, lastDot),
      extension: initial.slice(lastDot),
    };
  }

  return { baseName: initial, extension: "" };
};

const FileDialog: React.FC<FileDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  initialName,
  onConfirm,
  confirmLabel,
  isDirectory,
}) => {
  const [name, setName] = useState(() => splitNameAndExtension(initialName).baseName);
  const [extension, setExtension] = useState(() => splitNameAndExtension(initialName).extension);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (isDirectory) {
      setName(initialName);
      setExtension("");
      return;
    }

    const parts = splitNameAndExtension(initialName);
    setName(parts.baseName);
    setExtension(parts.extension);
  }, [open, initialName, isDirectory]);

  const handleConfirm = useCallback(() => {
    const fullName = isDirectory ? name : extension ? `${name}${extension}` : name;
    onConfirm(fullName);
    onOpenChange(false);
  }, [extension, isDirectory, name, onConfirm, onOpenChange]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleConfirm();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
      }
    },
    [handleConfirm, onOpenChange]
  );

  const folderInputId = useId();
  const fileInputId = useId();
  const extInputId = useId();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isDirectory ? (
            <div className="grid gap-2">
              <Label htmlFor={folderInputId}>Folder Name</Label>
              <Input
                id={folderInputId}
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
              />
            </div>
          ) : (
            <div className="grid grid-cols-4 items-end gap-4">
              <div className="col-span-3 grid gap-2">
                <Label htmlFor={fileInputId}>File Name</Label>
                <Input
                  id={fileInputId}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoFocus
                />
              </div>
              <div className="col-span-1 grid gap-2">
                <Label htmlFor={extInputId}>Extension</Label>
                <Input
                  id={extInputId}
                  value={extension}
                  onChange={(event) => setExtension(event.target.value)}
                  placeholder=".txt"
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>{confirmLabel}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileDialog;