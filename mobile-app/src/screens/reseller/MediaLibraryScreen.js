import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api/client';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppInput from '../../components/AppInput';
import AppScreen from '../../components/AppScreen';
import EmptyState from '../../components/EmptyState';
import LoadingView from '../../components/LoadingView';
import SectionCard from '../../components/SectionCard';
import { useToast } from '../../context/ToastContext';
import { palette, radii } from '../../theme/colors';

const fallbackImage = 'https://placehold.co/600x400?text=Media';

const MediaLibraryScreen = () => {
  const { showToast } = useToast();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState('');
  const [drafts, setDrafts] = useState({});

  const fetchAssets = async (query = '') => {
    setLoading(true);
    try {
      const { data } = await api.get('/media', {
        params: query ? { q: query, limit: 300 } : { limit: 300 },
        showSuccessToast: false,
        showErrorToast: false
      });
      const nextAssets = Array.isArray(data) ? data : [];
      setAssets(nextAssets);
      setDrafts(
        nextAssets.reduce((acc, asset) => {
          acc[asset._id] = {
            name: String(asset.name || ''),
            altText: String(asset.altText || '')
          };
          return acc;
        }, {})
      );
    } catch (error) {
      showToast(error?.response?.data?.message || error.message || 'Failed to load media library', 'error');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openGalleryAndUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast('Media permission is required to upload images.', 'error');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.86,
      base64: true,
      allowsMultipleSelection: false
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const picked = result.assets[0];
    const mimeType = String(picked.mimeType || 'image/jpeg').trim() || 'image/jpeg';
    const base64 = String(picked.base64 || '').trim();

    if (!base64) {
      showToast('Unable to read selected image.', 'error');
      return;
    }

    setUploading(true);
    try {
      const payload = {
        items: [
          {
            name: picked.fileName || 'Image',
            altText: '',
            url: `data:${mimeType};base64,${base64}`,
            mimeType,
            source: 'upload'
          }
        ]
      };

      await api.post('/media', payload);
      await fetchAssets(searchText);
      showToast('Image uploaded to media library', 'success');
    } catch {
      // Error toast handled by interceptor.
    } finally {
      setUploading(false);
    }
  };

  const onSaveAsset = async (asset) => {
    const draft = drafts[asset._id] || {};
    setEditingAssetId(asset._id);
    try {
      await api.put(`/media/${asset._id}`, {
        name: String(draft.name || '').trim() || 'Image',
        altText: String(draft.altText || '').trim()
      });
      await fetchAssets(searchText);
      showToast('Media asset updated', 'success');
    } catch {
      // Error toast handled by interceptor.
    } finally {
      setEditingAssetId('');
    }
  };

  const onDeleteAsset = async (assetId) => {
    try {
      await api.delete(`/media/${assetId}`);
      await fetchAssets(searchText);
      showToast('Media asset deleted', 'success');
    } catch {
      // Error toast handled by interceptor.
    }
  };

  return (
    <AppScreen>
      <AppHeader
        eyebrow="Reseller"
        title="Media Library"
        subtitle="Separate media library for reseller uploads and image reuse in product/SEO forms."
      />

      <SectionCard>
        <AppInput
          label="Search media"
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Image name, alt text, url"
        />
        <View style={styles.actionsRow}>
          <AppButton variant="ghost" onPress={() => fetchAssets(searchText)}>
            Search
          </AppButton>
          <AppButton onPress={openGalleryAndUpload} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload from Gallery'}
          </AppButton>
        </View>
      </SectionCard>

      {loading ? <LoadingView message="Loading media assets..." /> : null}
      {!loading && assets.length === 0 ? <EmptyState title="No media assets" message="Upload images from your gallery to create reseller media library." /> : null}

      {!loading && assets.map((asset) => {
        const draft = drafts[asset._id] || { name: asset.name || '', altText: asset.altText || '' };

        return (
          <SectionCard key={asset._id}>
            <Image source={{ uri: asset.url || fallbackImage }} style={styles.preview} resizeMode="cover" />
            <AppInput
              label="Name"
              value={draft.name}
              onChangeText={(value) =>
                setDrafts((current) => ({
                  ...current,
                  [asset._id]: {
                    ...current[asset._id],
                    name: value
                  }
                }))
              }
            />
            <AppInput
              label="Alt Text"
              value={draft.altText}
              onChangeText={(value) =>
                setDrafts((current) => ({
                  ...current,
                  [asset._id]: {
                    ...current[asset._id],
                    altText: value
                  }
                }))
              }
            />
            <AppInput label="URL" value={asset.url} editable={false} />

            <View style={styles.actionsRow}>
              <AppButton
                variant="ghost"
                onPress={() => onSaveAsset(asset)}
                disabled={editingAssetId === asset._id}
              >
                {editingAssetId === asset._id ? 'Saving...' : 'Save'}
              </AppButton>
              <AppButton variant="danger" onPress={() => onDeleteAsset(asset._id)}>
                Delete
              </AppButton>
            </View>
          </SectionCard>
        );
      })}
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    gap: 8
  },
  preview: {
    width: '100%',
    height: 190,
    borderRadius: radii.md,
    backgroundColor: '#eef2f7'
  },
  note: {
    color: palette.textSecondary,
    fontSize: 12
  }
});

export default MediaLibraryScreen;
