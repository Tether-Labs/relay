import { PaginationControls } from "@/components/pagination-controls";
import { cn } from "@/lib/utils";

type PaginatedArtifactGridProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  children: React.ReactNode;
  className?: string;
};

export function PaginatedArtifactGrid({
  page,
  pageCount,
  onPageChange,
  children,
  className,
}: PaginatedArtifactGridProps) {
  return (
    <div
      className={cn(
        "flex flex-col",
        pageCount > 1 && "min-h-[36rem]",
        className,
      )}
    >
      <div className="grid content-start gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      <PaginationControls
        page={page}
        pageCount={pageCount}
        onPageChange={onPageChange}
        className="mt-auto shrink-0 pt-8"
      />
    </div>
  );
}
