import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location"; // Геокодер Expo
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useTasks } from "../../src/context/TaskContext";
import { useCustomTheme } from "../../src/context/ThemeContext";

const themes = {
  light: {
    background: "#F5F5F7",
    card: "#FFFFFF",
    text: "#1C1C1E",
    subText: "#8E8E93",
    border: "#E5E5EA",
    textInput: "#F2F2F7",
    primary: "#007AFF",
  },
  dark: {
    background: "#121212",
    card: "#1E1E1E",
    text: "#FFFFFF",
    subText: "#8E8E93",
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
  const mapRef = useRef<MapView | null>(null);

  // Состояния полей формы
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [hoursAhead, setHoursAhead] = useState("2");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{
    uri: string;
    name: string;
    type: "image" | "pdf";
  } | null>(null);

  // Координаты и лоадер для геокодирования
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [errors, setErrors] = useState<{
    title?: string;
    description?: string;
    address?: string;
  }>({});

  const INITIAL_REGION = {
    latitude: 55.7558,
    longitude: 37.6173,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  // МЕТОД 1: Координаты ➡️ Адрес (Клик по карте)
  const handleMapPress = async (lat: number, lon: number) => {
    setCoordinates({ latitude: lat, longitude: lon });
    setIsGeocoding(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Access is denied",
          "Allow access to the location to auto-complete the address.",
        );
        setIsGeocoding(false);
        return;
      }

      const response = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lon,
      });
      if (response && response.length > 0) {
        const item = response[0];
        const formattedAddress = [
          item.city || item.subregion,
          item.street,
          item.name,
        ]
          .filter(Boolean)
          .join(", ");

        setAddress(
          formattedAddress || `Point: ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
        );
        if (errors.address)
          setErrors((prev) => ({ ...prev, address: undefined }));
      }
    } catch (error) {
      console.log("Ошибка обратного геокодирования:", error);
    } finally {
      setIsGeocoding(false);
    }
  };

  // МЕТОД 2: Адрес ➡️ Координаты (Ввод текста + Кнопка "Найти")
  const geocodeAddressText = async () => {
    if (!address.trim()) {
      Alert.alert("Attention", "First, enter the address text in the line.");
      return;
    }
    setIsGeocoding(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Access is denied", "Allow access to the location.");
        setIsGeocoding(false);
        return;
      }

      const response = await Location.geocodeAsync(address.trim());
      if (response && response.length > 0) {
        const { latitude, longitude } = response[0];
        setCoordinates({ latitude, longitude });

        mapRef.current?.animateToRegion(
          {
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          1000,
        );
      } else {
        Alert.alert(
          "Oops",
          "The specified address could not be found. Try to write it more accurately.",
        );
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred when searching for a location.");
    } finally {
      setIsGeocoding(false);
    }
  };

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAttachedFile({
        uri: result.assets[0].uri,
        name: result.assets[0].fileName || "photo.jpg",
        type: "image",
      });
    }
  };

  const pickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAttachedFile({
          uri: result.assets[0].uri,
          name: result.assets[0].name,
          type: "pdf",
        });
      }
    } catch (err) {
      Alert.alert("Error", "Couldn't select a document.");
    }
  };
  const handleCreate = async () => {
    const currentErrors: typeof errors = {};
    if (!title.trim()) currentErrors.title = "The task name is required";
    if (!description.trim())
      currentErrors.description = "The task description is required";
    if (!address.trim()) currentErrors.address = "Location address is required";

    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      return;
    }

    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + parseInt(hoursAhead || "2", 10));

    await addTask({
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate.toISOString(),
      location: {
        address: address.trim(),
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
      },
      attachments: attachedFile ? [JSON.stringify(attachedFile)] : [],
      status: "New",
    });

    Alert.alert("Success", "The task has been successfully created!", [
      {
        text: "Ok",
        onPress: () => {
          setTitle("");
          setDescription("");
          setAddress("");
          setCoordinates(null);
          setAttachedFile(null);
          setErrors({});
          router.push("/");
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.screenTitle, { color: colors.text }]}>New task</Text>

      {/* Поле: Название */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Task name *</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.textInput,
              color: colors.text,
              borderColor: errors.title ? "#FF3B30" : colors.border,
            },
          ]}
          placeholder="Make a program"
          placeholderTextColor="#8E8E93"
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            if (errors.title)
              setErrors((prev) => ({ ...prev, title: undefined }));
          }}
        />
      </View>

      {/* Поле: Описание */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>
          Description of works *
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
          placeholder="Describe the task in detail..."
          placeholderTextColor="#8E8E93"
          multiline
          value={description}
          onChangeText={(text) => {
            setDescription(text);
            if (errors.description)
              setErrors((prev) => ({ ...prev, description: undefined }));
          }}
        />
      </View>

      {/* Поле: Локация (Адрес и Кнопка Найти) */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Address *</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={[
              styles.input,
              {
                flex: 1,
                backgroundColor: colors.textInput,
                color: colors.text,
                borderColor: errors.address ? "#FF3B30" : colors.border,
              },
            ]}
            placeholder="City, street, house"
            placeholderTextColor="#8E8E93"
            value={address}
            onChangeText={(text) => {
              setAddress(text);
              if (errors.address)
                setErrors((prev) => ({ ...prev, address: undefined }));
            }}
          />
          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: colors.primary }]}
            onPress={geocodeAddressText}
            disabled={isGeocoding}
          >
            {isGeocoding ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.searchButtonText}>Find</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Интерактивная карта */}
      <View style={styles.inputGroup}>
        <View style={[styles.mapContainer, { borderColor: colors.border }]}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={INITIAL_REGION}
            onPress={(e) =>
              handleMapPress(
                e.nativeEvent.coordinate.latitude,
                e.nativeEvent.coordinate.longitude,
              )
            }
          >
            {coordinates && (
              <Marker
                coordinate={coordinates}
                title="Selected object"
                pinColor={colors.primary}
              />
            )}
          </MapView>
        </View>
        {coordinates && (
          <Text
            style={{
              color: "#34C759",
              fontSize: 13,
              marginTop: 6,
              fontWeight: "500",
            }}
          >
            ✓ The point is connected: {coordinates.latitude.toFixed(4)},{" "}
            {coordinates.longitude.toFixed(4)}
          </Text>
        )}
      </View>

      {/* Вложения */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>
          Attachment (Image or PDF)
        </Text>
        {attachedFile ? (
          <View
            style={[
              styles.imagePreviewContainer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {attachedFile.type === "image" ? (
              <Image
                source={{ uri: attachedFile.uri }}
                style={styles.previewImage}
              />
            ) : (
              <View style={{ paddingVertical: 16, alignItems: "center" }}>
                <Text style={{ fontSize: 36 }}>📄</Text>
                <Text
                  style={{ color: colors.text, marginTop: 4 }}
                  numberOfLines={1}
                >
                  {attachedFile.name}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setAttachedFile(null)}
            >
              <Text style={styles.removeImageText}>✕ Delete</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <TouchableOpacity
              style={[
                styles.attachButton,
                {
                  flex: 1,
                  marginRight: 6,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={pickImage}
            >
              <Text style={{ color: colors.primary, fontWeight: "600" }}>
                📸 Photo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.attachButton,
                {
                  flex: 1,
                  marginLeft: 6,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={pickPdf}
            >
              <Text style={{ color: colors.primary, fontWeight: "600" }}>
                📄 PDF
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Демо-режим пушей */}
      <View
        style={[
          styles.inputGroup,
          {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: colors.card,
            padding: 12,
            borderRadius: 10,
            marginBottom: 20,
          },
        ]}
      >
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={[styles.label, { color: colors.text, marginBottom: 2 }]}>
            🛠 Demo notification mode
          </Text>
          <Text style={{ color: colors.subText, fontSize: 12 }}>
            Test push in 30 seconds
          </Text>
        </View>
        <Switch
          value={isDemoMode}
          onValueChange={setIsDemoMode}
          trackColor={{ false: "#767577", true: colors.primary }}
        />
      </View>

      {/* Кнопка сохранения */}
      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: colors.primary }]}
        onPress={handleCreate}
      >
        <Text style={styles.submitButtonText}>Save task</Text>
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
  textArea: { height: 80, textAlignVertical: "top" },
  searchRow: { flexDirection: "row", alignItems: "center" },
  searchButton: {
    marginLeft: 8,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  searchButtonText: { color: "#FFF", fontWeight: "bold", fontSize: 14 },
  mapContainer: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
  },
  map: { width: "100%", height: "100%" },
  attachButton: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  imagePreviewContainer: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginTop: 4,
  },
  previewImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    resizeMode: "cover",
  },
  removeImageButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  removeImageText: { color: "#FFF", fontWeight: "bold", fontSize: 12 },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});
