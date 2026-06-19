import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationControlsProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function PaginationControls({
  page,
  pageCount,
  onPageChange,
  className,
}: PaginationControlsProps) {
  if (pageCount <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-3", className)}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <CaretLeft />
        Previous
      </Button>
      <span className="min-w-[4.5rem] text-center text-sm tabular-nums text-muted-foreground">
        {page} / {pageCount}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        Next
        <CaretRight />
      </Button>
    </nav>
  );
}
