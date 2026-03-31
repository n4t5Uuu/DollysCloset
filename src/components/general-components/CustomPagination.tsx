"use client";

import { useState } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
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
  const [goInput, setGoInput] = useState("");

  if (totalPages <= 1) return null;

  const handleGo = () => {
    if (disabled) return;

    const page = parseInt(goInput, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
    setGoInput("");
  };

  const baseBtn = "cursor-pointer border border-[#E7A3B0]/40 text-[#cc7f8f] hover:bg-[#fff5f7]";
  const disabledBtn = "pointer-events-none opacity-50 border border-[#E7A3B0]/40 text-[#cc7f8f]";

  return (
    <div className={`flex flex-col items-center gap-3 ${className ?? ""}`}>
      <Pagination aria-label="Pagination">
        <PaginationContent>
          {/* First */}
          <PaginationItem>
            <PaginationLink
              href="#"
              onClick={(e) => { e.preventDefault(); if (currentPage > 1) onPageChange(1); }}
              className={currentPage === 1 || disabled ? disabledBtn : baseBtn}
              aria-label="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </PaginationLink>
          </PaginationItem>

          {/* Previous */}
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage > 1) onPageChange(Math.max(1, currentPage - 1));
              }}
              className={currentPage === 1 || disabled ? disabledBtn : baseBtn}
            />
          </PaginationItem>

          {/* Page numbers */}
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
                    if (!disabled) onPageChange(pageNum);
                  }}
                  isActive={currentPage === pageNum}
                  className={
                    disabled && currentPage !== pageNum
                      ? disabledBtn
                      : currentPage === pageNum
                        ? "cursor-pointer bg-[#E7A3B0] text-white hover:bg-[#d891a0] border border-[#E7A3B0]"
                        : baseBtn
                  }
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            );
          })}

          {/* Next */}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage < totalPages) onPageChange(Math.min(totalPages, currentPage + 1));
              }}
              className={currentPage === totalPages || disabled ? disabledBtn : baseBtn}
            />
          </PaginationItem>

          {/* Last */}
          <PaginationItem>
            <PaginationLink
              href="#"
              onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) onPageChange(totalPages); }}
              className={currentPage === totalPages || disabled ? disabledBtn : baseBtn}
              aria-label="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      <div className="flex items-center gap-3 text-sm text-gray-400">
        <span>Page {currentPage} of {totalPages}</span>
        <span className="text-gray-300">•</span>
        <span>Go to page</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          inputMode="numeric"
          value={goInput}
          onChange={(e) => setGoInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleGo(); }}
          disabled={disabled}
          aria-label={`Go to page. Enter a number between 1 and ${totalPages}`}
          placeholder="1"
          className="w-16 h-8 text-center border border-[#E7A3B0]/40 rounded text-sm text-[#cc7f8f] focus:outline-none focus:ring-1 focus:ring-[#E7A3B0] disabled:opacity-50"
        />
        <button
          onClick={handleGo}
          disabled={disabled}
          className="px-3 h-8 text-sm border border-[#E7A3B0]/40 text-[#cc7f8f] rounded hover:bg-[#fff5f7] cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
        >
          Go
        </button>
      </div>
    </div>
  );
}
