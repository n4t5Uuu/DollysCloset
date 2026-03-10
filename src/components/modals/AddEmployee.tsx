import { useState, useEffect } from "react";
import { Loader2, X } from "lucide-react";
import { browserSupabase } from "@/lib/supabase/browser";
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

interface AddEmployeeProps {
    isOpen: boolean;
    onClose: () => void;
    employeeToEdit?: Employee | null;
    onEmployeeSaved: () => void;
}

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

    const hasUnsavedChanges = () => {
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
    };

    const handleClose = () => {
        if (hasUnsavedChanges()) {
            setShowDiscardConfirm(true);
        } else {
            onClose();
        }
    };

    useEffect(() => {
        if (isOpen) {
            if (employeeToEdit) {
                setFormData({
                    username: employeeToEdit.username,
                    first_name: employeeToEdit.first_name,
                    last_name: employeeToEdit.last_name,
                    password: "",
                });
            } else {
                setFormData({ username: "", first_name: "", last_name: "", password: "" });
            }
            setError(null);
        }
    }, [isOpen, employeeToEdit]);

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
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.username)) {
                setError('Please enter a valid email address.');
                setActionLoading(false);
                return;
            }

            const { data: { session } } = await browserSupabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const endpoint = employeeToEdit ? '/api/admin/edit-employee' : '/api/admin/create-employee';
            const method = employeeToEdit ? 'PUT' : 'POST';
            
            const body: Record<string, string> = {
                username: formData.username,
                first_name: formData.first_name,
                last_name: formData.last_name,
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="bg-white w-full max-w-md p-0">
                <CardHeader className="flex flex-row items-center justify-between border-b p-6 space-y-0 text-gray-900">
                    <CardTitle>{employeeToEdit ? "Edit Employee" : "Add New Employee"}</CardTitle>
                    <button type="button" onClick={handleClose} className="text-[#cc7f8f] hover:text-[#b96d7d] rounded-md p-1 hover:bg-[#fff5f7] cursor-pointer"><X className="w-5 h-5" /></button>
                </CardHeader>

                <form onSubmit={handleSaveEmployee}>
                    <CardContent className="space-y-5 p-6">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">Email Address</label>
                            <Input
                                type="email"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                placeholder="Enter email address"
                                required
                                disabled={actionLoading}
                                className="border-gray-300 text-gray-900 bg-white"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">First Name</label>
                                <Input
                                    type="text"
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                    placeholder="First name"
                                    required
                                    disabled={actionLoading}
                                    className="border-gray-300 text-gray-900 bg-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">Last Name</label>
                                <Input
                                    type="text"
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                    placeholder="Last name"
                                    required
                                    disabled={actionLoading}
                                    className="border-gray-300 text-gray-900 bg-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">
                                {employeeToEdit ? "New Password (optional)" : "Password"}
                            </label>
                            <Input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder={employeeToEdit ? "Leave blank to keep current" : "Enter password"}
                                required={!employeeToEdit}
                                minLength={6}
                                disabled={actionLoading}
                                className="border-gray-300 text-gray-900 bg-white"
                            />
                            <p className="text-xs text-gray-500">Minimum 6 characters {employeeToEdit && "if changing"}</p>
                        </div>
                    </CardContent>

                    <CardFooter className="flex gap-3 p-6 border-t bg-gray-50">
                        <Button type="button" variant="outline" onClick={handleClose} className="flex-1 border-[#E7A3B0]/40 text-[#cc7f8f] hover:bg-[#fff5f7] hover:text-[#b96d7d]">Cancel</Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-linear-to-r from-[#E7A3B0] to-[#f0b8c3] text-white hover:from-[#d891a0] hover:to-[#E7A3B0]"
                            disabled={actionLoading}
                        >
                            {actionLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {employeeToEdit ? "Saving..." : "Adding..."}
                                </>
                            ) : (
                                employeeToEdit ? 'Save Changes' : 'Add Employee'
                            )}
                        </Button>
                    </CardFooter>
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
