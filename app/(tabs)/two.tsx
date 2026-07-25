import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTasks } from "../../context/TaskContext";
import { useCustomTheme } from "../../context/ThemeContext";

const themes = {
  light: {
    background: "#F5F5F7",
    card: "#FFFFFF",
    text: "#1C1C1E",
    border: "#E5E5EA",
    textInput: "#F2F2F7",
    primary: "#007AFF",
  },
  dark: {
    background: "#121212",
    card: "#1E1E1E",
    text: "#FFFFFF",
    border: "#38383A",
    textInput: "#2C2C2E",
    primary: "#0A84FF",
  },
};

export default function CreateTaskScreen() {
  const { addTask } = useTasks();
  const { theme } = useCustomTheme();
  const colors = theme === "dark" ? themes.dark : themes.light;
  const router = useRouter();

  // Состояния полей формы
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [hoursAhead, setHoursAhead] = useState("2"); // Дефолтный дедлайн через 2 часа

  // Ошибки валидации
  const [errors, setErrors] = useState<{
    title?: string;
    description?: string;
    address?: string;
  }>({});

  const handleCreate = async () => {
    const currentErrors: typeof errors = {};

    // Жесткая валидация по ТЗ
    if (!title.trim()) currentErrors.title = "Название задачи обязательно";
    if (!description.trim())
      currentErrors.description = "Описание задачи обязательно";
    if (!address.trim()) currentErrors.address = "Адрес локации обязателен";

    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      Alert.alert("Ошибка", "Пожалуйста, заполните все обязательные поля.");
      return;
    }

    // Вычисляем дату дедлайна
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + parseInt(hoursAhead || "2", 10));

    try {
      await addTask({
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate.toISOString(),
        location: { address: address.trim() },
        attachments: [], // Фото добавим на следующем шаге
        status: "New",
      });

      Alert.alert("Успех", "Задача успешно создана локально!", [
        {
          text: "Отлично",
          onPress: () => {
            // Очищаем форму
            setTitle("");
            setDescription("");
            setAddress("");
            setErrors({});
            // Перенаправляем на первый таб со списком
            router.push("/");
          },
        },
      ]);
    } catch (e) {
      Alert.alert("Ошибка", "Не удалось сохранить задачу.");
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.screenTitle, { color: colors.text }]}>
        Новая задача
      </Text>

      {/* Поле: Название */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>
          Название задачи *
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.textInput,
              color: colors.text,
              borderColor: errors.title ? "#FF3B30" : colors.border,
            },
          ]}
          placeholder="Например, Проверить электрощит"
          placeholderTextColor="#8E8E93"
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            if (errors.title)
              setErrors((prev) => ({ ...prev, title: undefined }));
          }}
        />
        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
      </View>

      {/* Поле: Описание */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>
          Описание работ *
        </Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            {
              backgroundColor: colors.textInput,
              color: colors.text,
              borderColor: errors.description ? "#FF3B30" : colors.border,
            },
          ]}
          placeholder="Подробно опишите, что нужно сделать на объекте..."
          placeholderTextColor="#8E8E93"
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={(text) => {
            setDescription(text);
            if (errors.description)
              setErrors((prev) => ({ ...prev, description: undefined }));
          }}
        />
        {errors.description && (
          <Text style={styles.errorText}>{errors.description}</Text>
        )}
      </View>

      {/* Поле: Локация (Адрес) */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>
          Адрес объекта *
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.textInput,
              color: colors.text,
              borderColor: errors.address ? "#FF3B30" : colors.border,
            },
          ]}
          placeholder="Улица, дом, номер офиса"
          placeholderTextColor="#8E8E93"
          value={address}
          onChangeText={(text) => {
            setAddress(text);
            if (errors.address)
              setErrors((prev) => ({ ...prev, address: undefined }));
          }}
        />
        {errors.address && (
          <Text style={styles.errorText}>{errors.address}</Text>
        )}
      </View>

      {/* Поле: Время на выполнение */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>
          Срок выполнения (через сколько часов)
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.textInput,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          keyboardType="numeric"
          value={hoursAhead}
          onChangeText={setHoursAhead}
        />
      </View>

      {/* Кнопка создания */}
      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: colors.primary }]}
        onPress={handleCreate}
      >
        <Text style={styles.submitButtonText}>Сохранить задачу</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 60, paddingBottom: 40 },
  screenTitle: { fontSize: 28, fontWeight: "bold", marginBottom: 24 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: { height: 100, textAlignVertical: "top" },
  errorText: {
    color: "#FF3B30",
    fontSize: 13,
    marginTop: 4,
    fontWeight: "500",
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});
