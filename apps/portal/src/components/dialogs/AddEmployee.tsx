import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, X } from "lucide-react";
import { browserSupabase } from "@dollys-closet/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Employee } from "@/types/employee.types";
import DiscardChangesDialog from "@/components/dialogs/DiscardChangesDialog";
import { toast } from "sonner";
import { AdminDialogHeader } from "./AdminDialogHeader";
import { AdminDialogFooter } from "./AdminDialogFooter";
import { FormNotice } from "@/components/ui/form-notice";
import {
    sanitizeSingleLineInput,
    sanitizeSingleLineText,
    schemaExactLimits,
} from "@/lib/input-sanitization";

interface AddEmployeeProps {
    isOpen: boolean;
    onClose: () => void;
    employeeToEdit?: Employee | null;
    onEmployeeSaved: () => void;
}

const renderLengthMeta = (value: string, maxLength: number) => `${value.length}/${maxLength} characters`;

export default function AddEmployee({ isOpen, onClose, employeeToEdit, onEmployeeSaved }: AddEmployeeProps) {
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        username: "",
        first_name: "",
        last_name: "",
        password: "",
    });
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    const trimmedEmail = formData.username.trim();
    const trimmedFirstName = formData.first_name.trim();
    const trimmedLastName = formData.last_name.trim();
    const missingRequiredFields = useMemo(() => {
        const missingFields: string[] = [];

        if (!trimmedEmail) missingFields.push("email address");
        if (!trimmedFirstName) missingFields.push("first name");
        if (!trimmedLastName) missingFields.push("last name");
        if (!employeeToEdit && formData.password.length < 6) missingFields.push("password");

        return missingFields;
    }, [employeeToEdit, formData.password.length, trimmedEmail, trimmedFirstName, trimmedLastName]);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const hasInvalidEmail = trimmedEmail !== "" && !emailRegex.test(trimmedEmail);
    const hasInvalidPassword = formData.password.length > 0 && formData.password.length < 6;
    const isSubmitBlocked = actionLoading || missingRequiredFields.length > 0 || hasInvalidEmail || hasInvalidPassword;
    const formStatusMessage = missingRequiredFields.length > 0
        ? `Add ${missingRequiredFields.join(", ")} to continue.`
        : hasInvalidEmail
            ? "Enter a valid email address before saving."
            : hasInvalidPassword
                ? employeeToEdit
                    ? "Use at least 6 characters if you are resetting the password."
                    : "Password must be at least 6 characters long."
                : employeeToEdit
                    ? "Review your updates, then save when you're ready."
                    : "Required fields are complete. You can add this employee now.";

    const hasUnsavedChanges = useCallback(() => {
        if (employeeToEdit) {
            return (
                formData.username !== employeeToEdit.username ||
                formData.first_name !== employeeToEdit.first_name ||
                formData.last_name !== employeeToEdit.last_name ||
                formData.password !== ""
            );
        }
        return (
            formData.username !== "" ||
            formData.first_name !== "" ||
            formData.last_name !== "" ||
            formData.password !== ""
        );
    }, [employeeToEdit, formData]);

    const handleClose = useCallback(() => {
        if (hasUnsavedChanges()) {
            setShowDiscardConfirm(true);
        } else {
            onClose();
        }
    }, [hasUnsavedChanges, onClose]);

    useEffect(() => {
        if (isOpen) {
            if (employeeToEdit) {
                setFormData({
                    username: sanitizeSingleLineInput(employeeToEdit.username, schemaExactLimits.userUsername),
                    first_name: sanitizeSingleLineInput(employeeToEdit.first_name, schemaExactLimits.userFirstName),
                    last_name: sanitizeSingleLineInput(employeeToEdit.last_name, schemaExactLimits.userLastName),
                    password: "",
                });
            } else {
                setFormData({ username: "", first_name: "", last_name: "", password: "" });
            }
            setError(null);
        }
    }, [isOpen, employeeToEdit]);

    useEffect(() => {
        if (!isOpen) return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !actionLoading) {
                handleClose();
            }
        };

        document.addEventListener("keydown", handleEscape);

        return () => {
            document.body.style.overflow = originalOverflow;
            document.removeEventListener("keydown", handleEscape);
        };
    }, [actionLoading, handleClose, isOpen]);

    /**
     * Handles saving an employee to the backend.
     * Depending on whether `employeeToEdit` exists, it either creates a new employee or updates an existing one.
     * Interacts with the backend via a POST or PUT request to the respective '/api/admin/*' endpoints.
     * @param e - The form submission event.
     */
    const handleSaveEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        setError(null);

        try {
            const normalizedUsername = sanitizeSingleLineText(formData.username, schemaExactLimits.userUsername).toLowerCase();
            const normalizedFirstName = sanitizeSingleLineText(formData.first_name, schemaExactLimits.userFirstName);
            const normalizedLastName = sanitizeSingleLineText(formData.last_name, schemaExactLimits.userLastName);

            if (!emailRegex.test(normalizedUsername)) {
                setError('Please enter a valid email address.');
                setActionLoading(false);
                return;
            }

            const { data: { session } } = await browserSupabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const endpoint = employeeToEdit ? '/api/admin/employees' : '/api/admin/employees';
            const method = employeeToEdit ? 'PUT' : 'POST';
            
            const body: Record<string, string> = {
                username: normalizedUsername,
                first_name: normalizedFirstName,
                last_name: normalizedLastName,
            };

            if (employeeToEdit) {
                body.employee_id = employeeToEdit.user_id;
                if (formData.password) body.password = formData.password;
            } else {
                body.password = formData.password;
            }

            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || (employeeToEdit ? 'Failed to update employee' : 'Failed to add employee'));
            }

            toast.success(employeeToEdit ? 'Employee updated successfully.' : 'Employee added successfully.');
            onEmployeeSaved();
            onClose();
        } catch (err: unknown) {
            console.error('Error saving employee:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to save employee';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setActionLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(event) => {
            if (event.target === event.currentTarget && !actionLoading) {
                handleClose();
            }
        }}>
            <Card className="bg-white w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden p-0" onClick={(event) => event.stopPropagation()}>
                <AdminDialogHeader 
                    title={employeeToEdit ? "Edit Employee" : "Add New Employee"}
                    description={employeeToEdit ? "Update employee details or reset the password if needed." : "Create an employee account with a valid email and temporary password."}
                    onClose={handleClose}
                    isLoading={actionLoading}
                />

                <form onSubmit={handleSaveEmployee}>
                    <CardContent className="space-y-5 pt-2 px-6 pb-6 overflow-y-auto">
                        <FormNotice>
                            Fields marked with <span className="text-red-500">*</span> are required. Passwords must be at least 6 characters long.
                        </FormNotice>
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Email Address <span className="text-red-500">*</span></label>
                            <Input
                                type="email"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: sanitizeSingleLineInput(e.target.value, schemaExactLimits.userUsername) })}
                                placeholder="Enter email address"
                                maxLength={schemaExactLimits.userUsername}
                                required
                                disabled={actionLoading}
                                aria-invalid={hasInvalidEmail || !trimmedEmail}
                                className="border-gray-300 text-gray-900 bg-white placeholder:text-gray-400"
                            />
                            <p className="text-right text-xs text-gray-500">
                                {renderLengthMeta(formData.username, schemaExactLimits.userUsername)}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">First Name <span className="text-red-500">*</span></label>
                                <Input
                                    type="text"
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: sanitizeSingleLineInput(e.target.value, schemaExactLimits.userFirstName) })}
                                    placeholder="First name"
                                    maxLength={schemaExactLimits.userFirstName}
                                    required
                                    disabled={actionLoading}
                                    className="border-gray-300 text-gray-900 bg-white placeholder:text-gray-400"
                                />
                                <p className="text-right text-xs text-gray-500">
                                    {renderLengthMeta(formData.first_name, schemaExactLimits.userFirstName)}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Last Name <span className="text-red-500">*</span></label>
                                <Input
                                    type="text"
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: sanitizeSingleLineInput(e.target.value, schemaExactLimits.userLastName) })}
                                    placeholder="Last name"
                                    maxLength={schemaExactLimits.userLastName}
                                    required
                                    disabled={actionLoading}
                                    className="border-gray-300 text-gray-900 bg-white placeholder:text-gray-400"
                                />
                                <p className="text-right text-xs text-gray-500">
                                    {renderLengthMeta(formData.last_name, schemaExactLimits.userLastName)}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                {employeeToEdit ? "New Password (optional)" : <>Password <span className="text-red-500">*</span></>}
                            </label>
                            <Input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder={employeeToEdit ? "Leave blank to keep current" : "Enter password"}
                                required={!employeeToEdit}
                                minLength={6}
                                disabled={actionLoading}
                                aria-invalid={hasInvalidPassword}
                                className="border-gray-300 text-gray-900 bg-white placeholder:text-gray-400"
                            />
                            <p className="text-xs text-gray-500">Minimum 6 characters {employeeToEdit && "if changing"}</p>
                        </div>
                    </CardContent>

                    <AdminDialogFooter 
                        onCancel={handleClose}
                        statusMessage={formStatusMessage}
                        actionLabel={employeeToEdit ? "Save Changes" : "Add Employee"}
                        isLoading={actionLoading}
                        isActionDisabled={isSubmitBlocked}
                    />
                </form>
            </Card>

            <DiscardChangesDialog
                isOpen={showDiscardConfirm}
                onOpenChange={setShowDiscardConfirm}
                onDiscard={onClose}
            />
        </div>
    );
}
