import { useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTasks } from "../../context/TaskContext";
import { useCustomTheme } from "../../context/ThemeContext";
import { Task, TaskStatus } from "../../types";

// Простые цвета для светлой и тёмной темы
const themes = {
  light: {
    background: "#F5F5F7",
    card: "#FFFFFF",
    text: "#1C1C1E",
    subText: "#8E8E93",
    primary: "#007AFF",
  },
  dark: {
    background: "#121212",
    card: "#1E1E1E",
    text: "#FFFFFF",
    subText: "#8E8E93",
    primary: "#0A84FF",
  },
};

// Цветовые маркеры для статусов
const statusColors: Record<TaskStatus, string> = {
  New: "#34C759",
  "In Progress": "#007AFF",
  Completed: "#8E8E93",
  Cancelled: "#FF3B30",
};

export default function TaskListScreen() {
  const { tasks } = useTasks(); // Извлекаем таски
  const { theme, toggleTheme: changeTheme } = useCustomTheme(); // Извлекаем тему
  const colors = theme === "dark" ? themes.dark : themes.light;

  // Состояние для типа сортировки
  const [sortBy, setSortBy] = useState<"createdAt" | "dueDate" | "status">(
    "createdAt",
  );

  const router = useRouter();

  // Функция сортировки данных
  const getSortedTasks = (): Task[] => {
    const activeTasks = tasks.filter((t) => !t.isDeleted);
    return [...activeTasks].sort((a, b) => {
      if (sortBy === "status") {
        return a.status.localeCompare(b.status);
      }
      const dateA = new Date(
        sortBy === "dueDate" ? a.dueDate : a.createdAt,
      ).getTime();
      const dateB = new Date(
        sortBy === "dueDate" ? b.dueDate : b.createdAt,
      ).getTime();
      return dateB - dateA;
    });
  };

  // Компонент карточки задачи
  const renderTaskItem = ({ item }: { item: Task }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() =>
        router.push({ pathname: "/modal", params: { id: item.id } })
      }
    >
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeader}>
          <Text
            style={[styles.taskTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColors[item.status] },
            ]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <Text
          style={[styles.taskDescription, { color: colors.subText }]}
          numberOfLines={2}
        >
          {item.description}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={[styles.footerText, { color: colors.subText }]}>
            📅 До:{" "}
            {new Date(item.dueDate).toLocaleString([], {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "2-digit",
            })}
          </Text>
          <Text
            style={[styles.footerText, { color: colors.subText }]}
            numberOfLines={1}
          >
            📍 {item.location.address}
          </Text>
        </View>

        {/* Индикатор синхронизации */}
        <View style={styles.syncContainer}>
          <Text
            style={[
              styles.syncText,
              {
                color:
                  item.syncStatus === "Synced"
                    ? "#34C759" // Зеленый, если успешно
                    : item.syncStatus === "Sync Failed"
                      ? "#FF3B30" // Красный, если ошибка отправки
                      : "#FF9500", // Оранжевый, если ждет в очереди (Pending)
              },
            ]}
          >
            ●{" "}
            {item.syncStatus === "Sync Failed"
              ? "Ошибка отправки"
              : item.syncStatus}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Шапка экрана с переключателем темы */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Задачи</Text>
        <TouchableOpacity
          style={[styles.themeButton, { backgroundColor: colors.card }]}
          onPress={changeTheme}
        >
          <Text style={{ color: colors.primary }}>
            {theme === "light" ? "🌙 Тёмная" : "☀️ Светлая"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Панель сортировки */}
      <View style={styles.sortContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortScroll}
        >
          <Text style={[styles.sortLabel, { color: colors.subText }]}>
            Сортировка:
          </Text>
          <TouchableOpacity
            style={[
              styles.sortChip,
              sortBy === "createdAt" && { backgroundColor: colors.primary },
            ]}
            onPress={() => setSortBy("createdAt")}
          >
            <Text
              style={[
                styles.sortChipText,
                sortBy === "createdAt" && styles.activeChipText,
                { color: sortBy === "createdAt" ? "#FFF" : colors.text },
              ]}
            >
              По созданию
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortChip,
              sortBy === "dueDate" && { backgroundColor: colors.primary },
            ]}
            onPress={() => setSortBy("dueDate")}
          >
            <Text
              style={[
                styles.sortChipText,
                sortBy === "dueDate" && styles.activeChipText,
                { color: sortBy === "dueDate" ? "#FFF" : colors.text },
              ]}
            >
              По дедлайну
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortChip,
              sortBy === "status" && { backgroundColor: colors.primary },
            ]}
            onPress={() => setSortBy("status")}
          >
            <Text
              style={[
                styles.sortChipText,
                sortBy === "status" && styles.activeChipText,
                { color: sortBy === "status" ? "#FFF" : colors.text },
              ]}
            >
              По статусу
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Список задач или Empty State */}
      <FlatList
        data={getSortedTasks()}
        keyExtractor={(item) => item.id}
        renderItem={renderTaskItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={[styles.emptyText, { color: colors.text }]}>
              Список задач пуст
            </Text>
            <Text style={[styles.emptySubText, { color: colors.subText }]}>
              Создайте новую задачу, чтобы она появилась здесь.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: "bold" },
  themeButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  sortContainer: { paddingVertical: 8, paddingHorizontal: 16 },
  sortScroll: { alignItems: "center" },
  sortLabel: { marginRight: 8, fontSize: 14 },
  sortChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#8E8E93",
  },
  sortChipText: { fontSize: 13 },
  activeChipText: { fontWeight: "600" },
  listContent: { padding: 16, paddingBottom: 80 },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  taskTitle: { fontSize: 18, fontWeight: "bold", flex: 1, marginRight: 8 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  statusText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  taskDescription: { fontSize: 14, marginBottom: 12, lineHeight: 20 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#8E8E93",
    paddingTop: 8,
  },
  footerText: { fontSize: 11, flex: 1 },
  syncContainer: { marginTop: 8, alignItems: "flex-end" },
  syncText: { fontSize: 11, fontWeight: "600" },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 50, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  emptySubText: { fontSize: 14, textAlign: "center" },
});
