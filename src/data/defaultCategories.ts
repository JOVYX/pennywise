import { Category } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  // Expense Categories - Essential
  {
    id: 'rent-housing',
    name: 'Rent & Hostel / PG',
    type: 'expense',
    classification: 'essential',
    icon: 'Home',
    color: '#3b82f6', // blue
    isDefault: true,
    order: 1,
    subcategories: ['PG Rent', 'Flat Rent', 'Electricity & Maintenance', 'Hostel Fee']
  },
  {
    id: 'food-mess',
    name: 'Food & Mess / Canteen',
    type: 'expense',
    classification: 'essential',
    icon: 'Utensils',
    color: '#10b981', // emerald
    isDefault: true,
    order: 2,
    subcategories: ['Mess Bill', 'College Canteen', 'Dhaba / Thali', 'Swiggy / Zomato']
  },
  {
    id: 'groceries',
    name: 'Groceries & Essentials',
    type: 'expense',
    classification: 'essential',
    icon: 'ShoppingBag',
    color: '#06b6d4', // cyan
    isDefault: true,
    order: 3,
    subcategories: ['Kirana / Supermarket', 'Blinkit / Zepto', 'Toiletries', 'Fruits & Milk']
  },
  {
    id: 'transport',
    name: 'Transport & Commute',
    type: 'expense',
    classification: 'essential',
    icon: 'Bus',
    color: '#f59e0b', // amber
    isDefault: true,
    order: 4,
    subcategories: ['Metro Smart Card', 'Auto / Rickshaw', 'Bus Pass', 'Petrol / Fuel', 'Rapido / Uber']
  },
  {
    id: 'college-education',
    name: 'College & Academics',
    type: 'expense',
    classification: 'essential',
    icon: 'GraduationCap',
    color: '#8b5cf6', // purple
    isDefault: true,
    order: 5,
    subcategories: ['Books & Notebooks', 'Printouts & Xerox', 'Exam / Lab Fees', 'Online Course']
  },
  {
    id: 'mobile-internet',
    name: 'Mobile Recharge & Wi-Fi',
    type: 'expense',
    classification: 'essential',
    icon: 'Wifi',
    color: '#ec4899', // pink
    isDefault: true,
    order: 6,
    subcategories: ['Jio / Airtel Recharge', 'PG Wi-Fi Share', 'Data Add-on']
  },
  {
    id: 'health-personal',
    name: 'Health & Pharmacy',
    type: 'expense',
    classification: 'essential',
    icon: 'HeartPulse',
    color: '#ef4444', // red
    isDefault: true,
    order: 7,
    subcategories: ['Medicines / Pharmacy', 'Doctor Consultation', 'Grooming / Haircut', 'Gym Membership']
  },

  // Expense Categories - Discretionary
  {
    id: 'chai-snacks',
    name: 'Chai, Snacks & Bakery',
    type: 'expense',
    classification: 'discretionary',
    icon: 'Coffee',
    color: '#d97706', // warm amber
    isDefault: true,
    order: 8,
    subcategories: ['Chai Tapri', 'Samosa / Maggi / Street Food', 'Cafe & Cold Coffee', 'Bakery / Biscuits']
  },
  {
    id: 'entertainment-outings',
    name: 'Entertainment & Movies',
    type: 'expense',
    classification: 'discretionary',
    icon: 'Film',
    color: '#a855f7', // violet
    isDefault: true,
    order: 9,
    subcategories: ['Movie Tickets', 'Weekend Outing / Hangout', 'Gaming / Steam', 'Concerts / Events']
  },
  {
    id: 'shopping-clothes',
    name: 'Shopping & Gear',
    type: 'expense',
    classification: 'discretionary',
    icon: 'Shirt',
    color: '#14b8a6', // teal
    isDefault: true,
    order: 10,
    subcategories: ['Clothing & Shoes', 'Tech Accessories & Earphones', 'Stationery', 'Online Shopping']
  },
  {
    id: 'subscriptions',
    name: 'Digital Subscriptions',
    type: 'expense',
    classification: 'discretionary',
    icon: 'Tv',
    color: '#6366f1', // indigo
    isDefault: true,
    order: 11,
    subcategories: ['Spotify / Apple Music', 'YouTube Premium', 'Amazon Prime', 'Netflix Share']
  },
  {
    id: 'gifts-social',
    name: 'Gifts & Social Treats',
    type: 'expense',
    classification: 'discretionary',
    icon: 'Gift',
    color: '#f43f5e', // rose
    isDefault: true,
    order: 12,
    subcategories: ['Friend Birthday / Treat', 'Festivals & Sweets', 'Donations']
  },
  {
    id: 'debt-repayment',
    name: 'Debt & Friend Repayment',
    type: 'expense',
    classification: 'essential',
    icon: 'CreditCard',
    color: '#64748b', // slate
    isDefault: true,
    order: 13,
    subcategories: ['Repaying Friend / Roommate', 'Splitwise Settlement', 'Credit Card Bill', 'Loan EMI']
  },
  {
    id: 'miscellaneous',
    name: 'Miscellaneous / Other',
    type: 'expense',
    classification: 'discretionary',
    icon: 'MoreHorizontal',
    color: '#94a3b8',
    isDefault: true,
    order: 14,
    subcategories: ['Emergency Cash Expense', 'Lost Item Replacement', 'Other Unplanned']
  },

  // Income Categories
  {
    id: 'income-family',
    name: 'Family Support / Allowance',
    type: 'income',
    classification: 'essential',
    icon: 'Wallet',
    color: '#10b981',
    isDefault: true,
    order: 101,
    subcategories: ['Monthly Pocket Money', 'Parent Transfer for Rent', 'Emergency Family Help']
  },
  {
    id: 'income-freelance',
    name: 'Freelance & Part-time Work',
    type: 'income',
    classification: 'discretionary',
    icon: 'Briefcase',
    color: '#059669',
    isDefault: true,
    order: 102,
    subcategories: ['Coding / Design Gig', 'Tuition / Tutoring', 'Internship Stipend', 'College Event Duty']
  },
  {
    id: 'income-gifts',
    name: 'Gifts & Festival Money',
    type: 'income',
    classification: 'discretionary',
    icon: 'Sparkles',
    color: '#eab308',
    isDefault: true,
    order: 103,
    subcategories: ['Birthday Gift', 'Diwali / Eid / Festival Shagun', 'Relative Blessing']
  },
  {
    id: 'income-refunds',
    name: 'Refunds & Cashbacks',
    type: 'income',
    classification: 'essential',
    icon: 'RotateCcw',
    color: '#06b6d4',
    isDefault: true,
    order: 104,
    subcategories: ['UPI Cashback / Scratch card', 'E-commerce Return Refund', 'Bill Split Reimbursement']
  },
  {
    id: 'income-other',
    name: 'Other Income',
    type: 'income',
    classification: 'discretionary',
    icon: 'PlusCircle',
    color: '#64748b',
    isDefault: true,
    order: 105,
    subcategories: ['Old Textbook Sale', 'Campus Prize / Hackathon', 'Miscellaneous']
  }
];
