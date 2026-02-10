import { User, DollarSign, Download, Tag } from 'lucide-react';

export function Settings() {
  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-[#1F2933] mb-2">Settings</h1>
        <p className="text-[#64748B]">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-lg font-semibold text-[#1F2933] mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          Profile
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-2">Full Name</label>
            <input
              type="text"
              defaultValue="John Doe"
              className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-2">Email</label>
            <input
              type="email"
              defaultValue="john.doe@example.com"
              className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]"
            />
          </div>
          <button className="px-6 py-2 bg-[#2DD4BF] text-white rounded-xl hover:bg-[#14B8A6] transition-colors">
            Save Changes
          </button>
        </div>
      </div>

      {/* Currency */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-lg font-semibold text-[#1F2933] mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Currency
        </h3>
        <div>
          <label className="block text-sm font-medium text-[#64748B] mb-2">Preferred Currency</label>
          <select className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]">
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="JPY">JPY - Japanese Yen</option>
            <option value="CAD">CAD - Canadian Dollar</option>
          </select>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-lg font-semibold text-[#1F2933] mb-4 flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Categories
        </h3>
        <p className="text-sm text-[#64748B] mb-4">
          Manage your transaction categories to better organize your finances.
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <span className="text-[#1F2933]">Food & Dining</span>
            <span className="text-xs text-[#64748B]">15 transactions</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <span className="text-[#1F2933]">Shopping</span>
            <span className="text-xs text-[#64748B]">8 transactions</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <span className="text-[#1F2933]">Transport</span>
            <span className="text-xs text-[#64748B]">12 transactions</span>
          </div>
        </div>
        <button className="mt-4 text-[#2DD4BF] hover:text-[#14B8A6] text-sm font-medium">
          + Add New Category
        </button>
      </div>

      {/* Export Data */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-lg font-semibold text-[#1F2933] mb-4 flex items-center gap-2">
          <Download className="w-5 h-5" />
          Export Data
        </h3>
        <p className="text-sm text-[#64748B] mb-4">
          Download your financial data in CSV or PDF format.
        </p>
        <div className="flex gap-3">
          <button className="flex-1 px-4 py-3 bg-gray-50 text-[#1F2933] rounded-xl hover:bg-gray-100 transition-colors font-medium">
            Export as CSV
          </button>
          <button className="flex-1 px-4 py-3 bg-gray-50 text-[#1F2933] rounded-xl hover:bg-gray-100 transition-colors font-medium">
            Export as PDF
          </button>
        </div>
      </div>

      {/* About */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-[#1F2933] mb-4">About Leofy</h3>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2DD4BF] to-[#14B8A6] flex items-center justify-center">
            <span className="text-white text-xl font-semibold">L</span>
          </div>
          <div>
            <p className="font-semibold text-[#1F2933]">Leofy</p>
            <p className="text-sm text-[#64748B]">Version 1.0.0</p>
          </div>
        </div>
        <p className="text-sm text-[#64748B] leading-relaxed">
          Leofy is your personal finance companion, designed to help you track income, 
          expenses, and credit cards with clarity and ease. Stay on top of your financial 
          health without the stress.
        </p>
        <div className="mt-6 pt-6 border-t border-gray-100 space-y-2">
          <a href="#" className="block text-sm text-[#2DD4BF] hover:text-[#14B8A6]">Privacy Policy</a>
          <a href="#" className="block text-sm text-[#2DD4BF] hover:text-[#14B8A6]">Terms of Service</a>
          <a href="#" className="block text-sm text-[#2DD4BF] hover:text-[#14B8A6]">Contact Support</a>
        </div>
      </div>
    </div>
  );
}
