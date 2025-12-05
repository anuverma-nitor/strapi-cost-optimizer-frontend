import Layout from "@/components/ui/Layout";

export default function AddUserModal() {

    return (
        <Layout>
            <div className="container">
                <div className="flex justify-center items-center h-screen">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-2xl font-bold mb-4">Add User</h2>
                        <form>
                            <div className="mb-4">
                                <label htmlFor="firstname" className="block text-sm font-medium text-gray-700">First Name</label>
                                <input type="text" id="firstname" name="firstname" className="mt-1 p-2 border border-gray-300 rounded-md w-full" />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="lastname" className="block text-sm font-medium text-gray-700">Last Name</label>
                                <input type="text" id="lastname" name="lastname" className="mt-1 p-2 border border-gray-300 rounded-md w-full" />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
                                <input type="text" id="username" name="username" className="mt-1 p-2 border border-gray-300 rounded-md w-full" />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                                <input type="email" id="email" name="email" className="mt-1 p-2 border border-gray-300 rounded-md w-full" />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                                <select id="role" name="role" className="mt-1 p-2 border border-gray-300 rounded-md w-full">
                                    <option value="viewer">Viewer</option>
                                    <option value="author">Author</option>
                                    <option value="editor">Editor</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <button type="submit" className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700">Add User</button>
                        </form>
                    </div>
                </div>
            </div>
        </Layout>
    )

}