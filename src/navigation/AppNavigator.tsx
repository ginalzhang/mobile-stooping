import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { ComponentType } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { CartScreen } from "../features/cart/CartScreen";
import { useCart } from "../features/cart/CartContext";
import { ConfirmationScreen } from "../features/cart/ConfirmationScreen";
import { ProductDetailScreen } from "../features/product/ProductDetailScreen";
import { ShopScreen } from "../features/shop/ShopScreen";
import { colors } from "../theme/colors";
import type {
  AboutStackParamList,
  OrderStackParamList,
  RootTabParamList,
  ShopStackParamList
} from "./types";

let AboutScreenComponent: ComponentType;

try {
  AboutScreenComponent = require("../features/content").AboutScreen;
} catch {
  AboutScreenComponent = function AboutPlaceholder() {
    return <Text>About Stooping Club</Text>;
  };
}

const Tab = createBottomTabNavigator<RootTabParamList>();
const ShopStack = createNativeStackNavigator<ShopStackParamList>();
const OrderStack = createNativeStackNavigator<OrderStackParamList>();
const AboutStack = createNativeStackNavigator<AboutStackParamList>();

function ShopNavigator() {
  return (
    <ShopStack.Navigator screenOptions={stackOptions}>
      <ShopStack.Screen
        component={ShopScreen}
        name="ShopHome"
        options={{ title: "Stooping Club" }}
      />
      <ShopStack.Screen
        component={ProductDetailScreen}
        name="ProductDetail"
        options={{ title: "Item details" }}
      />
    </ShopStack.Navigator>
  );
}

function OrderNavigator() {
  return (
    <OrderStack.Navigator screenOptions={stackOptions}>
      <OrderStack.Screen
        component={CartScreen}
        name="OrderHome"
        options={{ title: "Your order" }}
      />
      <OrderStack.Screen
        component={ConfirmationScreen}
        name="Confirmation"
        options={{ title: "Pickup reminder" }}
      />
    </OrderStack.Navigator>
  );
}

function AboutNavigator() {
  return (
    <AboutStack.Navigator screenOptions={stackOptions}>
      <AboutStack.Screen
        component={AboutScreenComponent}
        name="AboutHome"
        options={{ title: "About" }}
      />
    </AboutStack.Navigator>
  );
}

export function AppNavigator() {
  const { totalQuantity } = useCart();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.forest,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            minHeight: 64,
            paddingBottom: 8,
            paddingTop: 8
          },
          tabBarIcon: ({ color }) => {
            return (
              <View>
                <TabIcon color={color} name={route.name} />
                {route.name === "Order" && totalQuantity > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{totalQuantity}</Text>
                  </View>
                ) : null}
              </View>
            );
          }
        })}
      >
        <Tab.Screen component={ShopNavigator} name="Shop" />
        <Tab.Screen component={OrderNavigator} name="Order" />
        <Tab.Screen component={AboutNavigator} name="About" />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function TabIcon({ color, name }: { color: string; name: keyof RootTabParamList }) {
  if (name === "Shop") {
    return (
      <Svg fill="none" height={24} viewBox="0 0 24 24" width={24}>
        <Path
          d="M5 9h14l-1.2 10.2A2 2 0 0 1 15.82 21H8.18a2 2 0 0 1-1.98-1.8L5 9Z"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
        <Path
          d="M8 9 10.2 4.5M16 9l-2.2-4.5M7.5 13h9"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
      </Svg>
    );
  }

  if (name === "Order") {
    return (
      <Svg fill="none" height={24} viewBox="0 0 24 24" width={24}>
        <Path
          d="M6.5 8.5h11l1 11A1.5 1.5 0 0 1 17 21H7a1.5 1.5 0 0 1-1.49-1.5l.99-11Z"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
        <Path
          d="M9 8.5V7a3 3 0 0 1 6 0v1.5M9.5 15.5c1.5 1.2 3.5 1.2 5 0"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
      </Svg>
    );
  }

  return (
    <Svg fill="none" height={24} viewBox="0 0 24 24" width={24}>
      <Path
        d="M17.5 7.5A7 7 0 0 0 5.8 9.4M5 5.5v4.2h4.2M6.5 16.5a7 7 0 0 0 11.7-1.9M19 18.5v-4.2h-4.2"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

const stackOptions = {
  contentStyle: { backgroundColor: colors.cream },
  headerShown: false,
  headerStyle: { backgroundColor: colors.cream },
  headerShadowVisible: false,
  headerTintColor: colors.forest,
  headerTitleStyle: {
    color: colors.ink,
    fontWeight: "900" as const
  }
};

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: colors.rust,
    borderRadius: 999,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    position: "absolute",
    right: -12,
    top: -5
  },
  badgeText: {
    color: colors.card,
    fontSize: 11,
    fontWeight: "900"
  }
});
