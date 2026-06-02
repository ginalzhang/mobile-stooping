import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { ComponentType } from "react";
import { StyleSheet, Text, View } from "react-native";

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
            const icon = route.name === "Shop" ? "▰" : route.name === "Order" ? "▣" : "↻";
            return (
              <View>
                <Text style={{ color, fontSize: 20, fontWeight: "900" }}>{icon}</Text>
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
