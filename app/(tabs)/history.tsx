import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useTasks } from "../../src/context/TaskContext";
import { useCustomTheme } from "../../src/context/ThemeContext";
import { HistoryLog } from "../../src/types";

const themes = {
  light: {
    background: "#F5F5F7",
    card: "#FFFFFF",
    text: "#1C1C1E",
    subText: "#8E8E93",
    border: "#E5E5EA",
  },
  dark: {
    background: "#121212",
    card: "#1E1E1E",
    text: "#FFFFFF",
    subText: "#8E8E93",
    border: "#38383A",
  },
};

// Иконки для разных типов действий
const actionIcons: Record<HistoryLog["actionType"], string> = {
  Create: "🟢",
  Edit: "🟡",
  "Status Change": "🔵",
  Attachment: "📎",
  Delete: "🔴",
  Sync: "🔄",
};

export default function HistoryScreen() {
  const { history } = useTasks();
  const { theme } = useCustomTheme();
  const colors = theme === "dark" ? themes.dark : themes.light;

  const renderHistoryItem = ({ item }: { item: HistoryLog }) => (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.icon}>{actionIcons[item.actionType] || "📝"}</Text>
        <Text style={[styles.actionType, { color: colors.text }]}>
          {item.actionType}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </Text>
      </View>
      <Text style={[styles.description, { color: colors.text }]}>
        {item.description}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.screenTitle, { color: colors.text }]}>
        History actions
      </Text>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderHistoryItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📜</Text>
            <Text style={[styles.emptyText, { color: colors.text }]}>
              Story is empty
            </Text>
            <Text style={[styles.emptySubText, { color: colors.subText }]}>
              Logs of task creation and modification will be displayed here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  screenTitle: {
    fontSize: 28,
    fontWeight: "bold",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  card: { padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  icon: { fontSize: 16, marginRight: 8 },
  actionType: { fontSize: 14, fontWeight: "bold", flex: 1 },
  timestamp: { fontSize: 12, color: "#8E8E93" },
  description: { fontSize: 15, lineHeight: 20 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyIcon: { fontSize: 50, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  emptySubText: { fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
});
