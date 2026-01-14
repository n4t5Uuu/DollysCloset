// app/employee/dashboard/page.tsx
export default function EmployeeDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">My Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">My Tasks</h3>
          <p className="text-3xl font-bold mt-2">12</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Completed</h3>
          <p className="text-3xl font-bold mt-2">8</p>
        </div>
      </div>
    </div>
  );
}