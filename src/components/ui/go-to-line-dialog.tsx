import { useCallback, useEffect, useId, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./dialog";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";

interface GoToLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxLine: number;
  onConfirm: (line: number) => void;
}

const GoToLineDialog: React.FC<GoToLineDialogProps> = ({
  open,
  onOpenChange,
  maxLine,
  onConfirm,
}) => {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const inputId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    setValue("");
    setError("");
  }, [open]);

  const parseLine = useCallback((raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      return Number.NaN;
    }

    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }, []);

  const validate = useCallback(
    (lineNumber: number) => {
      if (!Number.isFinite(lineNumber)) {
        return "Enter a valid number";
      }

      if (lineNumber < 1 || lineNumber > maxLine) {
        return `Enter a number between 1 and ${maxLine}`;
      }

      return "";
    },
    [maxLine]
  );

  const handleConfirm = useCallback(() => {
    const parsed = parseLine(value);
    const validationError = validate(parsed);

    if (validationError) {
      setError(validationError);
      return;
    }

    onConfirm(parsed);
    onOpenChange(false);
  }, [onConfirm, onOpenChange, parseLine, validate, value]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Go to Line</DialogTitle>
          <DialogDescription>
            Enter a line number between 1 and {maxLine}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor={inputId}>Line Number</Label>
            <Input
              id={inputId}
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                if (error) {
                  setError("");
                }
              }}
              inputMode="numeric"
              placeholder="e.g. 42"
              autoFocus
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${inputId}-error` : undefined}
            />
            <p
              id={`${inputId}-error`}
              role="alert"
              className={error ? "text-destructive text-sm" : "hidden"}
            >
              {error}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Go</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoToLineDialog;