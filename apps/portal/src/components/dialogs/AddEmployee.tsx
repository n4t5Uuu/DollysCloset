import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, X, Check, Eye, EyeOff } from "lucide-react";
import { 
    createClient,
    Employee,
    sanitizeSingleLineInput,
    sanitizeSingleLineText,
    schemaExactLimits
} from "@dollys-closet/core";
import { 
    Button,
    Input,
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
    FormNotice
} from "@dollys-closet/ui";
import DiscardChangesDialog from "@/components/dialogs/DiscardChangesDialog";
import { toast } from "sonner";
import { AdminDialogHeader } from "./AdminDialogHeader";
import { AdminDialogFooter } from "./AdminDialogFooter";

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
    const [showPassword, setShowPassword] = useState(false);

    // Real-time password validation logic
    const passwordValidations = useMemo(() => ({
        length: formData.password.length >= 8,
        uppercase: /[A-Z]/.test(formData.password),
        lowercase: /[a-z]/.test(formData.password),
        number: /[0-9]/.test(formData.password),
        special: /[^A-Za-z0-9]/.test(formData.password),
    }), [formData.password]);

    const isPasswordValid = Object.values(passwordValidations).every(v => v);
    const hasPasswordInput = formData.password.length > 0;
    const trimmedEmail = formData.username.trim();
    const trimmedFirstName = formData.first_name.trim();
    const trimmedLastName = formData.last_name.trim();
    const missingRequiredFields = useMemo(() => {
        const missingFields: string[] = [];

        if (!trimmedEmail) missingFields.push("email address");
        if (!trimmedFirstName) missingFields.push("first name");
        if (!trimmedLastName) missingFields.push("last name");
        if (!employeeToEdit && !isPasswordValid) missingFields.push("strong password");

        return missingFields;
    }, [employeeToEdit, isPasswordValid, trimmedEmail, trimmedFirstName, trimmedLastName]);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nameRegex = /^[\p{L}][\p{L}\s-]*[\p{L}]$|^[\p{L}]+$/u;
    const hasInvalidEmail = trimmedEmail !== "" && !emailRegex.test(trimmedEmail);
    const hasInvalidFirstName = trimmedFirstName !== "" && !nameRegex.test(trimmedFirstName);
    const hasInvalidLastName = trimmedLastName !== "" && !nameRegex.test(trimmedLastName);
    const hasInvalidPassword = hasPasswordInput && !isPasswordValid;
    const isSubmitBlocked = actionLoading || missingRequiredFields.length > 0 || hasInvalidEmail || hasInvalidFirstName || hasInvalidLastName || hasInvalidPassword;
    const formStatusMessage = missingRequiredFields.length > 0
        ? `Add ${missingRequiredFields.join(", ")} to continue.`
        : hasInvalidEmail
            ? "Enter a valid email address before saving."
            : hasInvalidFirstName
                ? "First name can only contain letters, spaces, and hyphens."
            : hasInvalidLastName
                ? "Last name can only contain letters, spaces, and hyphens."
            : hasInvalidPassword
                ? "This password choice is too weak."
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

            if (!nameRegex.test(normalizedFirstName)) {
                setError('First name can only contain letters, spaces, and hyphens.');
                setActionLoading(false);
                return;
            }

            if (!nameRegex.test(normalizedLastName)) {
                setError('Last name can only contain letters, spaces, and hyphens.');
                setActionLoading(false);
                return;
            }

            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4" onClick={(event) => {
            if (event.target === event.currentTarget && !actionLoading) {
                handleClose();
            }
        }}>
            <Card className="bg-white w-full h-full max-h-full rounded-none shadow-none flex flex-col overflow-hidden p-0 gap-0 sm:max-w-lg sm:max-h-[90vh] sm:rounded-2xl sm:shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <AdminDialogHeader
                    title={employeeToEdit ? "Edit Employee" : "Add New Employee"}
                    description={employeeToEdit ? "Update employee details or reset the password if needed." : "Create an employee account with a valid email and temporary password."}
                    onClose={handleClose}
                    isLoading={actionLoading}
                />

                <form onSubmit={handleSaveEmployee} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="min-h-0 flex-1 overflow-y-auto">
                    <CardContent className="space-y-5 pt-2 px-6 pb-6">
                        <FormNotice>
                            Fields marked with <span className="text-red-500">*</span> are required. Use a secure, non-personal password.
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
                                placeholder="e.g. name@gmail.com"
                                maxLength={schemaExactLimits.userUsername}
                                required
                                disabled={actionLoading}
                                aria-invalid={hasInvalidEmail}
                                className="border-gray-300 text-gray-900 bg-white placeholder:text-gray-400"
                            />
                            <div className="flex justify-between items-start gap-2">
                                {hasInvalidEmail ? (
                                    <p className="text-xs text-red-600">Email should be in a valid format (e.g., name@gmail.com).</p>
                                ) : (
                                    <div />
                                )}
                                <p className="text-right text-xs text-gray-500 shrink-0">
                                    {renderLengthMeta(formData.username, schemaExactLimits.userUsername)}
                                </p>
                            </div>
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
                                    aria-invalid={hasInvalidFirstName}
                                    className="border-gray-300 text-gray-900 bg-white placeholder:text-gray-400"
                                />
                                {hasInvalidFirstName ? (
                                    <p className="text-xs text-red-600">Letters, spaces, and hyphens only. No numbers or other symbols.</p>
                                ) : (
                                    <p className="text-right text-xs text-gray-500">
                                        {renderLengthMeta(formData.first_name, schemaExactLimits.userFirstName)}
                                    </p>
                                )}
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
                                    aria-invalid={hasInvalidLastName}
                                    className="border-gray-300 text-gray-900 bg-white placeholder:text-gray-400"
                                />
                                {hasInvalidLastName ? (
                                    <p className="text-xs text-red-600">Letters, spaces, and hyphens only. No numbers or other symbols.</p>
                                ) : (
                                    <p className="text-right text-xs text-gray-500">
                                        {renderLengthMeta(formData.last_name, schemaExactLimits.userLastName)}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100 mb-4 space-y-2.5">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Security Complexity</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                    <AdminValidationItem isMet={passwordValidations.length} label="8+ chars" />
                                    <AdminValidationItem isMet={passwordValidations.uppercase} label="Uppercase" />
                                    <AdminValidationItem isMet={passwordValidations.lowercase} label="Lowercase" />
                                    <AdminValidationItem isMet={passwordValidations.number} label="Number" />
                                    <AdminValidationItem isMet={passwordValidations.special} label="Symbol" />
                                </div>
                            </div>

                            <label className="block text-sm font-medium text-gray-700">
                                {employeeToEdit ? "New Password (optional)" : <>Password <span className="text-red-500">*</span></>}
                            </label>
                            <div className="relative group">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder={employeeToEdit ? "Leave blank to keep current" : "Enter password"}
                                    required={!employeeToEdit}
                                    disabled={actionLoading}
                                    aria-invalid={hasInvalidPassword}
                                    className="pr-10 border-gray-300 text-gray-900 bg-white placeholder:text-gray-400 focus:border-[#E7A3B0] focus:ring-[#E7A3B0]"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#E7A3B0] transition-colors focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                    </CardContent>
                    </div>

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

function AdminValidationItem({ isMet, label }: { isMet: boolean; label: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${isMet ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {isMet ? <Check size={10} strokeWidth={3} /> : <div className="w-1 h-1 rounded-full bg-current" />}
            </div>
            <span className={`text-[11px] transition-colors duration-300 ${isMet ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                {label}
            </span>
        </div>
    );
}
