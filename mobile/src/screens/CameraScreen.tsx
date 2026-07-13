import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { analyzeMeal, uploadImage } from '../lib/api';
import type { AnalyzeMealResponse } from '@health-app/shared';

export default function CameraScreen() {
  const navigation = useNavigation();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  async function pickImage(useCamera: boolean) {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission Required', `Please allow ${useCamera ? 'camera' : 'photo library'} access.`);
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          base64: true,
        });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setPreviewUri(asset.uri);
    setAnalyzing(true);

    try {
      let base64 = asset.base64;
      if (!base64) {
        base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      const uri = asset.uri.toLowerCase();
      const imageType: 'jpeg' | 'png' | 'webp' =
        uri.endsWith('.png') ? 'png' : uri.endsWith('.webp') ? 'webp' : 'jpeg';

      const [photoUrl, analysis] = await Promise.all([
        uploadImage(base64, imageType),
        analyzeMeal(base64, imageType),
      ]);

      (navigation as any).navigate('MealResult', {
        photoUrl,
        analysis: analysis as AnalyzeMealResponse,
      });
    } catch (err: any) {
      Alert.alert('Analysis Failed', err.message || 'Could not analyze this image. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <View style={styles.container}>
      {previewUri ? (
        <Image source={{ uri: previewUri }} style={styles.preview} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderEmoji}>📷</Text>
          <Text style={styles.placeholderText}>Take a photo of your meal</Text>
          <Text style={styles.placeholderHint}>or pick one from your gallery</Text>
        </View>
      )}

      {analyzing && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.analyzingText}>AI is analyzing your meal...</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.cameraButton]}
          onPress={() => pickImage(true)}
          disabled={analyzing}
        >
          <Text style={styles.buttonEmoji}>📸</Text>
          <Text style={styles.buttonText}>Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.galleryButton]}
          onPress={() => pickImage(false)}
          disabled={analyzing}
        >
          <Text style={styles.buttonEmoji}>🖼️</Text>
          <Text style={styles.buttonText}>Gallery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  preview: {
    flex: 1,
    width: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  placeholderHint: {
    fontSize: 14,
    color: '#6C757D',
    marginTop: 8,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  cameraButton: {
    backgroundColor: '#4CAF50',
  },
  galleryButton: {
    backgroundColor: '#2196F3',
  },
  buttonEmoji: {
    fontSize: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
