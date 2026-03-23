import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  ImageBackground,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { launchImageLibrary, ImagePickerResponse, Asset } from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { API_ENDPOINTS, getEnvironmentInfo } from '../../config/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BADGE_SIZE = 24;
const CIRCLE_SIZE = Math.floor((SCREEN_WIDTH - 48) / 3) - Math.floor(BADGE_SIZE / 2);
const CELL_WIDTH = CIRCLE_SIZE + Math.floor(BADGE_SIZE / 2);
const CELL_HEIGHT = CIRCLE_SIZE + BADGE_SIZE;

// Badge centers sit exactly on the circumference at the 45° (bottom-right / top-right) position
// Circle center in cell coords: (CIRCLE_SIZE/2, BADGE_SIZE/2 + CIRCLE_SIZE/2)
// Circumference point at ±45°: center ± radius * 0.7071
const _R = CIRCLE_SIZE / 2;
const _CX = _R;                          // circle center x in cell
const _CY = BADGE_SIZE / 2 + _R;        // circle center y in cell
const _D = Math.round(_R * 0.7071);     // offset along each axis at 45°

// Bottom-right circumference (+ badge)
const ADD_BADGE_LEFT = _CX + _D - Math.floor(BADGE_SIZE / 2);
const ADD_BADGE_TOP  = _CY + _D - Math.floor(BADGE_SIZE / 2);

// Top-right circumference (× badge)
const REMOVE_BADGE_LEFT = _CX + _D - Math.floor(BADGE_SIZE / 2);
const REMOVE_BADGE_TOP  = _CY - _D - Math.floor(BADGE_SIZE / 2);

interface PhotoUploadScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PhotoUpload'>;
  route: any;
}

interface PhotoSlot {
  localUri: string | null;
  order: number;
  asset: Asset | null;
}

const PhotoUploadScreen = ({ navigation, route }: PhotoUploadScreenProps) => {
  const insets = useSafeAreaInsets();
  const [photos, setPhotos] = useState<PhotoSlot[]>([
    { localUri: null, order: 1, asset: null },
    { localUri: null, order: 2, asset: null },
    { localUri: null, order: 3, asset: null },
    { localUri: null, order: 4, asset: null },
    { localUri: null, order: 5, asset: null },
    { localUri: null, order: 6, asset: null },
  ]);
  const [uploading, setUploading] = useState(false);

  const handleSelectPhoto = async (index: number) => {
    try {
      const result: ImagePickerResponse = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
        selectionLimit: 1,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: result.errorMessage || 'Failed to pick image',
          visibilityTime: 3000,
        });
        return;
      }

      if (result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const updatedPhotos = [...photos];
        updatedPhotos[index] = {
          localUri: asset.uri || null,
          order: index + 1,
          asset: asset,
        };
        setPhotos(updatedPhotos);
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to pick image',
        visibilityTime: 3000,
      });
    }
  };

  const handleRemovePhoto = (index: number) => {
    const updatedPhotos = [...photos];
    updatedPhotos[index] = { localUri: null, order: index + 1, asset: null };
    setPhotos(updatedPhotos);
  };

  // ═══════════════════════════════════════════════════════════════════
  // 🤖 FACE DETECTION API - InsightFace Model
  // ═══════════════════════════════════════════════════════════════════
  // Validates photo contains a clear, visible human face
  // Backend: Flask API running InsightFace buffalo_l model
  // ═══════════════════════════════════════════════════════════════════
  const checkPhotoWithMLModel = async (imageUri: string): Promise<{
    isApproved: boolean;
    reason: string;
    confidenceScore: number;
  }> => {
    try {
      console.log('🔍 Validating face in image:', imageUri);
      
      const envInfo = getEnvironmentInfo();
      console.log('🌐 Environment:', envInfo);
      console.log('📡 API URL:', API_ENDPOINTS.DETECT_FACE);
      
      // Prepare form data
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);
      
      // Call face detection API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      console.log('📡 Sending request to:', API_ENDPOINTS.DETECT_FACE);
      const response = await fetch(API_ENDPOINTS.DETECT_FACE, {
        method: 'POST',
        body: formData as any,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal: controller.signal as any,
      });
      
      clearTimeout(timeoutId);
      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const result = await response.json() as any;
      console.log('✅ Face detection result:', result);
      
      // Check if face was detected and approved
      if (result.decision === 'ACCEPTED' && result.faces_count > 0) {
        const face = result.faces[0];
        return {
          isApproved: true,
          reason: `Face detected (confidence: ${(face.score * 100).toFixed(1)}%)`,
          confidenceScore: face.score,
        };
      } else {
        return {
          isApproved: false,
          reason: 'No clear face detected. Please ensure your face is visible.',
          confidenceScore: 0,
        };
      }
      
    } catch (error: any) {
      console.error('❌ Face detection error:', error);
      
      // User-friendly error messages
      if (error.name === 'AbortError') {
        console.error('⏱️ Request timed out after 30 seconds');
        return {
          isApproved: false,
          reason: 'Request timed out. Please try again with a smaller photo.',
          confidenceScore: 0,
        };
      }
      
      if (error.message.includes('Network request failed') || error.message.includes('ECONNREFUSED')) {
        // Backend is not running - this is a developer error, not user error
        const envInfo = getEnvironmentInfo();
        console.error('⚠️ DEVELOPER: Backend not running or not reachable!');
        console.error('⚠️ Current API URL:', API_ENDPOINTS.DETECT_FACE);
        console.error('⚠️ Environment:', envInfo);
        console.error('⚠️ STEPS TO FIX:');
        console.error('   1. Check backend is running: python app.py');
        console.error(`   2. Verify IP in src/config/api.ts: LOCAL_WIFI_IP = '${envInfo.localIP}'`);
        console.error('   3. If on emulator, set IS_ANDROID_EMULATOR = true');
        return {
          isApproved: false,
          reason: 'Unable to validate photo. Please try again.',
          confidenceScore: 0,
        };
      }
      
      return {
        isApproved: false,
        reason: 'Photo validation failed. Please try again.',
        confidenceScore: 0,
      };
    }
  };

  const handleUpload = async () => {
    // Count uploaded photos
    const uploadedPhotos = photos.filter(p => p.localUri !== null);
    
    if (uploadedPhotos.length < 4) {
      Toast.show({
        type: 'error',
        text1: 'Not Enough Photos',
        text2: 'At least 4 photos are needed',
        visibilityTime: 3000,
      });
      return;
    }

    setUploading(true);

    try {
      const user = auth().currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }

      const userId = user.uid;
      
      // ═══════════════════════════════════════════════════════════════════
      // 🗑️ DELETE OLD PHOTOS IF USER IS RE-UPLOADING
      // ═══════════════════════════════════════════════════════════════════
      const userDoc = await firestore().collection('users').doc(userId).get();
      const existingPhotos = userDoc.data()?.photos || [];
      
      if (existingPhotos.length > 0) {
        console.log(`🗑️ Deleting ${existingPhotos.length} old photos before uploading new ones...`);
        
        // Delete old photos from Storage
        for (const oldPhoto of existingPhotos) {
          try {
            const oldRef = storage().refFromURL(oldPhoto.url);
            await oldRef.delete();
            console.log(`✅ Deleted old photo: ${oldPhoto.url.substring(0, 50)}...`);
          } catch (deleteError) {
            console.warn(`⚠️ Could not delete old photo (may not exist):`, deleteError);
          }
        }
      }
      // ═══════════════════════════════════════════════════════════════════
      
      const photoUrls: Array<{
        url: string;
        isPrimary: boolean;
        moderationStatus: 'approved' | 'rejected' | 'pending';
        uploadedAt: any;
        order: number;
      }> = [];

      // ═══════════════════════════════════════════════════════════════════
      // 🤖 STEP 1: VALIDATE ALL PHOTOS WITH ML MODEL FIRST
      // ═══════════════════════════════════════════════════════════════════
      console.log('🤖 Step 1: Validating all photos with ML model...');
      for (const photo of uploadedPhotos) {
        if (!photo.localUri || !photo.asset) continue;

        console.log(`🤖 Checking photo ${photo.order} with ML model...`);
        const mlResult = await checkPhotoWithMLModel(photo.localUri);
        
        if (!mlResult.isApproved) {
          // Photo rejected by ML model - STOP EVERYTHING
          Toast.show({
            type: 'error',
            text1: 'Photo Rejected',
            text2: `Photo ${photo.order}: ${mlResult.reason}`,
            visibilityTime: 5000,
          });
          setUploading(false);
          return; // Exit before uploading anything
        }
        
        console.log(`✅ Photo ${photo.order} approved by ML model (confidence: ${mlResult.confidenceScore})`);
      }
      console.log('✅ All photos passed ML validation!');
      // ═══════════════════════════════════════════════════════════════════

      // ═══════════════════════════════════════════════════════════════════
      // 📤 STEP 2: UPLOAD ALL PHOTOS TO STORAGE
      // ═══════════════════════════════════════════════════════════════════
      console.log('📤 Step 2: Uploading all photos to Storage...');
      for (const photo of uploadedPhotos) {
        if (!photo.localUri || !photo.asset) continue;

        // Upload to Firebase Storage
        const fileName = `photo_${photo.order}_${Date.now()}.jpg`;
        const storagePath = `users/${userId}/photos/${fileName}`;
        const reference = storage().ref(storagePath);

        // Clean URI (remove file:// prefix if present)
        let uploadUri = photo.localUri;
        if (uploadUri.startsWith('file://')) {
          uploadUri = uploadUri.substring(7);
        }

        console.log(`📤 Uploading photo ${photo.order} to ${storagePath}`);
        console.log(`📁 Local URI: ${uploadUri}`);

        try {
          // Upload file to Firebase Storage
          const uploadTask = reference.putFile(uploadUri);
          
          // Wait for upload to complete
          await uploadTask;
          
          console.log(`✅ Upload complete for photo ${photo.order}`);
          
          // Get download URL
          const downloadUrl = await reference.getDownloadURL();
          console.log(`🔗 Download URL obtained: ${downloadUrl.substring(0, 50)}...`);

          photoUrls.push({
            url: downloadUrl,
            isPrimary: photo.order === 1, // First photo is primary
            moderationStatus: 'approved', // ML model approved
            uploadedAt: new Date().toISOString(),
            order: photo.order,
          });
        } catch (uploadError: any) {
          console.error(`❌ Failed to upload photo ${photo.order}:`, uploadError);
          throw new Error(`Failed to upload photo ${photo.order}: ${uploadError.message}`);
        }
      }

      // ═══════════════════════════════════════════════════════════════════
      // 🧠 STEP 3: CREATE FACE TEMPLATE FOR LIVENESS VERIFICATION
      // ═══════════════════════════════════════════════════════════════════
      console.log('🧠 Step 3: Creating face template for liveness verification...');
      
      try {
        const templateResponse = await fetch(API_ENDPOINTS.CREATE_TEMPLATE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            photo_urls: photoUrls.map(p => p.url),
          }),
        });
        
        if (!templateResponse.ok) {
          throw new Error('Failed to create face template');
        }
        
        const templateResult = await templateResponse.json() as any;
        console.log('✅ Face template created:', templateResult.photos_processed, 'photos processed');
        
        // Update user document with photos AND template
        await firestore().collection('users').doc(userId).update({
          photos: photoUrls,
          faceTemplate: templateResult.template, // Base64 template for liveness verification
          templateCreatedAt: new Date().toISOString(),
        });
        
      } catch (templateError: any) {
        console.error('⚠️ Template creation failed:', templateError);
        // Still save photos, but without template
        await firestore().collection('users').doc(userId).update({
          photos: photoUrls,
        });
      }
      // ═══════════════════════════════════════════════════════════════════

      // Update signupStep to liveness
      await firestore().collection('accounts').doc(userId).update({
        signupStep: 'liveness',
      });

      setUploading(false);

      Toast.show({
        type: 'success',
        text1: 'Photos Uploaded!',
        text2: `${photoUrls.length} photos uploaded successfully`,
        visibilityTime: 3000,
      });

      setTimeout(() => {
        navigation.navigate('IdentityVerification');
      }, 1000);

    } catch (error: any) {
      setUploading(false);
      console.error('Upload error:', error);
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: error.message || 'Failed to upload photos',
        visibilityTime: 4000,
      });
    }
  };

  const uploadedCount = photos.filter(p => p.localUri !== null).length;

  return (
    <ImageBackground
      source={require('../../assets/images/bg_splash.webp')}
      style={styles.bg}
      blurRadius={6}
    >
      <View style={styles.overlay} />
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerBtn}>
          {navigation.canGoBack() && (
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.logoRow}>
          <Image source={require('../../assets/logo.png')} style={styles.logoImage} />
          <Text style={styles.appName}>Funmate</Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Add Your Photos</Text>
        <Text style={styles.subtitle}>Upload at least 4 clear face photos</Text>
        <Text style={styles.countText}>
          {uploadedCount}/6 added{uploadedCount >= 4 ? '  ✓' : ''}
        </Text>

        {/* Row 1 */}
        <View style={styles.photoRow}>
          {[0, 1, 2].map((index) => {
            const photo = photos[index];
            return (
              <View key={index} style={styles.circleCell}>
                <TouchableOpacity
                  style={[styles.circle, photo.localUri ? styles.circleFilled : styles.circleEmpty]}
                  onPress={() => handleSelectPhoto(index)}
                  activeOpacity={0.8}
                >
                  {!!photo.localUri && (
                    <View style={styles.circleImageWrapper}>
                      <Image
                        source={{ uri: photo.localUri }}
                        style={styles.circlePhoto}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                </TouchableOpacity>
                {!photo.localUri && (
                  <View style={styles.addBadge}>
                    <Ionicons name="add" size={14} color="#FFFFFF" />
                  </View>
                )}
                {!!photo.localUri && (
                  <TouchableOpacity
                    style={styles.removeBadge}
                    onPress={() => handleRemovePhoto(index)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={11} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Row 2 */}
        <View style={[styles.photoRow, { marginBottom: 0 }]}>
          {[3, 4, 5].map((index) => {
            const photo = photos[index];
            return (
              <View key={index} style={styles.circleCell}>
                <TouchableOpacity
                  style={[styles.circle, photo.localUri ? styles.circleFilled : styles.circleEmpty]}
                  onPress={() => handleSelectPhoto(index)}
                  activeOpacity={0.8}
                >
                  {!!photo.localUri && (
                    <View style={styles.circleImageWrapper}>
                      <Image
                        source={{ uri: photo.localUri }}
                        style={styles.circlePhoto}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                </TouchableOpacity>
                {!photo.localUri && (
                  <View style={styles.addBadge}>
                    <Ionicons name="add" size={14} color="#FFFFFF" />
                  </View>
                )}
                {!!photo.localUri && (
                  <TouchableOpacity
                    style={styles.removeBadge}
                    onPress={() => handleRemovePhoto(index)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={11} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Guidelines */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Photo Guidelines</Text>
          <Text style={styles.infoText}>• Your face must be clearly visible in each photo</Text>
          <Text style={styles.infoText}>• First photo becomes your profile picture</Text>
          <Text style={styles.infoText}>• No inappropriate or blurry content</Text>
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(32, insets.bottom + 16) }]}>
        <TouchableOpacity
          onPress={handleUpload}
          disabled={uploadedCount < 4 || uploading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={
              uploadedCount < 4 || uploading
                ? ['rgba(139,43,226,0.25)', 'rgba(6,182,212,0.25)']
                : ['#8B2BE2', '#06B6D4']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.uploadButton}
          >
            {uploading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.uploadButtonText}>
                Continue  ({uploadedCount}/6)
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,11,30,0.62)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 8,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.50)',
    marginBottom: 6,
  },
  countText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#A855F7',
    marginBottom: 28,
  },
  // ─── Circle grid ───
  photoRow: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  circleCell: {
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
  },
  circle: {
    position: 'absolute',
    top: Math.floor(BADGE_SIZE / 2),
    left: 0,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
  },
  circleEmpty: {
    backgroundColor: 'rgba(200,200,215,0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  circleFilled: {},
  circleImageWrapper: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    overflow: 'hidden',
  },
  circlePhoto: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    overflow: 'hidden',
  },
  addBadge: {
    position: 'absolute',
    left: ADD_BADGE_LEFT,
    top: ADD_BADGE_TOP,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: '#8B2BE2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBadge: {
    position: 'absolute',
    left: REMOVE_BADGE_LEFT,
    top: REMOVE_BADGE_TOP,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: 'rgba(20,10,40,0.88)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.30)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ─── Info box ───
  infoBox: {
    backgroundColor: 'rgba(30,28,45,0.85)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(139,92,246,0.25)',
    padding: 18,
    marginTop: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 5,
    lineHeight: 20,
  },
  // ─── Footer ───
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  uploadButton: {
    height: 54,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
  },
});

export default PhotoUploadScreen;
