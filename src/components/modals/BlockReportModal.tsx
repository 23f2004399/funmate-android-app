/**
 * BLOCK & REPORT MODAL
 * 
 * Displays options to block or report a user from ChatScreen
 * Handles both actions with appropriate confirmations
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { ReportReason } from '../../types/database';

interface BlockReportModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string; // The user to block/report
  userName: string; // For display
  isBlocked?: boolean; // Whether user is already blocked
  onBlock: () => Promise<void>;
  onUnblock?: () => Promise<void>; // Unblock handler
  onReport: (reason: ReportReason, description: string, screenshots: string[]) => Promise<void>;
}

export const BlockReportModal: React.FC<BlockReportModalProps> = ({
  visible,
  onClose,
  userId,
  userName,
  isBlocked = false,
  onBlock,
  onUnblock,
  onReport,
}) => {
  const [view, setView] = useState<'main' | 'report'>('main');
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setView('main');
      setSelectedReason(null);
      setDescription('');
      setScreenshots([]);
      setIsSubmitting(false);
    }
  }, [visible]);

  const reportReasons: { value: ReportReason; label: string }[] = [
    { value: 'harassment', label: 'Harassment or bullying' },
    { value: 'fake_profile', label: 'Fake profile or impersonation' },
    { value: 'inappropriate_content', label: 'Inappropriate content' },
    { value: 'scam', label: 'Scam or fraud' },
    { value: 'other', label: 'Other' },
  ];

  const handleBlock = () => {
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${userName}? You won't see each other's profiles or be able to message.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await onBlock();
              onClose();
              Alert.alert('Blocked', `${userName} has been blocked.`);
            } catch (error) {
              console.error('Error blocking user:', error);
              Alert.alert('Error', 'Failed to block user. Please try again.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleUnblock = () => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await onUnblock?.();
              onClose();
              Alert.alert('Unblocked', `${userName} has been unblocked.`);
            } catch (error) {
              console.error('Error unblocking user:', error);
              Alert.alert('Error', 'Failed to unblock user. Please try again.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handlePickScreenshot = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 3 - screenshots.length, // Max 3 total
      });

      if (result.assets && result.assets.length > 0) {
        const newScreenshots = result.assets
          .map(asset => asset.uri)
          .filter((uri): uri is string => uri !== undefined);
        setScreenshots(prev => [...prev, ...newScreenshots]);
      }
    } catch (error) {
      console.error('Error picking screenshot:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleRemoveScreenshot = (index: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index));
  };

  const handleReportSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Select Reason', 'Please select a reason for reporting.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Add Description', 'Please describe what happened.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Pass screenshots to report handler for upload
      await onReport(selectedReason, description.trim(), screenshots);
      
      // Reset form first
      setSelectedReason(null);
      setDescription('');
      setScreenshots([]);
      setView('main');
      
      Alert.alert(
        'Report Submitted',
        'Thank you for your report. Our team will review it shortly.',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMainView = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Report or Block {userName}</Text>
      
      <TouchableOpacity
        style={styles.option}
        onPress={() => setView('report')}
        disabled={isSubmitting}
      >
        <Text style={styles.optionText}>🚩 Report User</Text>
        <Text style={styles.optionDescription}>
          Report inappropriate behavior
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.option, isBlocked ? styles.warningOption : styles.dangerOption]}
        onPress={isBlocked ? handleUnblock : handleBlock}
        disabled={isSubmitting}
      >
        <Text style={[styles.optionText, !isBlocked && styles.dangerText]}>
          {isBlocked ? '✓ Unblock User' : '🚫 Block User'}
        </Text>
        <Text style={styles.optionDescription}>
          {isBlocked 
            ? 'Restore visibility and messaging'
            : "You won't see each other's profiles"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={onClose}
        disabled={isSubmitting}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>

      {isSubmitting && (
        <ActivityIndicator size="large" color="#E94057" style={styles.loader} />
      )}
    </View>
  );

  const renderReportView = () => (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Report {userName}</Text>
      <Text style={styles.subtitle}>
        Help us understand what happened. Your report is confidential.
      </Text>

      <Text style={styles.label}>Reason *</Text>
      {reportReasons.map((reason) => (
        <TouchableOpacity
          key={reason.value}
          style={[
            styles.reasonOption,
            selectedReason === reason.value && styles.reasonOptionSelected,
          ]}
          onPress={() => setSelectedReason(reason.value)}
          disabled={isSubmitting}
        >
          <Text
            style={[
              styles.reasonText,
              selectedReason === reason.value && styles.reasonTextSelected,
            ]}
          >
            {reason.label}
          </Text>
        </TouchableOpacity>
      ))}

      <Text style={[styles.label, styles.descriptionLabel]}>
        What happened? *
      </Text>
      <TextInput
        style={styles.descriptionInput}
        placeholder="Please describe the issue..."
        placeholderTextColor="#999"
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
        editable={!isSubmitting}
        textAlignVertical="top"
      />

      <Text style={[styles.label, styles.descriptionLabel]}>
        Screenshots (Optional)
      </Text>
      <Text style={styles.evidenceNote}>
        Upload up to 3 screenshots as evidence
      </Text>

      {screenshots.length > 0 && (
        <View style={styles.screenshotsContainer}>
          {screenshots.map((uri, index) => (
            <View key={index} style={styles.screenshotItem}>
              <Image source={{ uri }} style={styles.screenshotImage} />
              <TouchableOpacity
                style={styles.removeScreenshotButton}
                onPress={() => handleRemoveScreenshot(index)}
              >
                <Ionicons name="close-circle" size={24} color="#E94057" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {screenshots.length < 3 && (
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handlePickScreenshot}
          disabled={isSubmitting}
        >
          <Ionicons name="camera-outline" size={20} color="#E94057" />
          <Text style={styles.uploadButtonText}>
            {screenshots.length === 0 ? 'Add Screenshots' : `Add More (${3 - screenshots.length} left)`}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleReportSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Report</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setView('main')}
        disabled={isSubmitting}
      >
        <Text style={styles.cancelText}>← Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {view === 'main' ? renderMainView() : renderReportView()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  container: {
    padding: 24,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  option: {
    backgroundColor: '#F6F6F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  dangerOption: {
    backgroundColor: '#FFEBEE',
  },
  warningOption: {
    backgroundColor: '#FFF8E1',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  dangerText: {
    color: '#E94057',
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  loader: {
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  descriptionLabel: {
    marginTop: 16,
  },
  reasonOption: {
    backgroundColor: '#F6F6F6',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reasonOptionSelected: {
    backgroundColor: '#FFF0F3',
    borderColor: '#E94057',
  },
  reasonText: {
    fontSize: 15,
    color: '#666',
  },
  reasonTextSelected: {
    color: '#E94057',
    fontWeight: '600',
  },
  descriptionInput: {
    backgroundColor: '#F6F6F6',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#1A1A1A',
    minHeight: 100,
  },
  evidenceNote: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  screenshotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  screenshotItem: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  screenshotImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#F6F6F6',
  },
  removeScreenshotButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F3',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E94057',
    borderStyle: 'dashed',
    marginBottom: 20,
    gap: 8,
  },
  uploadButtonText: {
    color: '#E94057',
    fontSize: 15,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#E94057',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    padding: 12,
    alignItems: 'center',
  },
});
