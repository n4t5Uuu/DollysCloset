import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface CustomPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  disabled?: boolean;
}

export default function CustomPagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  disabled = false
}: CustomPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              if (currentPage > 1) onPageChange(Math.max(1, currentPage - 1));
            }} 
            className={currentPage === 1 || disabled
              ? "pointer-events-none opacity-50 border border-[#E7A3B0]/40 text-[#cc7f8f]" 
              : "cursor-pointer border border-[#E7A3B0]/40 text-[#cc7f8f] hover:bg-[#fff5f7]"} 
          />
        </PaginationItem>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const pageNum = totalPages <= 5 
            ? i + 1 
            : currentPage <= 3 
              ? i + 1 
              : currentPage >= totalPages - 2 
                ? totalPages - 4 + i 
                : currentPage - 2 + i;
          return (
            <PaginationItem key={pageNum}>
              <PaginationLink 
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(pageNum);
                }}
                isActive={currentPage === pageNum}
                className={
                  disabled && currentPage !== pageNum
                    ? "pointer-events-none opacity-50 border border-[#E7A3B0]/40 text-[#cc7f8f]"
                    : currentPage === pageNum
                      ? "cursor-pointer bg-[#E7A3B0] text-white hover:bg-[#d891a0] border border-[#E7A3B0]"
                      : "cursor-pointer border border-[#E7A3B0]/40 text-[#cc7f8f] hover:bg-[#fff5f7]"
                }
              >
                {pageNum}
              </PaginationLink>
            </PaginationItem>
          );
        })}
        <PaginationItem>
          <PaginationNext 
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (currentPage < totalPages) onPageChange(Math.min(totalPages, currentPage + 1));
            }} 
            className={currentPage === totalPages || disabled
              ? "pointer-events-none opacity-50 border border-[#E7A3B0]/40 text-[#cc7f8f]" 
              : "cursor-pointer border border-[#E7A3B0]/40 text-[#cc7f8f] hover:bg-[#fff5f7]"}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
