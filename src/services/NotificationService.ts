import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";
import { Alert, Platform } from "react-native";

// Настройка того, как уведомления ведут себя, когда приложение открыто
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const NotificationService = {
  // 1. Запрос прав у пользователя (требование UI/UX ТЗ)
  requestPermissions: async () => {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      Alert.alert(
        "Attention",
        "Without permission for notifications, you will miss task deadlines.",
      );
      return false;
    }

    // Специфичная настройка каналов звука для Android
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F71",
      });
    }
    return true;
  },

  // 2. Планирование уведомления за 30 минут до дедлайна
  scheduleTaskNotification: async (
    taskId: string,
    title: string,
    dueDateString: string,
  ) => {
    const dueDate = new Date(dueDateString);
    const triggerTime = dueDate.getTime() - 30 * 60 * 1000; // Минус 30 минут
    const now = Date.now();

    // Обработка fallback-логики по ТЗ (если до дедлайна осталось меньше 30 минут)
    if (triggerTime <= now) {
      console.log(`Fallback: дедлайн ближе 30 минут. Планируем на +10 секунд.`);
      return await NotificationService.scheduleDemoNotification(title, 10);
    }

    const secondsSecondsFromNow = Math.floor((triggerTime - now) / 1000);

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "⚠️ The deadline coming soon!",
        body: `There are 30 minutes left until the task "${title}" is completed.`,
        data: { taskId },
      },
      trigger: {
        type: SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsSecondsFromNow,
      },
    });

    return identifier;
  },

  // 3. Тот самый Демо-режим на 30-60 секунд
  scheduleDemoNotification: async (
    title: string,
    secondsAhead: number = 30,
  ) => {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔔 Demo mode: Push verification",
        body: `This is a test notification for the "${title}" task. It's been ${secondsAhead} seconds!`,
      },
      trigger: {
        type: SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsAhead,
      },
    });
    return identifier;
  },
};
