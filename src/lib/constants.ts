export const APP_NAME = "ShopNova";
export const CURRENCY = "BDT";
export const CURRENCY_SYMBOL = "৳";

export const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  { value: 'processing', label: 'Processing', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'packed', label: 'Packed', color: 'bg-purple-100 text-purple-800' },
  { value: 'shipped', label: 'Shipped', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-orange-100 text-orange-800' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  { value: 'returned', label: 'Returned', color: 'bg-gray-100 text-gray-800' },
  { value: 'refund_requested', label: 'Refund Requested', color: 'bg-amber-100 text-amber-800' },
  { value: 'refunded', label: 'Refunded', color: 'bg-teal-100 text-teal-800' },
];

export const PRODUCT_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
];

export const NAV_ITEMS = [
  { label: 'Home', href: '#home' },
  { label: 'Shop', href: '#shop' },
  { label: 'Categories', href: '#categories' },
  { label: 'Deals', href: '#shop?sort=newest&featured=true' },
  { label: 'Contact', href: '#contact' },
];

export const ADMIN_NAV_ITEMS = [
  { label: 'Dashboard', href: '#admin', icon: 'LayoutDashboard' },
  { label: 'Products', href: '#admin/products', icon: 'Package' },
  { label: 'Orders', href: '#admin/orders', icon: 'ShoppingCart' },
  { label: 'Customers', href: '#admin/customers', icon: 'Users' },
  { label: 'Categories', href: '#admin/categories', icon: 'FolderTree' },
  { label: 'Brands', href: '#admin/brands', icon: 'Tag' },
  { label: 'Coupons', href: '#admin/coupons', icon: 'Ticket' },
  { label: 'Import', href: '#admin/import', icon: 'Download' },
  { label: 'Homepage', href: '#admin/homepage', icon: 'Home' },
  { label: 'Settings', href: '#admin/settings', icon: 'Settings' },
];

export const ACCOUNT_NAV_ITEMS = [
  { label: 'Profile', href: '#account', icon: 'User' },
  { label: 'Orders', href: '#account/orders', icon: 'Package' },
  { label: 'Addresses', href: '#account/addresses', icon: 'MapPin' },
  { label: 'Wishlist', href: '#account/wishlist', icon: 'Heart' },
  { label: 'Reviews', href: '#account/reviews', icon: 'Star' },
  { label: 'Notifications', href: '#account/notifications', icon: 'Bell' },
];
