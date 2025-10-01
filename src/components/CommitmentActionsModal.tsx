import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Commitment } from '@/store/slices/commitmentsSlice';
import { Icon } from './icons';

interface CommitmentActionsModalProps {
  visible: boolean;
  onClose: () => void;
  commitment: Commitment | null;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onSoftDelete: (id: string) => void;
  onPermanentDelete: (id: string) => void;
}

const CommitmentActionsModal: React.FC<CommitmentActionsModalProps> = ({
  visible,
  onClose,
  commitment,
  onArchive,
  onRestore,
  onSoftDelete,
  onPermanentDelete,
}) => {
  if (!commitment) return null;

  const isActive = !commitment.archived && !commitment.deletedAt;
  const isArchived = commitment.archived === true && !commitment.deletedAt;
  const isRecentlyDeleted = commitment.deletedAt &&
    new Date(commitment.deletedAt).getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000;

  const handleArchive = () => {
    onArchive(commitment.id);
    onClose();
  };

  const handleRestore = () => {
    onRestore(commitment.id);
    onClose();
  };

  const handleSoftDelete = () => {
    Alert.alert(
      'Delete Commitment',
      'This commitment will be moved to Recently Deleted and can be restored within 7 days.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          onSoftDelete(commitment.id);
          onClose();
        }},
      ]
    );
  };

  const handlePermanentDelete = () => {
    Alert.alert(
      'Delete Permanently',
      'This commitment will be permanently deleted and cannot be restored. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Forever', style: 'destructive', onPress: () => {
          onPermanentDelete(commitment.id);
          onClose();
        }},
      ]
    );
  };

  const getDeletedDaysAgo = () => {
    if (!commitment.deletedAt) return 0;
    return Math.floor((Date.now() - new Date(commitment.deletedAt).getTime()) / (24 * 60 * 60 * 1000));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{commitment.title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="activity-failed" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Status indicator */}
            <View style={styles.statusSection}>
              {isActive && (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Active</Text>
                </View>
              )}
              {isArchived && (
                <View style={[styles.statusBadge, styles.archivedBadge]}>
                  <Text style={[styles.statusText, styles.archivedText]}>Archived</Text>
                </View>
              )}
              {isRecentlyDeleted && (
                <View style={[styles.statusBadge, styles.deletedBadge]}>
                  <Text style={[styles.statusText, styles.deletedText]}>
                    Deleted {getDeletedDaysAgo()} days ago
                  </Text>
                </View>
              )}
            </View>

            {/* Action buttons */}
            <View style={styles.actionsSection}>
              {isActive && (
                <>
                  <TouchableOpacity style={styles.actionButton} onPress={handleArchive}>
                    <Icon name="archive" size={20} color="#6B7280" />
                    <Text style={styles.actionText}>Archive</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton} onPress={handleSoftDelete}>
                    <Icon name="trash" size={20} color="#EF4444" />
                    <Text style={[styles.actionText, styles.destructiveText]}>Delete</Text>
                  </TouchableOpacity>
                </>
              )}

              {isArchived && (
                <>
                  <TouchableOpacity style={styles.actionButton} onPress={handleRestore}>
                    <Icon name="restore" size={20} color="#059669" />
                    <Text style={[styles.actionText, styles.restoreText]}>Restore</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton} onPress={handleSoftDelete}>
                    <Icon name="trash" size={20} color="#EF4444" />
                    <Text style={[styles.actionText, styles.destructiveText]}>Delete</Text>
                  </TouchableOpacity>
                </>
              )}

              {isRecentlyDeleted && (
                <>
                  <TouchableOpacity style={styles.actionButton} onPress={handleRestore}>
                    <Icon name="restore" size={20} color="#059669" />
                    <Text style={[styles.actionText, styles.restoreText]}>Undelete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton} onPress={handlePermanentDelete}>
                    <Icon name="trash" size={20} color="#DC2626" />
                    <Text style={[styles.actionText, styles.permanentDeleteText]}>Delete Permanently</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    minHeight: '30%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusSection: {
    marginBottom: 24,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#10B981',
  },
  archivedBadge: {
    backgroundColor: '#F59E0B',
  },
  deletedBadge: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  archivedText: {
    color: 'white',
  },
  deletedText: {
    color: 'white',
  },
  actionsSection: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 12,
  },
  destructiveText: {
    color: '#EF4444',
  },
  permanentDeleteText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  restoreText: {
    color: '#059669',
  },
});

export default CommitmentActionsModal;