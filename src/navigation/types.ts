import type { NavigatorScreenParams } from "@react-navigation/native";

export type ShopStackParamList = {
  ShopHome: undefined;
  ProductDetail: { productId: string; handle?: string };
};

export type OrderStackParamList = {
  OrderHome: undefined;
  Confirmation:
    | {
        reservationId?: string;
      }
    | undefined;
};

export type AboutStackParamList = {
  AboutHome: undefined;
};

export type RootTabParamList = {
  Shop: NavigatorScreenParams<ShopStackParamList>;
  Order: NavigatorScreenParams<OrderStackParamList>;
  About: NavigatorScreenParams<AboutStackParamList>;
};
