import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTasks } from "../context/TaskContext";
import { useCustomTheme } from "../context/ThemeContext";
import { TaskStatus } from "../types";

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

export default function TaskDetailModal() {
  const { tasks, updateTaskStatus, deleteTask } = useTasks();
  const { theme } = useCustomTheme();
  const colors = theme === "dark" ? themes.dark : themes.light;
  const router = useRouter();

  // Получаем id задачи из параметров навигации
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <Text style={{ color: colors.text }}>Задача не найдена</Text>
      </View>
    );
  }

  const changeStatus = async (status: TaskStatus) => {
    await updateTaskStatus(task.id, status);
    Alert.alert("Успех", `Статус изменен на "${status}"`);
  };

  const handleDelete = () => {
    Alert.alert("Удаление", "Вы уверены, что хотите удалить эту задачу?", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          await deleteTask(task.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Исправленная шапка: центровка через стили, без пустых View-заглушек */}
      <View style={[styles.customHeader, { borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={{ color: "#007AFF", fontSize: 17, fontWeight: "600" }}>
            ← Назад
          </Text>
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Детали задачи
          </Text>
        </View>
      </View>

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            {task.title}
          </Text>
          <Text
            style={[
              styles.statusText,
              { color: task.status === "Completed" ? "#34C759" : "#007AFF" },
            ]}
          >
            Статус: {task.status}
          </Text>
          <Text style={[styles.description, { color: colors.text }]}>
            {task.description}
          </Text>
          <Text style={[styles.metaText, { color: colors.subText }]}>
            📍 Адрес: {task.location.address}
          </Text>
          <Text style={[styles.metaText, { color: colors.subText }]}>
            📅 Дедлайн: {new Date(task.dueDate).toLocaleString()}
          </Text>
          <Text style={[styles.metaText, { color: colors.subText }]}>
            🔄 Синхронизация: {task.syncStatus}
          </Text>
        </View>

        {/* Кнопки управления статусом */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Изменить статус:
        </Text>
        <View style={styles.statusButtonsRow}>
          {(["In Progress", "Completed", "Cancelled"] as TaskStatus[]).map(
            (status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusButton,
                  {
                    backgroundColor:
                      task.status === status ? "#8E8E93" : "#007AFF",
                  },
                ]}
                disabled={task.status === status}
                onPress={() => changeStatus(status)}
              >
                <Text style={styles.buttonText}>{status}</Text>
              </TouchableOpacity>
            ),
          )}
        </View>

        {/* Кнопка удаления */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.buttonText}>Удалить задачу</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 10, paddingBottom: 40 },
  // Стили для новой кастомной шапки
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    position: "relative",
  },
  backButton: {
    zIndex: 10,
    paddingVertical: 4,
  },
  headerTitleContainer: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: 40,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  infoCard: { borderRadius: 12, padding: 16, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 8 },
  statusText: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  description: { fontSize: 16, lineHeight: 24, marginBottom: 16 },
  metaText: { fontSize: 14, marginBottom: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 10 },
  statusButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: "center",
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "#FFF", fontWeight: "bold", fontSize: 14 },
});
