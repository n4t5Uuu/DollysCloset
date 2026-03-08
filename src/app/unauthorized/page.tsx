import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg border border-gray-100 text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
          <AlertCircle className="h-8 w-8 text-red-600" aria-hidden="true" />
        </div>
        
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-500 mb-8">
            You do not have permission to view this page. You must be logged in with the correct credentials.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#E7A3B0] hover:bg-[#ca8c98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E7A3B0] transition-colors"
          >
            Sign in to your account
          </Link>
        </div>
      </div>
    </div>
  );
}
