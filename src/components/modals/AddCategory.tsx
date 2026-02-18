"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { browserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { InventoryCategory as Category } from "@/types/inventory.types";

interface AddCategoryProps {
    isOpen: boolean;
    onClose: () => void;
    categories: Category[]; // Passed to show parent options
    onCategoryAdded: (newCategory: Category) => void; // Callback to update parent state
}

export default function AddCategory({ isOpen, onClose, categories, onCategoryAdded }: AddCategoryProps) {
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [categoryForm, setCategoryForm] = useState({
        category_name: "",
        category_description: "",
        parent_category: "",
    });

    const resetForm = () => {
        setCategoryForm({ category_name: "", category_description: "", parent_category: "" });
        setError(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        setError(null);
        try {
            if (!categoryForm.category_name) throw new Error('Please enter a category name');
            const { data: { session } } = await browserSupabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            console.log('Sending category data:', {
                category_name: categoryForm.category_name,
                category_description: categoryForm.category_description,
                parent_category: categoryForm.parent_category ? parseInt(categoryForm.parent_category) : null,
            });

            const response = await fetch('/api/admin/create-category', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    category_name: categoryForm.category_name,
                    category_description: categoryForm.category_description,
                    parent_category: categoryForm.parent_category && categoryForm.parent_category !== "none" ? parseInt(categoryForm.parent_category) : null,
                })
            });

            const data = await response.json();

            console.log('Category response:', { status: response.status, data });

            if (!response.ok) throw new Error(data.error || `Failed to add category (Status: ${response.status})`);

            // Add new category to local state instead of refetching all
            if (data.category) {
                onCategoryAdded(data.category);
            }
            handleClose();
        } catch (err: any) {
            console.error('Error adding category:', err);
            setError(err.message || 'Failed to add category');
        } finally {
            setActionLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="bg-white w-full max-w-lg p-0">
                <CardHeader className="flex flex-row items-center justify-between border-b p-6 space-y-0 text-gray-900">
                    <CardTitle>Add Category</CardTitle>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </CardHeader>

                <form onSubmit={handleAddCategory}>
                    <CardContent className="space-y-4 p-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Category Name <span className="text-red-500">*</span></label>
                            <Input
                                type="text"
                                placeholder="e.g., Men's Top"
                                value={categoryForm.category_name}
                                onChange={(e) => setCategoryForm({ ...categoryForm, category_name: e.target.value })}
                                required
                                className="border-gray-300 text-gray-900 bg-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <Input
                                type="text"
                                placeholder="e.g., Men's clothing items"
                                value={categoryForm.category_description}
                                onChange={(e) => setCategoryForm({ ...categoryForm, category_description: e.target.value })}
                                className="border-gray-300 text-gray-900 bg-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Parent Category (Optional)</label>
                            <Select value={categoryForm.parent_category || "none"} onValueChange={(value) => setCategoryForm({ ...categoryForm, parent_category: value === "none" ? "" : value })}>
                                <SelectTrigger className="border-gray-300 text-gray-900 bg-white">
                                    <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent className="bg-white z-60 text-gray-900">
                                    <SelectItem value="none">None</SelectItem>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.category_id} value={cat.category_id.toString()}>
                                            {cat.category_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>

                    <CardFooter className="flex gap-3 p-6 border-t bg-gray-50">
                        <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
                            disabled={actionLoading || !categoryForm.category_name}
                        >
                            {actionLoading ? (<>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Adding...
                            </>) : (
                                "✚ Add Category"
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}