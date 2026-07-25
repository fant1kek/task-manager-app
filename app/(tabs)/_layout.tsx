import { Tabs } from "expo-router";
import React from "react";
import { Text } from "react-native";
import { useCustomTheme } from "../../context/ThemeContext";

const themes = {
  light: {
    card: "#FFFFFF",
    text: "#1C1C1E",
    primary: "#007AFF",
    inactive: "#8E8E93",
  },
  dark: {
    card: "#1E1E1E",
    text: "#FFFFFF",
    primary: "#0A84FF",
    inactive: "#8E8E93",
  },
};

export default function TabLayout() {
  const { theme } = useCustomTheme();
  const colors = theme === "dark" ? themes.dark : themes.light;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inactive,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 0,
          elevation: 5,
          shadowOpacity: 0.1,
        },
      }}
    >
      {/* Вкладка 1: Главный список задач */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Задачи",
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? "📋" : "📁"}</Text>
          ),
        }}
      />

      {/* Вкладка 2: Форма создания */}
      <Tabs.Screen
        name="two"
        options={{
          title: "Создать",
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? "➕" : "📝"}</Text>
          ),
        }}
      />
    </Tabs>
  );
}
