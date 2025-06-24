import React, { useState, useEffect } from "react";
import {
  Users,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  User,
} from "lucide-react";
import { apiService } from "../services/apiService";

export default function UserManagement() {
  const [users, setUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await apiService.listUsers();
      setUsers(result.enrolled_users);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete user "${userName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingUser(userName);
    setError("");
    setSuccessMessage("");

    try {
      await apiService.deleteUser(userName);
      setSuccessMessage(`User "${userName}" deleted successfully`);

      // Remove user from local state
      setUsers((prev) => prev.filter((user) => user !== userName));

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      const error = err as Error;
      setError(error.message || `Failed to delete user "${userName}"`);
    } finally {
      setDeletingUser(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">
                User Management
              </h3>
              <p className="text-slate-600 text-sm">
                Manage enrolled voice profiles
              </p>
            </div>
          </div>

          <button
            onClick={loadUsers}
            disabled={isLoading}
            className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-xl mb-4">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-4 rounded-xl mb-4">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm">{successMessage}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-5 h-5 animate-spin text-slate-500" />
              <span className="text-slate-500">Loading users...</span>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-slate-500 mb-2">
              No Users Enrolled
            </h4>
            <p className="text-slate-400">
              No voice profiles have been enrolled yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-slate-600 pb-2 border-b border-slate-200">
              <span>User Name</span>
              <span>Actions</span>
            </div>

            {users.map((userName) => (
              <div
                key={userName}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">{userName}</h4>
                    <p className="text-sm text-slate-500">
                      Voice profile enrolled
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteUser(userName)}
                  disabled={deletingUser === userName}
                  className="flex items-center space-x-2 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingUser === userName ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {users.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>
                Total enrolled users: <strong>{users.length}</strong>
              </span>
              <button
                onClick={loadUsers}
                className="text-slate-500 hover:text-slate-700 transition-colors"
              >
                Last updated: {new Date().toLocaleTimeString()}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Warning Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-center space-x-2 text-amber-800 mb-3">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Important Notice</span>
        </div>
        <ul className="text-amber-700 text-sm space-y-1">
          <li>• Deleting a user will permanently remove their voice profile</li>
          <li>
            • Deleted users will need to re-enroll to access the system again
          </li>
          <li>• This action cannot be undone</li>
          <li>• Always confirm the identity before deleting a user</li>
        </ul>
      </div>
    </div>
  );
}
