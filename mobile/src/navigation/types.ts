export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
};

export type CustomerTabParamList = {
  Home: undefined;
  Marketplace:
    | { categoryId?: number; search?: string }
    | undefined;
  Messages: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type VendorTabParamList = {
  Dashboard: undefined;
  Services: undefined;
  Messages: undefined;
  Profile: undefined;
};

export type AdminTabParamList = {
  Overview: undefined;
  Users: undefined;
  Vendors: undefined;
  Menu: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  ServiceDetail: { id: number };
  VendorPublic: { id: number };
  Favorites: undefined;
  AdminChat: { title: string; subtitle?: string; bookingId?: number; withId?: number };
  AdminBookings: undefined;
  AdminServices: undefined;
  AdminCategories: undefined;
  AdminReviews: undefined;
  AdminMessages: undefined;
  AdminMenus: undefined;
  AdminMedia: undefined;
  AdminSlider: undefined;
  AdminCoupons: undefined;
  AdminModeration: undefined;
  AdminCommissions: undefined;
  AdminKyc: undefined;
  AdminActivity: undefined;
  AdminSettings: undefined;
  AdminSeo: undefined;
  AdminPageSeo: undefined;
};
