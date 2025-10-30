import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./dialog";
import { Input } from "./input";
import { Button } from "./button";

interface GoToLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxLine: number;
  onConfirm: (line: number) => void;
}

const GoToLineDialog: React.FC<GoToLineDialogProps> = ({ open, onOpenChange, maxLine, onConfirm }) => {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setValue("");
      setError(null);
    }
  }, [open]);

  const parsedValue = useMemo(() => {
    if (!value.trim()) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }, [value]);

  useEffect(() => {
    if (!value) {
      setError(null);
      return;
    }

    if (parsedValue === null) {
      setError("Enter a valid number");
      return;
    }

    if (parsedValue < 1 || parsedValue > maxLine) {
      setError(`Enter a value between 1 and ${maxLine}`);
      return;
    }

    setError(null);
  }, [parsedValue, maxLine, value]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleConfirm = useCallback(() => {
    if (parsedValue === null || parsedValue < 1 || parsedValue > maxLine) {
      return;
    }
    onConfirm(parsedValue);
    handleClose();
  }, [handleClose, maxLine, onConfirm, parsedValue]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Go to Line</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="go-to-line-input">
            Line number (1 – {maxLine})
          </label>
          <Input
            id="go-to-line-input"
            autoFocus
            inputMode="numeric"
            placeholder="Enter line number"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleConfirm();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                handleClose();
              }
            }}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={Boolean(error) || !parsedValue}>
            Go
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GoToLineDialog;
