import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectArchivedCommitments,
  selectRecentlyDeletedCommitments,
  restoreCommitmentThunk,
  softDeleteCommitmentThunk,
  permanentDeleteCommitmentThunk,
  purgeExpiredDeleted,
  type Commitment,
} from '@/store/slices/commitmentsSlice';
import { Icon } from '@/components/icons';

interface ManageCommitmentsScreenProps {
  navigation: any;
}

const ManageCommitmentsScreen: React.FC<ManageCommitmentsScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const archivedCommitments = useAppSelector(selectArchivedCommitments);
  const recentlyDeletedCommitments = useAppSelector(selectRecentlyDeletedCommitments);

  // Purge expired deleted items on mount
  useEffect(() => {
    dispatch(purgeExpiredDeleted());
  }, [dispatch]);

  const handleRestore = (id: string) => {
    dispatch(restoreCommitmentThunk(id));
  };

  const handleSoftDelete = (id: string, title: string) => {
    Alert.alert(
      'Delete Commitment',
      `Move "${title}" to Recently Deleted? It can be restored within 7 days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => dispatch(softDeleteCommitmentThunk(id)) },
      ]
    );
  };

  const handlePermanentDelete = (id: string, title: string) => {
    Alert.alert(
      'Delete Permanently',
      `Permanently delete "${title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Forever', style: 'destructive', onPress: () => dispatch(permanentDeleteCommitmentThunk(id)) },
      ]
    );
  };

  const getDaysDeleted = (deletedAt: string) => {
    return Math.floor((Date.now() - new Date(deletedAt).getTime()) / (24 * 60 * 60 * 1000));
  };

  const renderArchivedItem = ({ item }: { item: Commitment }) => (
    <View style={styles.commitmentItem}>
      <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
      <View style={styles.commitmentInfo}>
        <Text style={styles.commitmentTitle}>{item.title}</Text>
        <Text style={styles.commitmentMeta}>Archived</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.restoreButton]}
          onPress={() => handleRestore(item.id)}
        >
          <Icon name="restore" size={16} color="#059669" />
          <Text style={[styles.actionText, styles.restoreText]}>Restore</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleSoftDelete(item.id, item.title)}
        >
          <Icon name="trash" size={16} color="#EF4444" />
          <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDeletedItem = ({ item }: { item: Commitment }) => (
    <View style={styles.commitmentItem}>
      <View style={[styles.colorIndicator, { backgroundColor: item.color, opacity: 0.5 }]} />
      <View style={styles.commitmentInfo}>
        <Text style={[styles.commitmentTitle, styles.deletedTitle]}>{item.title}</Text>
        <Text style={styles.commitmentMeta}>
          Deleted {getDaysDeleted(item.deletedAt!)} days ago
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.restoreButton]}
          onPress={() => handleRestore(item.id)}
        >
          <Icon name="restore" size={16} color="#059669" />
          <Text style={[styles.actionText, styles.restoreText]}>Undelete</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.permanentDeleteButton]}
          onPress={() => handlePermanentDelete(item.id, item.title)}
        >
          <Icon name="trash" size={16} color="#DC2626" />
          <Text style={[styles.actionText, styles.permanentDeleteText]}>Delete Forever</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Commitments</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Archived Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Archived ({archivedCommitments.length})</Text>
          {archivedCommitments.length > 0 ? (
            <FlatList
              data={archivedCommitments}
              renderItem={renderArchivedItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No archived commitments</Text>
            </View>
          )}
        </View>

        {/* Recently Deleted Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Deleted ({recentlyDeletedCommitments.length})</Text>
          <Text style={styles.sectionSubtitle}>Items are automatically deleted after 7 days</Text>
          {recentlyDeletedCommitments.length > 0 ? (
            <FlatList
              data={recentlyDeletedCommitments}
              renderItem={renderDeletedItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No recently deleted commitments</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  commitmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  colorIndicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 12,
  },
  commitmentInfo: {
    flex: 1,
  },
  commitmentTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  deletedTitle: {
    color: '#6B7280',
  },
  commitmentMeta: {
    fontSize: 14,
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  restoreButton: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  permanentDeleteButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  restoreText: {
    color: '#059669',
  },
  deleteText: {
    color: '#EF4444',
  },
  permanentDeleteText: {
    color: '#DC2626',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});

export default ManageCommitmentsScreen;