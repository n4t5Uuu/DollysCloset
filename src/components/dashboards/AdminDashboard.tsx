import { Home, BarChart3, Users, Activity, Package } from "lucide-react";

export default function AdminDashboard() {
    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-gray-500 text-sm font-medium">Total Users</h3>
                    <p className="text-3xl font-bold mt-2">150</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-gray-500 text-sm font-medium">Active Tasks</h3>
                    <p className="text-3xl font-bold mt-2">42</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-gray-500 text-sm font-medium">Reports</h3>
                    <p className="text-3xl font-bold mt-2">28</p>
                </div>
            </div>
        </div>
    );
}
